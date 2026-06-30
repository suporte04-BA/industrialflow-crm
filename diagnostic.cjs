const { chromium } = require('playwright');
const URL = 'https://transobras.suporte04.workers.dev';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Enable console logging from the page
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('HTTP status:', response.status());
  console.log('URL after networkidle:', page.url());

  // Wait for potential redirect
  await page.waitForTimeout(5000);
  console.log('URL after 5s wait:', page.url());

  // Get page content
  const bodyText = await page.textContent('body');
  console.log('\n=== BODY TEXT (first 2000 chars) ===');
  console.log(bodyText.substring(0, 2000));

  // Get all inputs
  const inputs = await page.locator('input').all();
  console.log('\n=== INPUTS ===');
  for (const input of inputs) {
    const placeholder = await input.getAttribute('placeholder');
    const type = await input.getAttribute('type');
    const visible = await input.isVisible();
    console.log(`  type=${type}, placeholder=${placeholder}, visible=${visible}`);
  }

  // Get all buttons
  const buttons = await page.locator('button').all();
  console.log('\n=== BUTTONS ===');
  for (const btn of buttons) {
    const text = await btn.textContent();
    const visible = await btn.isVisible();
    console.log(`  text="${text.trim()}", visible=${visible}`);
  }

  // Get all links
  const links = await page.locator('a').all();
  console.log('\n=== LINKS ===');
  for (const link of links) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    const visible = await link.isVisible();
    console.log(`  text="${text.trim()}", href=${href}, visible=${visible}`);
  }

  // Get outer HTML snippet
  const html = await page.content();
  console.log('\n=== HTML (first 3000 chars) ===');
  console.log(html.substring(0, 3000));

  await browser.close();
})();
