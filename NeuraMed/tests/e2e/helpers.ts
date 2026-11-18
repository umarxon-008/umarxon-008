import { expect, type Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/login");
  await page.fill("input[type=email]", "test@neuramed.uz");
  await page.fill("input[type=password]", "Test12345!");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Bugun" })).toBeVisible();
}
