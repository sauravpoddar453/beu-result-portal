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

const REMAINING_B22_EXAMS = [
  {
    batch: '22',
    semId: 3,
    examName: "B.Tech 3rd Semester Examination 2023",
    batchYear: "2023",
    examHeld: "August/2024",
    examId: "230103"
  },
  {
    batch: '22',
    semId: 4,
    examName: "B.Tech 4th Semester Examination 2024",
    batchYear: "2024",
    examHeld: "February/2025",
    examId: "240104"
  },
  {
    batch: '22',
    semId: 5,
    examName: "B.Tech. 5th Semester Examination, 2024",
    batchYear: "2024",
    examHeld: "July/2025",
    examId: "240105"
  },
  {
    batch: '22',
    semId: 6,
    examName: "B.Tech. 6th Semester Examination, 2025",
    batchYear: "2025",
    examHeld: "November/2025",
    examId: "250106"
  },
  {
    batch: '22',
    semId: 7,
    examName: "B.Tech. 7th Semester Examination, 2025",
    batchYear: "2025",
    examHeld: "February/2026",
    examId: "250107"
  },
  {
    batch: '22',
    semId: 8,
    examName: "B.Tech 8th Semester Examination 2026",
    batchYear: "2026",
    examHeld: "May/2026",
    examId: "260108"
  }
];

async function scrapeBatch22Remaining() {
  console.log("==================================================================");
  console.log("🎓 BATCH 22 FINISHING ENGINE - SEMESTERS 3 TO 8 ALL BRANCHES");
  console.log("🏫 Institution: PURNEA COLLEGE OF ENGINEERING (College Code: 131)");
  console.log("==================================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas\n');

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
  let grandTotalSaved = 0;

  try {
    for (const exam of REMAINING_B22_EXAMS) {
      const { batch, semId, examName, batchYear, examHeld, examId } = exam;
      const semNumStr = semId.toString();
      const semRoman = toRoman(semId);

      const d = Buffer.from(JSON.stringify({
        semester: semId,
        session: batchYear,
        exam_held: examHeld,
        exam_id: examId
      })).toString('base64');

      const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(examName)}?d=${encodeURIComponent(d)}`;
      console.log(`\n▶️ [EXAM Sem ${semId}] ${examName} (${url})`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await sleep(1500);
      } catch (e) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await sleep(1500);
        } catch (err) {
          console.warn('  ⚠️ Load failed, skipping exam:', err.message);
          continue;
        }
      }

      let examSaved = 0;

      for (const branch of BRANCHES) {
        console.log(`\n  📂 [Batch 22 | Sem ${semId}] Checking ${branch.name} (${branch.code})...`);
        let consecutiveNotFound = 0;

        // Regular rolls 1 to 65
        for (let r = 1; r <= 65; r++) {
          if (consecutiveNotFound >= 5) break;

          const rollStr = r.toString().padStart(3, '0');
          const regNo = `22${branch.code}131${rollStr}`;

          // Check DB cache
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
            console.log(`     ⏭️ [CACHED] ${regNo} | ${existing.name || 'Saved'} | SGPA: ${existing.sgpa}`);
            consecutiveNotFound = 0;
            continue;
          }

          const token = await getTurnstileToken(page, url);
          if (!token) continue;

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
            grandTotalSaved++;
            consecutiveNotFound = 0;
            console.log(`     ✅ [SAVED] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | ${doc.course} | SGPA: ${doc.sgpa} | ${doc.status}`);
          } else {
            consecutiveNotFound++;
            console.log(`     ℹ️ [NOT FOUND] ${regNo} (${consecutiveNotFound}/5)`);
          }
          await sleep(350);
        }

        // Lateral entry rolls 901 to 915
        let latConsecutiveNotFound = 0;
        for (let lr = 901; lr <= 915; lr++) {
          if (latConsecutiveNotFound >= 3) break;

          const regNo = `22${branch.code}131${lr}`;

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
            console.log(`     ⏭️ [CACHED LE] ${regNo} | ${existing.name || 'Saved'} | SGPA: ${existing.sgpa}`);
            latConsecutiveNotFound = 0;
            continue;
          }

          const token = await getTurnstileToken(page, url);
          if (!token) continue;

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
            grandTotalSaved++;
            latConsecutiveNotFound = 0;
            console.log(`     ✅ [SAVED LE] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | ${doc.course} | SGPA: ${doc.sgpa} | ${doc.status}`);
          } else {
            latConsecutiveNotFound++;
          }
          await sleep(350);
        }
      }

      if (examSaved > 0) {
        updateBrowserArtifact();
      }
    }
  } finally {
    await browser.close();
    await mongoose.disconnect();
    updateBrowserArtifact();
    console.log(`\n🎉 FINISHED! Total newly saved marksheets in Batch 22: ${grandTotalSaved}`);
  }
}

scrapeBatch22Remaining().catch(console.error);
