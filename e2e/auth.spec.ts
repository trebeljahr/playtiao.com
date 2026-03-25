import { test, expect } from '@playwright/test';

test.describe('Authentication flows', () => {
  test('signup creates an account and shows account indicator', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Sign up")');

    const username = `testuser_${Math.random().toString(36).slice(2, 7)}`;
    await page.fill('input[placeholder="Username"]', username);
    await page.fill('input[placeholder="Password"]', 'testpass123');
    await page.click('button:has-text("Create account")');

    await expect(page.locator('text=Account')).toBeVisible();
  });

  test('login with existing account', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // First, sign up
    await page.goto('/');
    await page.click('button:has-text("Sign up")');
    const username = `logintest_${Math.random().toString(36).slice(2, 7)}`;
    await page.fill('input[placeholder="Username"]', username);
    await page.fill('input[placeholder="Password"]', 'testpass123');
    await page.click('button:has-text("Create account")');
    await expect(page.locator('text=Account')).toBeVisible();

    // Logout
    await page.click('button:has-text("Account")');
    await page.click('button:has-text("Log out")');

    // Login again
    await page.click('button:has-text("Log in")');
    await page.fill('input[placeholder="Username or email"]', username);
    await page.fill('input[placeholder="Password"]', 'testpass123');
    await page.click('button:has-text("Sign in")');

    await expect(page.locator('text=Account')).toBeVisible();
    await context.close();
  });

  test('guest player can play without account', async ({ page }) => {
    await page.goto('/');
    // Should load without requiring login
    // Guest should be able to access game features
    await expect(page.locator('button:has-text("Create game")')).toBeVisible();
    await expect(page.locator('button:has-text("Find match")')).toBeVisible();
  });
});
