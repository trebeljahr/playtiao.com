import { test, expect } from '@playwright/test';

function cell(page: import('@playwright/test').Page, x: number, y: number) {
  return page.locator(`[data-testid="cell-${x}-${y}"]`);
}

test.describe('Computer game undo', () => {
  test('undo removes the human piece and lets the human place again', async ({ page }) => {
    await page.goto('/computer');
    await expect(cell(page, 9, 9)).toBeVisible();
    await expect(page.locator('text=White to move')).toBeVisible();

    // Human places at center
    await cell(page, 9, 9).click();
    await expect(cell(page, 9, 9)).toHaveAttribute('data-piece', 'white');

    // Click undo before AI responds
    await page.locator('button:has-text("Undo move")').click();

    // The piece should be removed
    await expect(cell(page, 9, 9)).not.toHaveAttribute('data-piece', 'white');
    // Should be human's turn again
    await expect(page.locator('text=White to move')).toBeVisible();

    // Human should be able to place at a different position
    await cell(page, 8, 8).click();
    await expect(cell(page, 8, 8)).toHaveAttribute('data-piece', 'white');
  });

  test('undo after AI responds removes both AI and human moves', async ({ page }) => {
    await page.goto('/computer');
    await expect(cell(page, 9, 9)).toBeVisible();

    // Human places
    await cell(page, 9, 9).click();
    await expect(cell(page, 9, 9)).toHaveAttribute('data-piece', 'white');

    // Wait for AI to respond
    await expect(page.locator('text=White to move')).toBeVisible({ timeout: 5000 });

    // Should have at least one black piece
    const blackPiecesBeforeUndo = await page.locator('[data-piece="black"]').count();
    expect(blackPiecesBeforeUndo).toBeGreaterThan(0);

    // Undo — should remove both AI and human moves
    await page.locator('button:has-text("Undo move")').click();
    await expect(page.locator('text=White to move')).toBeVisible();

    // Board should be empty again
    await expect(page.locator('[data-piece="white"]')).toHaveCount(0);
    await expect(page.locator('[data-piece="black"]')).toHaveCount(0);
  });

  test('multiple undo-place cycles work correctly', async ({ page }) => {
    await page.goto('/computer');
    await expect(cell(page, 9, 9)).toBeVisible();

    // Cycle 1: place and undo
    await cell(page, 9, 9).click();
    await expect(cell(page, 9, 9)).toHaveAttribute('data-piece', 'white');
    await page.locator('button:has-text("Undo move")').click();
    await expect(cell(page, 9, 9)).not.toHaveAttribute('data-piece', 'white');
    await expect(page.locator('text=White to move')).toBeVisible();

    // Cycle 2: place at different spot and undo
    await cell(page, 7, 7).click();
    await expect(cell(page, 7, 7)).toHaveAttribute('data-piece', 'white');
    await page.locator('button:has-text("Undo move")').click();
    await expect(cell(page, 7, 7)).not.toHaveAttribute('data-piece', 'white');
    await expect(page.locator('text=White to move')).toBeVisible();

    // Cycle 3: place and let AI respond, then undo
    await cell(page, 9, 9).click();
    await expect(page.locator('text=White to move')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Undo move")').click();

    // Board should be empty
    await expect(page.locator('[data-piece="white"]')).toHaveCount(0);
    await expect(page.locator('[data-piece="black"]')).toHaveCount(0);
  });

  test('last move arrows are cleared after undo', async ({ page }) => {
    await page.goto('/computer');
    await expect(cell(page, 9, 9)).toBeVisible();

    // Human places
    await cell(page, 9, 9).click();
    await expect(cell(page, 9, 9)).toHaveAttribute('data-piece', 'white');

    // Wait for AI to respond
    await expect(page.locator('text=White to move')).toBeVisible({ timeout: 5000 });

    // There should be last-move jump trail arrows if AI jumped,
    // or at minimum a last-move highlight. After undo, none should remain.
    await page.locator('button:has-text("Undo move")').click();

    // No last-move jump trail arrows should be present
    await expect(page.locator('[class*="lastmove"]')).toHaveCount(0, { timeout: 1000 });
    // No SVG lines for jump trails
    const jumpTrailArrows = await page.locator('g[class*="lastmove"], line[class*="lastmove"]').count();
    expect(jumpTrailArrows).toBe(0);
  });

  test('no stale pieces remain on the board after undo during AI thinking', async ({ page }) => {
    await page.goto('/computer');
    await expect(cell(page, 9, 9)).toBeVisible();

    // Place and immediately undo (AI is still thinking)
    await cell(page, 9, 9).click();
    // Don't wait for AI — undo right away
    await page.locator('button:has-text("Undo move")').click();

    // Board should be completely empty
    await expect(page.locator('[data-piece="white"]')).toHaveCount(0);
    await expect(page.locator('[data-piece="black"]')).toHaveCount(0);

    // No pending jump state — the game should be in a clean state
    await expect(page.locator('text=White to move')).toBeVisible();
  });
});
