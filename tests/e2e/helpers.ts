import { join } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

const mainEntry = join(process.cwd(), 'out/main/index.js');

export async function launchApp(
  userDataDir: string,
  env: Record<string, string> = {},
  extraArgs: string[] = [],
): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [mainEntry, ...(process.platform === 'linux' ? ['--no-sandbox'] : []), ...extraArgs],
    env: { ...process.env, MARIUS_USER_DATA_DIR: userDataDir, ELECTRON_RENDERER_URL: '', ...env },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}

export async function finishOnboarding(page: Page): Promise<void> {
  for (const name of ['Keyingi', 'Keyingi', 'Keyinroq', 'Keyingi', 'Boshlash']) {
    await page.getByRole('button', { name }).click();
  }
}

export function nav(page: Page) {
  return page.getByRole('navigation', { name: 'Asosiy navigatsiya' });
}
