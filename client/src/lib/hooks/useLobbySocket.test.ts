import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLobbySocket } from "./useLobbySocket";
import type { AuthResponse } from "@shared";

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.onclose?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

vi.mock("../api", () => ({
  buildWebSocketUrl: (gameId: string) => `ws://localhost:5005/api/ws?gameId=${gameId}`,
}));

const mockAccountAuth: AuthResponse = {
  player: {
    kind: "account",
    playerId: "player-1",
    displayName: "Test User",
  },
};

const mockGuestAuth: AuthResponse = {
  player: {
    kind: "guest",
    playerId: "guest-1",
    displayName: "Guest",
  },
};

describe("useLobbySocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("connects when auth is an account player", () => {
    const onGameUpdate = vi.fn();
    const onSocialUpdate = vi.fn();

    renderHook(() => useLobbySocket(mockAccountAuth, onGameUpdate, onSocialUpdate));

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain("/api/ws/lobby");
  });

  it("does not connect for guest players", () => {
    const onGameUpdate = vi.fn();
    const onSocialUpdate = vi.fn();

    renderHook(() => useLobbySocket(mockGuestAuth, onGameUpdate, onSocialUpdate));

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("does not connect when auth is null", () => {
    const onGameUpdate = vi.fn();
    const onSocialUpdate = vi.fn();

    renderHook(() => useLobbySocket(null, onGameUpdate, onSocialUpdate));

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("calls onGameUpdate when game-update message is received", () => {
    const onGameUpdate = vi.fn();
    const onSocialUpdate = vi.fn();

    renderHook(() => useLobbySocket(mockAccountAuth, onGameUpdate, onSocialUpdate));

    const socket = MockWebSocket.instances[0];
    act(() => {
      socket.simulateMessage({
        type: "game-update",
        summary: {
          gameId: "ABC123",
          status: "active",
          yourSeat: "white",
          currentTurn: "black",
          seats: { white: null, black: null },
        },
      });
    });

    expect(onGameUpdate).toHaveBeenCalled();
  });

  it("calls onSocialUpdate when social-update message is received", () => {
    const onGameUpdate = vi.fn();
    const onSocialUpdate = vi.fn();

    renderHook(() => useLobbySocket(mockAccountAuth, onGameUpdate, onSocialUpdate));

    const socket = MockWebSocket.instances[0];
    act(() => {
      socket.simulateMessage({
        type: "social-update",
        overview: {
          friends: [],
          incomingFriendRequests: [],
          outgoingFriendRequests: [],
          incomingInvitations: [],
          outgoingInvitations: [],
        },
      });
    });

    expect(onSocialUpdate).toHaveBeenCalled();
  });

  it("closes socket on unmount", () => {
    const onGameUpdate = vi.fn();
    const onSocialUpdate = vi.fn();

    const { unmount } = renderHook(() =>
      useLobbySocket(mockAccountAuth, onGameUpdate, onSocialUpdate),
    );

    const socket = MockWebSocket.instances[0];
    const closeSpy = vi.spyOn(socket, "close");

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });
});
