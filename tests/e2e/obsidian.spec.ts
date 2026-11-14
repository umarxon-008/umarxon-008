import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { finishOnboarding, launchApp, nav } from './helpers';
import { startMockAiServer, type MockAiServer } from './mock-ai-server';

/** PHASE 7B E2E: Obsidian (v2.1 §9) va zaxira nusxa. */
let dataDir: string;
let vaultDir: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-obse2e-'));
  vaultDir = mkdtempSync(join(tmpdir(), 'marius-vault-'));
  mkdirSync(join(vaultDir, '.obsidian'));
  writeFileSync(join(vaultDir, 'Reja.md'), '# Reja\n\nErtaga imtihon');
  mock = await startMockAiServer();
});

test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(vaultDir, { recursive: true, force: true });
});

test('A–E, H: Obsidian ixtiyoriy, Vault tanlash faqat o‘qish beradi, yaratish alohida yoqiladi, uzish', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await app.evaluate(({ dialog }, dir) => {
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [dir],
      })) as typeof dialog.showOpenDialog;
    }, vaultDir);
    await page.evaluate(async (url) => {
      await window.marius.ai.updateSettings({
        provider: 'ollama',
        ollamaBaseUrl: url,
        ollamaModel: 'mock-uz:latest',
      });
    }, mock.url);

    await nav(page).getByRole('link', { name: 'Sozlamalar' }).click();
    const section = page.locator('section', { has: page.getByRole('heading', { name: /Obsidian/ }) });
    await expect(section.getByText(/Obsidian: (o‘rnatilgan|topilmadi \(ixtiyoriy\))/)).toBeVisible(); // A
    await section.getByRole('button', { name: 'Mavjud Vault’ni tanlash' }).click();
    await expect(section.getByText('ulangan · 1 ta note')).toBeVisible();
    await expect(section.getByRole('checkbox', { name: /O‘qish/ })).toBeChecked();
    await expect(section.getByRole('checkbox', { name: /Yangi note yaratish/ })).not.toBeChecked(); // tanlash yozish huquqini bermaydi
    await expect(section.getByRole('checkbox', { name: /oxiriga qo‘shish/ })).not.toBeChecked();

    // D: yozish ruxsati yo'q — AI so'rasa ham fayl yaratilmaydi
    const call = (title: string) =>
      `TOOL:${JSON.stringify({ name: 'vault_create_note', arguments: { title, content: 'O‘zbekcha qayd 😊' } })}`;
    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    await page.getByLabel('Xabar', { exact: true }).fill(`Saqlab qo‘y ${call('Uchrashuv')}`);
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    await expect(page.getByText(/Natija: Obsidian’da yangi note yaratish ruxsati o‘chiq/)).toBeVisible();
    expect(existsSync(join(vaultDir, 'Uchrashuv.md'))).toBe(false);

    // E: yaratish yoqildi — oldindan ko'rish va tasdiq bilan
    await nav(page).getByRole('link', { name: 'Sozlamalar' }).click();
    await section.getByText('Yangi note yaratish').click();
    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    await page.getByLabel('Xabar', { exact: true }).fill(`Yana ${call('Uchrashuv')}`);
    await page.getByLabel('Xabar', { exact: true }).press('Enter');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText('Oldindan ko‘rish')).toBeVisible();
    await expect(dialog.locator('pre')).toContainText('O‘zbekcha qayd 😊');
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByText('Natija: “Uchrashuv” note’i yaratildi.')).toBeVisible();
    expect(readFileSync(join(vaultDir, 'Uchrashuv.md'), 'utf8')).toContain('O‘zbekcha qayd 😊');

    // H: uzish
    await nav(page).getByRole('link', { name: 'Sozlamalar' }).click();
    await section.getByRole('button', { name: 'Vault’ni uzish' }).click();
    await expect(section.getByRole('button', { name: 'Mavjud Vault’ni tanlash' })).toBeVisible();
    const st = await page.evaluate(() => window.marius.obsidian.status());
    expect(st.ok && st.data).toMatchObject({
      enabled: false,
      vaultPath: null,
      read: false,
      create: false,
      append: false,
    });
  } finally {
    await app.close();
  }
});

test('zaxira nusxa: fayl yaratiladi, API kalitlari kirmaydi', async () => {
  const { app, page } = await launchApp(dataDir);
  const target = join(vaultDir, 'zaxira.db');
  try {
    await finishOnboarding(page);
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = (async () => ({
        canceled: false,
        filePath: file,
      })) as typeof dialog.showSaveDialog;
    }, target);
    await nav(page).getByRole('link', { name: 'Sozlamalar' }).click();
    await page.getByRole('button', { name: 'Zaxira nusxa olish' }).click();
    await expect(
      page.getByText(/Zaxira saqlandi: 0 ta suhbat, 0 ta eslatma\. API kalitlari zaxiraga kirmaydi\./),
    ).toBeVisible();
    expect(existsSync(target)).toBe(true);
  } finally {
    await app.close();
  }
});
