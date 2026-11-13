import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

/**
 * E2E: `npm run build` dan keyin `out/` dagi haqiqiy ilova ishga tushiriladi.
 * Har bir test vaqtinchalik ma'lumotlar papkasidan foydalanadi.
 */

const mainEntry = join(process.cwd(), 'out/main/index.js');

async function launch(userDataDir: string): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [mainEntry, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])],
    env: { ...process.env, MARIUS_USER_DATA_DIR: userDataDir, ELECTRON_RENDERER_URL: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}

let dataDir: string;

test.beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-e2e-'));
});

test.afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

test('renderer’da Node yoki Electron API yo‘q, faqat window.marius bor', async () => {
  const { app, page } = await launch(dataDir);
  try {
    const exposure = await page.evaluate(() => ({
      require: typeof (globalThis as Record<string, unknown>)['require'],
      process: typeof (globalThis as Record<string, unknown>)['process'],
      module: typeof (globalThis as Record<string, unknown>)['module'],
      marius: typeof window.marius,
      frozen: Object.isFrozen(window.marius),
      keys: Object.keys(window.marius).sort(),
    }));
    expect(exposure).toEqual({
      require: 'undefined',
      process: 'undefined',
      module: 'undefined',
      marius: 'object',
      frozen: true,
      keys: ['app', 'logs', 'settings'],
    });

    const prefs = await app.evaluate(({ BrowserWindow }) => {
      // getLastWebPreferences Electron'da mavjud, lekin type'larda e'lon qilinmagan.
      const wc = BrowserWindow.getAllWindows()[0]!.webContents as unknown as {
        getLastWebPreferences(): Record<string, unknown> | null;
      };
      const wp = wc.getLastWebPreferences();
      return {
        contextIsolation: wp?.contextIsolation,
        nodeIntegration: wp?.nodeIntegration,
        sandbox: wp?.sandbox,
      };
    });
    expect(prefs).toEqual({ contextIsolation: true, nodeIntegration: false, sandbox: true });
  } finally {
    await app.close();
  }
});

test('noto‘g‘ri IPC ma’lumoti rad etiladi', async () => {
  const { app, page } = await launch(dataDir);
  try {
    const result = await page.evaluate(() =>
      window.marius.settings.update({ theme: 'neon' } as unknown as { theme: 'dark' }),
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  } finally {
    await app.close();
  }
});

test('tanishuv → bosh sahifa → sozlamalar; mavzu qayta ishga tushganda saqlanadi', async () => {
  let { app, page } = await launch(dataDir);
  try {
    await expect(page.getByRole('heading', { name: /Salom! Men MARIUS/ })).toBeVisible();
    await page.getByRole('button', { name: 'Keyingi' }).click(); // til
    await page.getByRole('button', { name: 'Keyingi' }).click(); // AI
    await page.getByRole('button', { name: 'Keyinroq' }).click(); // maxfiylik
    await page.getByRole('button', { name: 'Keyingi' }).click(); // tayyor
    await page.getByRole('button', { name: 'Boshlash' }).click();

    await expect(page.getByText('Bugun sizga qanday yordam bera olaman?')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Asosiy navigatsiya' })).toBeVisible();

    await page.getByRole('link', { name: 'Yordamchi' }).click();
    await expect(page.getByText(/2-bosqichda qo'shiladi/)).toBeVisible();

    await page.getByRole('link', { name: 'Sozlamalar' }).click();
    await page.getByText('Yorug‘', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByText('marius.db')).toBeVisible();
  } finally {
    await app.close();
  }

  ({ app, page } = await launch(dataDir));
  try {
    await expect(page.getByText('Bugun sizga qanday yordam bera olaman?')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  } finally {
    await app.close();
  }
});

test('tashqi sahifaga o‘tish bloklanadi', async () => {
  const { app, page } = await launch(dataDir);
  try {
    const before = page.url();
    await page.evaluate(() => {
      window.location.href = 'https://example.com';
    });
    await page.waitForTimeout(500);
    expect(page.url()).toBe(before);
  } finally {
    await app.close();
  }
});
