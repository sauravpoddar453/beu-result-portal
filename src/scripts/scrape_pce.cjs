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
  examHeld: String,
  examName: String,
  lastUpdated: { type: Date, default: Date.now },
}, { strict: false });

resultSchema.index({ regNo: 1, semester: 1 }, { unique: true });
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);

async function scrapeExamStudents(page, exam, regNumbers) {
  const d = Buffer.from(JSON.stringify({
    semester: exam.semId,
    session: exam.batchYear,
    exam_held: exam.examHeld,
    exam_id: exam.examId
  })).toString('base64');

  const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;
  console.log(`\n======================================================`);
  console.log(`[EXAM] ${exam.examName} (${exam.examHeld})`);
  console.log(`[URL]  ${url}`);
  console.log(`[REGS] Scanning ${regNumbers.length} students...`);
  console.log(`======================================================\n`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

  let savedCount = 0;
  let notFoundCount = 0;

  for (let idx = 0; idx < regNumbers.length; idx++) {
    const regNo = regNumbers[idx];
    const semRoman = toRoman(exam.semId);

    // Get fresh token from Turnstile
    const token = await page.evaluate(async () => {
      if (window.turnstile) window.turnstile.reset();
      for (let i = 0; i < 25; i++) {
        const val = document.querySelector('[name="cf-turnstile-response"]')?.value;
        if (val && val.length > 10) {
          const r = await fetch('https://beu-bih.ac.in/backend/v1/result/token?captcha=' + encodeURIComponent(val));
          const j = await r.json();
          return j.token;
        }
        await new Promise(r => setTimeout(r, 200));
      }
      return null;
    });

    if (!token) {
      console.log(`[${idx + 1}/${regNumbers.length}] [RETRY] Captcha token timeout for ${regNo}`);
      continue;
    }

    // Fetch result
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
      const semNumStr = exam.semId.toString();

      const doc = {
        regNo: data.redg_no?.toString() || regNo,
        name: data.name,
        fatherName: data.father_name,
        motherName: data.mother_name,
        college: data.college_name,
        semester: semNumStr, // e.g. "8" or "6"
        course: data.course,
        sgpa: Array.isArray(data.sgpa) ? (data.sgpa[exam.semId - 1] || 'N/A') : (data.sgpa || 'N/A'),
        allSgpa: Array.isArray(data.sgpa) ? data.sgpa : (data.sgpa ? [data.sgpa] : []),
        cgpa: data.cgpa,
        status: data.fail_any,
        examHeld: data.exam_held || exam.examHeld,
        examName: exam.examName,
        theorySubjects: data.theorySubjects || [],
        practicalSubjects: data.practicalSubjects || [],
        lastUpdated: new Date()
      };

      // Save to MongoDB Atlas
      await Result.findOneAndUpdate(
        { regNo: doc.regNo, semester: semNumStr },
        { $set: doc },
        { upsert: true, new: true }
      );

      savedCount++;
      console.log(`[${idx + 1}/${regNumbers.length}] [SAVED] ${doc.regNo} | ${doc.name} | SGPA: ${doc.sgpa} | CGPA: ${doc.cgpa} | Status: ${doc.status}`);
    } else {
      notFoundCount++;
      // console.log(`[${idx + 1}/${regNumbers.length}] [NOT FOUND] ${regNo}`);
    }

    // Small delay to be polite to BEU server
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n>>> Done Exam ${exam.examName}: Saved ${savedCount} marksheets, ${notFoundCount} not found.\n`);
  return savedCount;
}

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas successfully!');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    // Generate Registration numbers for Purnea College of Engineering (Code 151)
    // 2022 Batch: 22151...
    // Branches at PCE:
    // 131: AI (Computer Science & Engineering AI)
    // 105: CSE
    // 101: CE (Civil)
    // 102: ME (Mechanical)
    // 103: EE (Electrical)
    // 104: ECE (Electronics & Communication)

    const batches = ['22', '21'];
    const branches = ['131', '105', '101', '102', '103', '104'];

    const exams = [
      {
        id: 93,
        examName: "B.Tech 8th Semester Supplementary Examination 2026",
        batchYear: "2026",
        semId: 8,
        examHeld: "August/2026",
        examId: "2601098"
      },
      {
        id: 15,
        examName: "B.Tech. 6th Semester Examination, 2025",
        batchYear: "2025",
        semId: 6,
        examHeld: "November/2025",
        examId: "250106"
      },
      {
        id: 91,
        examName: "B.Tech 6th Semester Supplementary Examination 2026",
        batchYear: "2026",
        semId: 6,
        examHeld: "August/2026",
        examId: "2601096"
      }
    ];

    let totalSavedAll = 0;

    for (const exam of exams) {
      // Build targeted list of registration numbers for this exam
      const regList = [];
      for (const batch of (exam.semId === 8 ? ['22', '21', '20'] : ['22', '21'])) {
        for (const branch of branches) {
          // Typically 30-70 students per branch
          const maxRoll = (branch === '131') ? 35 : 40;
          for (let r = 1; r <= maxRoll; r++) {
            const rollStr = r.toString().padStart(3, '0');
            regList.push(`${batch}151${branch}${rollStr}`);
          }
        }
      }

      console.log(`Starting scan for ${regList.length} registration numbers for ${exam.examName}...`);
      const count = await scrapeExamStudents(page, exam, regList);
      totalSavedAll += count;
    }

    console.log(`\n======================================================`);
    console.log(`ALL DONE! Total marksheets fetched and saved to MongoDB: ${totalSavedAll}`);
    console.log(`======================================================\n`);

  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

run().catch(console.error);
