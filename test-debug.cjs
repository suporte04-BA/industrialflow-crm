const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const failed = [];
  page.on('response', resp => {
    if (resp.status() >= 400) failed.push(resp.url() + ' -> ' + resp.status());
  });
  
  await page.goto('https://transobras.suporte04.workers.dev', { waitUntil: 'networkidle', timeout: 15000 });
  
  // Login
  await page.fill('input[placeholder*="nome"]', 'suporte04@baeletrica.com.br');
  await page.fill('input[type="password"]', 'sjr183039');
  await page.click('button:has-text("Entrar")');
  await page.waitForTimeout(4000);
  
  console.log('=== Failed resources after login ===');
  if (failed.length === 0) console.log('  None!');
  failed.forEach(f => console.log('  ' + f));
  
  // Navigate to contratos
  const contratos = await page.locator('a[href="/contratos"]').first();
  if (await contratos.isVisible().catch(() => false)) {
    await contratos.click();
    await page.waitForTimeout(2000);
  } else {
    await page.goto('https://transobras.suporte04.workers.dev/contratos', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
  }
  
  // Find all buttons
  const allBtns = await page.locator('button').allTextContents();
  console.log('=== Buttons on Contratos page ===');
  allBtns.forEach(b => console.log('  ' + b.trim()));
  
  // Try Novo Contrato
  const novo = await page.locator('button:has-text("Novo")').first();
  const novoVisible = await novo.isVisible().catch(() => false);
  console.log('Novo button visible:', novoVisible);
  
  if (novoVisible) {
    await novo.click();
    await page.waitForTimeout(2000);
    const modal = await page.locator('text=Dados do Contrato').first();
    console.log('Modal opened:', await modal.isVisible().catch(() => false));
  }

  // Check tablet/mobile login
  console.log('=== Tablet test ===');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('https://transobras.suporte04.workers.dev/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  const tabletBtn = await page.locator('button:has-text("Entrar")').first();
  console.log('Tablet login button visible:', await tabletBtn.isVisible().catch(() => false));
  
  console.log('=== Mobile test ===');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://transobras.suporte04.workers.dev/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  const mobileBtn = await page.locator('button:has-text("Entrar")').first();
  console.log('Mobile login button visible:', await mobileBtn.isVisible().catch(() => false));

  await browser.close();
})();
