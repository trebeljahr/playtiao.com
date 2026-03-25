import {
  BOARD_SIZE,
  GameState,
  Position,
  PlayerColor,
  canPlacePiece,
  confirmPendingJump,
  getJumpTargets,
  getSelectableJumpOrigins,
  isGameOver,
  jumpPiece,
  placePiece,
} from "@shared";

export const COMPUTER_COLOR: PlayerColor = "black";
export const COMPUTER_THINK_MS = 440;

export type ComputerTurnPlan =
  | {
      type: "place";
      position: Position;
      score: number;
    }
  | {
      type: "jump";
      from: Position;
      path: Position[];
      score: number;
    };

function distanceFromBoardCenter(position: Position) {
  const center = (BOARD_SIZE - 1) / 2;
  return Math.sqrt((position.x - center) ** 2 + (position.y - center) ** 2);
}

function countAdjacentPieces(
  state: GameState,
  position: Position,
  color: PlayerColor,
) {
  const directions = [
    { dx: -1, dy: -1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
  ];

  let count = 0;
  for (const { dx, dy } of directions) {
    const nx = position.x + dx;
    const ny = position.y + dy;
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (state.positions[ny][nx] === color) {
        count += 1;
      }
    }
  }
  return count;
}

function scoreComputerPlacement(state: GameState, position: Position) {
  const centerBias = (BOARD_SIZE / 2 - distanceFromBoardCenter(position)) * 1.5;
  const enemyAdjacency = countAdjacentPieces(state, position, "white") * 2.5;
  const allyAdjacency =
    countAdjacentPieces(state, position, COMPUTER_COLOR) * 0.9;

  return centerBias + enemyAdjacency + allyAdjacency;
}

function collectComputerJumpPlans(
  state: GameState,
  from: Position,
): Array<{ path: Position[]; score: number }> {
  const targets = getJumpTargets(state, from, state.currentTurn);

  if (targets.length === 0) {
    return [];
  }

  return targets.flatMap((target) => {
    const jumped = jumpPiece(state, from, target);
    if (!jumped.ok) {
      return [];
    }

    const continuations = collectComputerJumpPlans(jumped.value, target);
    if (continuations.length > 0) {
      return continuations.map((continuation) => ({
        path: [target, ...continuation.path],
        score: continuation.score,
      }));
    }

    const confirmed = confirmPendingJump(jumped.value);
    if (!confirmed.ok) {
      return [];
    }

    const captures = jumped.value.pendingJump.length;
    const landingPressure = countAdjacentPieces(
      confirmed.value,
      target,
      "white",
    );

    return [
      {
        path: [target],
        score:
          captures * 120 +
          landingPressure * 2.1 -
          distanceFromBoardCenter(target) * 0.9,
      },
    ];
  });
}

export function chooseComputerTurn(state: GameState): ComputerTurnPlan | null {
  const jumpOrigins = getSelectableJumpOrigins(state, COMPUTER_COLOR);

  if (jumpOrigins.length > 0) {
    let bestJump: ComputerTurnPlan | null = null;

    for (const origin of jumpOrigins) {
      const plans = collectComputerJumpPlans(state, origin);

      for (const plan of plans) {
        if (!bestJump || plan.score > bestJump.score) {
          bestJump = {
            type: "jump",
            from: origin,
            path: plan.path,
            score: plan.score,
          };
        }
      }
    }

    if (bestJump) {
      return bestJump;
    }
  }

  let bestPlacement: ComputerTurnPlan | null = null;

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const position = { x, y };
      const placement = canPlacePiece(state, position);

      if (!placement.ok) {
        continue;
      }

      const score = scoreComputerPlacement(state, position);
      if (!bestPlacement || score > bestPlacement.score) {
        bestPlacement = {
          type: "place",
          position,
          score,
        };
      }
    }
  }

  return bestPlacement;
}

export function applyComputerTurn(state: GameState) {
  const plan = chooseComputerTurn(state);

  if (!plan) {
    return {
      ok: false as const,
      reason: "The computer could not find a legal move.",
    };
  }

  if (plan.type === "place") {
    return placePiece(state, plan.position);
  }

  let nextState = state;
  let from = plan.from;

  for (const destination of plan.path) {
    const jumped = jumpPiece(nextState, from, destination);
    if (!jumped.ok) {
      return jumped;
    }

    nextState = jumped.value;
    from = destination;
  }

  return confirmPendingJump(nextState);
}
