const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const toRoman = (num) => {
  const map = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
  return map[num] || num.toString();
};

async function getTurnstileToken(page, url) {
  let captcha = null;
  let attempts = 0;

  while (!captcha && attempts < 3) {
    attempts++;
    if (attempts > 1) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(1500);
      } catch (e) {}
    } else {
      try {
        await page.evaluate(() => {
          if (window.turnstile) {
            try { window.turnstile.reset(); } catch (e) {}
          }
        });
      } catch (e) {}
    }

    for (let i = 0; i < 20; i++) {
      try {
        captcha = await page.evaluate(() => {
          const el = document.querySelector('[name="cf-turnstile-response"]');
          return (el && el.value && el.value.length > 10) ? el.value : null;
        });
      } catch (e) {
        captcha = null;
      }
      if (captcha) break;
      await sleep(350);
    }
  }

  if (!captcha) return null;

  try {
    const tokenObj = await page.evaluate(async (cap) => {
      try {
        const res = await fetch('https://beu-bih.ac.in/backend/v1/result/token?captcha=' + encodeURIComponent(cap));
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, captcha);

    return tokenObj?.token || null;
  } catch (e) {
    return null;
  }
}

async function scrape8thSupplementary() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  const Result = mongoose.connection.db.collection('results');

  const exam = {
    examName: "B.Tech 8th Semester Supplementary Examination 2026",
    batchYear: "2026",
    semId: 8,
    examHeld: "August/2026",
    examId: "2601098"
  };

  const semRoman = toRoman(exam.semId);
  const d = Buffer.from(JSON.stringify({
    semester: exam.semId,
    session: exam.batchYear,
    exam_held: exam.examHeld,
    exam_id: exam.examId
  })).toString('base64');

  const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;

  const userDataDir = path.join(__dirname, '..', '..', '.puppeteer_profile_supp');

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=FirstPartySets'
    ]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1500);

  // Let's check students from PCE Purnea (131) and other colleges who had backlogs in 8th sem
  // We can query all 8th sem students who have fail/backlog or status !== 'PASSED' in DB
  const regularWithBacklog = await Result.find({
    semester: { $in: ['8', '8th', '8th Semester', 8] },
    $or: [
      { status: { $regex: /fail/i } },
      { sgpa: { $regex: /\*/ } },
      { cgpa: { $regex: /\*/ } }
    ]
  }).toArray();

  console.log(`Found ${regularWithBacklog.length} students in DB with 8th sem backlogs/asterisks.`);

  // Also test PCE Purnea batch 22 students (101, 102, 103, 104, 105, 151)
  const branches = ['101', '102', '103', '104', '105', '151'];
  const testRegNos = new Set(regularWithBacklog.map(s => s.regNo));

  // Add all PCE batch 22 students from DB
  const pce8th = await Result.find({
    regNo: { $regex: /^22\d{3}131/ },
    semester: { $in: ['8', '8th', '8th Semester', 8] }
  }).toArray();
  pce8th.forEach(s => testRegNos.add(s.regNo));

  console.log(`Testing ${testRegNos.size} students for 8th Sem Supplementary...`);

  let savedCount = 0;
  let idx = 0;

  for (const regNo of testRegNos) {
    idx++;
    const token = await getTurnstileToken(page, url);
    if (!token) {
      console.log(`[${idx}/${testRegNos.size}] ⚠️ No token for ${regNo}`);
      continue;
    }

    let res = null;
    try {
      res = await page.evaluate(async (yr, reg, sem, held, exId, tok) => {
        const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(yr)}&redg_no=${reg}&semester=${sem}&exam_held=${encodeURIComponent(held)}&exam_id=${exId}&token=${tok}`;
        try {
          const resp = await fetch(u);
          return { status: resp.status, json: await resp.json() };
        } catch (e) {
          return { error: e.message };
        }
      }, exam.batchYear, regNo, semRoman, exam.examHeld, exam.examId, token);
    } catch (e) {
      continue;
    }

    if (res?.json?.status === 200 && res.json.data) {
      const data = res.json.data;
      const doc = {
        regNo: data.redg_no ? data.redg_no.toString() : regNo,
        name: data.name || 'N/A',
        fatherName: data.father_name || 'N/A',
        motherName: data.mother_name || 'N/A',
        college: data.college_name || 'BEU College',
        semester: '8',
        course: data.course || 'B.Tech',
        sgpa: data.sgpa || 'N/A',
        allSgpa: Array.isArray(data.sgpa) ? data.sgpa : (data.sgpa ? [data.sgpa] : []),
        cgpa: data.cgpa || 'N/A',
        status: data.fail_any === 'PASS' ? 'PASSED' : (data.fail_any || 'PASSED'),
        examHeld: data.exam_held || exam.examHeld,
        examName: exam.examName,
        examId: exam.examId,
        isSupplementary: true,
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
        { regNo: doc.regNo, semester: '8', isSupplementary: true },
        { $set: doc },
        { upsert: true }
      );
      savedCount++;
      console.log(`🎉 [FOUND & SAVED SUPPL] ${doc.regNo} | ${doc.name} | SGPA: ${doc.sgpa} | Status: ${doc.status}`);
    } else {
      // Student did not appear in supplementary (not found)
      console.log(`[${idx}/${testRegNos.size}] ℹ️ ${regNo}: Not in Supplementary (likely passed regular)`);
    }

    await sleep(200);
  }

  console.log(`\n✅ Completed! Saved ${savedCount} supplementary results.`);
  await browser.close();
  await mongoose.disconnect();
}

scrape8thSupplementary().catch(console.error);
