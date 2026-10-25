const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
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

// Target plan: Batches 22, 23, 24, 25
const BATCH_EXAMS = [
  // --- BATCH 25 (2025-29) ---
  {
    batch: '25',
    semId: 1,
    examName: "B.Tech 1st Semester Examination 2025",
    batchYear: "2025",
    examHeld: "January/2026",
    examId: "250101N"
  },

  // --- BATCH 24 (2024-28) ---
  {
    batch: '24',
    semId: 1,
    examName: "B.Tech. 1st Semester Examination, 2024",
    batchYear: "2024",
    examHeld: "May/2025",
    examId: "240101"
  },
  {
    batch: '24',
    semId: 2,
    examName: "B.Tech. 2nd Semester Examination, 2025",
    batchYear: "2025",
    examHeld: "November/2025",
    examId: "250102N"
  },
  {
    batch: '24',
    semId: 3,
    examName: "B.Tech 3rd Semester Examination 2025",
    batchYear: "2025",
    examHeld: "April/2026",
    examId: "250103"
  },

  // --- BATCH 23 (2023-27) ---
  {
    batch: '23',
    semId: 1,
    examName: "B.Tech 1st Semester Examination 2023",
    batchYear: "2023",
    examHeld: "July/2024",
    examId: "230101"
  },
  {
    batch: '23',
    semId: 2,
    examName: "B.Tech 2nd Semester Examination 2024",
    batchYear: "2024",
    examHeld: "December/2024",
    examId: "240102"
  },
  {
    batch: '23',
    semId: 3,
    examName: "B.Tech. 3rd Semester Examination, 2024",
    batchYear: "2024",
    examHeld: "July/2025",
    examId: "240103"
  },
  {
    batch: '23',
    semId: 4,
    examName: "B.Tech. 4th Semester Examination, 2025",
    batchYear: "2025",
    examHeld: "December/2025",
    examId: "250104"
  },
  {
    batch: '23',
    semId: 5,
    examName: "B.Tech 5th Semester Examination 2025",
    batchYear: "2025",
    examHeld: "May/2026",
    examId: "250105"
  },

  // --- BATCH 22 (2022-26) ---
  {
    batch: '22',
    semId: 1,
    examName: "B.Tech 1st Semester Examination 2022",
    batchYear: "2022",
    examHeld: "May/2023",
    examId: "220101"
  },
  {
    batch: '22',
    semId: 2,
    examName: "B.Tech 2nd Semester Examination 2023",
    batchYear: "2023",
    examHeld: "September/2023",
    examId: "230102"
  },
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

async function scrapeBatchBranchExam(page, examConfig) {
  const { batch, semId, examName, batchYear, examHeld, examId } = examConfig;
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
  console.log(`🎓 [BATCH ${batch} | SEMESTER ${semId}] ${examName}`);
  console.log(`🏛️ Institution: Purnea College of Engineering (College Code: 131)`);
  console.log(`🌐 Target: ${url}`);
  console.log(`========================================================================================\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1500);
  } catch (e) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(2000);
    } catch (err) {
      console.warn(`   ⚠️ Could not load exam URL for ${examName}:`, err.message);
      return 0;
    }
  }

  let totalSavedThisExam = 0;

  for (const branch of BRANCHES) {
    console.log(`\n--- 📂 Scanning Branch: ${branch.name} (Code: ${branch.code}) for Batch ${batch} Sem ${semId} ---`);
    
    // Regular student rolls: 1 to 65
    let consecutiveNotFound = 0;
    let savedInBranch = 0;

    for (let r = 1; r <= 65; r++) {
      if (consecutiveNotFound >= 5) {
        console.log(`   ⏩ [REGULAR CUTOFF] 5 consecutive rolls not found in ${branch.name}. Moving to lateral entry rolls...`);
        break;
      }

      const rollStr = r.toString().padStart(3, '0');
      const regNo = `${batch}${branch.code}131${rollStr}`;

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
        console.log(`   ⏭️ [DB CACHED] ${regNo} | ${existing.name || 'Saved'} | SGPA: ${existing.sgpa} | ${existing.status}`);
        consecutiveNotFound = 0;
        continue;
      }

      // Fetch fresh captcha token
      const token = await getTurnstileToken(page, url);
      if (!token) {
        console.log(`   ⚠️ [TOKEN RETRY] Captcha timeout for ${regNo}`);
        continue;
      }

      // Query BEU Backend
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

        savedInBranch++;
        totalSavedThisExam++;
        consecutiveNotFound = 0;
        console.log(`   ✅ [SAVED] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | ${doc.course} | SGPA: ${doc.sgpa} | CGPA: ${doc.cgpa} | ${doc.status}`);
      } else {
        consecutiveNotFound++;
        console.log(`   ℹ️ [NOT FOUND] ${regNo} (${consecutiveNotFound}/5)`);
      }

      await sleep(350);
    }

    // Lateral Entry check (only for Semesters >= 3)
    if (semId >= 3) {
      let latConsecutiveNotFound = 0;
      for (let lr = 901; lr <= 915; lr++) {
        if (latConsecutiveNotFound >= 3) break;

        const regNo = `${batch}${branch.code}131${lr}`;

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
          console.log(`   ⏭️ [DB CACHED LE] ${regNo} | ${existing.name || 'Saved'} | SGPA: ${existing.sgpa}`);
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

          savedInBranch++;
          totalSavedThisExam++;
          latConsecutiveNotFound = 0;
          console.log(`   ✅ [SAVED LE] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | ${doc.course} | SGPA: ${doc.sgpa} | ${doc.status}`);
        } else {
          latConsecutiveNotFound++;
        }
        await sleep(350);
      }
    }

    console.log(`   📊 [BRANCH SUMMARY] ${branch.name}: ${savedInBranch} new marksheets saved in this pass.`);
  }

  return totalSavedThisExam;
}

async function startMasterFetch() {
  console.log("==================================================================");
  console.log("🚀 MASTER BEU MULTI-BRANCH SCRAPER - ALL BRANCHES & ALL SEMESTERS");
  console.log("🏫 Institution: PURNEA COLLEGE OF ENGINEERING, PURNEA (Code: 131)");
  console.log("🎯 Allowed Batches: 22, 23, 24, 25 | Degree: B.Tech ONLY");
  console.log("📂 Branches: Civil, Mech, Electrical, ECE, CSE, CSE (AI)");
  console.log("==================================================================");

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI missing in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas successfully!\n');

  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let grandTotalSaved = 0;

  try {
    for (let i = 0; i < BATCH_EXAMS.length; i++) {
      const exam = BATCH_EXAMS[i];
      console.log(`\n▶️ Starting Exam [${i + 1}/${BATCH_EXAMS.length}]: ${exam.examName} (Batch ${exam.batch} Sem ${exam.semId})...`);
      const savedInExam = await scrapeBatchBranchExam(page, exam);
      grandTotalSaved += savedInExam;

      if (savedInExam > 0) {
        updateBrowserArtifact();
      }
    }

    console.log(`\n==================================================================`);
    console.log(`🎉 ALL BRANCHES & ALL SEMESTERS FETCH COMPLETE!`);
    console.log(`📥 Total New Marksheets Saved Across All Branches: ${grandTotalSaved}`);
    console.log(`==================================================================\n`);

  } finally {
    await browser.close();
    await mongoose.disconnect();
    updateBrowserArtifact();
  }
}

startMasterFetch().catch(console.error);
