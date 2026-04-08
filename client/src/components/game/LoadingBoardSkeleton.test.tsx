import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GameState } from "@shared";
import { LoadingBoardSkeleton } from "./LoadingBoardSkeleton";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => (key === "loading" ? "Loading..." : key),
}));

vi.mock("@/components/game/TiaoBoard", () => ({
  TiaoBoard: ({ state, disabled }: { state: GameState; disabled?: boolean }) => (
    <div
      data-testid="tiao-board"
      data-disabled={disabled ? "true" : "false"}
      data-board-size={state.boardSize}
    />
  ),
}));

vi.mock("@/components/game/GameShared", () => ({
  HourglassSpinner: () => <span data-testid="hourglass" />,
}));

describe("LoadingBoardSkeleton", () => {
  it("renders a disabled empty board behind a glassy loading overlay", () => {
    render(<LoadingBoardSkeleton />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    const board = screen.getByTestId("tiao-board");
    expect(board.getAttribute("data-disabled")).toBe("true");
    expect(screen.getByTestId("hourglass")).toBeInTheDocument();
  });
});
