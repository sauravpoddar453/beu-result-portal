const puppeteer = require('puppeteer');

async function run() {
    let browser;
    try {
        console.log('Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        console.log('Navigating to BEU result page...');
        const url = 'https://beu-bih.ac.in/result-three?name=B.Tech%201st%20Semester%20Examination%202025&semester=I&session=2025&regNo=25151131024&exam_held=January%2F2026';
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('Page loaded. Waiting for result data rendering...');
        await new Promise(r => setTimeout(r, 6000)); // 6s wait for AJAX and render
        
        console.log('Title:', await page.title());
        
        console.log('Taking screenshot...');
        await page.screenshot({ path: 'screenshot-result.png' });
        console.log('Screenshot saved to screenshot-result.png');
        
        const bodyHTML = await page.content();
        console.log('HTML Length:', bodyHTML.length);
        
        if (bodyHTML.includes('FURQUAN')) {
            console.log('SUCCESS! Found student name FURQUAN in HTML!');
        } else {
            console.log('Warning: Student name not found.');
            const bodyText = await page.evaluate(() => document.body.innerText);
            console.log('Body Text Snippet (first 400 chars):');
            console.log(bodyText.substring(0, 400));
        }
        
    } catch (error) {
        console.error('Error occurred in Puppeteer:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}

run();
