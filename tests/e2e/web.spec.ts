import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { finishOnboarding, launchApp, nav } from './helpers';
import { MOCK_YOUTUBE_KEY, startMockAiServer, type MockAiServer } from './mock-ai-server';

/** PHASE 6 E2E: YouTube API qidiruvi (haqiqiy HTTP soxta serverga), brauzerda ochish (tasdiq bilan). */
let dataDir: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-web-'));
  mock = await startMockAiServer();
});

test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function stubBrowser(app: ElectronApplication) {
  await app.evaluate(({ shell }) => {
    (globalThis as Record<string, unknown>)['__external'] = [];
    shell.openExternal = async (url: string) => {
      ((globalThis as Record<string, unknown>)['__external'] as string[]).push(url);
    };
  });
}
const externals = (app: ElectronApplication) =>
  app.evaluate(() => (globalThis as Record<string, unknown>)['__external'] as string[]);

async function ask(page: Page, text: string) {
  await nav(page).getByRole('link', { name: 'Suhbat' }).click();
  await page.getByLabel('Xabar', { exact: true }).fill(text);
  await page.getByLabel('Xabar', { exact: true }).press('Enter');
}

test('YouTube kaliti → haqiqiy qidiruv natijasi → havolani ochish (tasdiq bilan)', async () => {
  const { app, page } = await launchApp(dataDir, { MARIUS_YOUTUBE_BASE_URL: mock.url });
  try {
    await finishOnboarding(page);
    await stubBrowser(app);
    await page.evaluate(async (url) => {
      await window.marius.ai.updateSettings({
        provider: 'ollama',
        ollamaBaseUrl: url,
        ollamaModel: 'mock-uz:latest',
      });
    }, mock.url);
    const status = await page.evaluate(() => window.marius.youtube.status());
    test.skip(!(status.ok && status.data.secretStorageAvailable), 'Kalitni shifrlab saqlab bo‘lmaydi');

    // Sozlamalar orqali kalit (sinov qidiruvi bilan tekshiriladi)
    await nav(page).getByRole('link', { name: 'Sozlamalar' }).click();
    await page.getByLabel('YouTube API kaliti').fill('notogri-kalit-123');
    await page.getByRole('button', { name: 'Saqlash' }).last().click();
    await expect(page.getByText(/YouTube uni qabul qilmadi/)).toBeVisible();
    await page.getByLabel('YouTube API kaliti').fill(MOCK_YOUTUBE_KEY);
    await page.getByRole('button', { name: 'Saqlash' }).last().click();
    await expect(page.getByText(/Kalit saqlandi va ishlayapti/)).toBeVisible();
    // ASCII bo'lmagan belgili kalit qabul qilinmaydi (HTTP header'ga sig'maydi)
    const bad = await page.evaluate(() => window.marius.youtube.setKey('kalit‘bilan-apostrof'));
    expect(bad).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });

    await ask(
      page,
      `YouTube’dan C++ video top TOOL:${JSON.stringify({ name: 'youtube_search', arguments: { query: 'C++ for loop o‘zbek tilida' } })}`,
    );
    await expect(page.getByText('Natija: YouTube’dan 1 ta video topildi.')).toBeVisible();
    const ytReq = mock.requests.filter((r) => r.path === '/youtube/v3/search').at(-1)!;
    expect(ytReq.headers['x-goog-api-key']).toBe(MOCK_YOUTUBE_KEY);
    // Vosita natijasi modelga haqiqiy ma'lumot bilan yuborilgan
    const toolTurn = mock.requests
      .filter((r) => r.path === '/api/chat')
      .map((r) => (r.body as { messages: { role: string; content: string }[] }).messages.at(-1)!)
      .find((m) => m.role === 'tool')!;
    expect(JSON.parse(toolTurn.content).data.videos[0]).toMatchObject({
      title: "C++ for sikli 'o‘zbek tilida'",
      channel: 'Dasturlash Darslari',
      url: 'https://www.youtube.com/watch?v=uzCpp01',
    });

    await page
      .getByLabel('Xabar', { exact: true })
      .fill(
        `Birinchisini och TOOL:${JSON.stringify({ name: 'open_url', arguments: { url: 'https://www.youtube.com/watch?v=uzCpp01' } })}`,
      );
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText('www.youtube.com', { exact: false })).toBeVisible();
    expect(await externals(app)).toEqual([]);
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByText('Natija: www.youtube.com brauzerda ochildi.')).toBeVisible();
    expect(await externals(app)).toEqual(['https://www.youtube.com/watch?v=uzCpp01']);
  } finally {
    await app.close();
  }
});

test('brauzerda qidiruv: rad etilsa ochilmaydi, tasdiqlansa tanlangan qidiruv tizimida ochiladi', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await stubBrowser(app);
    await page.evaluate(async (url) => {
      await window.marius.ai.updateSettings({
        provider: 'ollama',
        ollamaBaseUrl: url,
        ollamaModel: 'mock-uz:latest',
      });
      await window.marius.settings.update({ searchEngine: 'duckduckgo' });
    }, mock.url);
    const call = `TOOL:${JSON.stringify({ name: 'web_search', arguments: { query: 'sun’iy intellekt' } })}`;
    await ask(page, `Qidir ${call}`);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Bekor qilish' }).click();
    await expect(page.getByText(/Natija: Foydalanuvchi amalni bekor qildi/)).toBeVisible();
    expect(await externals(app)).toEqual([]);

    await page.getByLabel('Xabar', { exact: true }).fill(`Yana ${call}`);
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByText(/Natija: DuckDuckGo’da qidiruv brauzerda ochildi/)).toBeVisible();
    expect(await externals(app)).toEqual([
      `https://duckduckgo.com/?q=${encodeURIComponent('sun’iy intellekt')}`,
    ]);
  } finally {
    await app.close();
  }
});
