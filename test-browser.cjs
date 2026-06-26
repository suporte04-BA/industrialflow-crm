const { chromium } = require('playwright');

const URL = 'https://transobras.suporte04.workers.dev';
const EMAIL = process.env.TEST_EMAIL || 'suporte04@baeletrica.com.br';
const PASSWORD = process.env.TEST_PASSWORD || 'sjr183039';

let passed = 0;
let failed = 0;
const results = [];

function log(test, ok, detail = '') {
  if (ok) {
    passed++;
    results.push(`[PASS] ${test} ${detail}`);
    console.log(`  [PASS] ${test} ${detail}`);
  } else {
    failed++;
    results.push(`[FAIL] ${test} ${detail}`);
    console.log(`  [FAIL] ${test} ${detail}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  try {
    // ===== TEST 1: Page loads =====
    console.log('\n=== TEST 1: Page loads ===');
    let context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let page = await context.newPage();
    const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    log('HTTP status 200', response.status() === 200);
    const title = await page.title();
    log('Title contains TransObra', title.includes('TransObra'), `(got "${title}")`);

    // ===== TEST 2: Login page renders =====
    console.log('\n=== TEST 2: Login page renders ===');
    // Wait for React to render and redirect to login
    await page.waitForTimeout(2000);
    // If we're still on root, wait for redirect
    if (!page.url().includes('/login')) {
      await page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
    }
    // Wait for login elements to be visible
    await page.locator('button:has-text("Entrar")').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    log('Login button visible', await page.locator('button:has-text("Entrar")').first().isVisible());
    log('Name/email input visible', await page.locator('input[placeholder*="nome"]').first().isVisible());
    log('Password input visible', await page.locator('input[type="password"]').first().isVisible());
    log('Register link visible', await page.locator('a:has-text("Criar uma conta")').first().isVisible());

    // ===== TEST 3: No "Supabase nao configurado" =====
    console.log('\n=== TEST 3: No Supabase error ===');
    const pageText = await page.textContent('body');
    log('No "Supabase nao configurado" text', !pageText.includes('Supabase nao configurado'));

    // ===== TEST 4: Login =====
    console.log('\n=== TEST 4: Login with email ===');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.locator('input[placeholder*="nome"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button:has-text("Entrar")').first().click();
    await page.waitForTimeout(8000);
    const currentUrl = page.url();
    log('Navigated away from login', !currentUrl.includes('/login'), `(url: ${currentUrl})`);

    // ===== TEST 5: App loads =====
    console.log('\n=== TEST 5: App loaded ===');
    const bodyText = await page.textContent('body');
    const bodySnippet = bodyText.substring(0, 500);
    log('Has app content', bodyText.includes('TransObra') || bodyText.includes('Dashboard') || bodyText.includes('Contratos') || bodyText.includes('Perfil') || bodyText.includes('Comprovante') || bodyText.includes('Nenhum'), `(snippet: "${bodySnippet.substring(0, 200)}")`);
    log('Sidebar visible', await page.locator('aside').first().isVisible().catch(() => false));
    if (errors.length > 0) {
      console.log('  Console errors:', errors.slice(0, 5).join('\n  '));
    }

    // ===== TEST 6: Navigate Contratos =====
    console.log('\n=== TEST 6: Contratos ===');
    await page.goto(URL + '/contratos', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    let text = await page.textContent('body');
    log('Contratos page loaded', text.includes('Contrato') || text.includes('contrato'));
    log('Has Novo Contrato or empty state', text.includes('Novo Contrato') || text.includes('Nenhum contrato') || text.includes('CT-') || text.includes('cadastrados'));

    // ===== TEST 7: Novo Contrato modal =====
    console.log('\n=== TEST 7: Novo Contrato modal ===');
    const novoBtn = await page.locator('button:has-text("Novo Contrato")').first();
    const novoBtnVisible = await novoBtn.isVisible().catch(() => false);
    log('Novo Contrato button visible', novoBtnVisible);
    if (novoBtnVisible) {
      await novoBtn.click();
      await page.waitForTimeout(1500);
      log('Modal opened', await page.locator('text=Dados do Contrato').first().isVisible().catch(() => false));
      log('Has PDF import', await page.locator('text=Importar PDF').first().isVisible().catch(() => false));
      log('Has item fields', await page.locator('text=Itens Locados').first().isVisible().catch(() => false));
      await page.locator('button:has-text("Fechar")').first().click().catch(() => {});
      await page.waitForTimeout(500);
    } else {
      log('Modal opened', false, '(button not visible)');
      log('Has PDF import', false, '(button not visible)');
      log('Has item fields', false, '(button not visible)');
    }

    // ===== TEST 8: Comprovantes =====
    console.log('\n=== TEST 8: Comprovantes ===');
    await page.goto(URL + '/comprovantes', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    text = await page.textContent('body');
    log('Comprovantes loaded', text.includes('Comprovante') || text.includes('comprovante') || text.includes('Documento') || text.includes('Documentos'));
    log('Has comprovante or empty state', text.includes('Nenhum comprovante') || text.includes('CT-') || text.includes('1231') || text.includes('Alpha') || text.includes('Documentos') || text.includes('comprovantes'));

    // ===== TEST 9: Assinatura Digital =====
    console.log('\n=== TEST 9: Assinatura Digital ===');
    await page.goto(URL + '/assinatura', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    text = await page.textContent('body');
    log('Assinatura loaded', text.includes('ssinatura') || text.includes('Assinatura') || text.includes('Registrar'));

    // ===== TEST 10: Perfil =====
    console.log('\n=== TEST 10: Perfil ===');
    await page.goto(URL + '/perfil', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    text = await page.textContent('body');
    log('Perfil loaded', text.includes('erfil') || text.includes('Suporte') || text.includes('Comprovantes') || text.includes('Relatorio'));

    // ===== TEST 11: Devolucoes redirect =====
    console.log('\n=== TEST 11: Devolucoes redirect ===');
    await page.goto(URL + '/devolucoes', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const devUrl = page.url();
    log('Devolucoes redirects to home', !devUrl.includes('/devolucoes'), `(url: ${devUrl})`);

    // ===== TEST 12: Historico =====
    console.log('\n=== TEST 12: Historico ===');
    await page.goto(URL + '/historico', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    text = await page.textContent('body');
    log('Historico loaded', text.includes('istorico') || text.includes('Hist') || text.includes('historico') || text.includes('Acoes'));

    // ===== TEST 13: Usuarios =====
    console.log('\n=== TEST 13: Usuarios ===');
    await page.goto(URL + '/usuarios', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    text = await page.textContent('body');
    log('Usuarios loaded', text.includes('suario') || text.includes('Usuario') || text.includes('Gestao'));

    // ===== TEST 14: Equipamentos =====
    console.log('\n=== TEST 14: Equipamentos ===');
    await page.goto(URL + '/equipamentos', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    text = await page.textContent('body');
    log('Equipamentos loaded', text.includes('quipamento') || text.includes('Equipamento') || text.includes('cadastrados'));

    // ===== TEST 15: Ordens de Servico =====
    console.log('\n=== TEST 15: Ordens de Servico ===');
    await page.goto(URL + '/ordens', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    text = await page.textContent('body');
    log('Ordens loaded', text.includes('rdem') || text.includes('OS') || text.includes('Ordem') || text.includes('cadastradas'));

    await context.close();

    // ===== TEST 16: Responsive tablet =====
    console.log('\n=== TEST 16: Responsive tablet ===');
    context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    page = await context.newPage();
    await page.goto(URL + '/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    log('Tablet login renders', await page.locator('button:has-text("Entrar")').first().isVisible().catch(() => false));
    await context.close();

    // ===== TEST 17: Responsive mobile =====
    console.log('\n=== TEST 17: Responsive mobile ===');
    context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    page = await context.newPage();
    await page.goto(URL + '/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    log('Mobile login renders', await page.locator('button:has-text("Entrar")').first().isVisible().catch(() => false));
    await context.close();

  } catch (err) {
    log('FATAL ERROR', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('========================================');
  results.forEach(r => console.log(r));
  console.log('========================================');

  process.exit(failed > 0 ? 1 : 0);
})();
