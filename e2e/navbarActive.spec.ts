import { test, expect } from "@playwright/test";

test.describe("Navbar active link attributes", () => {
  test("active nav link on home page", async ({ page }) => {
    await page.goto("/");
    await page.click('[aria-label="Open navigation"]');

    const activeLink = page.locator('button[aria-current="page"]');
    await expect(activeLink).toBeVisible();

    // Should not be disabled
    await expect(activeLink).not.toHaveAttribute("disabled", "");
    await expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  test("non-active nav links do not have aria-current", async ({ page }) => {
    await page.goto("/");
    await page.click('[aria-label="Open navigation"]');

    // The active link should be visible
    const activeLink = page.locator('button[aria-current="page"]');
    await expect(activeLink).toBeVisible();

    // Other nav buttons inside the drawer should NOT have aria-current
    const navButtons = page.locator("aside button:not([aria-current])");
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("local and computer pages do not show dedicated nav items", async ({ page }) => {
    // /local page should open nav drawer but not have its own active nav item
    await page.goto("/local");
    await page.click('[aria-label="Open navigation"]');

    // The drawer should be visible
    const drawer = page.locator("aside");
    await expect(drawer).toBeVisible();

    // "Over the Board" and "Against computer" should not appear in the nav
    await expect(page.locator('aside button:has-text("Over the Board")')).toHaveCount(0);
    await expect(page.locator('aside button:has-text("Against computer")')).toHaveCount(0);
  });
});
