import { test, expect } from '@playwright/test';

test('multiplayer rematch flow', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();

  // 1. Alice signs up
  await alicePage.goto('/');
  await alicePage.click('button:has-text("Sign up")');
  const aliceUsername = `alice_${Math.random().toString(36).slice(2, 7)}`;
  await alicePage.fill('input[placeholder="Username"]', aliceUsername);
  await alicePage.fill('input[placeholder="Password"]', 'password123');
  await alicePage.click('button:has-text("Create account")');
  await expect(alicePage.locator('text=Account')).toBeVisible();

  // 2. Bob signs up
  await bobPage.goto('/');
  await bobPage.click('button:has-text("Sign up")');
  const bobUsername = `bob_${Math.random().toString(36).slice(2, 7)}`;
  await bobPage.fill('input[placeholder="Username"]', bobUsername);
  await bobPage.fill('input[placeholder="Password"]', 'password123');
  await bobPage.click('button:has-text("Create account")');
  await expect(bobPage.locator('text=Account')).toBeVisible();

  // 3. Alice creates a game
  await alicePage.click('button:has-text("Create game")');
  await expect(alicePage).toHaveURL(/\/game\/[A-Z0-9]{6}/);
  const gameUrl = alicePage.url();
  const gameId = gameUrl.split('/').pop()!;

  // 4. Bob joins the game via URL
  await bobPage.goto(gameUrl);
  await expect(bobPage.locator('text=Live match')).toBeVisible();
  await expect(alicePage.locator('text=Live match')).toBeVisible();

  // 5. Force finish the game via the test route
  // We can use alicePage.evaluate to send a POST request to the test route
  await alicePage.evaluate(async (gameId) => {
    await fetch(`/api/games/${gameId}/test-finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner: 'white' }),
    });
  }, gameId);

  // 6. Verify "Rematch" button appears for both
  await expect(alicePage.locator('button:has-text("Rematch")')).toBeVisible();
  await expect(bobPage.locator('button:has-text("Rematch")')).toBeVisible();

  // 7. Alice requests rematch
  await alicePage.click('button:has-text("Rematch")');
  await expect(alicePage.locator('text=Rematch requested')).toBeVisible();

  // 8. Verify Bob sees "Accept Rematch" and "Decline"
  await expect(bobPage.locator('button:has-text("Accept Rematch")')).toBeVisible();
  await expect(bobPage.locator('button:has-text("Decline")')).toBeVisible();

  // 9. Bob accepts rematch
  await bobPage.click('button:has-text("Accept Rematch")');

  // 10. Verify both are back in a "Live match"
  await expect(alicePage.locator('text=Live match')).toBeVisible();
  await expect(bobPage.locator('text=Live match')).toBeVisible();
  
  // Verify scores are reset
  await expect(alicePage.locator('text=0').first()).toBeVisible();
  await expect(bobPage.locator('text=0').first()).toBeVisible();
});
