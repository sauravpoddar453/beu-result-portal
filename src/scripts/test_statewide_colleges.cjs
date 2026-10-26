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

  const exam = {
    examName: "B.Tech 1st Semester Examination 2022",
    batchYear: "2022",
    semId: 1,
    examHeld: "May/2023",
    examId: "220101"
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

  const testRolls = [
    { reg: '22101107001', name: 'MIT Muzaffarpur' },
    { reg: '22101108001', name: 'BCE Bhagalpur' },
    { reg: '22101109001', name: 'Nalanda (NCE)' },
    { reg: '22101110001', name: 'Gaya (GCE)' },
    { reg: '22101111001', name: 'Darbhanga (DCE)' },
    { reg: '22101113001', name: 'Motihari (MCE)' },
    { reg: '22101126001', name: 'Bakhtiyarpur (BCE)' }
  ];

  for (const item of testRolls) {
    const token = await getTurnstileToken(page, url);
    if (!token) {
      console.log('Token failed for', item.reg);
      continue;
    }

    const res = await page.evaluate(async (ex, r, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(ex.batchYear)}&redg_no=${r}&semester=I&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
      try {
        const resp = await fetch(u);
        return { status: resp.status, json: await resp.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, exam, item.reg, token);

    if (res?.json?.status === 200 && res.json.data) {
      console.log(`✅ MATCH! [${item.name}] ${item.reg} -> "${res.json.data.name}" | College: "${res.json.data.college_name}" | Branch: "${res.json.data.course}" | SGPA: ${res.json.data.sgpa}`);
    } else {
      console.log(`❌ [${item.name}] ${item.reg} -> ${res?.json?.message || 'Not found'}`);
    }
    await sleep(250);
  }

  try { await browser.close(); } catch (e) {}
})();
