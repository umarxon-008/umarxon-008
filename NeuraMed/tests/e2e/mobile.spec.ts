import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

/** Telefonda hech bir sahifa yon tomonga siljimasligi kerak. */
test("telefon: sahifalar ekran kengligidan chiqmaydi", async ({ page }) => {
  await login(page);
  for (const path of ["/dashboard", "/checkup", "/medications", "/lab-reports", "/medcard", "/trace", "/trace/MP-10005", "/connect", "/connect?tab=appointments", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => {});
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
