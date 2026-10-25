const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
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

// Parse command line arguments (--batch=22 --branch=131 --sem=6 --force)
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value === undefined ? true : value;
    }
  });
  return args;
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
          // ignore goto timeout, proceed to check response
        }
      } else {
        await page.evaluate(() => {
          if (window.turnstile) window.turnstile.reset();
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

  // Exchange captcha response for BEU backend token
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

async function scrapeExamStudents(page, exam, regNumbers, force = false) {
  const d = Buffer.from(JSON.stringify({
    semester: exam.semId,
    session: exam.batchYear,
    exam_held: exam.examHeld,
    exam_id: exam.examId
  })).toString('base64');

  const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;
  console.log(`\n======================================================`);
  console.log(`📋 [EXAM] ${exam.examName} (${exam.examHeld})`);
  console.log(`🌐 [URL]  ${url}`);
  console.log(`🎯 [REGS] Scanning ${regNumbers.length} students...`);
  console.log(`======================================================\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1500);
  } catch (e) {
    console.warn('   ⚠️ Initial page navigation timed out, retrying...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2500);
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

    if (branchConsecutiveNotFound >= 5) {
      continue;
    }

    const semNumStr = exam.semId.toString();
    const semRoman = toRoman(exam.semId);

    // 1. Check if already exists in MongoDB Atlas (unless --force is passed)
    if (!force) {
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
        console.log(`[${idx + 1}/${regNumbers.length}] ⏭️ [SKIP - ALREADY IN DB] ${regNo} | ${existing.name || 'Saved'} | SGPA: ${existing.sgpa}`);
        skippedCount++;
        branchConsecutiveNotFound = 0;
        continue;
      }
    }

    // 2. Fetch fresh Turnstile token with automatic reload fallback
    const token = await getTurnstileToken(page, url, idx === 0);
    if (!token) {
      console.log(`[${idx + 1}/${regNumbers.length}] ⚠️ [RETRY FAIL] Captcha token timeout for ${regNo}`);
      errorCount++;
      continue;
    }

    // 3. Query BEU Backend API with token
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
      console.log(`[${idx + 1}/${regNumbers.length}] ✅ [SAVED] ${doc.regNo} | ${doc.name} | SGPA: ${doc.sgpa} | CGPA: ${doc.cgpa} | Status: ${doc.status}`);
    } else {
      notFoundCount++;
      branchConsecutiveNotFound++;
      console.log(`[${idx + 1}/${regNumbers.length}] ℹ️ [NOT FOUND] ${regNo}`);
      if (branchConsecutiveNotFound === 5) {
        console.log(`   ⏩ [BRANCH ${branchCode} COMPLETED] 5 consecutive numbers not found. Advancing to next branch...`);
      }
    }

    // Small delay between requests to be polite to university servers
    await sleep(400);
  }

  console.log(`\n>>> Done Exam ${exam.examName}:`);
  console.log(`    ✅ Saved: ${savedCount} | ⏭️ Skipped: ${skippedCount} | ℹ️ Not Found: ${notFoundCount} | ❌ Errors: ${errorCount}\n`);
  return savedCount;
}

async function run() {
  const cliArgs = parseArgs();
  console.log("==========================================================");
  console.log("🚀 PCE Marks & Results Live Scraper (BEU Portal)");
  console.log("==========================================================");

  if (!process.env.MONGO_URI) {
    console.error("❌ Error: MONGO_URI missing in .env file.");
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas successfully!\n');

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
    // Determine target batches, branches, and exams
    const targetBatches = cliArgs.batch ? cliArgs.batch.toString().split(',') : ['22', '21'];
    const targetBranches = cliArgs.branch ? cliArgs.branch.toString().split(',') : ['131', '105', '101', '102', '103', '104'];
    const force = Boolean(cliArgs.force);

    // Default exams prioritized: Regular 6th sem first, then 6th suppl, then 8th suppl
    const allExams = [
      {
        id: 15,
        examName: "B.Tech. 6th Semester Examination, 2025",
        batchYear: "2025",
        semId: 6,
        examHeld: "November/2025",
        examId: "250106",
        batches: ['22']
      },
      {
        id: 91,
        examName: "B.Tech 6th Semester Supplementary Examination 2026",
        batchYear: "2026",
        semId: 6,
        examHeld: "August/2026",
        examId: "2601096",
        batches: ['22', '21']
      },
      {
        id: 93,
        examName: "B.Tech 8th Semester Supplementary Examination 2026",
        batchYear: "2026",
        semId: 8,
        examHeld: "August/2026",
        examId: "2601098",
        batches: ['22', '21', '20']
      }
    ];

    let exams = allExams;
    if (cliArgs.sem) {
      const targetSem = parseInt(cliArgs.sem);
      exams = allExams.filter(e => e.semId === targetSem);
    }

    let totalSavedAll = 0;

    for (const exam of exams) {
      const regList = [];
      const applicableBatches = exam.batches.filter(b => targetBatches.includes(b));

      for (const batch of (applicableBatches.length > 0 ? applicableBatches : targetBatches)) {
        for (const branch of targetBranches) {
          const maxRoll = (branch === '131') ? 35 : (cliArgs.maxRoll ? parseInt(cliArgs.maxRoll) : 65);
          const startRoll = cliArgs.start ? parseInt(cliArgs.start) : 1;
          const endRoll = cliArgs.end ? parseInt(cliArgs.end) : maxRoll;

          for (let r = startRoll; r <= endRoll; r++) {
            const rollStr = r.toString().padStart(3, '0');
            regList.push(`${batch}151${branch}${rollStr}`);
          }
        }
      }

      console.log(`📌 Starting scan for ${regList.length} students in "${exam.examName}"...`);
      const count = await scrapeExamStudents(page, exam, regList, force);
      totalSavedAll += count;
    }

    console.log(`\n======================================================`);
    console.log(`🎉 SCRAPING COMPLETE!`);
    console.log(`📥 Total New Marksheets Saved to MongoDB: ${totalSavedAll}`);
    console.log(`======================================================\n`);

  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log("Browser closed and database connection closed.");
  }
}

run().catch(console.error);
