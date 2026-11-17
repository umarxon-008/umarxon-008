import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => { await login(page); });

test("Tibbiy karta: QR yaratiladi va havola kirishsiz ochiladi", async ({ page, browser }) => {
  await page.goto("/medcard");
  const create = page.getByRole("button", { name: "QR kodni yaratish" });
  if (await create.count()) await create.click();
  const link = page.locator("p.break-all").first();
  await expect(link).toContainText("/c/");
  const url = (await link.textContent())!.trim();
  const anon = await browser.newPage();
  await anon.goto(url);
  await expect(anon.getByText("Allergiyalar")).toBeVisible();
  await anon.close();
});

test("Chekap va koʻrsatkichlar: bemor faqat koʻradi (shifokor kiritadi)", async ({ page }) => {
  await page.goto("/checkup");
  await expect(page.getByText("Shifokor xulosasi").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Chekap oʻtkazish/ })).toHaveCount(0);
  await page.getByRole("tab", { name: "Koʻrsatkichlar" }).click();
  await expect(page.getByText(/Puls/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Oʻlchov qoʻshish" })).toHaveCount(0);
  await expect(page.getByText(/Qon bosimi/)).toHaveCount(0);
  const r = await page.request.post("/api/checkup", { data: { answers: {} } });
  expect(r.status()).toBe(405);
});

test("Dorilar: mening dorilarim, qidiruv va mosligi bitta sahifada", async ({ page }) => {
  await page.goto("/medications");
  await expect(page.getByRole("tab", { name: /Mening dorilarim/ })).toBeVisible();
  await page.getByRole("tab", { name: "Mosligi" }).click();
  await page.getByRole("button", { name: /Varfarin \+ Diklofenak/ }).click();
  await expect(page.getByText("Xavfli birikma").first()).toBeVisible();
  await page.goto("/interactions");
  await expect(page).toHaveURL(/\/medications\?tab=interactions/);
});

test("SOS: faqat 103 va joylashuv; eski sahifa yoʻq", async ({ page }) => {
  await page.goto("/dashboard");
  await page.locator("aside").getByRole("button", { name: /SOS/ }).click();
  const d = page.getByRole("dialog", { name: "SOS" });
  await expect(d.getByRole("link", { name: /103 ga qoʻngʻiroq qilish/ })).toHaveAttribute("href", "tel:103");
  await expect(d.getByRole("button", { name: /Joylashuvni yaqiningizga yuborish/ })).toBeVisible();
  await page.goto("/sos");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/connect");
  await page.getByRole("button", { name: "Yurak tez uradi, hansirayman" }).click();
  await expect(page.getByText(/Tavsiya: avval/)).toBeVisible();
});

test("Header: 🔔 bildirishnomalar va footer", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Bildirishnomalar" }).click();
  await expect(page.getByRole("dialog", { name: "Bildirishnomalar" })).toBeVisible();
  await expect(page.locator("footer").getByText(/Toshkent AI Hackathon/)).toBeVisible();
});

test("№17: import dori — ishonch indeksi, laboratoriya va mahalliy muqobil", async ({ page }) => {
  await page.goto("/trace");
  await page.getByRole("button", { name: "Import → mahalliy muqobil" }).click();
  await page.getByRole("link", { name: /Metformin/ }).first().click();
  await expect(page.getByText("Ishonch indeksi").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mahalliy muqobil bor" })).toBeVisible();
  await expect(page.getByText("Mustaqil laboratoriya natijalari")).toBeVisible();
  await expect(page.getByText(/arzonroq/).first()).toBeVisible();
});
