const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
require('dotenv').config();

const KNOWN_EXAMS_FILE = path.join(__dirname, 'known_beu_exams.json');
const CHECK_INTERVAL_MINUTES = parseInt(process.env.BEU_WATCH_INTERVAL_MINUTES || '30', 10);
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

function fetchBEUExams() {
  return new Promise((resolve, reject) => {
    https.get('https://beu-bih.ac.in/backend/v1/result/sem-get', { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const btech = json.find(c => c.courseName && c.courseName.toLowerCase().includes('b.tech'));
          if (!btech || !btech.exams) {
            return resolve([]);
          }
          resolve(btech.exams);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function loadKnownExamsFromCloudOrLocal() {
  // 1. Try loading from MongoDB metadata collection
  if (MONGO_URI) {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(MONGO_URI);
      }
      const metaCol = mongoose.connection.collection('crawler_metadata');
      const doc = await metaCol.findOne({ _id: 'known_beu_exams' });
      if (doc && doc.data) {
        return doc.data;
      }
    } catch (e) {
      console.warn('⚠️ Note on cloud metadata fetch:', e.message);
    }
  }

  // 2. Fallback to local JSON file
  try {
    if (fs.existsSync(KNOWN_EXAMS_FILE)) {
      return JSON.parse(fs.readFileSync(KNOWN_EXAMS_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('⚠️ Could not read local known exams file:', e.message);
  }
  return null;
}

async function saveKnownExamsToCloudAndLocal(examsMap) {
  // 1. Save locally
  try {
    fs.writeFileSync(KNOWN_EXAMS_FILE, JSON.stringify(examsMap, null, 2), 'utf8');
  } catch (e) {
    console.error('⚠️ Could not save local known exams file:', e.message);
  }

  // 2. Save to MongoDB metadata collection
  if (MONGO_URI) {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(MONGO_URI);
      }
      const metaCol = mongoose.connection.collection('crawler_metadata');
      await metaCol.updateOne(
        { _id: 'known_beu_exams' },
        { $set: { data: examsMap, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (e) {
      console.warn('⚠️ Note on cloud metadata save:', e.message);
    }
  }
}

function runScraper() {
  return new Promise((resolve) => {
    console.log('\n🚀 Automatically launching Statewide Data Scraper for the new results...');
    const child = spawn('node', ['src/scripts/scrape_beu_statewide.cjs'], {
      cwd: path.join(__dirname, '..', '..'),
      stdio: 'inherit',
      detached: false,
      env: process.env
    });

    child.on('close', code => {
      console.log(`🏁 Scraper process exited with code ${code}`);
      resolve(code);
    });

    child.on('error', err => {
      console.error('❌ Error executing scraper:', err.message);
      resolve(1);
    });
  });
}

async function checkAndAutoFetch() {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n🔍 [${timestamp}] Checking BEU Portal for new result publications...`);

  try {
    const liveExams = await fetchBEUExams();
    let knownMap = await loadKnownExamsFromCloudOrLocal();

    // Baseline initialization: register all currently published exams
    if (!knownMap) {
      console.log(`ℹ️ Initializing Known Exams registry with ${liveExams.length} existing BEU exams.`);
      knownMap = {};
      liveExams.forEach(e => {
        knownMap[e.id] = {
          examName: e.examName,
          examId: e.examId,
          session: e.session,
          publishDate: e.publishDate,
          firstSeen: new Date().toISOString()
        };
      });
      await saveKnownExamsToCloudAndLocal(knownMap);
      console.log('✅ Baseline registry synchronized. Watcher is now actively monitoring for NEW results.\n');
      return [];
    }

    // Detect new exams
    const newExams = [];
    liveExams.forEach(e => {
      if (!knownMap[e.id]) {
        newExams.push(e);
      }
    });

    // Ensure cloud copy exists
    await saveKnownExamsToCloudAndLocal(knownMap);

    if (newExams.length === 0) {
      console.log(`✨ All clear: No new BEU result uploads found. (Tracking ${Object.keys(knownMap).length} total exams).`);
      return [];
    }

    console.log(`\n🚨🚨🚨 NEW BEU RESULT DETECTED! (${newExams.length} new exam(s) published) 🚨🚨🚨`);
    newExams.forEach(e => {
      console.log(`  🎉 [NEW] "${e.examName}"`);
      console.log(`     Session: ${e.session} | Sem: ${e.semId} | ExamID: ${e.examId} | Published: ${e.publishDate}`);
      knownMap[e.id] = {
        examName: e.examName,
        examId: e.examId,
        session: e.session,
        publishDate: e.publishDate,
        firstSeen: new Date().toISOString(),
        pendingFetch: true
      };
    });

    await saveKnownExamsToCloudAndLocal(knownMap);

    // Run scraper and wait for it
    await runScraper();

    return newExams;
  } catch (error) {
    console.error('⚠️ Error checking BEU portal:', error.message);
    return [];
  }
}

async function startWatcher() {
  const isOnce = process.argv.includes('--once');
  const isCloud = process.argv.includes('--cloud');

  console.log('==================================================================');
  console.log('🛰️ BEU RESULT AUTO-WATCHER & CONTINUOUS MONITOR');
  if (isCloud) {
    console.log('☁️ Execution Mode: CLOUD RUNNER (GitHub Actions / Cloud Scheduler)');
  } else {
    console.log(`📡 Polling Frequency: Every ${CHECK_INTERVAL_MINUTES} minutes`);
  }
  console.log('🎯 Target: Automatic detection of newly uploaded semester results');
  console.log('==================================================================');

  await checkAndAutoFetch();

  if (isOnce || isCloud) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (e) {}
    process.exit(0);
  }

  // Periodic monitoring loop for local/daemon mode
  setInterval(async () => {
    await checkAndAutoFetch();
  }, CHECK_INTERVAL_MINUTES * 60 * 1000);
}

startWatcher().catch(console.error);
