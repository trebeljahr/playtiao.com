import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PublicProfilePage } from "./PublicProfilePage";

const mockGetPublicProfile = vi.fn();
const mockSendFriendRequest = vi.fn();
const mockAcceptFriendRequest = vi.fn();

vi.mock("@/lib/api", () => ({
  getPublicProfile: (...args: unknown[]) => mockGetPublicProfile(...args),
  getPlayerMatchHistory: vi.fn().mockResolvedValue({ games: [], playerId: null, hasMore: false }),
  sendFriendRequest: (...args: unknown[]) => mockSendFriendRequest(...args),
  acceptFriendRequest: (...args: unknown[]) => mockAcceptFriendRequest(...args),
}));

const mockAuth = {
  player: { playerId: "me-1", displayName: "CurrentUser", kind: "account" as const },
};

vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({
    auth: mockAuth,
    authLoading: false,
    onOpenAuth: vi.fn(),
    onLogout: vi.fn(),
  }),
}));

vi.mock("@/lib/SocialNotificationsContext", () => ({
  useSocialNotifications: () => ({
    pendingFriendRequestCount: 0,
    incomingInvitationCount: 0,
    refreshNotifications: vi.fn(),
  }),
}));

// Override useParams per test
let mockParams: Record<string, string> = {};
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    useParams: () => mockParams,
  };
});

describe("PublicProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublicProfile.mockResolvedValue({
      profile: { displayName: "Andreas Edmeier", createdAt: "2025-01-01T00:00:00Z" },
    });
  });

  it("decodes URL-encoded username before calling API (no double-encoding)", async () => {
    // Simulate Next.js providing a URL-encoded param (space -> %20)
    mockParams = { username: "Andreas%20Edmeier" };

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(mockGetPublicProfile).toHaveBeenCalledWith("Andreas Edmeier");
    });
  });

  it("handles already-decoded username params correctly", async () => {
    mockParams = { username: "ricotrebeljahr" };

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(mockGetPublicProfile).toHaveBeenCalledWith("ricotrebeljahr");
    });
  });

  it("displays the profile after loading", async () => {
    mockParams = { username: "Andreas%20Edmeier" };

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Andreas Edmeier")).toBeInTheDocument();
    });
  });
});

describe("PublicProfilePage add friend (#92)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { username: "SomePlayer" };
  });

  it("renders 'Add Friend' button when friendshipStatus is 'none'", async () => {
    mockGetPublicProfile.mockResolvedValue({
      profile: {
        displayName: "SomePlayer",
        playerId: "player-2",
        createdAt: "2025-01-01T00:00:00Z",
        friendshipStatus: "none",
      },
    });

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add friend/i })).toBeInTheDocument();
    });
  });

  it("calls sendFriendRequest and changes to 'Pending' button on click", async () => {
    mockGetPublicProfile.mockResolvedValue({
      profile: {
        displayName: "SomePlayer",
        playerId: "player-2",
        createdAt: "2025-01-01T00:00:00Z",
        friendshipStatus: "none",
      },
    });
    mockSendFriendRequest.mockResolvedValue({ message: "sent" });

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add friend/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add friend/i }));

    await waitFor(() => {
      expect(mockSendFriendRequest).toHaveBeenCalledWith("player-2");
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /pending/i })).toBeInTheDocument();
    });
  });

  it("renders 'Already Friends' pill when friendshipStatus is 'friend'", async () => {
    mockGetPublicProfile.mockResolvedValue({
      profile: {
        displayName: "SomePlayer",
        playerId: "player-2",
        createdAt: "2025-01-01T00:00:00Z",
        friendshipStatus: "friend",
      },
    });

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Friends")).toBeInTheDocument();
    });
  });

  it("renders 'Accept Request' button when friendshipStatus is 'incoming-request'", async () => {
    mockGetPublicProfile.mockResolvedValue({
      profile: {
        displayName: "SomePlayer",
        playerId: "player-2",
        createdAt: "2025-01-01T00:00:00Z",
        friendshipStatus: "incoming-request",
      },
    });

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /accept request/i })).toBeInTheDocument();
    });
  });

  it("does not render friend button when friendshipStatus is 'self'", async () => {
    mockGetPublicProfile.mockResolvedValue({
      profile: {
        displayName: "MyUser",
        playerId: "me-1",
        createdAt: "2025-01-01T00:00:00Z",
        friendshipStatus: "self",
      },
    });

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("MyUser")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /add friend/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Friends")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept request/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pending/i })).not.toBeInTheDocument();
  });
});
