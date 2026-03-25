import { test, expect } from '@playwright/test';

test('multiplayer rematch decline flow', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();

  // Alice signs up
  await alicePage.goto('/');
  await alicePage.click('button:has-text("Sign up")');
  const aliceUsername = `alice_dec_${Math.random().toString(36).slice(2, 7)}`;
  await alicePage.fill('input[placeholder="Username"]', aliceUsername);
  await alicePage.fill('input[placeholder="Password"]', 'password123');
  await alicePage.click('button:has-text("Create account")');
  await expect(alicePage.locator('text=Account')).toBeVisible();

  // Bob signs up
  await bobPage.goto('/');
  await bobPage.click('button:has-text("Sign up")');
  const bobUsername = `bob_dec_${Math.random().toString(36).slice(2, 7)}`;
  await bobPage.fill('input[placeholder="Username"]', bobUsername);
  await bobPage.fill('input[placeholder="Password"]', 'password123');
  await bobPage.click('button:has-text("Create account")');
  await expect(bobPage.locator('text=Account')).toBeVisible();

  // Alice creates game, Bob joins
  await alicePage.click('button:has-text("Create game")');
  await expect(alicePage).toHaveURL(/\/game\/[A-Z0-9]{6}/);
  const gameUrl = alicePage.url();
  const gameId = gameUrl.split('/').pop()!;

  await bobPage.goto(gameUrl);
  await expect(bobPage.locator('text=Live match')).toBeVisible();

  // Force finish the game
  await alicePage.evaluate(async (gameId) => {
    await fetch(`/api/games/${gameId}/test-finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner: 'white' }),
    });
  }, gameId);

  // Rematch buttons appear
  await expect(alicePage.locator('button:has-text("Rematch")')).toBeVisible();
  await expect(bobPage.locator('button:has-text("Rematch")')).toBeVisible();

  // Alice requests rematch
  await alicePage.click('button:has-text("Rematch")');
  await expect(alicePage.locator('text=Rematch requested')).toBeVisible();

  // Bob declines
  await expect(bobPage.locator('button:has-text("Decline")')).toBeVisible();
  await bobPage.click('button:has-text("Decline")');

  // After decline, rematch request should be cleared
  // The game should still show as finished, no new game started
  await expect(alicePage.locator('text=Live match')).not.toBeVisible({ timeout: 3000 });

  await aliceContext.close();
  await bobContext.close();
});
