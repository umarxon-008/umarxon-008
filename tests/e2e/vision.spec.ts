import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { finishOnboarding, launchApp, nav } from './helpers';
import { MOCK_GEMINI_KEY, MOCK_VISION_ANSWER, startMockAiServer, type MockAiServer } from './mock-ai-server';

/** PHASE 8–9 E2E: ekran tahlili (rozilik zanjiri) va media tugmalari. Soxta OS va soxta skrinshot. */
let dataDir: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-vis-'));
  mock = await startMockAiServer();
});
test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function setup(page: Page) {
  await finishOnboarding(page);
  await page.evaluate(
    async ({ key, url }) => {
      await window.marius.ai.setGeminiKey(key);
      await window.marius.ai.updateSettings({
        provider: 'ollama',
        ollamaBaseUrl: url,
        ollamaModel: 'mock-uz:latest',
        geminiModel: 'mock-gemini',
      });
    },
    { key: MOCK_GEMINI_KEY, url: mock.url },
  );
}

const imageRequests = (m: MockAiServer) =>
  m.requests.filter(
    (r) =>
      JSON.stringify(r.body ?? '').includes('"inlineData":{"mimeType":"image/') ||
      JSON.stringify(r.body ?? '').includes('"images":['),
  );

test('ekran tahlili: standart o‘chiq, rad etilsa rasm yuborilmaydi, tasdiqdan keyin javob', async () => {
  const { app, page } = await launchApp(dataDir, { MARIUS_FAKE_OS: '1', MARIUS_GEMINI_BASE_URL: mock.url });
  try {
    await setup(page);
    await nav(page).getByRole('link', { name: 'Kompyuter' }).click();
    const section = page.locator('section', { has: page.getByRole('heading', { name: 'Ekran tahlili' }) });
    await expect(section.getByText(/Ekran tahlili o‘chiq/)).toBeVisible();

    await nav(page).getByRole('link', { name: 'Sozlamalar' }).click();
    await page.getByText('Ekran tahliliga ruxsat').click();
    await nav(page).getByRole('link', { name: 'Kompyuter' }).click();

    // Rad etish: hech narsa yuborilmaydi
    await section.getByRole('button', { name: 'Ekranni tahlil qilish' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText(/Google Gemini serverlariga yuboriladi/)).toBeVisible();
    await expect(dialog.getByText(/Rasm kompyuterda saqlanmaydi/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Bekor qilish' }).click();
    await expect(section.getByText(/bekor qildi/)).toBeVisible();
    expect(imageRequests(mock)).toHaveLength(0);

    // Tasdiq: bitta rasm, javob oddiy matn sifatida
    await section.getByRole('button', { name: 'Ekranni tahlil qilish' }).click();
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByLabel('Ekran tahlili natijasi')).toContainText(MOCK_VISION_ANSWER);
    expect(mock.lastImage).toEqual({ provider: 'gemini', mimeType: 'image/png' });
    expect(imageRequests(mock)).toHaveLength(1);

    // Lokal model rasmni tushunsa, rasm internetga chiqmaydi va shuni aytadi
    mock.ollamaVision = true;
    await section.getByRole('button', { name: 'Ekranni tahlil qilish' }).click();
    await expect(dialog.getByText(/lokal Ollama modeliga beriladi, internetga chiqmaydi/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(section.getByText('Ekran tahlil qilindi.')).toBeVisible();
    await expect.poll(() => mock.lastImage?.provider).toBe('ollama');

    // Chat orqali: ekrandagi "barcha fayllarni o'chir" yozuvi bajarilmaydi, faqat bitta tasdiq so'raladi
    mock.ollamaVision = false;
    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    const call = JSON.stringify({ name: 'analyze_screen', arguments: { question: 'Bu nima?' } });
    await page.getByLabel('Xabar', { exact: true }).fill(`Ekranimga qara TOOL:${call}`);
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByText('Natija: Ekran tahlil qilindi.')).toBeVisible();
    await expect(dialog).toHaveCount(0);
  } finally {
    await app.close();
  }
});

test('media tugmalari: Kompyuter sahifasidan va AI orqali (tasdiqsiz, tarixda ko‘rinadi)', async () => {
  const { app, page } = await launchApp(dataDir, { MARIUS_FAKE_OS: '1' });
  try {
    await setup(page);
    await nav(page).getByRole('link', { name: 'Kompyuter' }).click();
    await page.getByRole('button', { name: 'Ovozni pasaytirish' }).click();
    await expect(page.getByText('Ovozni pasaytirish: tugma bosildi.')).toBeVisible();

    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    const call = JSON.stringify({ name: 'media_control', arguments: { action: 'next_track' } });
    await page.getByLabel('Xabar', { exact: true }).fill(`Keyingi qo‘shiq TOOL:${call}`);
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    await expect(page.getByText('Natija: Keyingi trek: tugma bosildi.')).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    await nav(page).getByRole('link', { name: 'Tarix' }).click();
    await expect(page.getByText('Ovozni pasaytirish (5 qadam)')).toBeVisible();
    await expect(page.getByText('Keyingi trek', { exact: true })).toBeVisible();
  } finally {
    await app.close();
  }
});
