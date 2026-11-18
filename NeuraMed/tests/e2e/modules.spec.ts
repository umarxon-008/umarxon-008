import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => { await login(page); });

test("PHARMA TRACE: shubhali partiya va xabar berish", async ({ page }) => {
  await page.goto("/trace");
  await page.getByLabel("Dori nomi yoki partiya raqami").fill("Ibuprofen");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/trace\/MP-10004/);
  await expect(page.getByText("Shubhali").first()).toBeVisible();
  await page.getByRole("button", { name: "Xabar berish" }).click();
  await page.getByText("Narx yoki sotuv joyi shubhali").click();
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.getByText("Xabar saqlandi")).toBeVisible();
});

test("MEDCONNECT: qabulga yozilish, chat (faqat qabuldan keyin) va bekor qilish", async ({ page }) => {
  await page.goto("/connect");
  // Jasur Toshmatov (hisobsiz katalog shifokori) — avtomatik javob beradi
  await page.getByRole("button", { name: "Qabulga yozilish" }).nth(1).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator(".grid button:not([disabled])").first().click();
  await dialog.getByRole("button", { name: /tasdiqlash/ }).click();
  await expect(page.getByText("Qabulga yozildingiz")).toBeVisible();
  await page.getByRole("tab", { name: /Xabarlar/ }).click();
  await page.locator("section ul button").filter({ hasText: "Jasur Toshmatov" }).first().click();
  await page.fill("input[aria-label=Xabar]", "Salom, savolim bor");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Xabaringizni oldim|koʻrik kerak|qabulga olib keling/).last()).toBeVisible();
  await page.getByRole("tab", { name: /Qabullarim/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Bekor qilish", exact: true }).first().click();
  await expect(page.getByText("Qabul bekor qilindi")).toBeVisible();
});

test("Til almashtirish: English, Русский, Қазақша, Тоҷикӣ", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: /English/ }).click();
  await expect(page.getByText("Appearance")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("Next medicine")).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: /Русский/ }).click();
  await expect(page.getByText("Оформление")).toBeVisible();
  await page.getByRole("button", { name: /Қазақша/ }).click();
  await expect(page.getByText("Көрініс")).toBeVisible();
  await page.getByRole("button", { name: /Тоҷикӣ/ }).click();
  await expect(page.getByText("Намуди зоҳирӣ")).toBeVisible();
  await page.getByRole("button", { name: /O'zbek/ }).click();
  await expect(page.getByText("Koʻrinish").or(page.getByText("Ko'rinish"))).toBeVisible();
});
