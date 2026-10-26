const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const toRoman = (num) => {
  const map = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
  return map[num] || num.toString();
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getFreshToken(page, url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1500);
    } else {
      await page.evaluate(() => {
        if (window.turnstile) {
          try { window.turnstile.reset(); } catch (e) {}
        }
      });
    }

    for (let i = 0; i < 20; i++) {
      const captcha = await page.evaluate(() => {
        const el = document.querySelector('[name="cf-turnstile-response"]');
        return (el && el.value && el.value.length > 10) ? el.value : null;
      });
      if (captcha) {
        const tokenObj = await page.evaluate(async (cap) => {
          try {
            const res = await fetch('https://beu-bih.ac.in/backend/v1/result/token?captcha=' + encodeURIComponent(cap));
            return await res.json();
          } catch (e) {
            return { error: e.message };
          }
        }, captcha);
        if (tokenObj?.token) return tokenObj.token;
      }
      await sleep(350);
    }
  }
  return null;
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
  examHeld: String,
  examName: String,
  lastUpdated: { type: Date, default: Date.now },
}, { strict: false });

resultSchema.index({ regNo: 1, semester: 1 }, { unique: true });
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);

async function probeAndFetchLE(targetReg = '23105131901') {
  console.log(`\n==================================================================`);
  console.log(`🎯 FETCHING LATERAL ENTRY (LE) STUDENT RESULT: ${targetReg}`);
  console.log(`==================================================================\n`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  // Candidate exams where Batch 23 LE could exist (Sem 3, 4, 5)
  const candidateExams = [
    { semId: 3, examName: "B.Tech. 3rd Semester Examination, 2024", batchYear: "2024", examHeld: "July/2025", examId: "240103" },
    { semId: 3, examName: "B.Tech 3rd Semester Examination 2023", batchYear: "2023", examHeld: "August/2024", examId: "230103" },
    { semId: 4, examName: "B.Tech. 4th Semester Examination, 2025", batchYear: "2025", examHeld: "December/2025", examId: "250104" },
    { semId: 4, examName: "B.Tech 4th Semester Examination 2024", batchYear: "2024", examHeld: "February/2025", examId: "240104" },
    { semId: 5, examName: "B.Tech 5th Semester Examination 2025", batchYear: "2025", examHeld: "May/2026", examId: "250105" },
    { semId: 5, examName: "B.Tech. 5th Semester Examination, 2024", batchYear: "2024", examHeld: "July/2025", examId: "240105" },
    { semId: 6, examName: "B.Tech. 6th Semester Examination, 2025", batchYear: "2025", examHeld: "November/2025", examId: "250106" },
    { semId: 7, examName: "B.Tech. 7th Semester Examination, 2025", batchYear: "2025", examHeld: "February/2026", examId: "250107" }
  ];

  const profileDir = path.join(__dirname, '..', '..', '.puppeteer_profile');
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: profileDir,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  let foundRecords = [];

  for (const ex of candidateExams) {
    const semRoman = toRoman(ex.semId);
    const d = Buffer.from(JSON.stringify({
      semester: ex.semId,
      session: ex.batchYear,
      exam_held: ex.examHeld,
      exam_id: ex.examId
    })).toString('base64');

    const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(ex.examName)}?d=${encodeURIComponent(d)}`;
    console.log(`\n🔍 Checking [Sem ${ex.semId}] "${ex.examName}"...`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
      await sleep(1000);

      const token = await getFreshToken(page, url);
      if (!token) {
        console.log(`  ⚠️ Could not acquire Cloudflare Turnstile token for this exam.`);
        continue;
      }

      const res = await page.evaluate(async (yr, r, sem, held, exId, tok) => {
        const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(yr)}&redg_no=${r}&semester=${sem}&exam_held=${encodeURIComponent(held)}&exam_id=${exId}&token=${tok}`;
        try {
          const resp = await fetch(u);
          return { status: resp.status, json: await resp.json() };
        } catch (e) {
          return { error: e.message };
        }
      }, ex.batchYear, targetReg, semRoman, ex.examHeld, ex.examId, token);

      if (res?.json?.status === 200 && res.json.data) {
        const data = res.json.data;
        console.log(`\n  🎉 SUCCESS! Found Result for ${targetReg}!`);
        console.log(`  👤 Name: ${data.name}`);
        console.log(`  🏫 College: ${data.college_name}`);
        console.log(`  📚 Course: ${data.course}`);
        console.log(`  📊 SGPA: ${JSON.stringify(data.sgpa)}`);
        console.log(`  📈 CGPA: ${JSON.stringify(data.cgpa)}`);
        console.log(`  📝 Status: ${data.status || 'PASS'}`);

        // Save to MongoDB
        const semNumStr = ex.semId.toString();
        const semIdx = ex.semId - 1;
        const studentSgpa = Array.isArray(data.sgpa) ? (data.sgpa[semIdx] || 'N/A') : (data.sgpa || 'N/A');

        const doc = {
          regNo: targetReg,
          name: data.name || 'N/A',
          fatherName: data.father_name || 'N/A',
          motherName: data.mother_name || 'N/A',
          college: data.college_name || 'PURNEA COLLEGE OF ENGINEERING, PURNEA',
          semester: semNumStr,
          course: data.course || 'Computer Science and Engineering',
          sgpa: studentSgpa,
          cgpa: data.cgpa || 'N/A',
          allSgpa: Array.isArray(data.sgpa) ? data.sgpa : [],
          status: data.status || 'PASS',
          theorySubjects: data.theory_subject || [],
          practicalSubjects: data.practical_subject || [],
          subjects: [...(data.theory_subject || []), ...(data.practical_subject || [])],
          examHeld: ex.examHeld,
          examName: ex.examName,
          lastUpdated: new Date()
        };

        await Result.findOneAndUpdate(
          { regNo: targetReg, semester: semNumStr },
          doc,
          { upsert: true, new: true }
        );
        console.log(`  💾 Saved into MongoDB collection for Semester ${semNumStr}!`);
        foundRecords.push({ exam: ex.examName, sem: ex.semId, name: data.name, sgpa: studentSgpa });
      } else {
        console.log(`  ❌ Not found in this exam (${res?.json?.message || res?.status || 'No match'})`);
      }
    } catch (err) {
      console.log(`  ⚠️ Error querying exam:`, err.message);
    }
  }

  await browser.close();
  await mongoose.disconnect();

  console.log(`\n==================================================================`);
  console.log(`🏁 FINISHED! Total matching records saved: ${foundRecords.length}`);
  console.log(`==================================================================\n`);
  return foundRecords;
}

const target = process.argv[2] || '23105131901';
probeAndFetchLE(target).catch(console.error);
