const puppeteer = require('puppeteer');
require('dotenv').config();

async function testBranches() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized', '--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Test exam: B.Tech 6th Semester Examination, 2025 (examId: 250106)
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

  // Wait for turnstile
  let captcha = null;
  for (let i = 0; i < 20; i++) {
    captcha = await page.evaluate(() => {
      const el = document.querySelector('[name="cf-turnstile-response"]');
      return (el && el.value && el.value.length > 10) ? el.value : null;
    });
    if (captcha) break;
    await new Promise(r => setTimeout(r, 400));
  }

  const tokenObj = await page.evaluate(async (cap) => {
    try {
      const res = await fetch('https://beu-bih.ac.in/backend/v1/result/token?captcha=' + encodeURIComponent(cap));
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  }, captcha);

  console.log('Turnstile token acquired:', Boolean(tokenObj?.token));

  // Test candidate registration numbers across branches:
  // Branch 131 (AI - we know works)
  // Branch 101 (Civil)
  // Branch 102 (Mechanical)
  // Branch 103 (Electrical)
  // Branch 104 (ECE)
  // Also test other college codes to compare: e.g. MIT Muzaffarpur (101), BCE Bhagalpur (102), etc.
  const candidates = [
    { reg: '22151131001', branch: 'PCE AI (131)' },
    { reg: '22151101001', branch: 'PCE Civil (101) roll 1' },
    { reg: '22151101005', branch: 'PCE Civil (101) roll 5' },
    { reg: '22151102001', branch: 'PCE Mech (102) roll 1' },
    { reg: '22151103001', branch: 'PCE Elec (103) roll 1' },
    { reg: '22151104001', branch: 'PCE ECE (104) roll 1' },
    { reg: '22101101001', branch: 'MIT Muzaffarpur Civil roll 1' }
  ];

  for (const c of candidates) {
    const res = await page.evaluate(async (ex, r, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(ex.batchYear)}&redg_no=${r}&semester=VI&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
      try {
        const resp = await fetch(u);
        return { status: resp.status, json: await resp.json() };
      } catch (e) {
        return { error: e.message };
      }
    }, exam, c.reg, tokenObj?.token);

    if (res?.json?.status === 200 && res.json.data) {
      console.log(`✅ FOUND [${c.branch}]: ${c.reg} -> ${res.json.data.name} (${res.json.data.college_name})`);
    } else {
      console.log(`❌ NOT FOUND [${c.branch}]: ${c.reg} -> ${res?.json?.message || 'No record'}`);
    }
  }

  await browser.close();
}

testBranches().catch(console.error);
