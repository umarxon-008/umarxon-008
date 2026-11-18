import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => { await login(page); });

test("MEDAI: manbali javob va shoshilinch holat ogohlantirishi", async ({ page }) => {
  await page.goto("/assistant");
  await page.getByRole("button", { name: "ALT nima?" }).click();
  await expect(page.getByText("Qoʻshimcha oʻqish uchun manbalar")).toBeVisible();
  await page.locator("textarea").fill("Ko'kragim qattiq og'riyapti, nafas ololmayapman");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Shoshilinch holat belgilari boʻlishi mumkin").first()).toBeVisible();
});

test("PHARMA TRACE: shubhali partiya va xabar berish", async ({ page }) => {
  await page.goto("/trace");
  await page.getByRole("button", { name: "Shubhali dori" }).click();
  await page.getByRole("link", { name: /Ibuprofen/ }).first().click();
  await expect(page.getByText("Shubhali").first()).toBeVisible();
  await page.getByRole("button", { name: "Xabar berish" }).click();
  await page.getByText("Narx yoki sotuv joyi shubhali").click();
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.getByText("Xabar saqlandi")).toBeVisible();
});

test("MEDCONNECT: qabulga yozilish, bekor qilish va chat", async ({ page }) => {
  await page.goto("/connect");
  await page.getByRole("button", { name: "Qabulga yozilish" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator(".grid button:not([disabled])").first().click();
  await dialog.getByRole("button", { name: /tasdiqlash/ }).click();
  await expect(page.getByText("Qabulga yozildingiz")).toBeVisible();
  // bekor qilish (oxirgi yaratilgan qabul ro'yxat boshida)
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Bekor qilish", exact: true }).first().click();
  await expect(page.getByText("Qabul bekor qilindi")).toBeVisible();
  await page.getByRole("tab", { name: /Xabarlar/ }).click();
  await page.locator("section ul button").nth(1).click();
  await page.fill("input[aria-label=Xabar]", "Salom, savolim bor");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Xabaringizni oldim|koʻrik kerak|qabulga olib keling/).last()).toBeVisible();
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
