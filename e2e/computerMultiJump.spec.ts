import { test, expect } from '@playwright/test';

function cell(page: import('@playwright/test').Page, x: number, y: number) {
  return page.locator(`[data-testid="cell-${x}-${y}"]`);
}

/**
 * Determine the human color by watching for the first status message.
 * Returns which color the human is playing.
 */
async function detectHumanColor(page: import('@playwright/test').Page): Promise<'white' | 'black'> {
  // Either "X to move" (human) or "Computer thinking" (AI) will appear
  const humanTurn = page.locator('text=/^(White|Black) to move$/');
  const aiThinking = page.locator('text=Computer thinking');

  // Race: which appears first
  const first = await Promise.race([
    humanTurn.waitFor({ timeout: 15000 }).then(async () => {
      const text = await humanTurn.textContent();
      return text!.startsWith('White') ? 'white' : 'black';
    }),
    aiThinking.waitFor({ timeout: 15000 }).then(async () => {
      // If AI is thinking first, wait for it to finish
      await expect(aiThinking).not.toBeVisible({ timeout: 15000 });
      const text = await humanTurn.textContent();
      return text!.startsWith('White') ? 'white' : 'black';
    }),
  ]);

  return first as 'white' | 'black';
}

// AI worker can be slow under CPU pressure; retry once on failure
test.describe.configure({ retries: 1 });

test('AI completes a multi-jump without the board getting stuck', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/computer');
  await page.click('button:has-text("Easy")');
  await page.click('button:has-text("Start Game")');
  await expect(cell(page, 9, 9)).toBeVisible();

  // Wait to determine which color the human is
  const humanColor = await detectHumanColor(page);
  const computerColor = humanColor === 'white' ? 'black' : 'white';
  const humanLabel = humanColor === 'white' ? 'White' : 'Black';

  // Inject a board state where the computer has a double-jump available.
  // Computer piece at (9,6), two human pieces at (9,7) and (9,9),
  // empty at (9,8) and (9,10). Set it to the computer's turn.
  await page.evaluate(({ computerColor, humanColor }) => {
    const boardEl = document.querySelector('[data-testid="cell-9-9"]');
    if (!boardEl) throw new Error('Board not found');

    const fiberKey = Object.keys(boardEl).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
    );
    if (!fiberKey) throw new Error('React fiber not found');

    let fiber = (boardEl as any)[fiberKey];
    let found = false;
    for (let i = 0; i < 50 && fiber; i++) {
      if (fiber.memoizedState) {
        let hook = fiber.memoizedState;
        while (hook) {
          const state = hook.memoizedState;
          if (
            state &&
            typeof state === 'object' &&
            state.score &&
            typeof state.score.white === 'number' &&
            state.positions &&
            state.currentTurn
          ) {
            const queue = hook.queue;
            if (queue && queue.dispatch) {
              // Deep clone the positions array
              const positions = state.positions.map((row: any[]) => [...row]);

              // Set up the multi-jump scenario
              positions[6][9] = computerColor;
              positions[7][9] = humanColor;
              positions[8][9] = null;
              positions[9][9] = humanColor;
              positions[10][9] = null;

              const newState = {
                ...state,
                positions,
                currentTurn: computerColor, // AI's turn
                pendingJump: [],
                pendingCaptures: [],
                history: [{
                  type: 'put',
                  color: humanColor,
                  position: { x: 5, y: 5 },
                }],
              };
              queue.dispatch(newState);
              found = true;
              break;
            }
          }
          hook = hook.next;
        }
        if (found) break;
      }
      fiber = fiber.return;
    }

    if (!found) {
      throw new Error('Could not find game state in React fiber tree');
    }
  }, { computerColor, humanColor });

  // The AI should now think and execute a multi-jump.
  // If the bug is present, the game would get stuck after the first hop —
  // neither "Computer thinking" nor "X to move" would be visible.
  // With the fix, the AI completes the full sequence and the human's turn starts.
  await expect(page.locator(`text=${humanLabel} to move`)).toBeVisible({ timeout: 15000 });

  // Verify the board is playable: human can place a piece on an empty cell.
  const candidates = [
    { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 },
    { x: 4, y: 4 }, { x: 12, y: 12 }, { x: 13, y: 13 },
  ];

  let placed = false;
  for (const c of candidates) {
    const piece = await cell(page, c.x, c.y).getAttribute('data-piece');
    if (!piece) {
      await cell(page, c.x, c.y).click();
      await expect(cell(page, c.x, c.y)).toHaveAttribute('data-piece', humanColor, { timeout: 2000 });
      placed = true;
      break;
    }
  }

  expect(placed).toBe(true);
});
