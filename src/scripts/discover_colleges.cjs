const puppeteer = require('puppeteer');
const path = require('path');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getTurnstileToken(page, url) {
  let captcha = null;
  let attempts = 0;

  while (!captcha && attempts < 3) {
    attempts++;
    if (attempts > 1) {
      await page.evaluate(() => {
        if (window.turnstile) {
          try { window.turnstile.reset(); } catch (e) {}
        }
      });
      await sleep(1000);
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

  // Test on B.Tech 6th Semester Examination 2025 (Batch 22 Sem 6, Nov/2025, examId: 250106)
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
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1500);

  // Probe colleges 101 through 145 with Civil roll 001: 22101[col]001
  const discoveredColleges = {};

  for (let c = 101; c <= 145; c++) {
    const colCode = c.toString();
    const regNo = `22101${colCode}001`;

    const token = await getTurnstileToken(page, url);
    if (!token) {
      console.log(`[Col ${colCode}] Token retry...`);
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
      const colName = res.json.data.college_name;
      discoveredColleges[colCode] = colName;
      console.log(`✅ College ${colCode}: "${colName}" (Student: ${res.json.data.name})`);
    } else {
      console.log(`❌ College ${colCode}: Not found for 22101${colCode}001`);
    }

    await sleep(250);
  }

  console.log('\n--- DISCOVERED COLLEGES ---');
  console.log(JSON.stringify(discoveredColleges, null, 2));

  try { await browser.close(); } catch (e) {}
})();
