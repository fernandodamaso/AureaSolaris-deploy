const puppeteer = require('puppeteer');

async function getGeminiCode(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Wait for the code block to appear
  try {
    await page.waitForSelector('code', { timeout: 10000 });
    const code = await page.evaluate(() => {
      const codeBlocks = Array.from(document.querySelectorAll('code'));
      return codeBlocks.map(block => block.innerText).join('\n---\n');
    });
    console.log(code);
  } catch (e) {
    console.log("Could not find code blocks.");
  }
  
  await browser.close();
}

const url = process.argv[2];
if (url) getGeminiCode(url);
