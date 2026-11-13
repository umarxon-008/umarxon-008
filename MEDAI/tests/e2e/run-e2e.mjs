/**
 * MEDAI brauzer (E2E) testlari — Playwright + Chromium.
 *   npm run test:e2e
 * Playwright o'rnatilmagan bo'lsa:  npm i -D playwright && npx playwright install chromium
 * Server demo rejimda vaqtinchalik portda ishga tushiriladi. Faqat SINTETIK namuna fayllar ishlatiladi.
 * Skrinshotlar: tests/e2e/screenshots/ (yoki E2E_SHOTS muhit o'zgaruvchisi).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.env.MEDAI_FORCE_DEMO = 'true';
process.env.MEDAI_RATE_LIMIT = '1000';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright topilmadi. Oʻrnatish: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(here, '../fixtures');
const SHOTS = process.env.E2E_SHOTS || path.join(here, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const { createApp } = await import('../../server/server.js');
const server = createApp().listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✔ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  ✘ ${name}\n      ${String(err.message).split('\n')[0]}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const browser = await chromium.launch();
const consoleErrors = [];

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  page.on('dialog', (d) => { consoleErrors.push(`Kutilmagan dialog (XSS?): ${d.message()}`); d.dismiss(); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  return page;
}

async function ask(page, text) {
  const before = await page.locator('.msg--ai:not(.msg--typing)').count();
  await page.fill('#chatInput', text);
  await page.press('#chatInput', 'Enter');
  await page.waitForFunction((n) => document.querySelectorAll('.msg--ai:not(.msg--typing)').length > n, before);
  return page.locator('.msg--ai:not(.msg--typing)').last();
}

console.log(`\nMEDAI E2E testlari (${BASE})\n`);
const page = await newPage();

await check('1. Chatga oddiy oʻzbekcha savol yuborish', async () => {
  await page.screenshot({ path: `${SHOTS}/desktop-01-welcome.png` });
  const msg = await ask(page, 'Gemoglobin nima?');
  const text = await msg.innerText();
  assert(text.includes('Gemoglobin'), 'javobda Gemoglobin yoʻq');
  assert(text.includes('DEMO'), 'demo belgisi koʻrinmayapti');
  assert(await msg.locator('.source-list a').count() >= 1, 'manba havolasi yoʻq');
  assert(await page.locator('.msg--user .bubble').last().innerText() === 'Gemoglobin nima?', 'foydalanuvchi xabari notoʻgʻri');
  await page.screenshot({ path: `${SHOTS}/desktop-02-chat-answer.png` });
});

await check('2. Boʻsh xabar yuborishga urinish', async () => {
  const count = await page.locator('.msg').count();
  await page.fill('#chatInput', '   ');
  assert(await page.locator('#sendBtn').isDisabled(), 'yuborish tugmasi faol boʻlmasligi kerak');
  await page.press('#chatInput', 'Enter');
  await page.waitForSelector('.toast--warning');
  assert((await page.locator('.msg').count()) === count, 'boʻsh xabar yuborildi');
});

await check('3. Juda uzun xabar (UI 4000 belgida cheklaydi, server >4000 ni rad etadi)', async () => {
  await page.fill('#chatInput', 'a'.repeat(4100));
  const len = (await page.inputValue('#chatInput')).length;
  assert(len === 4000, `maxlength ishlamadi: ${len}`);
  assert(await page.locator('#charCount.is-limit').count() === 1, 'limit ogohlantirishi koʻrinmadi');
  const res = await page.evaluate(async () => (await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'a'.repeat(4001) }] }) })).json());
  assert(res.error && res.error.includes('4000'), `server rad etmadi: ${JSON.stringify(res)}`);
  await page.fill('#chatInput', '');
  await page.type('#chatInput', 'b'.repeat(20));
  assert((await page.locator('#charCount').innerText()).startsWith('20 /'), 'belgilar hisoblagichi ishlamayapti');
  await page.fill('#chatInput', '');
});

await check('4. AI/API ishlamagan holat va «Qayta urinish»', async () => {
  await page.route('**/api/chat', (r) => r.abort());
  await page.fill('#chatInput', 'Trombotsit nima?');
  await page.press('#chatInput', 'Enter');
  await page.waitForSelector('.msg--error');
  assert((await page.locator('.msg--error').innerText()).includes('Server bilan aloqa'), 'xato matni notoʻgʻri');
  await page.screenshot({ path: `${SHOTS}/desktop-03-chat-error.png` });
  await page.unroute('**/api/chat');
  await page.click('.msg--error [data-action="retry"]');
  await page.waitForSelector('.msg--error', { state: 'detached' });
  assert((await page.locator('.msg--ai').last().innerText()).includes('Trombotsit'), 'qayta urinishdan keyin javob yoʻq');
});

