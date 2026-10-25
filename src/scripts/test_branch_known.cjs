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

async function testBranchCodesKnownExam() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized', '--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Known exam: B.Tech 3rd Semester Examination 2023 (August/2024, examId: 230103)
  const exam = {
    examName: "B.Tech 3rd Semester Examination 2023",
    batchYear: "2023",
    semId: 3,
    examHeld: "August/2024",
    examId: "230103"
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

  // Test branch codes for Batch 22 PCE (151):
  // 131 is known to exist: 22151131001
  const branchesToTest = ['131', '101', '102', '103', '104', '105', '110', '161'];

  for (const branch of branchesToTest) {
    console.log(`\n======================================================`);
    console.log(`🔍 Testing Branch Code: ${branch} for PCE (151) in Sem 3...`);
    console.log(`======================================================`);

    for (const roll of ['001', '002', '010', '901']) {
      const regNo = `22151${branch}${roll}`;
      const token = await getFreshToken(page, url);
      if (!token) {
        console.log(`   [${regNo}] ⚠️ Token timeout`);
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
        console.log(`   🎉 FOUND: ${regNo} | Name: ${res.json.data.name} | Course: ${res.json.data.course} | College: ${res.json.data.college_name}`);
        break; // found at least one in this branch
      } else {
        console.log(`   ❌ [${regNo}] ${res?.json?.message || 'Not found'}`);
      }
      await sleep(300);
    }
  }

  await browser.close();
}

testBranchCodesKnownExam().catch(console.error);
