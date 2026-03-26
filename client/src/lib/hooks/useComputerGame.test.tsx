import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useComputerGame } from "./useComputerGame";
import {
  createInitialGameState,
  placePiece,
  jumpPiece,
  confirmPendingJump,
} from "@shared";
import type { GameState } from "@shared";

// Store resolve/reject callbacks so tests can control when the AI "responds"
let resolveAI: ((plan: any) => void) | null = null;
let cancelMock: ReturnType<typeof vi.fn>;

vi.mock("../computer-ai", () => ({
  COMPUTER_THINK_MS: 0, // no think delay in tests
  randomComputerColor: () => "black" as const,
  requestComputerMove: vi.fn(() => {
    cancelMock = vi.fn();
    return {
      promise: new Promise((resolve) => {
        resolveAI = resolve;
      }),
      cancel: cancelMock,
    };
  }),
  applyComputerTurnPlan: vi.fn(),
}));

describe("useComputerGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resolveAI = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with white (human) to move", () => {
    const { result } = renderHook(() => useComputerGame());
    expect(result.current.localGame.currentTurn).toBe("white");
    expect(result.current.computerThinking).toBe(false);
  });

  it("blocks human clicks during computer turn", () => {
    const { result } = renderHook(() => useComputerGame());

    act(() => result.current.handleLocalBoardClick({ x: 9, y: 9 }));
    expect(result.current.localGame.positions[9][9]).toBe("white");
    expect(result.current.localGame.currentTurn).toBe("black");

    act(() => result.current.handleLocalBoardClick({ x: 8, y: 8 }));
    expect(result.current.localGame.positions[8][8]).toBeNull();
  });

  it("controlsDisabled is true during computer turn", () => {
    const { result } = renderHook(() => useComputerGame());

    act(() => result.current.handleLocalBoardClick({ x: 9, y: 9 }));
    expect(result.current.controlsDisabled).toBe(true);
    expect(result.current.localGame.currentTurn).toBe("black");
  });

  it("controlsDisabled is false on human turn", () => {
    const { result } = renderHook(() => useComputerGame());
    expect(result.current.controlsDisabled).toBe(false);
    expect(result.current.localGame.currentTurn).toBe("white");
  });
});

describe("useComputerGame – undo while AI is thinking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resolveAI = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("undoes the player's move and cancels AI when undo is pressed during AI thinking", () => {
    const { result } = renderHook(() => useComputerGame());

    // Human places at (9,9) — triggers AI thinking
    act(() => result.current.handleLocalBoardClick({ x: 9, y: 9 }));
    expect(result.current.localGame.currentTurn).toBe("black");
    expect(result.current.localGame.positions[9][9]).toBe("white");

    // Undo while AI is thinking
    act(() => result.current.handleLocalUndoTurn());

    // Should restore to before the human's move
    expect(result.current.localGame.positions[9][9]).toBeNull();
    expect(result.current.localGame.currentTurn).toBe("white");
    expect(result.current.localGame.history.length).toBe(0);
    expect(result.current.computerThinking).toBe(false);
  });

  it("undoes correctly after multiple place-undo cycles", () => {
    const { result } = renderHook(() => useComputerGame());

    // Place, undo, place again, undo again
    act(() => result.current.handleLocalBoardClick({ x: 9, y: 9 }));
    act(() => result.current.handleLocalUndoTurn());
    expect(result.current.localGame.positions[9][9]).toBeNull();
    expect(result.current.localGame.currentTurn).toBe("white");

    act(() => result.current.handleLocalBoardClick({ x: 7, y: 7 }));
    expect(result.current.localGame.positions[7][7]).toBe("white");
    act(() => result.current.handleLocalUndoTurn());
    expect(result.current.localGame.positions[7][7]).toBeNull();
    expect(result.current.localGame.currentTurn).toBe("white");
    expect(result.current.localGame.history.length).toBe(0);
  });

  it("board has no pending jumps after undoing during AI thinking", () => {
    const { result } = renderHook(() => useComputerGame());

    act(() => result.current.handleLocalBoardClick({ x: 9, y: 9 }));
    act(() => result.current.handleLocalUndoTurn());

    expect(result.current.localGame.pendingJump.length).toBe(0);
  });
});

describe("useComputerGame – undo during AI animation (mid-jump)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resolveAI = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores pre-AI state when undo is pressed during a multi-jump animation", async () => {
    const { result } = renderHook(() => useComputerGame());

    // Set up a board where black can perform a multi-hop jump:
    //   black at (9,6), white pieces at (9,7) and (9,9), empty at (9,8) and (9,10)
    const state = createInitialGameState();
    state.positions[6][9] = "black";
    state.positions[7][9] = "white";
    state.positions[9][9] = "white";
    // It's black's turn (computer)
    state.currentTurn = "black";
    // Add a dummy history entry so the player has something to undo
    state.history = [{
      type: "put" as const,
      color: "white" as const,
      position: { x: 5, y: 5 },
    }];
    state.positions[5][5] = "white";

    act(() => {
      result.current.setLocalGame(state);
    });

    // AI should now be thinking — resolve with a multi-jump plan
    expect(resolveAI).not.toBeNull();
    const jumpPlan = {
      type: "jump" as const,
      from: { x: 9, y: 6 },
      path: [{ x: 9, y: 8 }, { x: 9, y: 10 }],
      score: 200,
    };

    // Resolve the AI and let the first animation step execute
    await act(async () => {
      resolveAI!(jumpPlan);
      // Flush the microtask queue + timers so the first jump step applies
      await vi.advanceTimersByTimeAsync(1);
    });

    // The game state may now have pending jumps from the animation.
    // Undo should cleanly restore to the pre-AI state regardless.
    act(() => result.current.handleLocalUndoTurn());

    // Should have undone back to before the player's move
    expect(result.current.localGame.pendingJump.length).toBe(0);
    expect(result.current.localGame.currentTurn).toBe("white");
    expect(result.current.computerThinking).toBe(false);
  });
});