await check('Takroriy soʻrov cheklovi (javob kutilayotganda yuborish bloklanadi)', async () => {
  let calls = 0;
  await page.route('**/api/chat', async (r) => { calls += 1; await new Promise((x) => setTimeout(x, 700)); await r.continue(); });
  await page.fill('#chatInput', 'Glyukoza nima?');
  await page.press('#chatInput', 'Enter');
  await page.fill('#chatInput', 'Yana savol');
  await page.press('#chatInput', 'Enter');
  await page.waitForSelector('#typing', { state: 'detached' });
  await page.unroute('**/api/chat');
  assert(calls === 1, `${calls} ta soʻrov yuborildi`);
  await page.fill('#chatInput', '');
});

await check('9. Tibbiy tashxis soʻralgan holat', async () => {
  const msg = await ask(page, 'Menda qanday kasallik bor? Tashxis qoʻying.');
  assert((await msg.innerText()).includes('Tashxis qoʻya olmayman'), 'tashxis rad etilmadi');
});

await check('10. Dori dozasini oʻzgartirish soʻralgan holat', async () => {
  const msg = await ask(page, 'Dorimning dozasini ikki baravar oshirsam boʻladimi?');
  assert((await msg.innerText()).includes('Dozani mustaqil tavsiya qila olmayman'), 'doza rad etilmadi');
});

await check('11. Manba topilmagan holat', async () => {
  const msg = await ask(page, 'Futbol qoidalari qanday?');
  const text = await msg.innerText();
  assert(text.includes('manba topilmadi') || text.includes('Manba topilmadi'), 'manba yoʻqligi aytilmadi');
  assert(await msg.locator('.sources--none').count() === 1, 'manba ogohlantirishi koʻrinmayapti');
});

await check('Shoshilinch holat ogohlantirishi (103)', async () => {
  await ask(page, 'Koʻkragim qattiq ogʻriyapti, nafas ololmayapman');
  assert(await page.locator('#emergencyBanner').isVisible(), 'shoshilinch banner koʻrinmadi');
  await page.screenshot({ path: `${SHOTS}/desktop-04-emergency.png` });
  await page.click('#emergencyClose');
});

await check('XSS: HTML matn sifatida koʻrsatiladi', async () => {
  await ask(page, '<img src=x onerror="alert(1)"> **qalin** [havola](javascript:alert(1))');
  assert(await page.locator('.messages img[src="x"]').count() === 0, 'img elementi yaratildi');
  assert(await page.locator('.messages a[href^="javascript"]').count() === 0, 'javascript: havola yaratildi');
});

await check('Javobni nusxalash va fikr bildirish', async () => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const last = page.locator('.msg--ai:not(.msg--error)').first();
  await last.locator('[data-action="copy"]').click();
  await page.waitForSelector('.toast--success');
  await last.locator('[data-action="feedback"][data-value="up"]').click();
  assert(await last.locator('[data-value="up"]').getAttribute('aria-pressed') === 'true', 'fikr saqlanmadi');
});

await check('14. Chat history saqlanishi (qayta yuklashdan keyin)', async () => {
  const n = await page.locator('.msg').count();
  await page.reload({ waitUntil: 'networkidle' });
  assert((await page.locator('.msg').count()) === n, 'xabarlar qayta yuklashdan keyin yoʻqoldi');
  await page.goto(`${BASE}/#/history`);
  await page.waitForSelector('.history-item');
  assert((await page.locator('.history-item').count()) === 1, 'tarixda 1 ta suhbat boʻlishi kerak');
  assert((await page.locator('.history-item strong').innerText()).startsWith('Gemoglobin nima'), 'avtomatik nom notoʻgʻri');
  await page.screenshot({ path: `${SHOTS}/desktop-05-history.png` });
});

