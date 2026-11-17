import { test, expect } from "@playwright/test";

const loginAs = async (page: import("@playwright/test").Page, email: string) => {
  await page.goto("/login");
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Test12345!");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/(dashboard|doctor)/);
};

test("Shifokor: paneli, bemor sahifasi, chekap va koʻrsatkich kiritish", async ({ page }) => {
  await loginAs(page, "doctor@neuramed.uz");
  await expect(page).toHaveURL(/\/doctor$/);
  await expect(page.getByText("Bemorlarim").first()).toBeVisible();
  // bemor bo'limlari shifokorga yopiq
  await page.goto("/checkup");
  await expect(page).toHaveURL(/\/doctor$/);
  await page.getByRole("link", { name: /Aziza Karimova/ }).first().click();
  await expect(page.getByText(/Allergiya:/)).toBeVisible();
  await page.getByRole("tab", { name: "Chekap" }).click();
  await page.getByRole("button", { name: /Chekap oʻtkazish/ }).click();
  for (let i = 0; i < 11; i++) await page.locator("section.card-base div.grid button").first().click();
  await page.fill("textarea", "E2E: holat barqaror.");
  await page.getByRole("button", { name: /Saqlash va bemorga yuborish/ }).click();
  await expect(page.getByText("E2E: holat barqaror.")).toBeVisible();
  await page.getByRole("tab", { name: "Koʻrsatkichlar" }).click();
  await page.getByRole("button", { name: "Oʻlchov qoʻshish" }).first().click();
  await page.getByRole("dialog").locator("input").fill("74");
  await page.getByRole("dialog").getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("dialog", { name: "Oʻlchov saqlandi" })).toBeVisible();
});

test("Bemor shifokor bo'limiga kira olmaydi, API 403", async ({ page }) => {
  await loginAs(page, "test@neuramed.uz");
  await page.goto("/doctor");
  await expect(page).toHaveURL(/\/dashboard/);
  const r = await page.request.get("/api/doctor/patients");
  expect(r.status()).toBe(403);
});

test("Ro'yxatdan o'tish: shifokor roli bilan", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("radio", { name: /Shifokor/ }).click();
  await page.getByLabel("Ism *").fill("Test Shifokor");
  await page.getByLabel("Email *").fill(`e2e${Date.now()}@example.test`);
  await page.getByLabel("Mutaxassislik *").fill("Nevrolog");
  await page.getByLabel("Ish joyi *").fill("Namuna klinika");
  await page.getByLabel("Litsenziya raqami *").fill("LIC-1");
  await page.getByLabel("Parol *").fill("Test12345!");
  await page.getByLabel("Parolni tasdiqlang *").fill("Test12345!");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/doctor/);
  await expect(page.getByText(/Litsenziya tekshirilmagan/)).toBeVisible();
});
