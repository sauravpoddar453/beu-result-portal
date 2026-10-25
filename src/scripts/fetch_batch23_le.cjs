const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const { execSync } = require('child_process');
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

function updateBrowserArtifact() {
  try {
    console.log('🔄 Syncing Antigravity Browser artifact (beu_result_browser.html)...');
    execSync('node src/scripts/generate_filtered_browser.cjs', { stdio: 'inherit' });
  } catch (err) {
    console.error('⚠️ Error updating browser artifact:', err.message);
  }
}

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

const BRANCHES = [
  { code: '101', name: 'Civil Engineering' },
  { code: '102', name: 'Mechanical Engineering' },
  { code: '103', name: 'Electrical Engineering' },
  { code: '104', name: 'Electronics & Communication Engineering' },
  { code: '105', name: 'Computer Science & Engineering' },
  { code: '151', name: 'CSE (Artificial Intelligence)' }
];

// Lateral entry exams for Batch 23
const BATCH23_LE_EXAMS = [
  {
    semId: 3,
    examName: "B.Tech. 3rd Semester Examination, 2024",
    batchYear: "2024",
    examHeld: "July/2025",
    examId: "240103"
  },
  {
    semId: 4,
    examName: "B.Tech. 4th Semester Examination, 2025",
    batchYear: "2025",
    examHeld: "December/2025",
    examId: "250104"
  },
  {
    semId: 5,
    examName: "B.Tech 5th Semester Examination 2025",
    batchYear: "2025",
    examHeld: "May/2026",
    examId: "250105"
  }
];

async function fetchBatch23LateralEntry() {
  console.log("==================================================================");
  console.log("🎯 BATCH 23 LATERAL ENTRY (LE) SCRAPER - ALL BRANCHES (901–915)");
  console.log("🏫 Institution: PURNEA COLLEGE OF ENGINEERING (College Code: 131)");
  console.log("==================================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas successfully!\n');

  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  let totalSaved = 0;

  try {
    for (const exam of BATCH23_LE_EXAMS) {
      const { semId, examName, batchYear, examHeld, examId } = exam;
      const semNumStr = semId.toString();
      const semRoman = toRoman(semId);

      const d = Buffer.from(JSON.stringify({
        semester: semId,
        session: batchYear,
        exam_held: examHeld,
        exam_id: examId
      })).toString('base64');

      const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(examName)}?d=${encodeURIComponent(d)}`;
      console.log(`\n========================================================================================`);
      console.log(`▶️ Scanning [Batch 23 LE | Sem ${semId}] "${examName}"`);
      console.log(`🌐 URL: ${url}`);
      console.log(`========================================================================================\n`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await sleep(1500);
      } catch (e) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await sleep(1500);
        } catch (err) {
          console.warn('  ⚠️ Load failed for exam:', err.message);
          continue;
        }
      }

      let examSaved = 0;

      for (const branch of BRANCHES) {
        console.log(`\n  📂 [Batch 23 LE | Sem ${semId}] Checking ${branch.name} (${branch.code})...`);

        // Check lateral entry rolls 901 through 915
        for (let lr = 901; lr <= 915; lr++) {
          const regNo = `23${branch.code}131${lr}`;

          // Check DB Cache first
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

          if (existing && existing.subjects && existing.subjects.length > 0) {
            console.log(`     ⏭️ [DB CACHED] ${regNo} | ${existing.name || 'Saved'} | SGPA: ${existing.sgpa}`);
            continue;
          }

          const token = await getTurnstileToken(page, url);
          if (!token) {
            console.log(`     ⚠️ [TOKEN TIMEOUT] for ${regNo}`);
            continue;
          }

          const res = await page.evaluate(async (yr, reg, sem, held, exId, tok) => {
            const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(yr)}&redg_no=${reg}&semester=${sem}&exam_held=${encodeURIComponent(held)}&exam_id=${exId}&token=${tok}`;
            try {
              const resp = await fetch(u);
              return { status: resp.status, json: await resp.json() };
            } catch (e) {
              return { error: e.message };
            }
          }, batchYear, regNo, semRoman, examHeld, examId, token);

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
              course: data.course || branch.name,
              sgpa: studentSgpa,
              allSgpa: Array.isArray(data.sgpa) ? data.sgpa : (data.sgpa ? [data.sgpa] : []),
              cgpa: data.cgpa || 'N/A',
              status: data.fail_any === 'PASS' ? 'PASSED' : (data.fail_any || 'PASSED'),
              examHeld: data.exam_held || examHeld,
              examName: examName,
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

            examSaved++;
            totalSaved++;
            console.log(`     🎉 [SAVED LE] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | ${doc.course} | SGPA: ${doc.sgpa} | ${doc.status}`);
          } else {
            console.log(`     ℹ️ [NOT FOUND] ${regNo}`);
          }
          await sleep(350);
        }
      }

      if (examSaved > 0) {
        updateBrowserArtifact();
      }
    }

    console.log(`\n==================================================================`);
    console.log(`🎉 BATCH 23 LATERAL ENTRY FETCH COMPLETE!`);
    console.log(`📥 Total Newly Saved Lateral Entry Marksheets: ${totalSaved}`);
    console.log(`==================================================================\n`);

  } finally {
    await browser.close();
    await mongoose.disconnect();
    updateBrowserArtifact();
  }
}

fetchBatch23LateralEntry().catch(console.error);
