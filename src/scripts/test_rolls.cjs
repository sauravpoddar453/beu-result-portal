const puppeteer = require('puppeteer');
const https = require('https');

async function testBEU() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage();
  
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
  
  // wait for turnstile
  let captcha = null;
  for (let i = 0; i < 20; i++) {
    captcha = await page.evaluate(() => {
      const el = document.querySelector('[name="cf-turnstile-response"]');
      return (el && el.value && el.value.length > 10) ? el.value : null;
    });
    if (captcha) break;
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('Captcha obtained:', Boolean(captcha));

  const tokenObj = await page.evaluate(async (cap) => {
    const res = await fetch('https://beu-bih.ac.in/backend/v1/result/token?captcha=' + encodeURIComponent(cap));
    return await res.json();
  }, captcha);
  console.log('Token:', tokenObj?.token ? 'OK' : 'FAIL');

  // Let's test a few candidate roll numbers:
  // AI: 22151131001 (we know this works)
  // Civil: 22151101001, 2215101001, 22101151001, 22151101002
  // Also lateral entry: 23151131901, 23151101901, etc.
  const candidates = [
    '22151131001',
    '22151101001',
    '2215101001',
    '22151102001',
    '22151103001',
    '22151104001',
    '23151131901',
    '23151131902'
  ];

  for (const reg of candidates) {
    const res = await page.evaluate(async (ex, r, tok) => {
      const u = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${encodeURIComponent(ex.batchYear)}&redg_no=${r}&semester=VI&exam_held=${encodeURIComponent(ex.examHeld)}&exam_id=${ex.examId}&token=${tok}`;
      try {
        const resp = await fetch(u);
        return await resp.json();
      } catch (e) {
        return { error: e.message };
      }
    }, exam, reg, tokenObj?.token);

    if (res?.status === 200 && res.data) {
      console.log(`✅ [FOUND] ${reg} -> ${res.data.name} | ${res.data.college_name}`);
    } else {
      console.log(`❌ [NOT FOUND] ${reg} -> ${res?.message || res?.error || 'Unknown'}`);
    }
  }

  await browser.close();
}

testBEU().catch(console.error);
