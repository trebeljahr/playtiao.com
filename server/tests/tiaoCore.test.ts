import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  BOARD_SIZE,
  SCORE_TO_WIN,
  canPlacePiece,
  confirmPendingJump,
  createInitialGameState,
  getSelectableJumpOrigins,
  getWinner,
  isGameOver,
  jumpPiece,
  placePiece,
  undoLastTurn,
  undoPendingJumpStep,
} from "../../shared/src";
import { assertRegion, at, serializePositions, stateFromDiagram } from "./boardHarness";

describe("Tiao core rules", () => {
  test("initial state starts on an empty 19x19 board with white to move", () => {
    const state = createInitialGameState();

    assert.equal(state.positions.length, BOARD_SIZE);
    assert.ok(state.positions.every((row) => row.length === BOARD_SIZE));
    assert.equal(state.currentTurn, "white");
    assert.deepEqual(state.score, { black: 0, white: 0 });
    assert.equal(state.history.length, 0);
    assert.equal(state.pendingJump.length, 0);
    assert.equal(state.pendingCaptures.length, 0);
    assert.equal(getWinner(state), null);
    assert.equal(isGameOver(state), false);
  });

  test("border placements are only legal when the opponent could jump into them", () => {
    const allowed = stateFromDiagram(
      `
        . . .
        . W .
        . B .
      `,
      {
        turn: "white",
      }
    );
    const blocked = stateFromDiagram(
      `
        . . .
        . W .
        . . .
      `,
      {
        turn: "white",
      }
    );

    const allowedPlacement = canPlacePiece(allowed, { x: 1, y: 0 });
    assert.equal(allowedPlacement.ok, true);

    const blockedPlacement = canPlacePiece(blocked, { x: 1, y: 0 });
    assert.equal(blockedPlacement.ok, false);
    if (!blockedPlacement.ok) {
      assert.equal(blockedPlacement.code, "INVALID_BORDER");
    }
  });

  test("the cluster rule allows a tenth stone but blocks the eleventh", () => {
    const origin = { x: 4, y: 9 };
    const nineStoneCluster = stateFromDiagram(
      `
        W W W W W W W W W . .
      `,
      {
        origin,
        turn: "white",
      }
    );
    const tenStoneCluster = stateFromDiagram(
      `
        W W W W W W W W W W .
      `,
      {
        origin,
        turn: "white",
      }
    );

    const tenthStone = canPlacePiece(nineStoneCluster, at(origin, 9, 0));
    assert.equal(tenthStone.ok, true);

    const eleventhStone = canPlacePiece(tenStoneCluster, at(origin, 10, 0));
    assert.equal(eleventhStone.ok, false);
    if (!eleventhStone.ok) {
      assert.equal(eleventhStone.code, "INVALID_CLUSTER");
    }
  });

  test("jump chains stay pending until confirmation and then score captured stones", () => {
    const origin = { x: 5, y: 5 };
    const state = stateFromDiagram(
      `
        W . . . . .
        . B . . . .
        . . . . . .
        . . . B . .
        . . . . . .
        . . . . . .
      `,
      {
        origin,
        turn: "white",
      }
    );

    const firstJump = jumpPiece(state, at(origin, 0, 0), at(origin, 2, 2));
    assert.equal(firstJump.ok, true);
    if (!firstJump.ok) {
      return;
    }

    assert.equal(firstJump.value.pendingJump.length, 1);
    assertRegion(
      firstJump.value,
      `
        . . . . . .
        . B . . . .
        . . W . . .
        . . . B . .
        . . . . . .
        . . . . . .
      `,
      { origin }
    );

    const secondJump = jumpPiece(
      firstJump.value,
      at(origin, 2, 2),
      at(origin, 4, 4)
    );
    assert.equal(secondJump.ok, true);
    if (!secondJump.ok) {
      return;
    }

    assert.equal(secondJump.value.pendingJump.length, 2);
    assert.equal(secondJump.value.pendingCaptures.length, 2);
    const lockedOrigins = serializePositions(
      getSelectableJumpOrigins(secondJump.value)
    );
    assert.deepEqual(lockedOrigins, [`${origin.x + 4},${origin.y + 4}`]);

    const pendingPlacement = canPlacePiece(secondJump.value, at(origin, 5, 0));
    assert.equal(pendingPlacement.ok, false);
    if (!pendingPlacement.ok) {
      assert.equal(pendingPlacement.code, "PENDING_JUMP");
    }

    const confirmed = confirmPendingJump(secondJump.value);
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) {
      return;
    }

    assert.equal(confirmed.value.currentTurn, "black");
    assert.deepEqual(confirmed.value.score, { black: 0, white: 2 });
    assert.equal(confirmed.value.pendingJump.length, 0);
    assert.equal(confirmed.value.pendingCaptures.length, 0);
    assertRegion(
      confirmed.value,
      `
        . . . . . .
        . . . . . .
        . . . . . .
        . . . . . .
        . . . . W .
        . . . . . .
      `,
      { origin }
    );
  });

  test("undoPendingJumpStep only rewinds the most recent hop", () => {
    const origin = { x: 5, y: 5 };
    const state = stateFromDiagram(
      `
        W . . . . .
        . B . . . .
        . . . . . .
        . . . B . .
        . . . . . .
        . . . . . .
      `,
      {
        origin,
        turn: "white",
      }
    );

    const firstJump = jumpPiece(state, at(origin, 0, 0), at(origin, 2, 2));
    assert.equal(firstJump.ok, true);
    if (!firstJump.ok) {
      return;
    }

    const secondJump = jumpPiece(
      firstJump.value,
      at(origin, 2, 2),
      at(origin, 4, 4)
    );
    assert.equal(secondJump.ok, true);
    if (!secondJump.ok) {
      return;
    }

    const undone = undoPendingJumpStep(secondJump.value);
    assert.equal(undone.ok, true);
    if (!undone.ok) {
      return;
    }

    assert.equal(undone.value.pendingJump.length, 1);
    assert.equal(undone.value.pendingCaptures.length, 1);
    assertRegion(
      undone.value,
      `
        . . . . . .
        . B . . . .
        . . W . . .
        . . . B . .
        . . . . . .
        . . . . . .
      `,
      { origin }
    );
  });

  test("getSelectableJumpOrigins lists every capturing piece and locks to the pending jumper", () => {
    const origin = { x: 5, y: 5 };
    const state = stateFromDiagram(
      `
        W . . W . .
        . B . . B .
        . . . . . .
      `,
      {
        origin,
        turn: "white",
      }
    );

    const selectableOrigins = serializePositions(getSelectableJumpOrigins(state));
    assert.deepEqual(selectableOrigins, [
      `${origin.x},${origin.y}`,
      `${origin.x + 3},${origin.y}`,
    ]);

    const jumped = jumpPiece(state, at(origin, 0, 0), at(origin, 2, 2));
    assert.equal(jumped.ok, true);
    if (!jumped.ok) {
      return;
    }

    const lockedOrigins = serializePositions(getSelectableJumpOrigins(jumped.value));
    assert.deepEqual(lockedOrigins, [`${origin.x + 2},${origin.y + 2}`]);
  });

  test("undoLastTurn restores both placed stones and confirmed captures", () => {
    const placed = placePiece(createInitialGameState(), { x: 9, y: 9 });
    assert.equal(placed.ok, true);
    if (!placed.ok) {
      return;
    }

    const undonePlacement = undoLastTurn(placed.value);
    assert.equal(undonePlacement.ok, true);
    if (!undonePlacement.ok) {
      return;
    }

    assert.equal(undonePlacement.value.currentTurn, "white");
    assert.equal(undonePlacement.value.history.length, 0);
    assert.equal(undonePlacement.value.positions[9]?.[9] ?? null, null);

    const origin = { x: 5, y: 5 };
    const jumpState = stateFromDiagram(
      `
        W . . . . .
        . B . . . .
        . . . . . .
        . . . B . .
        . . . . . .
        . . . . . .
      `,
      {
        origin,
        turn: "white",
      }
    );

    const firstJump = jumpPiece(jumpState, at(origin, 0, 0), at(origin, 2, 2));
    assert.equal(firstJump.ok, true);
    if (!firstJump.ok) {
      return;
    }

    const secondJump = jumpPiece(
      firstJump.value,
      at(origin, 2, 2),
      at(origin, 4, 4)
    );
    assert.equal(secondJump.ok, true);
    if (!secondJump.ok) {
      return;
    }

    const confirmed = confirmPendingJump(secondJump.value);
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) {
      return;
    }

    const undoneJump = undoLastTurn(confirmed.value);
    assert.equal(undoneJump.ok, true);
    if (!undoneJump.ok) {
      return;
    }

    assert.equal(undoneJump.value.currentTurn, "white");
    assert.deepEqual(undoneJump.value.score, { black: 0, white: 0 });
    assert.equal(undoneJump.value.history.length, 0);
    assertRegion(
      undoneJump.value,
      `
        W . . . . .
        . B . . . .
        . . . . . .
        . . . B . .
        . . . . . .
        . . . . . .
      `,
      { origin }
    );
  });

  test("game over and illegal jump targets are rejected", () => {
    const gameOverState = stateFromDiagram(
      `
        W . .
        . B .
        . . .
      `,
      {
        turn: "white",
        score: { white: SCORE_TO_WIN },
      }
    );

    const placement = canPlacePiece(gameOverState, { x: 2, y: 2 });
    assert.equal(placement.ok, false);
    if (!placement.ok) {
      assert.equal(placement.code, "GAME_OVER");
    }

    const jumpWhileOver = jumpPiece(
      gameOverState,
      { x: 0, y: 0 },
      { x: 2, y: 2 }
    );
    assert.equal(jumpWhileOver.ok, false);
    if (!jumpWhileOver.ok) {
      assert.equal(jumpWhileOver.code, "GAME_OVER");
    }

    const illegalJumpState = stateFromDiagram(
      `
        W . .
        . W .
        . . .
      `,
      {
        turn: "white",
      }
    );
    const illegalJump = jumpPiece(
      illegalJumpState,
      { x: 0, y: 0 },
      { x: 2, y: 2 }
    );
    assert.equal(illegalJump.ok, false);
    if (!illegalJump.ok) {
      assert.equal(illegalJump.code, "INVALID_JUMP");
    }
  });
});
