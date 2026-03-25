import { test, expect } from '@playwright/test';

test.describe('Forfeit in multiplayer', () => {
  test('forfeit button appears and forfeiting ends the game', async ({ browser }) => {
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    const alicePage = await aliceContext.newPage();
    const bobPage = await bobContext.newPage();

    // Alice signs up
    await alicePage.goto('/');
    await alicePage.click('button:has-text("Sign up")');
    const aliceUsername = `alice_ff_${Math.random().toString(36).slice(2, 7)}`;
    await alicePage.fill('input[placeholder="Username"]', aliceUsername);
    await alicePage.fill('input[placeholder="Password"]', 'password123');
    await alicePage.click('button:has-text("Create account")');
    await expect(alicePage.locator('text=Account')).toBeVisible();

    // Bob signs up
    await bobPage.goto('/');
    await bobPage.click('button:has-text("Sign up")');
    const bobUsername = `bob_ff_${Math.random().toString(36).slice(2, 7)}`;
    await bobPage.fill('input[placeholder="Username"]', bobUsername);
    await bobPage.fill('input[placeholder="Password"]', 'password123');
    await bobPage.click('button:has-text("Create account")');
    await expect(bobPage.locator('text=Account')).toBeVisible();

    // Alice creates a game
    await alicePage.click('button:has-text("Create game")');
    await expect(alicePage).toHaveURL(/\/game\/[A-Z0-9]{6}/);
    const gameUrl = alicePage.url();

    // Bob joins the game
    await bobPage.goto(gameUrl);
    await expect(bobPage.locator('text=Live match')).toBeVisible();
    await expect(alicePage.locator('text=Live match')).toBeVisible();

    // Verify the Forfeit button is visible for Alice (active player)
    await expect(alicePage.locator('button:has-text("Forfeit")')).toBeVisible();

    // Verify the Forfeit button is visible for Bob too
    await expect(bobPage.locator('button:has-text("Forfeit")')).toBeVisible();

    // Alice forfeits — need to handle the confirm dialog
    alicePage.on('dialog', (dialog) => dialog.accept());
    await alicePage.click('button:has-text("Forfeit")');

    // Both should see the game as finished — the opponent (Bob) wins
    await expect(bobPage.locator('text=wins')).toBeVisible({ timeout: 5000 });
    await expect(alicePage.locator('text=wins')).toBeVisible({ timeout: 5000 });

    // After forfeit, the Forfeit button should no longer be visible
    await expect(alicePage.locator('button:has-text("Forfeit")')).not.toBeVisible({ timeout: 3000 });
    await expect(bobPage.locator('button:has-text("Forfeit")')).not.toBeVisible({ timeout: 3000 });

    await aliceContext.close();
    await bobContext.close();
  });
});
