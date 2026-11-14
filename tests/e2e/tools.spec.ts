import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { finishOnboarding, launchApp, nav } from './helpers';
import {
  MOCK_GEMINI_KEY,
  MOCK_THOUGHT_SIGNATURE,
  startMockAiServer,
  type MockAiServer,
} from './mock-ai-server';

/**
 * PHASE 4 E2E: AI → vosita chaqiruvi → tasdiq oynasi → amal → natijani tekshirish → audit (Tarix).
 * Soxta OS (MARIUS_FAKE_OS=1, faqat dev/test) haqiqiy dasturlarni ochmasdan butun zanjirni sinaydi.
 */
const FAKE_OS = { MARIUS_FAKE_OS: '1' };

let dataDir: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-tools-'));
  mock = await startMockAiServer();
});

test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
});

/** Bu fayl AI → tasdiq oynasi zanjirini sinaydi: tezkor buyruqlar o'chiriladi (ular alohida sinaladi) */
async function useOllama(page: Page) {
  await page.evaluate(async (url) => {
    await window.marius.settings.update({ quickCommands: false });
    await window.marius.ai.updateSettings({
      provider: 'ollama',
      ollamaBaseUrl: url,
      ollamaModel: 'mock-uz:latest',
    });
  }, mock.url);
}

async function ask(page: Page, text: string) {
  await nav(page).getByRole('link', { name: 'Suhbat' }).click();
  await page.getByLabel('Xabar', { exact: true }).fill(text);
  await page.getByLabel('Xabar', { exact: true }).press('Enter');
}

