const puppeteer = require('puppeteer');
const https = require('https');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAllSem1Exams() {
  return new Promise((resolve, reject) => {
    https.get('https://beu-bih.ac.in/backend/v1/result/sem-get', { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        const btech = json.find(c => c.courseName.toLowerCase().includes('b.tech'));
        resolve(btech ? btech.exams.filter(e => e.semId === 1) : []);
      });
    }).on('error', reject);
  });
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

(async () => {
  const sem1Exams = await fetchAllSem1Exams();
  console.log(`Checking ${sem1Exams.length} Sem 1 exams for Anand Mohan (24101131001)...`);

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
  const regNo = '24101131001';

  for (const ex of sem1Exams) {
    console.log(`Testing: "${ex.examName}" (ID: ${ex.examId}, held: ${ex.examHeld}, batchYear: ${ex.batchYear})...`);
    const d = Buffer.from(JSON.stringify({
      semester: 1,
      session: ex.batchYear,
      exam_held: ex.examHeld,
      exam_id: ex.examId
    })).toString('base64');

    const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(ex.examName)}?d=${encodeURIComponent(d)}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1500);
    } catch (e) {
      continue;
    }

    const token = await getTurnstileToken(page, url, true);
    if (!token) {
      console.log('  ⚠️ Token failed');
      continue;
    }

    const res = await page.evaluate(async (yr, reg, held, exId, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(yr)}&redg_no=${reg}&semester=I&exam_held=${encodeURIComponent(held)}&exam_id=${exId}&token=${tok}`;
      try {
        const r = await fetch(u);
        return { status: r.status, json: await r.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, ex.batchYear, regNo, ex.examHeld, ex.examId, token);

    if (res?.json?.status === 200 && res.json.data) {
      console.log(`  🎉 FOUND! ${res.json.data.name} | SGPA: ${res.json.data.sgpa} | Course: ${res.json.data.course}`);
      console.log('  EXAM DETAILS MATCH:', JSON.stringify(ex));
      break;
    } else {
      console.log(`  ❌ ${res?.json?.message || 'Not found'}`);
    }
  }

  await browser.close();
})();
