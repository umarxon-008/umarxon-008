import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

/**
 * E2E: `npm run build` dan keyin `out/` dagi haqiqiy ilova ishga tushiriladi.
 * Har bir test vaqtinchalik ma'lumotlar papkasidan foydalanadi.
 */

const mainEntry = join(process.cwd(), 'out/main/index.js');

/** Chromium'ning sinov mikrofoni: haqiqiy qurilmasiz audio oqimi beradi. Ruxsat siyosati baribir MARIUS'da. */
const FAKE_MEDIA = ['--use-fake-device-for-media-stream'];

async function launch(
  userDataDir: string,
  extraArgs: string[] = [],
): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [mainEntry, ...(process.platform === 'linux' ? ['--no-sandbox'] : []), ...extraArgs],
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
      keys: [
        'ai',
        'app',
        'audit',
        'chat',
        'computer',
        'files',
        'logs',
        'memory',
        'reminders',
        'settings',
        'system',
        'tools',
        'voice',
        'youtube',
      ],
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

    const nav = page.getByRole('navigation', { name: 'Asosiy navigatsiya' });
    await expect(nav).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kompyuter holati' })).toBeVisible();

    await nav.getByRole('link', { name: 'Suhbat' }).click();
    await expect(page.getByRole('heading', { name: 'Yangi suhbat', level: 1 })).toBeVisible();

    for (const name of ['Tarix', 'Kompyuter']) {
      await nav.getByRole('link', { name }).click();
      await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
    }

    for (const name of ['Xotira', 'Vazifalar']) {
      await nav.getByRole('link', { name }).click();
      await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
    }

    await nav.getByRole('link', { name: 'Sozlamalar' }).click();
    await page.getByText('Yorug‘', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByText('marius.db')).toBeVisible();
  } finally {
    await app.close();
  }

  ({ app, page } = await launch(dataDir));
  try {
    await expect(page.getByRole('heading', { name: 'Kompyuter holati' })).toBeVisible();
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

async function finishOnboarding(page: Page): Promise<void> {
  for (const name of ['Keyingi', 'Keyingi', 'Keyinroq', 'Keyingi', 'Boshlash']) {
    await page.getByRole('button', { name }).click();
  }
}

test('kompyuter holati real ko‘rsatkichlarni ko‘rsatadi', async () => {
  const { app, page } = await launch(dataDir);
  try {
    await finishOnboarding(page);
    const panel = page.getByRole('region', { name: 'Kompyuter holati' });
    await expect(panel.getByText(/^\d{1,3}%$/).first()).toBeVisible();
    // Main process'dagi qiymat UI'dagi bilan bir xil manbadan
    const metrics = await page.evaluate(() => window.marius.system.getMetrics());
    expect(metrics.ok).toBe(true);
    if (metrics.ok) {
      expect(metrics.data.memory.totalBytes).toBeGreaterThan(0);
      await expect(panel.getByText(`${metrics.data.memory.percent}%`).first()).toBeVisible();
    }
  } finally {
    await app.close();
  }
});

test('mikrofon: yoqish → tinglash → tugatish (sinov qurilmasi, rozilik yo‘q)', async () => {
  const { app, page } = await launch(dataDir, FAKE_MEDIA);
  try {
    await finishOnboarding(page);
    await page.getByRole('button', { name: 'Mikrofonni yoqish' }).click();
    const stop = page.getByRole('button', { name: 'Tinglashni tugatish' });
    await expect(stop).toBeVisible();
    await expect(stop).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Sizni eshityapman…')).toBeVisible();
    await expect(page.getByText('● yoqiq')).toBeVisible();
    await stop.click();
    await expect(page.getByRole('button', { name: 'Mikrofonni yoqish' })).toBeVisible();
    await expect(page.getByText('● yoqiq')).toHaveCount(0);
    // Rozilik bo'lmagani uchun matnga aylantirilmaydi va bu aniq aytiladi
    await expect(page.getByText(/yuborilishiga rozilik bering/)).toBeVisible();
  } finally {
    await app.close();
  }
});

test('kamera ruxsati rad etiladi (faqat mikrofon audio ruxsat etilgan)', async () => {
  const { app, page } = await launch(dataDir, FAKE_MEDIA);
  try {
    const result = await page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        return 'granted';
      } catch (error) {
        return (error as Error).name;
      }
    });
    expect(result).toBe('NotAllowedError');
  } finally {
    await app.close();
  }
});
