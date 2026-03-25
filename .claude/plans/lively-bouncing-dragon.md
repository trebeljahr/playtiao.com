# Implementation Plan: TODOS.md Bug Fixes & Features

## Context
The user has a TODOS.md with 16 items covering UI bugs, missing features, and behavioral issues that keep regressing. Each item needs implementation + regression/unit/e2e tests.

---

## Group 1: Quick UI Fixes (low risk, high value)

### 1.1 — Don't show confetti to the loser; show falling particles instead (#1)
- **Files**: `client/src/lib/useWinConfetti.ts`, `MultiplayerGamePage.tsx`, `ComputerGamePage.tsx`, `LocalGamePage.tsx`
- **Change**: Add a `playerColor` param to `useWinConfetti`. When `winner === playerColor` (or local mode), fire celebratory confetti. When `winner !== playerColor` (loser), fire a different particle effect — gentle falling leaves/rain-like particles using canvas-confetti with `gravity: 0.3`, `drift: 1`, muted colors, slower velocity. In local mode, always fire confetti (both players share screen).
- **Tests**: Unit test for useWinConfetti with winner/loser/local scenarios. E2E: finish a computer game as loser, verify different animation.

### 1.2 — Don't play confetti when opening game review (#8)
- **Files**: `MultiplayerGamePage.tsx`
- **Change**: Pass `null` to `useWinConfetti` when `isReviewMode` is true (entering via /games page). Currently confetti fires because `winner` is set from the finished game state.
- **Fix**: `useWinConfetti(isReviewMode ? null : winner)`
- **Tests**: E2E: open a finished game from My Games, verify no confetti.

### 1.3 — Hide rematch/copy buttons in review mode (#9)
- **Files**: `MultiplayerGamePage.tsx` (lines 681-746, and copy pill area)
- **Change**: Wrap the rematch section and RoomCodeCopyPill/ShareLinkCopyPill in `!isReviewMode &&` guards.
- **Tests**: E2E: review a finished game, verify no rematch/copy buttons visible.

### 1.4 — Move review navigation buttons under the board (#10)
- **Files**: `MultiplayerGamePage.tsx`
- **Change**: Extract the MoveList navigation buttons (⏮◀▶⏭) into a separate component or render them in the board column below the board when `isReviewMode`, rather than in the side panel's MoveList.
- **Tests**: E2E: review game, verify nav buttons are below the board.

### 1.5 — Navbar active link contrast (#4)
- **Files**: `client/src/components/Navbar.tsx` (line 171)
- **Change**: The active link uses `text-[#28170e]` same as inactive but has a bg overlay `bg-[rgba(255,248,232,0.94)]` that washes out the contrast. Also `disabled={item.active}` dims the button. Fix: remove `disabled` on active items (use a different visual indicator) or override `disabled:text-[color]` with a darker/matching color. Use `pointer-events-none` instead of `disabled` for active items.
- **Tests**: Unit test for active class application.

### 1.6 — Remove confirm/undo jump buttons from scorecard (#13)
- **Files**: `LocalGamePage.tsx` (lines 119-128), `MultiplayerGamePage.tsx` (lines 657-679)
- **Change**: Remove the "Confirm jump" and "Undo jump" Button elements. The board already supports click-to-confirm (click same piece) and hover-to-cancel/undo.
- **Tests**: E2E: verify buttons don't appear during a multi-jump.

---

## Group 2: Behavioral Fixes

### 2.1 — Computer game end popup overlay (#2)
- **Files**: `ComputerGamePage.tsx`
- **Change**: When `winner` is set, show a Dialog/modal overlay with:
  - Win: congratulatory message + "Play again" / "Change difficulty" / "Back to lobby"
  - Loss: encouraging message + "Try again" / "Change difficulty" / "Back to lobby"
- Reuse existing Dialog component from `components/ui/dialog`.
- **Tests**: E2E: play vs computer until game ends, verify popup appears with correct messaging.

### 2.2 — AI move animation for multi-jumps (#3)
- **Files**: `client/src/lib/hooks/useComputerGame.ts`, `client/src/lib/computer-ai.ts`
- **Change**: Instead of applying the entire jump plan atomically via `applyComputerTurnPlan()`, apply each jump step one at a time with a delay (e.g., 300ms per step). This lets the board animate each hop.
  - New function `applyComputerTurnPlanAnimated()` that yields intermediate states.
  - useComputerGame applies steps sequentially with timeouts.
- **Tests**: Unit test that animated plan applies steps in order. E2E: computer makes multi-jump, verify intermediate board states.

