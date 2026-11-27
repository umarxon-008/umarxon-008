import { expect, test } from '@playwright/test';

const DEMO = { email: 'admin@energycomp.uz', password: 'Demo12345' };

test.describe('EnergyComp E2E', () => {
  test('landing: asosiy CTA va soxta statistika yo‘q', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Energiya sarfini boshqaring');
    await expect(page.getByRole('link', { name: /Boshqarishni boshlash/ })).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/98%|30% tejash/);
  });

  test('himoyalangan sahifa loginsiz /login ga yo‘naltiradi', async ({ page }) => {
    await page.goto('/app/monitoring');
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fmonitoring/);
  });

  test('ro‘yxatdan o‘tish → dashboard → uskuna qo‘shish → xaritada ko‘rinadi', async ({ page }) => {
    const email = `e2e-${Date.now()}@test.uz`;
    await page.goto('/register');
    await page.getByLabel('Ism-familiya').fill('E2E Foydalanuvchi');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Parol', { exact: true }).fill('Parol1234');
    await page.getByLabel('Parolni tasdiqlash').fill('Parol1234');
    await page.getByLabel('Tashkilot nomi').fill('E2E Zavod');
    await page.getByLabel('Sanoat yo‘nalishi').selectOption({ index: 1 });
    await page.getByLabel(/Foydalanish shartlari/).check();
    await page.getByRole('button', { name: 'Ro‘yxatdan o‘tish' }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByText('Hali uskuna qo‘shilmagan')).toBeVisible();

    await page.goto('/app/equipment?new=1');
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nomi', { exact: true }).fill('E2E press');
    await dialog.getByLabel('Kod', { exact: true }).fill('E2E-1');
    await dialog.getByLabel('Nominal quvvat', { exact: true }).fill('25');
    await dialog.getByRole('button', { name: 'Qo‘shish' }).click();
    await expect(page.getByRole('link', { name: 'E2E press' })).toBeVisible();

    await page.goto('/app/factory-map');
    await expect(page.getByRole('button', { name: /^E2E press,/ })).toBeVisible();
  });

  test('demo login: dashboard, AI Inspector va monitoring ishlaydi', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(DEMO.email);
    await page.getByLabel('Parol', { exact: true }).fill(DEMO.password);
    await page.getByRole('button', { name: 'Kirish' }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByText('Joriy umumiy quvvat')).toBeVisible();
    await page.goto('/app/ai-inspector');
    await expect(page.getByRole('heading', { name: 'AI Inspector' })).toBeVisible();
    await page.goto('/app/monitoring');
    await expect(page.getByText('Energiya (davr)')).toBeVisible();
    // Mobil: gorizontal skroll bo'lmasligi kerak
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
