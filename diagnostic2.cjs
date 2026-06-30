const { chromium } = require('playwright');
const URL = 'https://transobras.suporte04.workers.dev';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => console.log('CONSOLE [' + msg.type() + ']:', msg.text()));

  // Listen for page errors
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Listen for request failures
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));

  // Listen for responses with errors
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });

  const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('HTTP status:', response.status());
  console.log('URL:', page.url());

  await page.waitForTimeout(8000);
  console.log('URL after 8s:', page.url());

  // Check root div
  const rootContent = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log('\nroot innerHTML length:', rootContent.length);
  console.log('root innerHTML:', rootContent.substring(0, 500));

  // Take a screenshot
  await page.screenshot({ path: 'C:\\Users\\usuario\\industrialflow-crm\\debug.png', fullPage: true });
  console.log('\nScreenshot saved to debug.png');

  await browser.close();
})();