await check('Yangi suhbat yaratish va suhbatni ochish', async () => {
  await page.click('#newChatBtn');
  await page.waitForSelector('#welcome:not([hidden])');
  await ask(page, 'Kreatinin nima?');
  await page.goto(`${BASE}/#/history`);
  await page.waitForFunction(() => document.querySelectorAll('.history-item').length === 2);
  await page.locator('.history-item', { hasText: 'Gemoglobin nima' }).locator('[data-action="open"]').click();
  await page.waitForFunction(() => document.querySelector('#chatTitle').textContent.startsWith('Gemoglobin'));
});

await check('14. Chat history oʻchirilishi (tasdiqlash dialogi bilan)', async () => {
  await page.goto(`${BASE}/#/history`);
  await page.waitForSelector('.history-item');
  await page.locator('.history-item', { hasText: 'Kreatinin' }).locator('[data-action="delete"]').click();
  await page.waitForSelector('.modal.is-open');
  await page.screenshot({ path: `${SHOTS}/desktop-06-confirm.png` });
  await page.keyboard.press('Escape'); // bekor qilish
  await page.waitForSelector('#modal', { state: 'hidden' });
  assert((await page.locator('.history-item').count()) === 2, 'Escape bilan bekor qilinmadi');
  await page.locator('.history-item', { hasText: 'Kreatinin' }).locator('[data-action="delete"]').click();
  await page.click('.modal__footer .btn--danger');
  await page.waitForFunction(() => document.querySelectorAll('.history-item').length === 1);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('medai.v1')).conversations.length);
  assert(stored === 1, 'localStorage dan oʻchirilmadi');
});

await check('5. PDF yuklash → tasdiqlash → natija', async () => {
  await page.goto(`${BASE}/#/analysis`);
  await page.setInputFiles('#labFileInput', path.join(fixtures, 'namuna-qon-tahlili.pdf'));
  assert(await page.locator('#labFileChip').isVisible(), 'fayl maʼlumoti koʻrinmadi');
  assert((await page.locator('#labFileMeta').innerText()).startsWith('PDF'), 'format koʻrsatilmadi');
  await page.click('#labAnalyzeBtn');
  await page.waitForSelector('#analysisStage2:not([hidden]) #confirmRows tr');
  assert((await page.locator('#confirmRows tr').count()) === 8, 'tasdiqlash jadvalida 8 qator boʻlishi kerak');
  await page.screenshot({ path: `${SHOTS}/desktop-07-analysis-confirm.png`, fullPage: true });
  await page.click('#confirmForm button[type="submit"]');
  await page.waitForSelector('#analysisStage3:not([hidden]) .result-card');
  const hb = page.locator('.result-card', { hasText: 'Gemoglobin' });
  assert((await hb.innerText()).includes('Oraliqdan past'), 'gemoglobin past deb baholanmadi');
  const cr = page.locator('.result-card', { hasText: 'Kreatinin' });
  assert((await cr.innerText()).includes('Baholanmadi'), 'oraliqsiz koʻrsatkich baholanmasligi kerak');
  assert(await page.locator('#doctorQuestions li').count() >= 3, 'shifokorga savollar yoʻq');
  assert(!/\bnull\b|undefined/.test(await page.locator('#analysisStage3').innerText()), 'sahifada null/undefined matni bor');
  await page.screenshot({ path: `${SHOTS}/desktop-08-analysis-result.png`, fullPage: true });
  const leaked = await page.evaluate(() => (localStorage.getItem('medai.v1') || '').includes('Gemoglobin (HGB)'));
  assert(!leaked, 'laboratoriya natijasi localStorage ga yozilgan');
});

await check('Qiymatni tahrirlash va forma validatsiyasi', async () => {
  await page.click('[data-action="edit"]');
  await page.fill('#confirmRows input[data-row="0"][data-key="value"]', 'abc');
  await page.click('#confirmForm button[type="submit"]');
  await page.waitForSelector('#confirmError:not([hidden])');
  assert(await page.locator('#confirmRows input.is-invalid').count() === 1, 'notoʻgʻri maydon belgilanmadi');
  await page.fill('#confirmRows input[data-row="0"][data-key="value"]', '135');
  await page.click('#confirmForm button[type="submit"]');
  await page.waitForSelector('#analysisStage3:not([hidden])');
  assert((await page.locator('.result-card', { hasText: 'Gemoglobin' }).innerText()).includes('Oraliq ichida'), 'tuzatilgan qiymat qayta baholanmadi');
  await page.click('[data-action="new"]');
});

