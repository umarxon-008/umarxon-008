import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { finishOnboarding, launchApp, nav } from './helpers';
import { startMockAiServer, type MockAiServer } from './mock-ai-server';

/** PHASE 7 E2E: eslatmalar (o'zbekcha vaqt, vaqtida chiqishi, AI orqali) va xotira (maxfiy filtr, modelga yetishi). */
let dataDir: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-mem-'));
  mock = await startMockAiServer();
});

test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function useOllama(page: Page) {
  await page.evaluate(async (url) => {
    await window.marius.ai.updateSettings({
      provider: 'ollama',
      ollamaBaseUrl: url,
      ollamaModel: 'mock-uz:latest',
    });
  }, mock.url);
}

test('Vazifalar: o‘zbekcha vaqt → aniq sana → qo‘shish → bajarildi', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await nav(page).getByRole('link', { name: 'Vazifalar' }).click();
    await page.getByLabel('Nimani eslatish kerak').fill('Darsga tayyorlanish');
    await page.getByLabel('Qachon', { exact: true }).fill('ertaga ertalab');
    await expect(page.getByText('Ertaga, 08:00')).toBeVisible();
    await expect(page.getByText(/taxmin: soat 08:00/)).toBeVisible();
    await page.getByRole('button', { name: 'Qo‘shish' }).click();
    const list = page.getByRole('list', { name: 'Kutilayotgan eslatmalar' });
    await expect(list.getByText('Darsga tayyorlanish')).toBeVisible();
    await list.getByRole('button', { name: 'Bajarildi' }).click();
    await expect(page.getByText('Eslatmalar yo‘q')).toBeVisible();

    await page.getByLabel('Qachon', { exact: true }).fill('qachondir');
    await expect(page.getByText(/Vaqtni tushunmadim/)).toBeVisible();
  } finally {
    await app.close();
  }
});

test('eslatma vaqti kelganda ilova ichida xabar chiqadi (va Windows bildirishnomasi yuboriladi)', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await page.evaluate(() =>
      window.marius.reminders.create({
        title: 'Suv ichish',
        dueAt: new Date(Date.now() + 2500).toISOString(),
      }),
    );
    const toast = page.getByRole('region', { name: 'Eslatmalar' });
    await expect(toast.getByText('Suv ichish')).toBeVisible({ timeout: 10_000 });
    await toast.getByRole('button', { name: 'Bajarildi' }).click();
    const list = await page.evaluate(() => window.marius.reminders.list());
    expect(list.ok && list.data[0]).toMatchObject({ title: 'Suv ichish', status: 'done' });
    expect(list.ok && list.data[0]!.notifiedAt).not.toBeNull();
    // O'tgan vaqtga eslatma qo'shib bo'lmaydi
    const past = await page.evaluate(() =>
      window.marius.reminders.create({ title: 'x', dueAt: new Date(Date.now() - 60_000).toISOString() }),
    );
    expect(past).toMatchObject({ ok: false, error: { code: 'REMINDER_IN_PAST' } });
  } finally {
    await app.close();
  }
});

test('AI orqali eslatma: aniq sana tasdiq oynasida ko‘rsatiladi', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await useOllama(page);
    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    const call = JSON.stringify({
      name: 'create_reminder',
      arguments: { title: 'Vazifa', when: 'ertaga soat 19:00' },
    });
    await page.getByLabel('Xabar', { exact: true }).fill(`Ertaga 19:00 da eslat TOOL:${call}`);
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText('“Vazifa” — Ertaga, 19:00')).toBeVisible();
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByText('Natija: Eslatma qo‘shildi: Ertaga, 19:00.')).toBeVisible();
    await nav(page).getByRole('link', { name: 'Vazifalar' }).click();
    await expect(
      page.getByRole('list', { name: 'Kutilayotgan eslatmalar' }).getByText('Vazifa'),
    ).toBeVisible();
  } finally {
    await app.close();
  }
});

test('Xotira: qo‘shish, maxfiy ma’lumot rad etiladi, AI’ga kontekst sifatida yetadi, o‘chirilsa yetmaydi', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await useOllama(page);
    await nav(page).getByRole('link', { name: 'Xotira' }).click();
    const input = page.getByLabel('Yangi xotira yozuvi');
    await input.fill('kartam 8600 1234 5678 9012');
    await page.getByRole('button', { name: 'Qo‘shish' }).click();
    await expect(page.getByText(/maxfiy ma’lumot xotiraga saqlanmaydi/)).toBeVisible();
    await input.fill('Men C++ o‘rganyapman');
    await page.getByRole('button', { name: 'Qo‘shish' }).click();
    await expect(
      page.getByRole('list', { name: 'Xotira yozuvlari' }).getByText('Men C++ o‘rganyapman'),
    ).toBeVisible();

    const send = async (text: string) => {
      await nav(page).getByRole('link', { name: 'Suhbat' }).click();
      await page.getByRole('button', { name: 'Yangi suhbat' }).click();
      await page.getByLabel('Xabar', { exact: true }).fill(text);
      await page.getByLabel('Xabar', { exact: true }).press('Enter');
      await expect(page.getByRole('button', { name: 'Yuborish' })).toBeVisible();
      const req = mock.requests.filter((r) => r.path === '/api/chat').at(-1)!;
      return (req.body as { messages: { role: string; content: string }[] }).messages[0]!.content;
    };
    expect(await send('Salom')).toContain('- Men C++ o‘rganyapman');

    await nav(page).getByRole('link', { name: 'Xotira' }).click();
    await page.getByText('Xotira yoqilgan').click();
    expect(await send('Yana salom')).not.toContain('Men C++ o‘rganyapman');
  } finally {
    await app.close();
  }
});
