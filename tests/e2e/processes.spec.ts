import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { finishOnboarding, launchApp, nav } from './helpers';
import { startMockAiServer, type MockAiServer } from './mock-ai-server';

/** Task Manager funksiyasi: jarayonlar ro'yxati va dasturni yopish (soxta OS). */
let dataDir: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-proc-'));
  mock = await startMockAiServer();
});
test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test('jarayonlar: RAM/CPU, tizim jarayoni himoyalangan, yopish va majburan yopish tasdiq bilan', async () => {
  const { app, page } = await launchApp(dataDir, { MARIUS_FAKE_OS: '1' });
  try {
    await finishOnboarding(page);
    await nav(page).getByRole('link', { name: 'Kompyuter' }).click();
    const section = page.locator('section', { has: page.getByRole('heading', { name: 'Jarayonlar' }) });
    const chromeRow = section.getByRole('row', { name: /chrome/ });
    await expect(chromeRow).toContainText('(3)');
    await expect(chromeRow).toContainText('16.5%');
    await expect(chromeRow).toContainText('1.1 GB');
    // Tizim jarayonlarini yopish tugmasi yo'q
    await expect(section.getByRole('row', { name: /svchost/ }).getByRole('button')).toHaveCount(0);
    await expect(section.getByRole('row', { name: /explorer/ }).getByRole('button')).toHaveCount(0);

    // CPU bo'yicha saralash: FakeSync (25%) birinchi
    await section.getByRole('radiogroup', { name: 'Saralash' }).getByText('CPU', { exact: true }).click();
    await expect(section.locator('tbody tr').first()).toContainText('FakeSync');

    // Oddiy yopish: tasdiq oynasi, keyin dastur yo'qoladi
    await section.getByRole('button', { name: 'chrome ni yopish' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText('Dasturni yopish', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByText('chrome yopildi.')).toBeVisible();
    await expect(section.getByRole('row', { name: /chrome/ })).toHaveCount(0);

    // Oynasiz dastur: oddiy usul ishlamaydi → "Majburan yopish" taklif qilinadi
    await section.getByRole('button', { name: 'FakeSync ni yopish' }).click();
    await expect(page.getByText(/oynasi yo‘q.*majburan/)).toBeVisible();
    await section.getByRole('button', { name: 'FakeSync ni majburan yopish' }).click();
    await expect(dialog.getByText(/YO‘QOLADI/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByText('FakeSync yopildi.')).toBeVisible();

    // Tarixda ko'rinadi
    await nav(page).getByRole('link', { name: 'Tarix' }).click();
    await expect(page.getByText('Majburan yopish: FakeSync')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('AI orqali: “ko‘p RAM ishlatayotgan dastur” va yopishda tasdiq so‘raladi', async () => {
  const { app, page } = await launchApp(dataDir, { MARIUS_FAKE_OS: '1' });
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
    const box = page.getByLabel('Xabar', { exact: true });
    await box.fill(
      `Qaysi dastur ko‘p RAM yeyapti? TOOL:${JSON.stringify({ name: 'list_processes', arguments: {} })}`,
    );
    await box.press('Enter');
    await expect(page.getByText(/Natija: \d+ ta dastur ishlayapti\./)).toBeVisible();
    const toolResult = mock.requests
      .map((r) => JSON.stringify(r.body ?? ''))
      .find((b) => b.includes('\\"programs\\"'));
    expect(toolResult).toContain('chrome');

    await box.fill(
      `Telegramni yop TOOL:${JSON.stringify({ name: 'close_app', arguments: { name: 'Telegram' } })}`,
    );
    await box.press('Enter');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText(/Telegram \(1 ta jarayon/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Bekor qilish' }).click();
    await expect(page.getByText(/Natija: Foydalanuvchi amalni bekor qildi/)).toBeVisible();
  } finally {
    await app.close();
  }
});