await check('6. Notoʻgʻri formatdagi fayl', async () => {
  await page.setInputFiles('#labFileInput', path.join(fixtures, 'notogri-format.docx'));
  await page.waitForSelector('#labError:not([hidden])');
  assert((await page.locator('#labError').innerText()).includes('qoʻllab-quvvatlanmaydi'), 'format xatosi koʻrsatilmadi');
});

await check('7. Juda katta fayl (>10 MB)', async () => {
  await page.setInputFiles('#labFileInput', { name: 'katta.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(11 * 1024 * 1024, 0x25) });
  await page.waitForSelector('#labError:not([hidden])');
  assert((await page.locator('#labError').innerText()).includes('10 MB'), 'hajm xatosi koʻrsatilmadi');
});

await check('8. OCR xatosi / skanerlangan hujjat (qoʻlda kiritishga oʻtadi)', async () => {
  await page.setInputFiles('#labFileInput', path.join(fixtures, 'skan-namuna.pdf'));
  await page.click('#labAnalyzeBtn');
  await page.waitForSelector('#analysisStage2:not([hidden])');
  assert((await page.locator('#analysisStage2').innerText()).includes('OCR mavjud emas'), 'OCR ogohlantirishi yoʻq');
  assert((await page.locator('#confirmRows tr').count()) === 1, 'qoʻlda kiritish uchun boʻsh qator yoʻq');
  await page.click('[data-action="back"]');
});

await check('Yuklashni bekor qilish', async () => {
  await page.route('**/api/analyze-report', async (r) => { await new Promise((x) => setTimeout(x, 3000)); await r.continue().catch(() => {}); });
  await page.click('#labRemoveBtn');
  await page.setInputFiles('#labFileInput', path.join(fixtures, 'namuna-qon-tahlili.pdf'));
  await page.click('#labAnalyzeBtn');
  await page.waitForSelector('#labProgress:not([hidden])');
  await page.click('#labCancelBtn');
  await page.waitForSelector('#labProgress', { state: 'hidden' });
  assert(await page.locator('#analysisStage1').isVisible(), '1-bosqichda qolish kerak');
  await page.unroute('**/api/analyze-report');
});

await check('Dori qoʻllanmasi: yoʻriqnoma fayli (doza koʻrsatilmaydi)', async () => {
  await page.goto(`${BASE}/#/medicine`);
  await page.click('#tab-file');
  await page.setInputFiles('#medFileInput', path.join(fixtures, 'namuna-yoriqnoma.txt'));
  await page.click('#medFileBtn');
  await page.waitForSelector('#medicineResult .med-section');
  const text = await page.locator('#medicineResult').innerText();
  assert(text.includes('Namuna-dori 500') && text.includes('sezuvchanlik'), 'boʻlimlar koʻrsatilmadi');
  assert(!text.includes('koʻrsatilmasligi kerak'), 'dozalash boʻlimi koʻrinib qoldi');
  assert(!/\bnull\b|undefined/.test(text), 'sahifada null/undefined matni bor');
  await page.screenshot({ path: `${SHOTS}/desktop-09-medicine.png`, fullPage: true });
});

await check('Dori qoʻllanmasi: nom boʻyicha (demo — ochiq «mavjud emas» holati) va validatsiya', async () => {
  await page.click('#tab-name');
  await page.click('#medNameForm button[type="submit"]');
  assert(await page.locator('#medNameError').isVisible(), 'boʻsh nom xatosi koʻrinmadi');
  await page.fill('#medNameInput', 'Paratsetamol');
  await page.click('#medNameForm button[type="submit"]');
  await page.waitForSelector('#medicineResult .state-card--warning');
});

await check('Tibbiy kutubxona: qidiruv, boʻsh natija va batafsil oyna', async () => {
  await page.goto(`${BASE}/#/library`);
  await page.waitForSelector('.term-card');
  assert((await page.locator('.term-card').count()) === 26, '26 ta atama boʻlishi kerak');
  await page.fill('#librarySearch', 'crp');
  await page.waitForFunction(() => document.querySelectorAll('.term-card').length === 1);
  await page.fill('#librarySearch', 'zzzz');
  await page.waitForSelector('.empty-state');
  await page.click('#libraryClear');
  await page.locator('.term-card', { hasText: 'Kreatinin' }).click();
  await page.waitForSelector('.modal.is-open .term-detail');
  await page.screenshot({ path: `${SHOTS}/desktop-10-library-detail.png` });
  await page.click('.modal__footer .btn--primary');
  await page.waitForFunction(() => location.hash.startsWith('#/chat') && document.querySelector('#chatInput').value.includes('Kreatinin'));
});

await check('13. Navigatsiyadagi barcha tugmalar', async () => {
  const routes = { chat: 'AI yordamchi', analysis: 'Tibbiy tahlil', medicine: 'Dori qoʻllanmasi', library: 'Tibbiy kutubxona', history: 'Suhbatlar tarixi', about: 'Loyiha haqida' };
  for (const [route, title] of Object.entries(routes)) {
    await page.click(`.nav__item[data-route="${route}"]`);
    await page.waitForFunction((t) => document.querySelector('#pageTitle').textContent === t, title);
    assert(await page.locator(`#view-${route}`).isVisible(), `${route} koʻrinmadi`);
  }
  await page.click('.profile-card');
  await page.waitForFunction(() => document.querySelector('#pageTitle').textContent === 'Profil va sozlamalar');
  await page.click('#profileBtn');
  await page.waitForSelector('#profileMenu:not([hidden])');
  await page.keyboard.press('Escape');
  await page.click('#statusPill');
  await page.waitForSelector('.modal.is-open');
  await page.keyboard.press('Escape');
  await page.selectOption('#langSelect', 'ru');
  assert((await page.inputValue('#langSelect')) === 'uz', 'til oʻzbekchaga qaytmadi');
});

await check('«Sinab koʻring»: savoldagi qiymatni oraliq bilan solishtirish', async () => {
  await page.click('#newChatBtn');
  await page.waitForSelector('#welcome:not([hidden])');
  const before = await page.locator('.msg--ai').count();
  await page.locator('.try-chip').first().click();
  await page.waitForFunction((n) => document.querySelectorAll('.msg--ai:not(.msg--typing)').length > n, before);
  const text = await page.locator('.msg--ai').last().innerText();
  assert(text.includes('natijangiz haqida') && text.includes('past'), 'qiymat solishtirilmadi');
});

await check('Dori qoʻllanmasi: «Namuna yoʻriqnoma» tugmasi', async () => {
  await page.goto(`${BASE}/#/medicine`);
  await page.click('#medSampleBtn');
  await page.waitForFunction(() => document.querySelector('#medicineResult .card__title')?.textContent === 'Namuna-dori 500');
});

await check('Loyiha haqida: taqdimot sahifasi va tugmalari', async () => {
  await page.goto(`${BASE}/#/about`);
  await page.waitForSelector('#view-about:not([hidden]) .about-hero');
  assert((await page.locator('.about-card').count()) >= 9, 'imkoniyat kartalari yetarli emas');
  await page.screenshot({ path: `${SHOTS}/desktop-12-about.png` });
  await page.locator('[data-about-action="sample"]').click();
  await page.waitForSelector('#view-analysis:not([hidden]) #labFileChip:not([hidden])');
  await page.click('#labRemoveBtn');
});

await check('Sozlamalar: ism validatsiyasi va saqlash', async () => {
  await page.goto(`${BASE}/#/settings`);
  await page.fill('#profileName', 'Test123');
  await page.click('#profileForm button[type="submit"]');
  assert(await page.locator('#profileNameError').isVisible(), 'ism validatsiyasi ishlamadi');
  await page.fill('#profileName', 'Aziza');
  await page.click('#profileForm button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#sidebarName').textContent === 'Aziza');
  await page.screenshot({ path: `${SHOTS}/desktop-11-settings.png`, fullPage: true });
});

await check('Klaviatura: Tab bilan navigatsiya va skip-link', async () => {
  await page.goto(`${BASE}/#/chat`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement.classList.contains('skip-link')), 'birinchi Tab skip-link ga tushmadi');
});

