const puppeteer = require('puppeteer');

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

async function test12DigitLE() {
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

  // Test on B.Tech 3rd Semester Examination 2024 (Batch 23 Sem 3, July/2025, examId: 240103)
  const exam = {
    examName: "B.Tech. 3rd Semester Examination, 2024",
    batchYear: "2024",
    semId: 3,
    examHeld: "July/2025",
    examId: "240103"
  };

  const d = Buffer.from(JSON.stringify({
    semester: exam.semId,
    session: exam.batchYear,
    exam_held: exam.examHeld,
    exam_id: exam.examId
  })).toString('base64');

  const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1500);

  // Test the user's exact roll number: 231051310901, and 0902, 0903, etc.
  const testRolls = [
    '231051310901',
    '231051310902',
    '231051310903',
    '231011310901', // Civil
    '231021310901', // Mechanical
    '231031310901', // Electrical
    '231041310901', // ECE
    '231511310901'  // CSE-AI
  ];

  for (const regNo of testRolls) {
    const token = await getFreshToken(page, url);
    if (!token) {
      console.log(`[${regNo}] Captcha timeout`);
      continue;
    }

    const res = await page.evaluate(async (ex, reg, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(ex.batchYear)}&redg_no=${reg}&semester=III&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
      try {
        const resp = await fetch(u);
        return { status: resp.status, json: await resp.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, exam, regNo, token);

    if (res?.json?.status === 200 && res.json.data) {
      console.log(`🎉 MATCH FOUND! ${regNo} -> Name: "${res.json.data.name}" | Course: "${res.json.data.course}" | SGPA: ${res.json.data.sgpa}`);
    } else {
      console.log(`❌ [${regNo}] ${res?.json?.message || 'Not found'}`);
    }
    await sleep(300);
  }

  await browser.close();
}

test12DigitLE().catch(console.error);
