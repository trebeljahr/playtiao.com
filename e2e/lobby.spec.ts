import { test, expect } from '@playwright/test';

test.describe('Lobby', () => {
  test('lobby shows create game and find match buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button:has-text("Create game")')).toBeVisible();
    await expect(page.locator('button:has-text("Find match")')).toBeVisible();
  });

  test('creating a game navigates to game page', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Create game")');
    await expect(page).toHaveURL(/\/game\/[A-Z0-9]{6}/);
  });

  test('active game appears in lobby after creation', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Sign up (needed to see games list)
    await page.goto('/');
    await page.click('button:has-text("Sign up")');
    const username = `lobby_${Math.random().toString(36).slice(2, 7)}`;
    await page.fill('input[placeholder="Username"]', username);
    await page.fill('input[placeholder="Password"]', 'password123');
    await page.click('button:has-text("Create account")');
    await expect(page.locator('text=Account')).toBeVisible();

    // Create game
    await page.click('button:has-text("Create game")');
    await expect(page).toHaveURL(/\/game\/[A-Z0-9]{6}/);
    const gameId = page.url().split('/').pop()!;

    // Go back to lobby
    await page.goto('/');

    // The game should appear in the active games section
    await expect(page.locator(`text=${gameId}`)).toBeVisible({ timeout: 5000 });

    await context.close();
  });
});