// ---------- Mobil ----------
const mobile = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

await check('12. Mobil ekran: drawer, chat va sahifalar', async () => {
  await mobile.screenshot({ path: `${SHOTS}/mobile-01-welcome.png` });
  assert(!(await mobile.locator('#sidebar').evaluate((el) => el.classList.contains('is-open'))), 'drawer boshida yopiq boʻlishi kerak');
  await mobile.click('#menuBtn');
  await mobile.waitForSelector('#sidebar.is-open');
  await mobile.waitForTimeout(300);
  await mobile.screenshot({ path: `${SHOTS}/mobile-02-drawer.png` });
  await mobile.click('.nav__item[data-route="analysis"]');
  await mobile.waitForSelector('#sidebar:not(.is-open)', { state: 'attached' });
  await mobile.waitForSelector('#view-analysis:not([hidden])');
  await mobile.setInputFiles('#labFileInput', path.join(fixtures, 'namuna-qon-tahlili.pdf'));
  await mobile.click('#labAnalyzeBtn');
  await mobile.waitForSelector('#confirmRows tr');
  await mobile.screenshot({ path: `${SHOTS}/mobile-03-confirm.png`, fullPage: true });
  await mobile.click('#confirmForm button[type="submit"]');
  await mobile.waitForSelector('.result-card');
  await mobile.screenshot({ path: `${SHOTS}/mobile-04-result.png`, fullPage: true });
  await mobile.goto(`${BASE}/#/chat`);
  await ask(mobile, 'Umumiy qon tahlilidagi koʻrsatkichlar nimani anglatadi?');
  await mobile.screenshot({ path: `${SHOTS}/mobile-05-chat.png` });
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!overflow, 'gorizontal scroll paydo boʻldi');
});

