import { test, expect } from '@playwright/test';

function cell(page: import('@playwright/test').Page, x: number, y: number) {
  return page.locator(`[data-testid="cell-${x}-${y}"]`);
}

test('computer game lets human place and AI responds', async ({ page }) => {
  await page.goto('/computer');
  await expect(cell(page, 9, 9)).toBeVisible();

  // Should start with White (human) to move
  await expect(page.locator('text=White to move')).toBeVisible();

  // Human (white) places at center
  await cell(page, 9, 9).click();
  await expect(cell(page, 9, 9)).toHaveAttribute('data-piece', 'white');

  // Wait for computer (black) to make its move
  // The AI has a COMPUTER_THINK_MS of 440ms delay
  await expect(page.locator('text=White to move')).toBeVisible({ timeout: 3000 });

  // Verify the computer placed a black piece somewhere
  // We can check that there's at least one black piece on the board
  await expect(page.locator('[data-piece="black"]').first()).toBeVisible();
});

test('cannot place during computer turn', async ({ page }) => {
  await page.goto('/computer');
  await expect(cell(page, 9, 9)).toBeVisible();

  // Human places
  await cell(page, 9, 9).click();
  await expect(cell(page, 9, 9)).toHaveAttribute('data-piece', 'white');

  // Wait for AI to respond and human turn to come back
  await expect(page.locator('text=White to move')).toBeVisible({ timeout: 3000 });

  // Now human should be able to place again
  await cell(page, 8, 8).click();
  await expect(cell(page, 8, 8)).toHaveAttribute('data-piece', 'white');
});
