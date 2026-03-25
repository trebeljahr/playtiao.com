import { test, expect } from '@playwright/test';

test('spectator can view an active game without joining', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const spectatorContext = await browser.newContext();

  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  const spectatorPage = await spectatorContext.newPage();

  // Alice signs up and creates a game
  await alicePage.goto('/');
  await alicePage.click('button:has-text("Sign up")');
  const aliceUsername = `alice_spec_${Math.random().toString(36).slice(2, 7)}`;
  await alicePage.fill('input[placeholder="Username"]', aliceUsername);
  await alicePage.fill('input[placeholder="Password"]', 'password123');
  await alicePage.click('button:has-text("Create account")');
  await expect(alicePage.locator('text=Account')).toBeVisible();

  // Alice creates game
  await alicePage.click('button:has-text("Create game")');
  await expect(alicePage).toHaveURL(/\/game\/[A-Z0-9]{6}/);
  const gameUrl = alicePage.url();

  // Bob signs up and joins
  await bobPage.goto('/');
  await bobPage.click('button:has-text("Sign up")');
  const bobUsername = `bob_spec_${Math.random().toString(36).slice(2, 7)}`;
  await bobPage.fill('input[placeholder="Username"]', bobUsername);
  await bobPage.fill('input[placeholder="Password"]', 'password123');
  await bobPage.click('button:has-text("Create account")');
  await expect(bobPage.locator('text=Account')).toBeVisible();

  await bobPage.goto(gameUrl);
  await expect(bobPage.locator('text=Live match')).toBeVisible();

  // Spectator (as guest) visits the game URL
  await spectatorPage.goto(gameUrl);
  // Spectator should see the game but not be a player
  // The board should be visible
  await expect(spectatorPage.locator('[data-testid="cell-9-9"]')).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
  await spectatorContext.close();
});
