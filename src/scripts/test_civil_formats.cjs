const puppeteer = require('puppeteer');
require('dotenv').config();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getFreshToken(page, url) {
  await page.evaluate(() => {
    if (window.turnstile) {
      try { window.turnstile.reset(); } catch (e) {}
    }
  });

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
  return null;
}

async function testCivilFormats() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized', '--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const exam = {
    examName: "B.Tech. 6th Semester Examination, 2025",
    batchYear: "2025",
    semId: 6,
    examHeld: "November/2025",
    examId: "250106"
  };

  const d = Buffer.from(JSON.stringify({
    semester: exam.semId,
    session: exam.batchYear,
    exam_held: exam.examHeld,
    exam_id: exam.examId
  })).toString('base64');

  const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(exam.examName)}?d=${encodeURIComponent(d)}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1500);

  // Variations for Civil:
  const civilVariations = [
    '2215101001',   // 10 digits (22-151-01-001)
    '22151010001',  // 11 digits (22-151-010-001)
    '22151001001',  // 11 digits (22-151-001-001)
    '22151101001',  // 11 digits (22-151-101-001)
    '22151101002',
    '22151101003',
    '22151101004',
    '22151101005',
    '22151101010',
    '22151101025',
    '22151101050',
    // What if PCE is college code 51 or 15 instead of 151?
    '22051101001',
    '22015101001',
    // What if Civil is in 2021 batch or 2023 batch?
    '21151101001',
    '21151101002',
    '23151101001'
  ];

  for (const regNo of civilVariations) {
    const token = await getFreshToken(page, url);
    if (!token) {
      console.log(`[${regNo}] Captcha token timeout`);
      continue;
    }

    const res = await page.evaluate(async (ex, reg, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(ex.batchYear)}&redg_no=${reg}&semester=VI&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
      try {
        const resp = await fetch(u);
        return { status: resp.status, json: await resp.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, exam, regNo, token);

    if (res?.json?.status === 200 && res.json.data) {
      console.log(`🎉 SUCCESS! ${regNo} -> ${res.json.data.name} | ${res.json.data.course} | ${res.json.data.college_name}`);
      break;
    } else {
      console.log(`❌ [${regNo}] ${res?.json?.message || 'Not found'}`);
    }
    await sleep(300);
  }

  await browser.close();
}

testCivilFormats().catch(console.error);