await check('Laptop va planshet oʻlchamlari', async () => {
  for (const [w, h, name] of [[1024, 768, 'laptop'], [768, 1024, 'tablet']]) {
    await mobile.setViewportSize({ width: w, height: h });
    await mobile.goto(`${BASE}/#/library`);
    await mobile.waitForSelector('.term-card');
    await mobile.screenshot({ path: `${SHOTS}/${name}-library.png` });
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert(!overflow, `${name}: gorizontal scroll`);
  }
});

// ---------- Serversiz (statik) rejim: dist/ API'siz beriladi ----------
await check('Statik rejim (serversiz): chat, PDF tahlil (pdf.js) va dori brauzerda ishlaydi', async () => {
  execSync('node scripts/build.mjs', { cwd: path.resolve(here, '../..'), stdio: 'ignore' });
  const express = require('express');
  const staticApp = express();
  staticApp.use((req, res, next) => { res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'"); next(); });
  staticApp.use(express.static(path.resolve(here, '../../dist')));
  const st = staticApp.listen(0, '127.0.0.1');
  await new Promise((r) => st.once('listening', r));
  const SBASE = `http://127.0.0.1:${st.address().port}`;
  try {
    const sp = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    const errs = [];
    sp.on('pageerror', (e) => errs.push(e.message));
    await sp.goto(SBASE, { waitUntil: 'networkidle' });
    await sp.waitForFunction(() => document.querySelector('#statusText').textContent === 'Demo rejim');
    const msg = await ask(sp, 'Gemoglobinim 112 g/L, meʼyor 120–160');
    assert((await msg.innerText()).includes('natijangiz haqida'), 'statik chat ishlamadi');
    await sp.goto(`${SBASE}/#/analysis`);
    await sp.setInputFiles('#labFileInput', path.join(fixtures, 'namuna-qon-tahlili.pdf'));
    await sp.click('#labAnalyzeBtn');
    await sp.waitForSelector('#confirmRows tr', { timeout: 20000 });
    assert((await sp.locator('#confirmRows tr').count()) === 8, 'brauzerdagi PDF oʻqish 8 qator bermadi');
    await sp.goto(`${SBASE}/#/medicine`);
    await sp.click('#medSampleBtn');
    await sp.waitForSelector('#medicineResult .med-section');
    assert(errs.length === 0, errs.join(' | '));
    await sp.close();
  } finally {
    st.close();
  }
});

await check('Brauzer konsolida xatolar yoʻq', async () => {
  const real = consoleErrors.filter((e) => !e.includes('net::ERR_FAILED') && !e.includes('Failed to load resource'));
  assert(real.length === 0, real.join(' | '));
});

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\nNatija: ${results.length - failed.length}/${results.length} test oʻtdi. Skrinshotlar: ${SHOTS}\n`);
process.exit(failed.length ? 1 : 0);
