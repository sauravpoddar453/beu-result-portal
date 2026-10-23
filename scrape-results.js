import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

// Ensure MONGO_URI is set
if (!process.env.MONGO_URI) {
  console.error("❌ Error: MONGO_URI missing in .env file.");
  process.exit(1);
}

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
  lastUpdated: { type: Date, default: Date.now },
}, { strict: false });

const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);

/**
 * Fetch official exam metadata directly from BEU
 */
async function fetchExamDetails(targetSem, targetCourseName = 'B.Tech', targetExamName = null, isSuppl = false) {
  return new Promise((resolve, reject) => {
    https.get('https://beu-bih.ac.in/backend/v1/result/sem-get', { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const course = json.find(c => c.courseName.toLowerCase().includes(targetCourseName.toLowerCase())) || json[0];
          
          if (targetExamName) {
            const exactMatch = course.exams.find(e => 
              e.examName.toLowerCase().includes(targetExamName.toLowerCase())
            );
            if (exactMatch) return resolve(exactMatch);
          }

          const semNum = parseInt(targetSem);
          const matchingExams = course.exams.filter(e => e.semId === semNum);
          
          let selected;
          if (isSuppl) {
            selected = matchingExams.find(e => e.examName.toLowerCase().includes('suppl') || e.examName.toLowerCase().includes('(s)'));
          } else {
            selected = matchingExams.find(e => !e.examName.toLowerCase().includes('suppl') && !e.examName.toLowerCase().includes('(s)'));
          }

          if (!selected && matchingExams.length > 0) {
            selected = matchingExams[0];
          }

          if (selected) {
            resolve(selected);
          } else {
            reject(new Error(`No exam found for Course ${targetCourseName}, Semester ${targetSem}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse command line arguments (e.g. node scrape-results.js --prefix=22151131 --start=1 --end=30 --sem=6)
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value;
    }
  });
  return args;
}

async function run() {
  const cliArgs = parseArgs();

  const semester = parseInt(cliArgs.sem || process.env.SCRAPE_SEMESTER || '6');
  const rollPrefix = cliArgs.prefix || process.env.SCRAPE_PREFIX || '22151131';
  const startRoll = parseInt(cliArgs.start || process.env.SCRAPE_START || '1');
  const endRoll = parseInt(cliArgs.end || process.env.SCRAPE_END || '30');
  const courseName = cliArgs.course || process.env.SCRAPE_COURSE || 'B.Tech';
  const examNameArg = cliArgs.exam || process.env.SCRAPE_EXAM || null;
  const isSuppl = Boolean(cliArgs.suppl || process.env.SCRAPE_SUPPL);

  console.log("==========================================================");
  console.log("🚀 BEU Result Portal - Automated Results Scraper");
  console.log("==========================================================");
  console.log(`🔍 Course: ${courseName} | Semester: ${semester} | Suppl: ${isSuppl}`);
  if (examNameArg) console.log(`📋 Target Exam Name: ${examNameArg}`);
  console.log(`🎯 Roll Prefix: ${rollPrefix} | Range: ${startRoll} to ${endRoll}`);
  console.log("==========================================================");

  // 1. Fetch matching exam details from BEU
  let exam;
  try {
    console.log("📡 Fetching official exam details from BEU...");
    exam = await fetchExamDetails(semester, courseName, examNameArg, isSuppl);
    console.log(`✅ Exam Selected: ${exam.examName}`);
    console.log(`   Session: ${exam.batchYear} | Exam Held: ${exam.examHeld} | Exam ID: ${exam.examId || exam.id}`);
  } catch (err) {
    console.error("❌ Failed to fetch exam details:", err.message);
    process.exit(1);
  }

  // 2. Build target URL
  const paramObj = {
    semester: exam.semId,
    session: (exam.batchYear || '2025').toString().trim(),
    exam_held: (exam.examHeld || '').toString().trim(),
    exam_id: (exam.examId || exam.id || '').toString().trim()
  };
  const d = Buffer.from(JSON.stringify(paramObj)).toString('base64');
  const targetUrl = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;

  // 3. Connect to MongoDB
  try {
    console.log("\n📦 Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas successfully.\n");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }

  // 4. Launch browser with anti-detection flags
  console.log("🌐 Launching Browser (Turnstile-Bypass Mode)...");
  const browser = await puppeteer.launch({
    headless: false, // Visible browser ensures Turnstile passes smoothly
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

  // Stealth: Remove navigator.webdriver
  await page.evaluateOnNewDocument(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  let latestData = null;
  let apiReceived = false;

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('beu-bih.ac.in/backend/v1/result/get-result')) {
      apiReceived = true;
      try {
        const json = await res.json();
        if (json && json.status === 200 && json.data) {
          latestData = json.data;
        } else {
          latestData = null;
        }
      } catch (e) {
        latestData = null;
      }
    }
  });

  console.log(`Navigating to: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);

  let savedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (let r = startRoll; r <= endRoll; r++) {
    const regNo = `${rollPrefix}${String(r).padStart(3, '0')}`;
    latestData = null;
    apiReceived = false;

    console.log(`\n----------------------------------------------------------`);
    console.log(`🔄 Processing Roll: ${regNo} (${r - startRoll + 1}/${endRoll - startRoll + 1})`);

    try {
      // Ensure we are on result-two page
      if (!page.url().includes('result-two')) {
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await sleep(2500);
      }

      // 1. Wait for input field
      await page.waitForSelector('#reg', { timeout: 15000 });

      // Clear & Enter Roll Number
      await page.click('#reg', { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type('#reg', regNo, { delay: 40 });
      await page.evaluate((val) => {
        const el = document.querySelector('#reg');
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, regNo);

      // 2. Wait for Cloudflare Turnstile token
      let hasToken = false;
      for (let t = 0; t < 10; t++) {
        const tokenVal = await page.evaluate(() => {
          const inp = document.querySelector('input[name="cf-turnstile-response"]');
          return inp ? inp.value : '';
        });
        if (tokenVal && tokenVal.length > 10) {
          hasToken = true;
          break;
        }
        await sleep(1000);
      }

      if (!hasToken) {
        console.warn(`   ⚠️ Turnstile token delayed for ${regNo}. Attempting submit anyway...`);
      }

      // 3. Click Show Result
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.innerText.includes('Show Result'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (!clicked) {
        console.warn(`   ❌ 'Show Result' button not found.`);
        errorCount++;
        continue;
      }

      // 4. Wait for API response
      let waitIter = 0;
      while (!apiReceived && waitIter < 15) {
        await sleep(500);
        waitIter++;
      }

      if (latestData) {
        const d = latestData;
        const semIdx = semester - 1;
        const studentSgpa = Array.isArray(d.sgpa) ? (d.sgpa[semIdx] || 'N/A') : (d.sgpa || 'N/A');

        const mappedDoc = {
          regNo: d.redg_no ? d.redg_no.toString() : regNo,
          name: d.name || 'N/A',
          fatherName: d.father_name || 'N/A',
          motherName: d.mother_name || 'N/A',
          college: d.college_name || 'N/A',
          semester: `${semester}th Semester`,
          course: d.course || 'B.Tech',
          sgpa: studentSgpa,
          allSgpa: Array.isArray(d.sgpa) ? d.sgpa : (d.sgpa ? [d.sgpa] : []),
          cgpa: d.cgpa || 'N/A',
          status: d.fail_any === 'PASS' ? 'PASSED' : (d.fail_any || 'PASSED'),
          theorySubjects: d.theorySubjects || [],
          practicalSubjects: d.practicalSubjects || [],
          subjects: [ ...(d.theorySubjects || []), ...(d.practicalSubjects || []) ].map(s => ({
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

        await Result.findOneAndUpdate(
          { regNo: mappedDoc.regNo, semester: mappedDoc.semester },
          { $set: mappedDoc },
          { upsert: true, new: true }
        );

        console.log(`   ✅ [SAVED] ${mappedDoc.regNo} | ${mappedDoc.name}`);
        console.log(`      College: ${mappedDoc.college}`);
        console.log(`      SGPA: ${mappedDoc.sgpa} | CGPA: ${mappedDoc.cgpa} | Result: ${mappedDoc.status}`);
        console.log(`      Subjects: ${mappedDoc.theorySubjects.length} Theory + ${mappedDoc.practicalSubjects.length} Practical`);
        savedCount++;
      } else {
        // Check if server returned not found
        console.log(`   ℹ️ [NOT FOUND] ${regNo} - Record not found on university server.`);
        notFoundCount++;
      }

      // Small delay between requests to be gentle on university servers
      await sleep(1500);

    } catch (err) {
      console.error(`   ❌ [ERROR] ${regNo}:`, err.message);
      errorCount++;
    }
  }

  console.log("\n==========================================================");
  console.log("🏁 Scraping Session Complete!");
  console.log(`✅ Successfully Saved to DB: ${savedCount}`);
  console.log(`ℹ️ Not Found on University: ${notFoundCount}`);
  console.log(`❌ Errors / Retries: ${errorCount}`);
  console.log("==========================================================");

  await browser.close();
  await mongoose.disconnect();
  console.log("Browser closed and database disconnected.");
}

run().catch(console.error);
