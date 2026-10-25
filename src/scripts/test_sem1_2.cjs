const puppeteer = require('puppeteer');
require('dotenv').config();

async function testSem1and2() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized', '--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Test Sem 1 for Batch 22:
  // id: 36 | B.Tech 1st Semester Examination 2022 | batchYear: 2022 | held: May/2023 | examId: 220101 | session: 2022-26
  const examSem1 = {
    examName: "B.Tech 1st Semester Examination 2022",
    batchYear: "2022",
    semId: 1,
    examHeld: "May/2023",
    examId: "220101"
  };

  const d1 = Buffer.from(JSON.stringify({
    semester: examSem1.semId,
    session: examSem1.batchYear,
    exam_held: examSem1.examHeld,
    exam_id: examSem1.examId
  })).toString('base64');

  const url1 = `https://beu-bih.ac.in/result-two/${encodeURIComponent(examSem1.examName)}?d=${encodeURIComponent(d1)}`;
  console.log('Navigating to Sem 1 exam URL:', url1);
  await page.goto(url1, { waitUntil: 'networkidle2', timeout: 45000 });

  // Turnstile
  let cap1 = null;
  for (let i = 0; i < 20; i++) {
    cap1 = await page.evaluate(() => document.querySelector('[name="cf-turnstile-response"]')?.value);
    if (cap1 && cap1.length > 10) break;
    await new Promise(r => setTimeout(r, 400));
  }
  const tok1 = await page.evaluate(async (c) => (await (await fetch('https://beu-bih.ac.in/backend/v1/result/token?captcha=' + encodeURIComponent(c))).json()).token, cap1);
  console.log('Sem 1 token:', Boolean(tok1));

  const res1 = await page.evaluate(async (ex, tok) => {
    const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=2022&redg_no=22151131001&semester=I&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
    return (await (await fetch(u)).json());
  }, examSem1, tok1);

  console.log('Sem 1 Result for 22151131001:', res1.status, res1.data?.name || res1.message);

  // 2. Test Sem 2 for Batch 22:
  // id: 37 | B.Tech 2nd Semester Examination 2023 | batchYear: 2023 | held: September/2023 | examId: 230102 | session: 2022-26
  const examSem2 = {
    examName: "B.Tech 2nd Semester Examination 2023",
    batchYear: "2023",
    semId: 2,
    examHeld: "September/2023",
    examId: "230102"
  };

  const d2 = Buffer.from(JSON.stringify({
    semester: examSem2.semId,
    session: examSem2.batchYear,
    exam_held: examSem2.examHeld,
    exam_id: examSem2.examId
  })).toString('base64');

  const url2 = `https://beu-bih.ac.in/result-two/${encodeURIComponent(examSem2.examName)}?d=${encodeURIComponent(d2)}`;
  console.log('Navigating to Sem 2 exam URL:', url2);
  await page.goto(url2, { waitUntil: 'networkidle2', timeout: 45000 });

  let cap2 = null;
  for (let i = 0; i < 20; i++) {
    cap2 = await page.evaluate(() => document.querySelector('[name="cf-turnstile-response"]')?.value);
    if (cap2 && cap2.length > 10) break;
    await new Promise(r => setTimeout(r, 400));
  }
  const tok2 = await page.evaluate(async (c) => (await (await fetch('https://beu-bih.ac.in/backend/v1/result/token?captcha=' + encodeURIComponent(c))).json()).token, cap2);
  console.log('Sem 2 token:', Boolean(tok2));

  const res2 = await page.evaluate(async (ex, tok) => {
    const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=2023&redg_no=22151131001&semester=II&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
    return (await (await fetch(u)).json());
  }, examSem2, tok2);

  console.log('Sem 2 Result for 22151131001:', res2.status, res2.data?.name || res2.message);

  await browser.close();
}

testSem1and2().catch(console.error);
