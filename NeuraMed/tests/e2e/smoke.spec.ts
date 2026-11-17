import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const PAGES: [string, RegExp][] = [
  ["/dashboard", /NeuraMed modullari/],
  ["/assistant", /Tibbiy atama yoki tahlil haqida soʻrang/],
  ["/library", /tibbiy atama oddiy tilda/],
  ["/trace", /Mahalliy dorilarga ishonch/],
  ["/trace/MP-10004", /Taʼminot zanjiri/],
  ["/connect", /Shifokor topish, qabulga yozilish/],
  ["/checkup", /Chekap — shifokor oʻtkazadi/],
  ["/medications", /Mening dorilarim/],
  ["/lab-reports", /Laboratoriya tahlillari/],
  ["/more", /Loyiha haqida/],
  ["/about", /Xavfsizlik qoidalari/],
  ["/connect?tab=prep", /Qaysi qabulga tayyorlanyapsiz/],
  ["/settings", /Til/],
];

test("barcha asosiy sahifalar xatosiz ochiladi", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  await login(page);
  for (const [path, text] of PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(400);
    await expect(page.locator("main").getByText(text).first(), path).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("kirmasdan sahifa login'ga, API esa 401 qaytaradi", async ({ page, request }) => {
  await page.goto("/doctor");
  await expect(page).toHaveURL(/\/login/);
  const r = await request.get("/api/doctor/patients");
  expect(r.status()).toBe(401);
});
