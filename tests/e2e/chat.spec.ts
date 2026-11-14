import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { finishOnboarding, launchApp, nav } from './helpers';
import { MOCK_GEMINI_KEY, startMockAiServer, type MockAiServer } from './mock-ai-server';

/**
 * PHASE 2 E2E: haqiqiy Electron ilovasi soxta AI serverga haqiqiy HTTP so'rov yuboradi.
 * main → fetch → oqim → IPC hodisalari → React UI → SQLite zanjiri to'liq sinaladi.
 */

let dataDir: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-chat-'));
  mock = await startMockAiServer();
});

test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function configureOllamaViaUi(page: Page, url: string) {
  await nav(page).getByRole('link', { name: 'Sozlamalar' }).click();
  await page.getByRole('radio', { name: /Ollama/ }).click();
  const input = page.getByLabel('Ollama manzili');
  await input.fill(url);
  const ai = page.locator('#ai');
  await ai.getByRole('button', { name: 'Saqlash' }).click();
  await ai.getByRole('button', { name: 'Ulanishni tekshirish' }).click();
  await expect(page.getByText('Ulanish muvaffaqiyatli. 1 ta model topildi.')).toBeVisible();
  await page.getByRole('combobox', { name: 'AI model' }).selectOption('mock-uz:latest');
}

test('AI sozlanmagan: suhbat sahifasi sozlashga yo‘naltiradi', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    await expect(page.getByText('AI hali ulanmagan')).toBeVisible();
    await expect(page.getByLabel('Xabar', { exact: true })).toBeDisabled();
  } finally {
    await app.close();
  }
});

test('Ollama: sozlash → xabar yuborish → oqimli javob → restartdan keyin saqlangan', async () => {
  let { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await configureOllamaViaUi(page, mock.url);

    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    await expect(page.getByText('Ollama · mock-uz:latest · lokal')).toBeVisible();
    await page.getByLabel('Xabar', { exact: true }).fill('Salom, MARIUS!');
    await page.getByLabel('Xabar', { exact: true }).press('Enter');

    const log = page.getByRole('log', { name: 'Xabarlar' });
    await expect(log.getByText('Salom, MARIUS!')).toBeVisible();
    await expect(log.getByText(/Assalomu alaykum! Men/)).toBeVisible();
    await expect(log.locator('strong', { hasText: 'MARIUS' }).last()).toBeVisible(); // **MARIUS** → qalin
    await expect(page.getByRole('button', { name: 'Yuborish' })).toBeVisible(); // oqim tugadi

    // So'rov: tizim ko'rsatmasi + foydalanuvchi xabari
    const chatReq = mock.requests.find((r) => r.path === '/api/chat')!;
    const msgs = (chatReq.body as { messages: { role: string; content: string }[] }).messages;
    expect(msgs[0]!.role).toBe('system');
    expect(msgs[0]!.content).toContain('MARIUS');
    expect(msgs.at(-1)).toEqual({ role: 'user', content: 'Salom, MARIUS!' });
  } finally {
    await app.close();
  }

  ({ app, page } = await launchApp(dataDir));
  try {
    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    await page.locator('.conv-item__open', { hasText: 'Salom, MARIUS!' }).click();
    await expect(
      page.getByRole('log', { name: 'Xabarlar' }).getByText(/O‘zbek tilida yordam beraman/),
    ).toBeVisible();
  } finally {
    await app.close();
  }
});

