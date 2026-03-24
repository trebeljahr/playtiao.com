import type {
  AuthResponse,
  MatchmakingState,
  MultiplayerGamesIndex,
  MultiplayerSnapshot,
  PlayerIdentity,
  SocialOverview,
  SocialSearchResult,
} from "@shared";

type JsonBody = Record<string, unknown> | undefined;

export type AccountProfile = {
  displayName: string;
  email: string;
  profilePicture?: string;
  createdAt?: string;
  updatedAt?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string;
  }

  return window.location.origin;
}

export const API_BASE_URL = getApiBaseUrl();

export function buildWebSocketUrl(gameId: string, token: string) {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.searchParams.set("gameId", gameId);
  url.searchParams.set("token", token);
  return url.toString();
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: JsonBody;
    token?: string;
  } = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the server. Make sure the backend is running."
    );
  }

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  } & T;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message || "The request could not be completed."
    );
  }

  return data;
}

async function upload<T>(path: string, formData: FormData, token: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the server. Make sure the backend is running."
    );
  }

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  } & T;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message || "The request could not be completed."
    );
  }

  return data;
}

export function createGuest(displayName?: string) {
  return request<AuthResponse>("/api/player/guest", {
    method: "POST",
    body: displayName ? { displayName } : undefined,
  });
}

export function getCurrentPlayer(token: string) {
  return request<{ player: PlayerIdentity }>("/api/player/me", {
    token,
  });
}

export function loginWithEmail(email: string, password: string) {
  return request<AuthResponse>("/api/player/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

export function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
) {
  return request<AuthResponse>("/api/player/signup", {
    method: "POST",
    body: {
      email,
      password,
      displayName,
    },
  });
}

export function createMultiplayerGame(token: string) {
  return request<{ snapshot: MultiplayerSnapshot }>("/api/games", {
    method: "POST",
    token,
  });
}

export function joinMultiplayerGame(token: string, gameId: string) {
  return request<{ snapshot: MultiplayerSnapshot }>(
    `/api/games/${gameId}/join`,
    {
      method: "POST",
      token,
    }
  );
}

export function accessMultiplayerGame(token: string, gameId: string) {
  return request<{ snapshot: MultiplayerSnapshot }>(
    `/api/games/${gameId}/access`,
    {
      method: "POST",
      token,
    }
  );
}

export function getMultiplayerGame(token: string, gameId: string) {
  return request<{ snapshot: MultiplayerSnapshot }>(`/api/games/${gameId}`, {
    token,
  });
}

export function listMultiplayerGames(token: string) {
  return request<{ games: MultiplayerGamesIndex }>("/api/games", {
    token,
  });
}

export function enterMatchmaking(token: string) {
  return request<{ matchmaking: MatchmakingState }>("/api/matchmaking", {
    method: "POST",
    token,
  });
}

export function getMatchmakingState(token: string) {
  return request<{ matchmaking: MatchmakingState }>("/api/matchmaking", {
    token,
  });
}

export function leaveMatchmaking(token: string) {
  return request<void>("/api/matchmaking", {
    method: "DELETE",
    token,
  });
}

export function getSocialOverview(token: string) {
  return request<{ overview: SocialOverview }>("/api/player/social/overview", {
    token,
  });
}

export function searchPlayers(token: string, query: string) {
  return request<{ results: SocialSearchResult[] }>(
    `/api/player/social/search?q=${encodeURIComponent(query)}`,
    {
      token,
    }
  );
}

export function sendFriendRequest(token: string, accountId: string) {
  return request<{ message: string }>("/api/player/social/friend-requests", {
    method: "POST",
    token,
    body: {
      accountId,
    },
  });
}

export function acceptFriendRequest(token: string, accountId: string) {
  return request<{ message: string }>(
    `/api/player/social/friend-requests/${accountId}/accept`,
    {
      method: "POST",
      token,
    }
  );
}

export function declineFriendRequest(token: string, accountId: string) {
  return request<{ message: string }>(
    `/api/player/social/friend-requests/${accountId}/decline`,
    {
      method: "POST",
      token,
    }
  );
}

export function cancelFriendRequest(token: string, accountId: string) {
  return request<{ message: string }>(
    `/api/player/social/friend-requests/${accountId}/cancel`,
    {
      method: "POST",
      token,
    }
  );
}

export function sendGameInvitation(
  token: string,
  body: {
    gameId: string;
    recipientId: string;
    expiresInMinutes: number;
  }
) {
  return request<{ message: string }>("/api/player/social/game-invitations", {
    method: "POST",
    token,
    body,
  });
}

export function revokeGameInvitation(token: string, invitationId: string) {
  return request<{ message: string }>(
    `/api/player/social/game-invitations/${invitationId}/revoke`,
    {
      method: "POST",
      token,
    }
  );
}

export function getAccountProfile(token: string) {
  return request<{ profile: AccountProfile }>("/api/player/profile", {
    token,
  });
}

export function updateAccountProfile(
  token: string,
  body: {
    displayName?: string;
    email?: string;
  }
) {
  return request<{ auth: AuthResponse; profile: AccountProfile }>(
    "/api/player/profile",
    {
      method: "PUT",
      body,
      token,
    }
  );
}

export function uploadAccountProfilePicture(token: string, file: File) {
  const formData = new FormData();
  formData.set("profilePicture", file);

  return upload<{ auth: AuthResponse; profile: AccountProfile }>(
    "/api/player/profile-picture",
    formData,
    token
  );
}
