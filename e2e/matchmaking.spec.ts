import { test, expect } from '@playwright/test';

test('matchmaking pairs two players into a game', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();

  // Alice navigates to matchmaking
  await alicePage.goto('/');
  await alicePage.click('button:has-text("Find match")');
  await expect(alicePage).toHaveURL(/\/matchmaking/);
  await expect(alicePage.locator('text=Searching')).toBeVisible();

  // Bob navigates to matchmaking
  await bobPage.goto('/');
  await bobPage.click('button:has-text("Find match")');

  // Both should eventually land in a game
  await expect(alicePage).toHaveURL(/\/game\/[A-Z0-9]{6}/, { timeout: 10000 });
  await expect(bobPage).toHaveURL(/\/game\/[A-Z0-9]{6}/, { timeout: 10000 });

  // Both should see "Live match"
  await expect(alicePage.locator('text=Live match')).toBeVisible();
  await expect(bobPage.locator('text=Live match')).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});
