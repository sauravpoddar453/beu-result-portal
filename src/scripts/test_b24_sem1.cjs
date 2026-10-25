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

async function testB24Sem1() {
  const sem1Exams = await fetchAllSem1Exams();
  console.log(`Found ${sem1Exams.length} Sem 1 exams.`);

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
  const regNo = '24101131001'; // ANAND MOHAN (Batch 24 Civil)

  for (const ex of sem1Exams) {
    console.log(`\nTesting Exam: "${ex.examName}" (ID: ${ex.examId}, held: ${ex.examHeld}, session: ${ex.session})...`);
    
    const d = Buffer.from(JSON.stringify({
      semester: 1,
      session: ex.batchYear,
      exam_held: ex.examHeld,
      exam_id: ex.examId
    })).toString('base64');

    const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(ex.examName)}?d=${encodeURIComponent(d)}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);

    const token = await getFreshToken(page, url);
    if (!token) {
      console.log('  ⚠️ Captcha timeout');
      continue;
    }

    const res = await page.evaluate(async (yr, reg, held, exId, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(yr)}&redg_no=${reg}&semester=I&exam_held=${encodeURIComponent(held)}&exam_id=${exId}&token=${tok}`;
      try {
        const resp = await fetch(u);
        return { status: resp.status, json: await resp.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, ex.batchYear, regNo, ex.examHeld, ex.examId, token);

    if (res?.json?.status === 200 && res.json.data) {
      console.log(`  🎉 FOUND! ${regNo} -> ${res.json.data.name} | SGPA: ${res.json.data.sgpa} | ${res.json.data.course}`);
      break;
    } else {
      console.log(`  ❌ ${res?.json?.message || 'Not found'}`);
    }
  }

  await browser.close();
}

testB24Sem1().catch(console.error);
