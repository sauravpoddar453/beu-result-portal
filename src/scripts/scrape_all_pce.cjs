const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const toRoman = (num) => {
  const map = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
  return map[num] || num.toString();
};

const resultSchema = new mongoose.Schema({
  regNo: { type: String, required: true },
  name: String,
  fatherName: String,
  motherName: String,
  college: String,
  semester: String,
  sgpa: mongoose.Schema.Types.Mixed,
  cgpa: mongoose.Schema.Types.Mixed,
  status: String,
  course: String,
  theorySubjects: Array,
  practicalSubjects: Array,
  allSgpa: Array,
  subjects: Array,
  examHeld: String,
  examName: String,
  lastUpdated: { type: Date, default: Date.now },
}, { strict: false });

resultSchema.index({ regNo: 1, semester: 1 }, { unique: true });
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch live exam list from BEU
async function fetchAllBTechExams() {
  return new Promise((resolve, reject) => {
    https.get('https://beu-bih.ac.in/backend/v1/result/sem-get', { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const btech = json.find(c => c.courseName.toLowerCase().includes('b.tech'));
          resolve(btech ? btech.exams : []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Robust Turnstile token retriever with clean page reload fallback
 */
async function getTurnstileToken(page, url, isFirst = false) {
  let captcha = null;
  let attempts = 0;

  while (!captcha && attempts < 3) {
    attempts++;
    if (!isFirst || attempts > 1) {
      if (attempts > 1) {
        console.log(`   🔄 [RELOAD] Turnstile reset stalled. Reloading page cleanly...`);
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
          await sleep(1500);
        } catch (e) {
          // ignore goto timeout
        }
      } else {
        await page.evaluate(() => {
          if (window.turnstile) {
            try { window.turnstile.reset(); } catch (e) {}
          }
        });
      }
    }

    for (let i = 0; i < 20; i++) {
      captcha = await page.evaluate(() => {
        const el = document.querySelector('[name="cf-turnstile-response"]');
        return (el && el.value && el.value.length > 10) ? el.value : null;
      });
      if (captcha) break;
      await sleep(350);
    }
  }

  if (!captcha) return null;

  const tokenObj = await page.evaluate(async (cap) => {
    try {
      const res = await fetch('https://beu-bih.ac.in/backend/v1/result/token?captcha=' + encodeURIComponent(cap));
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  }, captcha);

  return tokenObj?.token || null;
}

// Map exam session (e.g. "2022-26") strictly to allowed batches (22, 23, 24, 25)
function extractBatchesFromSession(session, semId) {
  const allowed = ['22', '23', '24', '25'];
  let batches = [];
  if (session) {
    const match = session.match(/(\d{4})-(\d{2,4})/);
    if (match) {
      const startYear = match[1]; // e.g. "2022"
      batches = [startYear.slice(-2)];
    } else if (session.includes('YBL') || session.includes('Arrear') || session.includes('Carry')) {
      batches = ['22', '23', '24', '25'];
    }
  }
  return batches.filter(b => allowed.includes(b));
}

async function scrapeExamStudents(page, exam, regNumbers) {
  const d = Buffer.from(JSON.stringify({
    semester: exam.semId,
    session: exam.batchYear,
    exam_held: exam.examHeld,
    exam_id: exam.examId
  })).toString('base64');

  const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;
  console.log(`\n================================================================`);
  console.log(`📋 [EXAM: Sem ${exam.semId}] ${exam.examName}`);
  console.log(`📅 [Session] ${exam.session || 'N/A'} | Held: ${exam.examHeld} | ID: ${exam.examId}`);
  console.log(`🎯 [REGS] Scanning up to ${regNumbers.length} students from PCE Purnea (151)...`);
  console.log(`================================================================\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1500);
  } catch (e) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(2000);
    } catch (err) {
      console.warn('   ⚠️ Failed to load exam page:', err.message);
      return 0;
    }
  }

  let savedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  let currentBranch = null;
  let branchConsecutiveNotFound = 0;

  for (let idx = 0; idx < regNumbers.length; idx++) {
    const regNo = regNumbers[idx];
    const branchCode = regNo.slice(5, 8);

    if (branchCode !== currentBranch) {
      currentBranch = branchCode;
      branchConsecutiveNotFound = 0;
    }

    // Smart cutoff: if 5 consecutive roll numbers in a branch are not found, move to next branch
    if (branchConsecutiveNotFound >= 5) {
      continue;
    }

    const semNumStr = exam.semId.toString();
    const semRoman = toRoman(exam.semId);

    // 1. Fast check if already in MongoDB Atlas
    const existing = await Result.findOne({
      regNo,
      $or: [
        { semester: semNumStr },
        { semester: `${semNumStr}th Semester` },
        { semester: `${semNumStr}st Semester` },
        { semester: `${semNumStr}nd Semester` },
        { semester: `${semNumStr}rd Semester` }
      ]
    });

    if (existing) {
      console.log(`[${idx + 1}/${regNumbers.length}] ⏭️ [DB CACHED] ${regNo} (Sem ${semNumStr}) | ${existing.name || 'Saved'} | SGPA: ${existing.sgpa} | Status: ${existing.status}`);
      skippedCount++;
      branchConsecutiveNotFound = 0;
      continue;
    }

    // 2. Fetch fresh Turnstile token
    const token = await getTurnstileToken(page, url, idx === 0);
    if (!token) {
      console.log(`[${idx + 1}/${regNumbers.length}] ⚠️ [TOKEN RETRY] Captcha timeout for ${regNo}`);
      errorCount++;
      continue;
    }

    // 3. Query BEU Backend API
    const res = await page.evaluate(async (ex, reg, sem, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(ex.batchYear)}&redg_no=${reg}&semester=${sem}&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
      try {
        const r = await fetch(u);
        return { status: r.status, json: await r.json() };
      } catch (e) {
        return { status: 500, error: e.message };
      }
    }, exam, regNo, semRoman, token);

    if (res?.json?.status === 200 && res.json.data) {
      const data = res.json.data;
      const semIdx = exam.semId - 1;
      const studentSgpa = Array.isArray(data.sgpa) ? (data.sgpa[semIdx] || 'N/A') : (data.sgpa || 'N/A');

      const doc = {
        regNo: data.redg_no ? data.redg_no.toString() : regNo,
        name: data.name || 'N/A',
        fatherName: data.father_name || 'N/A',
        motherName: data.mother_name || 'N/A',
        college: data.college_name || 'PURNEA COLLEGE OF ENGINEERING, PURNEA',
        semester: semNumStr,
        course: data.course || 'B.Tech',
        sgpa: studentSgpa,
        allSgpa: Array.isArray(data.sgpa) ? data.sgpa : (data.sgpa ? [data.sgpa] : []),
        cgpa: data.cgpa || 'N/A',
        status: data.fail_any === 'PASS' ? 'PASSED' : (data.fail_any || 'PASSED'),
        examHeld: data.exam_held || exam.examHeld,
        examName: exam.examName,
        theorySubjects: data.theorySubjects || [],
        practicalSubjects: data.practicalSubjects || [],
        subjects: [ ...(data.theorySubjects || []), ...(data.practicalSubjects || []) ].map(s => ({
          code: s.code,
          name: s.name,
          grade: s.grade,
          credit: s.credit,
          point: parseFloat(s.total) || 0,
          ese: s.ese,
          ia: s.ia,
          total: s.total
        })),
        lastUpdated: new Date()
      };

      // Save to MongoDB Atlas
      await Result.findOneAndUpdate(
        { regNo: doc.regNo, semester: semNumStr },
        { $set: doc },
        { upsert: true, returnDocument: 'after' }
      );

      savedCount++;
      branchConsecutiveNotFound = 0;
      console.log(`[${idx + 1}/${regNumbers.length}] ✅ [SAVED BEU] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | SGPA: ${doc.sgpa} | CGPA: ${doc.cgpa} | Status: ${doc.status}`);
    } else {
      notFoundCount++;
      branchConsecutiveNotFound++;
      console.log(`[${idx + 1}/${regNumbers.length}] ℹ️ [NOT FOUND] ${regNo}`);
      if (branchConsecutiveNotFound === 5) {
        console.log(`   ⏩ [BRANCH ${branchCode} COMPLETED] 5 consecutive numbers not found. Advancing to next branch...`);
      }
    }

    await sleep(400);
  }

  console.log(`\n>>> Done Exam [Sem ${exam.semId}] ${exam.examName}:`);
  console.log(`    ✅ Saved: ${savedCount} | ⏭️ Cached: ${skippedCount} | ℹ️ Not Found: ${notFoundCount} | ❌ Errors: ${errorCount}\n`);
  return savedCount;
}

async function run() {
  console.log("==================================================================");
  console.log("🎓 MASTER BEU RESULTS SCRAPER - ALL SEMESTERS & ALL BATCHES");
  console.log("🏫 Institution: PURNEA COLLEGE OF ENGINEERING, PURNEA (Code: 151)");
  console.log("==================================================================");

  if (!process.env.MONGO_URI) {
    console.error("❌ Error: MONGO_URI missing in .env file.");
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas successfully!\n');

  console.log('Fetching live examination registry from BEU portal...');
  const allExams = await fetchAllBTechExams();
  console.log(`Found ${allExams.length} B.Tech examinations in official BEU registry.\n`);

  // Filter strictly to exams for Batches 22, 23, 24, 25
  const prioritizedExams = allExams.filter(e => {
    if (e.examName.includes('Special Examination 2023')) return false;
    const applicableBatches = extractBatchesFromSession(e.session, e.semId);
    return applicableBatches.length > 0;
  }).sort((a, b) => {
    const aSuppl = a.examName.includes('Supplementary') || a.examName.includes('(S)');
    const bSuppl = b.examName.includes('Supplementary') || b.examName.includes('(S)');
    if (aSuppl !== bSuppl) return aSuppl ? 1 : -1;
    return b.semId - a.semId;
  });

  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    let grandTotalSaved = 0;
    const branches = ['131', '105', '101', '102', '103', '104'];

    for (const exam of prioritizedExams) {
      const batches = extractBatchesFromSession(exam.session, exam.semId);
      const regList = [];

      for (const batch of batches) {
        for (const branch of branches) {
          const maxRoll = (branch === '131') ? 35 : 45;
          for (let r = 1; r <= maxRoll; r++) {
            const rollStr = r.toString().padStart(3, '0');
            regList.push(`${batch}151${branch}${rollStr}`);
          }
        }
      }

      console.log(`📌 Starting scan for Exam [Sem ${exam.semId}] "${exam.examName}" (${regList.length} roll targets for batch ${batches.join(',')})...`);
      const count = await scrapeExamStudents(page, exam, regList);
      grandTotalSaved += count;
    }

    console.log(`\n==================================================================`);
    console.log(`🎉 ALL SEMESTERS & BATCHES SCAN COMPLETE!`);
    console.log(`📥 Total New Marksheets Saved to MongoDB: ${grandTotalSaved}`);
    console.log(`==================================================================\n`);

  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log("Browser closed and database disconnected.");
  }
}

run().catch(console.error);
