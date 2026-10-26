const puppeteer = require('puppeteer');
const https = require('https');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const toRoman = (num) => {
  const map = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
  return map[num] || num.toString();
};

async function fetchAllExams() {
  return new Promise((resolve, reject) => {
    https.get('https://beu-bih.ac.in/backend/v1/result/sem-get', { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        const btech = json.find(c => c.courseName.toLowerCase().includes('b.tech'));
        resolve(btech ? btech.exams : []);
      });
    }).on('error', reject);
  });
}

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

async function probeStudent() {
  const regNo = '231051310901';
  console.log(`🔍 Probing BEU for Registration Number: "${regNo}" across ALL available exams...`);

  const allExams = await fetchAllExams();
  console.log(`Loaded ${allExams.length} B.Tech exams from registry.`);

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  // Test exams relevant to batch 23 or lateral entry (Sem 3, 4, 5, 1, 2)
  // Let's filter to exams published from 2023 to 2026
  const targetExams = allExams.filter(e => {
    return e.session && (e.session.includes('2023') || e.session.includes('2024') || e.session.includes('2022') || e.session.includes('YBL') || e.session.includes('Arrear'));
  });

  console.log(`Testing ${targetExams.length} candidate exams...`);

  for (let i = 0; i < targetExams.length; i++) {
    const exam = targetExams[i];
    const semRoman = toRoman(exam.semId);

    const d = Buffer.from(JSON.stringify({
      semester: exam.semId,
      session: exam.batchYear,
      exam_held: exam.examHeld,
      exam_id: exam.examId
    })).toString('base64');

    const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1000);
    } catch (e) {
      continue;
    }

    const token = await getFreshToken(page, url);
    if (!token) continue;

    const res = await page.evaluate(async (yr, reg, sem, held, exId, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(yr)}&redg_no=${reg}&semester=${sem}&exam_held=${encodeURIComponent(held)}&exam_id=${exId}&token=${tok}`;
      try {
        const resp = await fetch(u);
        return { status: resp.status, json: await resp.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, exam.batchYear, regNo, semRoman, exam.examHeld, exam.examId, token);

    if (res?.json?.status === 200 && res.json.data) {
      console.log(`\n🎉🎉🎉 FOUND! [${regNo}] in Exam: "${exam.examName}" (Sem ${exam.semId})`);
      console.log(`   Student Name: ${res.json.data.name}`);
      console.log(`   Course: ${res.json.data.course}`);
      console.log(`   College: ${res.json.data.college_name}`);
      console.log(`   SGPA: ${res.json.data.sgpa}`);
      console.log(`   Status: ${res.json.data.fail_any}\n`);
      break;
    } else {
      console.log(`[${i + 1}/${targetExams.length}] ❌ "${exam.examName}" (Sem ${exam.semId}): ${res?.json?.message || 'Not found'}`);
    }
  }

  await browser.close();
}

probeStudent().catch(console.error);
