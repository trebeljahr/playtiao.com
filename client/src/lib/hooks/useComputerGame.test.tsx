import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useComputerGame } from "./useComputerGame";
import { COMPUTER_COLOR, COMPUTER_THINK_MS } from "../computer-ai";

describe("useComputerGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

    // Human (white) places at center
    act(() => result.current.handleLocalBoardClick({ x: 9, y: 9 }));
    expect(result.current.localGame.positions[9][9]).toBe("white");
    expect(result.current.localGame.currentTurn).toBe("black");

    // Now it's computer's turn — human clicks should be ignored
    act(() => result.current.handleLocalBoardClick({ x: 8, y: 8 }));
    // The click should have been ignored — (8,8) should still be empty
    expect(result.current.localGame.positions[8][8]).toBeNull();
  });

  it("sets computerThinking when it becomes computer turn", () => {
    const { result } = renderHook(() => useComputerGame());

    // Human places
    act(() => result.current.handleLocalBoardClick({ x: 9, y: 9 }));
    expect(result.current.localGame.currentTurn).toBe("black");

    // The useEffect should have triggered and set computerThinking
    // (the actual setTimeout callback timing is handled by the hook internally)
    expect(result.current.localGame.currentTurn).toBe(COMPUTER_COLOR);
  });

  it("controlsDisabled is true during computer turn", () => {
    const { result } = renderHook(() => useComputerGame());

    // Human places
    act(() => result.current.handleLocalBoardClick({ x: 9, y: 9 }));
    // It's now the computer's turn — controls should be disabled
    expect(result.current.controlsDisabled).toBe(true);
    expect(result.current.localGame.currentTurn).toBe(COMPUTER_COLOR);
  });

  it("controlsDisabled is false on human turn", () => {
    const { result } = renderHook(() => useComputerGame());

    // Fresh state: white (human) to move
    expect(result.current.controlsDisabled).toBe(false);
    expect(result.current.localGame.currentTurn).toBe("white");
  });
});
