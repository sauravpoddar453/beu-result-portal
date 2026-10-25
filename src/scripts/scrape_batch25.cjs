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
        console.log(`   🔄 [RELOAD] Reloading page...`);
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

async function scrapeBatch25() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const exam = {
    id: 34,
    examName: "B.Tech 1st Semester Examination 2025",
    batchYear: "2025",
    semId: 1,
    examHeld: "January/2026",
    examId: "250101N"
  };

  const d = Buffer.from(JSON.stringify({
    semester: exam.semId,
    session: exam.batchYear,
    exam_held: exam.examHeld,
    exam_id: exam.examId
  })).toString('base64');

  const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;
  console.log('Target URL:', url);

  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--start-maximized', '--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1500);

  let saved = 0;
  for (let r = 1; r <= 35; r++) {
    const regNo = `25151131${r.toString().padStart(3, '0')}`;
    
    // Check DB
    const existing = await Result.findOne({ regNo, semester: '1' });
    if (existing) {
      console.log(`[${r}/35] ⏭️ Already in DB: ${regNo} (${existing.name})`);
      continue;
    }

    const token = await getTurnstileToken(page, url, r === 1);
    if (!token) {
      console.log(`[${r}/35] ⚠️ Captcha failed for ${regNo}`);
      continue;
    }

    const res = await page.evaluate(async (ex, reg, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(ex.batchYear)}&redg_no=${reg}&semester=I&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
      try {
        const resp = await fetch(u);
        return { status: resp.status, json: await resp.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, exam, regNo, token);

    if (res?.json?.status === 200 && res.json.data) {
      const data = res.json.data;
      const doc = {
        regNo: data.redg_no ? data.redg_no.toString() : regNo,
        name: data.name || 'N/A',
        fatherName: data.father_name || 'N/A',
        motherName: data.mother_name || 'N/A',
        college: data.college_name || 'PURNEA COLLEGE OF ENGINEERING, PURNEA',
        semester: '1',
        course: data.course || 'B.Tech',
        sgpa: Array.isArray(data.sgpa) ? (data.sgpa[0] || 'N/A') : (data.sgpa || 'N/A'),
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
        { regNo: doc.regNo, semester: '1' },
        { $set: doc },
        { upsert: true, returnDocument: 'after' }
      );
      saved++;
      console.log(`[${r}/35] ✅ [SAVED BEU BATCH 25] ${doc.regNo} (Sem 1) | ${doc.name} | SGPA: ${doc.sgpa} | Status: ${doc.status}`);
    } else {
      console.log(`[${r}/35] ℹ️ [NOT FOUND] ${regNo}`);
    }

    await sleep(400);
  }

  console.log(`Finished Batch 25 Sem 1: Saved ${saved} new marksheets.`);
  await browser.close();
  await mongoose.disconnect();
}

scrapeBatch25().catch(console.error);
