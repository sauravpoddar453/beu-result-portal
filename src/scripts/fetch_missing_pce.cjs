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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getTurnstileToken(page, url, isFirst = false) {
  let captcha = null;
  let attempts = 0;

  while (!captcha && attempts < 3) {
    attempts++;
    if (!isFirst || attempts > 1) {
      if (attempts > 1) {
        console.log(`   🔄 [RELOAD] Refreshing Turnstile cleanly...`);
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
          await sleep(1500);
        } catch (e) {}
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

async function scrapeMissing() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas\n');

  // Exact missing examinations to achieve 100% complete data:
  const tasks = [
    {
      batch: '22',
      maxRoll: 32,
      semId: 1,
      exam: {
        examName: "B.Tech 1st Semester Examination 2022",
        batchYear: "2022",
        semId: 1,
        examHeld: "May/2023",
        examId: "220101"
      }
    },
    {
      batch: '22',
      maxRoll: 32,
      semId: 2,
      exam: {
        examName: "B.Tech 2nd Semester Examination 2023",
        batchYear: "2023",
        semId: 2,
        examHeld: "September/2023",
        examId: "230102"
      }
    },
    {
      batch: '23',
      maxRoll: 35,
      semId: 1,
      exam: {
        examName: "B.Tech 1st Semester Examination 2023",
        batchYear: "2023",
        semId: 1,
        examHeld: "July/2024",
        examId: "230101"
      }
    },
    {
      batch: '23',
      maxRoll: 35,
      semId: 2,
      exam: {
        examName: "B.Tech 2nd Semester Examination 2024",
        batchYear: "2024",
        semId: 2,
        examHeld: "December/2024",
        examId: "240102"
      }
    },
    {
      batch: '24',
      maxRoll: 35,
      semId: 1,
      exam: {
        examName: "B.Tech. 1st Semester Examination, 2024",
        batchYear: "2024",
        semId: 1,
        examHeld: "May/2025",
        examId: "240101"
      }
    }
  ];

  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--start-maximized', '--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let totalNew = 0;

  for (const t of tasks) {
    const { batch, maxRoll, semId, exam } = t;
    const semRoman = toRoman(semId);

    const d = Buffer.from(JSON.stringify({
      semester: exam.semId,
      session: exam.batchYear,
      exam_held: exam.examHeld,
      exam_id: exam.examId
    })).toString('base64');

    const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;
    console.log(`\n==================================================================`);
    console.log(`🎯 FETCHING MISSING: Batch ${batch} • Semester ${semId} (${exam.examName})`);
    console.log(`🌐 URL: ${url}`);
    console.log(`==================================================================`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      await sleep(1500);
    } catch (e) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(2000);
    }

    let savedThisExam = 0;
    for (let r = 1; r <= maxRoll; r++) {
      const regNo = `${batch}151131${r.toString().padStart(3, '0')}`;
      const semNumStr = semId.toString();

      // Check DB
      const existing = await Result.findOne({
        regNo,
        $or: [
          { semester: semNumStr },
          { semester: `${semNumStr}st Semester` },
          { semester: `${semNumStr}nd Semester` },
          { semester: `${semNumStr}rd Semester` },
          { semester: `${semNumStr}th Semester` }
        ]
      });

      if (existing) {
        console.log(`[${r}/${maxRoll}] ⏭️ [DB CACHED] ${regNo} (Sem ${semNumStr}) | ${existing.name || 'Saved'} | SGPA: ${existing.sgpa}`);
        continue;
      }

      const token = await getTurnstileToken(page, url, r === 1);
      if (!token) {
        console.log(`[${r}/${maxRoll}] ⚠️ Captcha token timeout for ${regNo}`);
        continue;
      }

      const res = await page.evaluate(async (ex, reg, sem, tok) => {
        const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(ex.batchYear)}&redg_no=${reg}&semester=${sem}&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
        try {
          const resp = await fetch(u);
          return { status: resp.status, json: await resp.json() };
        } catch (e) {
          return { error: e.message };
        }
      }, exam, regNo, semRoman, token);

      if (res?.json?.status === 200 && res.json.data) {
        const data = res.json.data;
        const semIdx = semId - 1;
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

        await Result.findOneAndUpdate(
          { regNo: doc.regNo, semester: semNumStr },
          { $set: doc },
          { upsert: true, returnDocument: 'after' }
        );

        savedThisExam++;
        totalNew++;
        console.log(`[${r}/${maxRoll}] ✅ [SAVED] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | SGPA: ${doc.sgpa} | CGPA: ${doc.cgpa} | Status: ${doc.status}`);
      } else {
        console.log(`[${r}/${maxRoll}] ℹ️ [NOT FOUND] ${regNo}`);
      }

      await sleep(400);
    }

    console.log(`Done Batch ${batch} Sem ${semId}: Saved ${savedThisExam} new marksheets.`);
  }

  console.log(`\n==================================================================`);
  console.log(`🎉 ALL MISSING PCE MARKSHEETS FETCHED! Total New Saved: ${totalNew}`);
  console.log(`==================================================================\n`);

  await browser.close();
  await mongoose.disconnect();
}

scrapeMissing().catch(console.error);
