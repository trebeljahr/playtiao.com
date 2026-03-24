import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";

// Mock the API calls so we don't actually fetch anything
vi.mock("@/lib/api", () => ({
  createGuest: vi.fn().mockResolvedValue({
    player: { playerId: "guest-123", displayName: "Anonymous", kind: "guest" },
  }),
  getCurrentPlayer: vi.fn().mockRejectedValue(new Error("Not logged in")),
}));

describe("App", () => {
  it("renders without crashing and uses router hooks correctly", async () => {
    // We wrap in BrowserRouter because App uses useNavigate/useLocation
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // It should initially show the loading screen
    expect(screen.getByText(/Opening Tiao/i)).toBeInTheDocument();
  });
});
