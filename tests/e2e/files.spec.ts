import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { finishOnboarding, launchApp, nav } from './helpers';
import { startMockAiServer, type MockAiServer } from './mock-ai-server';

/** PHASE 5 E2E: ruxsatli papkalar, qidiruv, ochish, AI orqali papka yaratish (tasdiq bilan). */
let dataDir: string;
let files: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-fe2e-'));
  files = mkdtempSync(join(tmpdir(), 'marius-docs-'));
  mkdirSync(join(files, 'Dars'));
  writeFileSync(join(files, 'Dars', 'dars jadvali.pdf'), 'pdf');
  writeFileSync(join(files, 'skript.bat'), 'echo');
  mock = await startMockAiServer();
});

test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(files, { recursive: true, force: true });
});

/** Tizim dialogi va shell.openPath sinov uchun almashtiriladi (haqiqiy oynalar ochilmaydi) */
async function stubShell(app: ElectronApplication, folder: string) {
  await app.evaluate(({ dialog, shell }, dir) => {
    (globalThis as Record<string, unknown>)['__opened'] = [];
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [dir],
    })) as typeof dialog.showOpenDialog;
    shell.openPath = async (p: string) => {
      ((globalThis as Record<string, unknown>)['__opened'] as string[]).push(p);
      return '';
    };
    shell.showItemInFolder = () => undefined;
  }, folder);
}

async function addFolder(page: Page) {
  await nav(page).getByRole('link', { name: 'Kompyuter' }).click();
  await page.getByRole('button', { name: 'Boshqa papka…' }).click();
  await expect(
    page.getByRole('list', { name: 'Ruxsat berilgan papkalar' }).getByRole('listitem'),
  ).toHaveCount(1);
}

test('papkaga ruxsat → qidirish → ochish; dastur fayli ochilmaydi', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await stubShell(app, files);
    await addFolder(page);

    await page.getByPlaceholder('Fayl nomi (masalan, dars jadvali)').fill('dars jadvali');
    await page.getByRole('button', { name: 'Qidirish' }).click();
    const results = page.getByRole('list', { name: 'Qidiruv natijalari' });
    await expect(results.getByText('dars jadvali.pdf')).toBeVisible();
    await results.getByRole('button', { name: 'dars jadvali.pdf ni ochish' }).click();
    await expect(page.getByText('dars jadvali.pdf ochildi.')).toBeVisible();
    const opened = await app.evaluate(() => (globalThis as Record<string, unknown>)['__opened'] as string[]);
    expect(opened).toHaveLength(1);
    expect(opened[0]).toContain('dars jadvali.pdf');

    await page.getByPlaceholder('Fayl nomi (masalan, dars jadvali)').fill('skript');
    await page.getByRole('button', { name: 'Qidirish' }).click();
    await results.getByRole('button', { name: 'skript.bat ni ochish' }).click();
    await expect(page.getByText(/Dastur yoki skript fayllari xavfsizlik uchun ochilmaydi/)).toBeVisible();
    expect(
      await app.evaluate(() => ((globalThis as Record<string, unknown>)['__opened'] as string[]).length),
    ).toBe(1);

    // Ruxsatsiz joy: IPC to'g'ridan-to'g'ri chaqirilsa ham rad etiladi
    const r = await page.evaluate(() => window.marius.files.open('/etc/hosts'));
    expect(r.ok && r.data.ok).toBe(false);
  } finally {
    await app.close();
  }
});

test('AI orqali papka yaratish: tasdiq oynasi va natija tekshiruvi', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await stubShell(app, files);
    await addFolder(page);
    await page.evaluate(async (url) => {
      await window.marius.ai.updateSettings({
        provider: 'ollama',
        ollamaBaseUrl: url,
        ollamaModel: 'mock-uz:latest',
      });
    }, mock.url);
    await nav(page).getByRole('link', { name: 'Suhbat' }).click();
    const call = JSON.stringify({ name: 'create_folder', arguments: { parentPath: files, name: 'MARIUS' } });
    await page.getByLabel('Xabar', { exact: true }).fill(`Yangi MARIUS papka yarat TOOL:${call}`);
    await page.getByLabel('Xabar', { exact: true }).press('Enter');

    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText('Yangi papka yaratish')).toBeVisible();
    expect(existsSync(join(files, 'MARIUS'))).toBe(false);
    await dialog.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByText('Natija: “MARIUS” papkasi yaratildi.')).toBeVisible();
    expect(existsSync(join(files, 'MARIUS'))).toBe(true);
  } finally {
    await app.close();
  }
});
