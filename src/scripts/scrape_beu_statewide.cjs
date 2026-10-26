const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
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

function updateBrowserArtifact() {
  try {
    console.log('🔄 Syncing Statewide Browser artifact (beu_result_browser.html)...');
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
        try {
          await page.evaluate(() => {
            if (window.turnstile) {
              try { window.turnstile.reset(); } catch (e) {}
            }
          });
        } catch (e) {}
      }
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

// Complete directory of all Bihar Engineering University (BEU) affiliated colleges
const COLLEGES = [
  // Top Established Government Engineering Colleges
  { code: '107', name: 'Muzaffarpur Institute of Technology (MIT)' },
  { code: '108', name: 'Bhagalpur College of Engineering (BCE)' },
  { code: '109', name: 'Nalanda College of Engineering, Chandi' },
  { code: '110', name: 'Gaya College of Engineering (GCE)' },
  { code: '111', name: 'Darbhanga College of Engineering (DCE)' },
  { code: '113', name: 'Motihari College of Engineering (MCE)' },
  { code: '117', name: 'LNJPIT Chhapra' },
  { code: '124', name: 'Shershah College of Engineering, Sasaram' },
  { code: '125', name: 'RRSDCE Begusarai' },
  { code: '126', name: 'Bakhtiyarpur College of Engineering, Patna' },
  { code: '127', name: 'Sitamarhi Institute of Technology (SIT)' },
  { code: '128', name: 'BP Mandal College of Engineering, Madhepura' },
  { code: '129', name: 'Katihar Engineering College' },
  { code: '130', name: 'Supaul College of Engineering' },
  { code: '131', name: 'Purnea College of Engineering (PCE)' },
  { code: '132', name: 'Saharsa College of Engineering' },
  { code: '133', name: 'Government Engineering College, Jamui' },
  { code: '134', name: 'Government Engineering College, Banka' },
  { code: '135', name: 'Government Engineering College, Vaishali' },
  { code: '141', name: 'Government Engineering College, Nawada' },
  { code: '142', name: 'Government Engineering College, Kishanganj' },
  { code: '144', name: 'Government Engineering College, Munger' },
  { code: '145', name: 'Government Engineering College, Sheohar' },
  { code: '146', name: 'Government Engineering College, West Champaran' },
  { code: '147', name: 'Government Engineering College, Aurangabad' },
  { code: '148', name: 'Government Engineering College, Kaimur' },
  { code: '149', name: 'Government Engineering College, Gopalganj' },
  { code: '150', name: 'Government Engineering College, Madhubani' },
  { code: '151', name: 'Government Engineering College, Siwan' },
  { code: '152', name: 'Government Engineering College, Jehanabad' },
  { code: '153', name: 'Government Engineering College, Arwal' },
  { code: '154', name: 'Government Engineering College, Khagaria' },
  { code: '155', name: 'Government Engineering College, Buxar' },
  { code: '156', name: 'Government Engineering College, Bhojpur' },
  { code: '157', name: 'Government Engineering College, Sheikhpura' },
  { code: '158', name: 'Government Engineering College, Lakhisarai' },
  { code: '159', name: 'Government Engineering College, Samastipur' },
  { code: '165', name: 'Shri Phanishwar Nath Renu Engineering College, Araria' },

  // Prominent Private & Affiliated Engineering Colleges
  { code: '103', name: 'Netaji Subhas Institute of Technology (NSIT), Bihta' },
  { code: '118', name: 'Buddha Institute of Technology, Gaya' },
  { code: '119', name: 'Adwaita Mission Institute of Technology, Banka' },
  { code: '121', name: 'Moti Babu Institute of Technology, Araria' },
  { code: '122', name: 'Exalt College of Engineering, Vaishali' },
  { code: '123', name: 'Siwan Engineering & Technical Institute, Siwan' },
  { code: '136', name: "Mother's Institute of Technology, Bihta" },
  { code: '139', name: 'R.P. Sharma Institute of Technology, Patna' },
  { code: '140', name: 'MACET Patna' },
  { code: '166', name: 'Millia Kishanganj College of Engineering' },
  { code: '174', name: 'Rungta Institute of Technology, Araria' },
  { code: '175', name: 'J.P. College of Engineering, Nalanda' }
];

// All BEU engineering branch codes
const BRANCHES = [
  { code: '101', name: 'Civil Engineering' },
  { code: '102', name: 'Mechanical Engineering' },
  { code: '103', name: 'Electrical Engineering' },
  { code: '104', name: 'Electronics & Communication Engineering' },
  { code: '105', name: 'Computer Science & Engineering' },
  { code: '106', name: 'Information Technology' },
  { code: '110', name: 'Electrical & Electronics Engineering' },
  { code: '151', name: 'CSE (Artificial Intelligence)' },
  { code: '152', name: 'CSE (Cyber Security)' },
  { code: '153', name: 'CSE (Data Science)' },
  { code: '157', name: 'CSE (AI & Machine Learning)' },
  { code: '161', name: 'Mechatronics Engineering' }
];

// Statewide Examination Catalog across Batches 22, 23, 24, 25
const STATEWIDE_EXAMS = [
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

  // --- BATCH 24 (2024-28) ---
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

  // --- BATCH 25 (2025-29) ---
  {
    batch: '25',
    semId: 1,
    examName: "B.Tech 1st Semester Examination 2025",
    batchYear: "2025",
    examHeld: "January/2026",
    examId: "250101N"
  }
];

const STATE_FILE = path.join(__dirname, 'statewide_progress.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { lastExamIndex: 0, lastCollegeIndex: 0, totalSavedSession: 0 };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {}
}

async function scrapeStatewideBEU() {
  console.log("==================================================================");
  console.log("🌍 BIHAR ENGINEERING UNIVERSITY (BEU) - STATEWIDE DATA CRAWLER");
  console.log("🏛️ Coverage: ALL Colleges (38+ Government & Affiliated) | ALL Branches");
  console.log("🎓 Batches: 2022-26, 2023-27, 2024-28, 2025-29 | All Published Sems");
  console.log("==================================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas successfully!\n');

  const profileDir = path.join(__dirname, '..', '..', '.puppeteer_profile');
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: profileDir,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=FirstPartySets'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let state = loadState();
  let sessionSaved = 0;
  let newSinceLastSync = 0;

  try {
    for (let eIdx = 0; eIdx < STATEWIDE_EXAMS.length; eIdx++) {
      const exam = STATEWIDE_EXAMS[eIdx];
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

      console.log(`\n========================================================================================`);
      console.log(`📋 [EXAM ${eIdx + 1}/${STATEWIDE_EXAMS.length}] "${examName}" (Batch ${batch} | Sem ${semId})`);
      console.log(`🌐 URL: ${url}`);
      console.log(`========================================================================================\n`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await sleep(1500);
      } catch (e) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await sleep(2000);
        } catch (err) {
          console.warn('  ⚠️ Load failed, skipping exam:', err.message);
          continue;
        }
      }

      for (let cIdx = 0; cIdx < COLLEGES.length; cIdx++) {
        const college = COLLEGES[cIdx];
        console.log(`\n🏛️ [Exam ${semId} | Col ${cIdx + 1}/${COLLEGES.length}] ${college.name} (Code: ${college.code})...`);

        let collegeSavedCount = 0;

        for (const branch of BRANCHES) {
          let consecutiveNotFound = 0;
          let branchHasStudents = false;

          // Regular student rolls 1 to 65
          for (let r = 1; r <= 65; r++) {
            // Smart branch skip: if first 3 rolls are not found, college doesn't offer this branch
            if (!branchHasStudents && r > 3 && consecutiveNotFound >= 3) {
              break;
            }

            // In active branch: cutoff if 5 consecutive rolls missing
            if (branchHasStudents && consecutiveNotFound >= 5) {
              break;
            }

            const rollStr = r.toString().padStart(3, '0');
            const regNo = `${batch}${branch.code}${college.code}${rollStr}`;

            // Check MongoDB Cache first
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
              branchHasStudents = true;
              consecutiveNotFound = 0;
              continue;
            }

            const token = await getTurnstileToken(page, url);
            if (!token) {
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
              }, batchYear, regNo, semRoman, examHeld, examId, token);
            } catch (evalErr) {
              console.warn('⚠️ Query evaluation note:', evalErr.message);
              continue;
            }

            if (res?.json?.status === 200 && res.json.data) {
              const data = res.json.data;
              branchHasStudents = true;
              consecutiveNotFound = 0;

              const semIdx = semId - 1;
              const studentSgpa = Array.isArray(data.sgpa) ? (data.sgpa[semIdx] || 'N/A') : (data.sgpa || 'N/A');

              const doc = {
                regNo: data.redg_no ? data.redg_no.toString() : regNo,
                name: data.name || 'N/A',
                fatherName: data.father_name || 'N/A',
                motherName: data.mother_name || 'N/A',
                college: data.college_name || college.name,
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

              sessionSaved++;
              collegeSavedCount++;
              newSinceLastSync++;

              console.log(`     ✅ [SAVED] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | ${college.name.split(',')[0]} | ${doc.course} | SGPA: ${doc.sgpa}`);

              if (newSinceLastSync >= 50) {
                updateBrowserArtifact();
                newSinceLastSync = 0;
              }
            } else {
              consecutiveNotFound++;
            }
            await sleep(250);
          }

          // Lateral entry check for Semesters >= 3
          if (semId >= 3 && branchHasStudents) {
            let latConsecutiveNotFound = 0;
            for (let lr = 901; lr <= 915; lr++) {
              if (latConsecutiveNotFound >= 3) break;

              const regNo = `${batch}${branch.code}${college.code}${lr}`;

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
                latConsecutiveNotFound = 0;
                continue;
              }

              const token = await getTurnstileToken(page, url);
              if (!token) continue;

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
                }, batchYear, regNo, semRoman, examHeld, examId, token);
              } catch (evalErr) {
                console.warn('⚠️ LE evaluation note:', evalErr.message);
                continue;
              }

              if (res?.json?.status === 200 && res.json.data) {
                const data = res.json.data;
                latConsecutiveNotFound = 0;

                const semIdx = semId - 1;
                const studentSgpa = Array.isArray(data.sgpa) ? (data.sgpa[semIdx] || 'N/A') : (data.sgpa || 'N/A');

                const doc = {
                  regNo: data.redg_no ? data.redg_no.toString() : regNo,
                  name: data.name || 'N/A',
                  fatherName: data.father_name || 'N/A',
                  motherName: data.mother_name || 'N/A',
                  college: data.college_name || college.name,
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

                sessionSaved++;
                collegeSavedCount++;
                newSinceLastSync++;
                console.log(`     🎉 [SAVED LE] ${doc.regNo} (Sem ${semNumStr}) | ${doc.name} | ${college.name.split(',')[0]} | ${doc.course} | SGPA: ${doc.sgpa}`);
              } else {
                latConsecutiveNotFound++;
              }
              await sleep(250);
            }
          }
        }

        saveState({ lastExamIndex: eIdx, lastCollegeIndex: cIdx, totalSavedSession: sessionSaved });
      }

      updateBrowserArtifact();
    }

    console.log(`\n==================================================================`);
    console.log(`🎉 STATEWIDE BEU CRAWL COMPLETE!`);
    console.log(`📥 Total New Marksheets Saved to MongoDB: ${sessionSaved}`);
    console.log(`==================================================================\n`);

  } finally {
    try { await browser.close(); } catch (e) { console.warn('Browser close note:', e.message); }
    try { await mongoose.disconnect(); } catch (e) {}
    updateBrowserArtifact();
  }
}

scrapeStatewideBEU().catch(console.error);