test('javobni to‘xtatish va xatodan keyin qayta urinish', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await page.evaluate(async (url) => {
      await window.marius.ai.updateSettings({
        provider: 'ollama',
        ollamaBaseUrl: url,
        ollamaModel: 'mock-uz:latest',
      });
    }, mock.url);
    await nav(page).getByRole('link', { name: 'Suhbat' }).click();

    // To'xtatish
    await page.getByLabel('Xabar', { exact: true }).fill('SEKIN javob ber');
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    await expect(page.getByText('so‘z2')).toBeVisible();
    await page.getByRole('button', { name: 'Javobni to‘xtatish' }).click();
    await expect(page.getByText('⏹ To‘xtatildi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yuborish' })).toBeVisible();

    // Xato → o'zbekcha xabar → qayta urinish
    mock.failNext = true;
    await page.getByLabel('Xabar', { exact: true }).fill('Ikkinchi savol');
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    await expect(page.getByText(/Ollama ishlayapti, lekin xato qaytardi \(500 mock failure\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Qayta urinish' }).click();
    await expect(page.getByText(/O‘zbek tilida yordam beraman/).last()).toBeVisible();
    await expect(page.getByText(/xato qaytardi/)).toHaveCount(0);
  } finally {
    await app.close();
  }
});

test('Gemini API kaliti: Windows’da shifrlab saqlanadi, boshqa tizimlarda ochiq matnda saqlanmaydi', async () => {
  const { app, page } = await launchApp(dataDir, { MARIUS_GEMINI_BASE_URL: mock.url });
  try {
    await finishOnboarding(page);
    await nav(page).getByRole('link', { name: 'Sozlamalar' }).click();
    await page.getByRole('radio', { name: /Google Gemini/ }).click();
    const ai = await page.evaluate(() => window.marius.ai.getSettings());
    expect(ai.ok).toBe(true);
    const encryptionAvailable = ai.ok && ai.data.secretStorageAvailable;

    if (process.platform === 'win32') {
      // Windows'da DPAPI har doim mavjud bo'lishi kerak
      expect(encryptionAvailable).toBe(true);
    }

    if (encryptionAvailable) {
      await page.getByLabel('Gemini API kalit').fill(MOCK_GEMINI_KEY);
      await page.locator('#ai').getByRole('button', { name: 'Saqlash' }).click();
      await expect(page.getByText('API kalit saqlangan')).toBeVisible();
      await expect(page.getByText('Ulanish muvaffaqiyatli. 1 ta model topildi.')).toBeVisible();
      await expect(page.getByLabel('Gemini API kalit')).toHaveValue(''); // UI'da qolmaydi
      await page.getByRole('combobox', { name: 'AI model' }).selectOption('mock-gemini');

      await nav(page).getByRole('link', { name: 'Suhbat' }).click();
      await expect(page.getByText(/Gemini ishlatilmoqda: xabarlaringiz/)).toBeVisible();
      await page.getByLabel('Xabar', { exact: true }).fill('Salom');
      await page.getByLabel('Xabar', { exact: true }).press('Enter');
      await expect(page.getByText(/O‘zbek tilida yordam beraman/)).toBeVisible();
      const geminiReq = mock.requests.find((r) => r.path.includes(':streamGenerateContent'))!;
      expect(geminiReq.headers['x-goog-api-key']).toBe(MOCK_GEMINI_KEY);
    } else {
      // Shifrlash yo'q: ogohlantirish ko'rinadi va saqlash tugmasi o'chiq
      await expect(page.getByText(/kalitni shifrlab saqlash imkoni yo‘q/)).toBeVisible();
      await page.getByLabel('Gemini API kalit').fill(MOCK_GEMINI_KEY);
      await expect(page.locator('#ai').getByRole('button', { name: 'Saqlash' })).toBeDisabled();
      const direct = await page.evaluate((k) => window.marius.ai.setGeminiKey(k), MOCK_GEMINI_KEY);
      expect(direct).toMatchObject({ ok: false, error: { code: 'SECRET_STORAGE_UNAVAILABLE' } });
    }
  } finally {
    await app.close();
  }

  // Kalit hech qayerda ochiq matnda yo'q: DB (WAL bilan) va loglar
  const needle = Buffer.from(MOCK_GEMINI_KEY);
  const files = [
    ...readdirSync(dataDir)
      .filter((f) => f.startsWith('marius.db'))
      .map((f) => join(dataDir, f)),
    ...readdirSync(join(dataDir, 'logs')).map((f) => join(dataDir, 'logs', f)),
  ];
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) expect(readFileSync(f).includes(needle), f).toBe(false);
});