test('“Kalkulyatorni och” → tasdiq oynasi → tasdiqlash → ochildi → Tarix', async () => {
  const { app, page } = await launchApp(dataDir, FAKE_OS);
  try {
    await finishOnboarding(page);
    await useOllama(page);
    await ask(page, 'Kalkulyatorni och');

    const dialog = page.getByRole('alertdialog', { name: 'MARIUS ruxsat so‘rayapti' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Dasturni ochish')).toBeVisible();
    await expect(dialog.getByText('Calculator', { exact: true })).toBeVisible();
    await expect(dialog.getByText('2 · Qaytariladigan amal')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Bekor qilish' })).toBeFocused(); // xavfsiz standart
    // Tasdiqlashdan oldin hech narsa ochilmagan
    const before = await page.evaluate(() => window.marius.computer.listWindows());
    expect(before.ok && before.data.some((w) => w.title === 'Calculator')).toBe(false);

    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(dialog).toBeHidden();
    const card = page.locator('.tool-card').filter({ hasText: 'Dastur ochish: kalkulyator' });
    await expect(card.getByText('Bajarildi')).toBeVisible();
    await expect(card.getByText('Calculator ochildi.')).toBeVisible();
    await expect(
      page.getByRole('log', { name: 'Xabarlar' }).getByText('Kalkulyator ochildi.', { exact: true }),
    ).toBeVisible();

    const after = await page.evaluate(() => window.marius.computer.listWindows());
    expect(after.ok && after.data.some((w) => w.title === 'Calculator')).toBe(true);

    // Tool natijasi modelga yuborilgan (role "tool")
    const toolTurn = mock.requests
      .filter((r) => r.path === '/api/chat')
      .map((r) => (r.body as { messages: { role: string; content: string }[] }).messages.at(-1)!)
      .find((m) => m.role === 'tool')!;
    expect(JSON.parse(toolTurn.content)).toMatchObject({ ok: true, verified: true });

    await nav(page).getByRole('link', { name: 'Tarix' }).click();
    const row = page.getByRole('row').filter({ hasText: 'Dastur ochish: kalkulyator' });
    await expect(row.getByText('Tasdiqlandi')).toBeVisible();
    await expect(row.getByText('Bajarildi')).toBeVisible();
    await expect(row.getByText('MARIUS')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('rad etilsa dastur ochilmaydi va bu suhbatda hamda Tarixda ko‘rinadi', async () => {
  const { app, page } = await launchApp(dataDir, FAKE_OS);
  try {
    await finishOnboarding(page);
    await useOllama(page);
    await ask(page, 'Kalkulyatorni och');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await expect(page.locator('.tool-card').getByText('Bekor qilindi')).toBeVisible();
    await expect(page.getByText('Amal bajarilmadi.')).toBeVisible();
    const after = await page.evaluate(() => window.marius.computer.listWindows());
    expect(after.ok && after.data.some((w) => w.title === 'Calculator')).toBe(false);

    await nav(page).getByRole('link', { name: 'Tarix' }).click();
    await expect(
      page.getByRole('row').filter({ hasText: 'kalkulyator' }).getByText('Rad etildi'),
    ).toBeVisible();
  } finally {
    await app.close();
  }
});

test('Kompyuter sahifasi: dastur qidirish, ochish (siz bosgansiz), oynaga o‘tish', async () => {
  const { app, page } = await launchApp(dataDir, FAKE_OS);
  try {
    await finishOnboarding(page);
    await nav(page).getByRole('link', { name: 'Kompyuter' }).click();
    await expect(page.getByRole('heading', { name: /Dasturlar \(6\)/ })).toBeVisible();
    await page.getByPlaceholder('Qidirish…').fill('note');
    const apps = page.getByRole('list', { name: 'Dasturlar' });
    await expect(apps.getByRole('listitem')).toHaveCount(1);
    await apps.getByRole('button', { name: 'Notepad ni ochish' }).click();
    await expect(page.getByText('Notepad ochildi.')).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0); // foydalanuvchi o'zi bosdi: qo'shimcha tasdiq yo'q

    const windows = page.getByRole('list', { name: 'Ochiq oynalar' });
    await windows.getByRole('button', { name: '“Notepad” oynasiga o‘tish' }).click();
    await expect(page.getByText('“Notepad” oynasiga o‘tildi.')).toBeVisible();

    await nav(page).getByRole('link', { name: 'Tarix' }).click();
    const row = page.getByRole('row').filter({ hasText: 'Dastur ochish' });
    await expect(row.getByText('Siz bosgansiz')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('Gemini: function calling va thoughtSignature keyingi so‘rovda o‘zgarmasdan qaytariladi', async () => {
  const { app, page } = await launchApp(dataDir, { ...FAKE_OS, MARIUS_GEMINI_BASE_URL: mock.url });
  try {
    await finishOnboarding(page);
    const ai = await page.evaluate(() => window.marius.ai.getSettings());
    test.skip(!(ai.ok && ai.data.secretStorageAvailable), 'Bu tizimda kalitni shifrlab saqlab bo‘lmaydi');
    await page.evaluate(async (key) => {
      await window.marius.settings.update({ quickCommands: false });
      await window.marius.ai.setGeminiKey(key);
      await window.marius.ai.updateSettings({ provider: 'gemini', geminiModel: 'mock-gemini' });
    }, MOCK_GEMINI_KEY);
    await ask(page, 'Kalkulyatorni och');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(
      page.getByRole('log', { name: 'Xabarlar' }).getByText('Kalkulyator ochildi.', { exact: true }),
    ).toBeVisible();

    const followUp = mock.requests.filter((r) => r.path.includes(':streamGenerateContent')).at(-1)!;
    const contents = (followUp.body as { contents: { role: string; parts: Record<string, unknown>[] }[] })
      .contents;
    expect(contents.at(-2)).toMatchObject({
      role: 'model',
      parts: [{ functionCall: { name: 'launch_app' }, thoughtSignature: MOCK_THOUGHT_SIGNATURE }],
    });
    expect(contents.at(-1)).toMatchObject({
      role: 'user',
      parts: [{ functionResponse: { name: 'launch_app', response: { ok: true } } }],
    });
  } finally {
    await app.close();
  }
});

test('haqiqiy OS adapteri: Windows’da Start menyusi dasturlari o‘qiladi, boshqa tizimda tushunarli xabar', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    const info = await page.evaluate(() => window.marius.computer.info());
    expect(info.ok).toBe(true);
    if (process.platform === 'win32') {
      const apps = await page.evaluate(() => window.marius.computer.listApps(true));
      expect(apps.ok && apps.data.length).toBeGreaterThan(0);
      const wins = await page.evaluate(() => window.marius.computer.listWindows());
      expect(wins.ok).toBe(true);
      // Haqiqiy Get-Process skripti: jarayonlar, RAM, CPU va tizim jarayonlari himoyasi
      const procs = await page.evaluate(() => window.marius.computer.listProcesses('memory'));
      expect(procs.ok).toBe(true);
      if (procs.ok) {
        expect(procs.data.groups.length).toBeGreaterThan(3);
        expect(procs.data.groups[0]!.memoryBytes).toBeGreaterThan(0);
        expect(procs.data.groups.some((g) => g.cpuPercent !== null)).toBe(true);
        expect(procs.data.groups.find((g) => g.name.toLowerCase() === 'svchost')?.protected).toBe(true);
        // MARIUS o'zini yopa olmaydi
        expect(procs.data.groups.find((g) => /^electron$/i.test(g.name))?.protected ?? true).toBe(true);
      }
    } else {
      const procs = await page.evaluate(() => window.marius.computer.listProcesses('memory'));
      expect(procs).toMatchObject({ ok: false, error: { code: 'OS_UNSUPPORTED' } });
      expect(info.ok && info.data.supported).toBe(false);
      await nav(page).getByRole('link', { name: 'Kompyuter' }).click();
      await expect(page.getByText(/faqat Windows’da mavjud/)).toBeVisible();
    }
  } finally {
    await app.close();
  }
});

test('tezkor buyruqlar: AI’siz va tasdiqsiz bir zumda ochadi; yopishda tasdiq so‘raladi', async () => {
  const { app, page } = await launchApp(dataDir, FAKE_OS);
  try {
    await finishOnboarding(page);
    await page.evaluate(async (url) => {
      await window.marius.ai.updateSettings({
        provider: 'ollama',
        ollamaBaseUrl: url,
        ollamaModel: 'mock-uz:latest',
      });
    }, mock.url);
    const aiCalls = () => mock.requests.filter((r) => r.path === '/api/chat').length;
    const log = page.getByRole('log', { name: 'Xabarlar' });

    const started = Date.now();
    await ask(page, 'Kalkulyatorni och');
    await expect(log.getByText('Calculator ochildi.', { exact: true }).first()).toBeVisible();
    expect(Date.now() - started).toBeLessThan(3000);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    expect(aiCalls()).toBe(0); // AI'ga hech narsa yuborilmadi

    await page.getByLabel('Xabar', { exact: true }).fill('ovozni pasaytir');
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    await expect(log.getByText('Ovozni pasaytirish: tugma bosildi.').first()).toBeVisible();

    await page.getByLabel('Xabar', { exact: true }).fill('Telegramni yop');
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText('Dasturni yopish', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(log.getByText('Telegram yopildi.').first()).toBeVisible();

    expect(aiCalls()).toBe(0);

    // Noma'lum dastur: tezkor yo'l ishlamaydi, so'rov AI'ga yuboriladi
    await page.getByLabel('Xabar', { exact: true }).fill('Fotoshopni och');
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    await expect.poll(aiCalls).toBe(1);
  } finally {
    await app.close();
  }
});
