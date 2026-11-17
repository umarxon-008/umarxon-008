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

test("Koʻrsatkichlar: xavfli bosim ogohlantirish beradi", async ({ page }) => {
  await page.goto("/vitals");
  await page.getByRole("button", { name: "Oʻlchov qoʻshish" }).last().click();
  const d = page.getByRole("dialog");
  await d.locator("input").nth(0).fill("185");
  await d.locator("input").nth(1).fill("121");
  await d.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText(/Juda yuqori bosim/).first()).toBeVisible();
});

test("Dorilar mosligi va chekap", async ({ page }) => {
  await page.goto("/interactions");
  await page.getByRole("button", { name: /Varfarin \+ Diklofenak/ }).click();
  await expect(page.getByText("Xavfli birikma").first()).toBeVisible();
  await page.goto("/checkup");
  await page.getByRole("button", { name: /Chekapni (boshlash|qayta)/ }).click();
  for (let i = 0; i < 12; i++) await page.locator("section.card-base div.grid button").first().click();
  await expect(page.getByText("/ 100").first()).toBeVisible();
});

test("SOS va belgilar boʻyicha mutaxassis", async ({ page }) => {
  await page.goto("/sos");
  await expect(page.getByText("103").first()).toBeVisible();
  await page.goto("/connect");
  await page.getByRole("button", { name: "Bosim koʻtariladi, yurak tez uradi" }).click();
  await expect(page.getByText(/Tavsiya: avval/)).toBeVisible();
});