### 2.3 — "It's your move" toast only when opponent actually moved (#14)
- **Files**: `LobbyPage.tsx` (lines 44-65)
- **Change**: The current logic fires the toast on any `game-update` where it's your turn and you're not in the game. The issue is it also fires when YOU leave the game (your departure triggers a game-update). Fix: track which games you were just in and suppress the toast for ~5 seconds after leaving a game, OR compare `historyLength` to detect that a new move was actually made.
- Better approach: Store `lastSeenHistoryLength` per game. Only toast if `payload.summary.historyLength > lastSeen`.
- **Tests**: E2E: leave a game, verify no spurious toast. Return after opponent moves, verify toast appears.

### 2.4 — Local mode turn order bug (#16)
- **Files**: `shared/src/tiao.ts` (canPlacePiece, placePiece), `client/src/lib/hooks/useLocalGame.ts`
- **Investigation**: `canPlacePiece` and `placePiece` in the shared engine may not enforce turn correctly for placement (only jump selection checks `tile === currentTurn`). Need to verify the shared engine enforces turn on placement.
- **Fix**: If the engine doesn't enforce turn on placement, add the check. If it does, the bug may be in hot-reload/state reset scenarios.
- **Tests**: E2E: verify cannot place wrong color piece. Unit test for engine turn enforcement.

### 2.5 — Show "waiting in game" indicator in active games list (#15)
- **Files**: `LobbyPage.tsx` (lines 321-357)
- **Change**: The `MultiplayerGameSummary` already includes `seats` with `online` status. Add a visual indicator (colored dot or "Opponent waiting" badge) when the opponent is online in the game. Sort these games higher.
- **Tests**: Unit test for sorting logic. E2E: have opponent connect, verify indicator appears.

---

## Group 3: WebSocket Improvements

### 3.1 — My Games page: remove refresh button, use WebSocket (#5)
- **Files**: `GamesPage.tsx` (lines 76-81)
- **Change**: The page ALREADY has `useLobbyMessage` listening for `game-update` (lines 42-46). The refresh button is redundant. Simply remove it.
- **Tests**: E2E: verify no refresh button on My Games page. Verify list updates via WebSocket.

### 3.2 — Lobby invitations: remove refresh button, use WebSocket (#11)
- **Files**: `LobbyPage.tsx` (lines 377-384)
- **Change**: The lobby ALREADY listens for `social-update` and calls `refreshSocialOverview` (lines 67-69). The refresh button is redundant. Remove it.
- **Tests**: E2E: verify no refresh button on invitations card.

---

## Group 4: Complex Features

### 4.1 — Forfeit/resign functionality (#6)
- **Protocol**: Add `{ type: "forfeit" }` to `GameActionMessage` in `shared/src/protocol.ts`
- **Server**: Handle `forfeit` in `gameService.applyAction()` — set winner to opponent, status to "finished"
- **Client**: Add "Forfeit" button in `MultiplayerGamePage.tsx` game panel (with confirmation dialog)
- **Files**: `shared/src/protocol.ts`, `server/game/gameService.ts`, `client/src/pages/MultiplayerGamePage.tsx`
- **Tests**: Server unit test for forfeit. E2E: forfeit a game, verify it ends with opponent winning.

### 4.2 — Rematch creates new game (#12)
- **Server**: `gameService.requestRematch()` currently resets the same room. Change to:
  1. Create a new room via `createGame()`
  2. Auto-join both players
  3. Mark old room as finished (keep history)
  4. Broadcast new game ID to both players via a new `rematch-started` message
- **Client**: Handle `rematch-started` message — navigate to new game URL
- **Protocol**: Add `{ type: "rematch-started"; gameId: string }` to `ServerToClientMessage`
- **Files**: `shared/src/protocol.ts`, `server/game/gameService.ts`, `client/src/pages/MultiplayerGamePage.tsx`, `client/src/lib/hooks/useMultiplayerGame.ts`
- **Tests**: Server unit test for new room creation. E2E: rematch flow creates new URL.

### 4.3 — Matchmaking with time controls (#7) — DEFERRED
- Deferred to a future batch. Too large for this round (needs clock system, server timers, protocol changes, UI).

---

## Implementation Order

1. **Group 1** (quick fixes) — all 6 items, then tests
2. **Group 3** (WebSocket) — 2 items, trivial removals + tests
3. **Group 2** (behavioral) — 5 items with tests
4. **Group 4.1** (forfeit) — new feature + tests
5. **Group 4.2** (rematch new game) — server refactor + tests
6. ~~Group 4.3 (time controls)~~ — **DEFERRED**

---

## Testing Strategy

- **Unit tests** (Vitest): Hook behavior, component rendering, engine logic
- **Server tests** (Node test runner): API endpoints, game service operations
- **E2E tests** (Playwright): Full user flows for each regression-prone item
- Every todo item gets at least one e2e test to prevent regressions

---

## Verification

1. Run `npm run test` in client dir for unit tests
2. Run `npm test` in server dir for server tests
3. Run `npx playwright test` for e2e tests
4. Start dev servers and manually verify key flows via preview tools
