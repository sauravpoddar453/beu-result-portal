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

async function test11DigitLE() {
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

  // Test Sem 3, Sem 4, Sem 5 for Batch 23 LE
  const exams = [
    {
      name: "B.Tech. 3rd Semester Examination, 2024",
      sem: "III",
      batchYear: "2024",
      semId: 3,
      examHeld: "July/2025",
      examId: "240103"
    },
    {
      name: "B.Tech. 4th Semester Examination, 2025",
      sem: "IV",
      batchYear: "2025",
      semId: 4,
      examHeld: "December/2025",
      examId: "250104"
    },
    {
      name: "B.Tech 5th Semester Examination 2025",
      sem: "V",
      batchYear: "2025",
      semId: 5,
      examHeld: "May/2026",
      examId: "250105"
    }
  ];

  // Candidates: 11 digits: 23105131901..906
  const rolls = [
    '23105131901',
    '23105131902',
    '23105131903',
    '23101131901',
    '23101131902',
    '23102131901',
    '23103131901'
  ];

  for (const ex of exams) {
    console.log(`\nTesting Exam: ${ex.name}...`);
    const d = Buffer.from(JSON.stringify({
      semester: ex.semId,
      session: ex.batchYear,
      exam_held: ex.examHeld,
      exam_id: ex.examId
    })).toString('base64');

    const url = `https://beu-bih.ac.in/result-two/${encodeURIComponent(ex.name)}?d=${encodeURIComponent(d)}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);

    for (const reg of rolls) {
      const token = await getFreshToken(page, url);
      if (!token) continue;

      const res = await page.evaluate(async (yr, r, sem, held, exId, tok) => {
        const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(yr)}&redg_no=${r}&semester=${sem}&exam_held=${encodeURIComponent(held)}&exam_id=${exId}&token=${tok}`;
        try {
          const resp = await fetch(u);
          return { status: resp.status, json: await resp.json() };
        } catch (e) {
          return { error: e.message };
        }
      }, ex.batchYear, reg, ex.sem, ex.examHeld, ex.examId, token);

      if (res?.json?.status === 200 && res.json.data) {
        console.log(`  🎉 MATCH! ${reg} -> ${res.json.data.name} | ${res.json.data.course} | SGPA: ${res.json.data.sgpa}`);
      } else {
        console.log(`  ❌ [${reg}] ${res?.json?.message || 'Not found'}`);
      }
      await sleep(300);
    }
  }

  await browser.close();
}

test11DigitLE().catch(console.error);
