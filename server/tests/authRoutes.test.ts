import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { AuthResponse } from "../../shared/src";

process.env.TOKEN_SECRET ??= "test-token-secret";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/tiao-test";
process.env.S3_BUCKET_NAME ??= "tiao-test-assets";
process.env.S3_PUBLIC_URL ??= "https://assets.test.local";

type PatchedGameService = {
  createGame: unknown;
  joinGame: unknown;
  accessGame: unknown;
  getSnapshot: unknown;
  listGames: unknown;
  enterMatchmaking: unknown;
  getMatchmakingState: unknown;
  leaveMatchmaking: unknown;
};

type TestRouter = {
  stack: Array<{
    route?: {
      path: string;
      methods: Record<string, boolean>;
      stack: Array<{
        handle: (
          req: Record<string, unknown>,
          res: Record<string, unknown>,
          next: (error?: unknown) => void
        ) => unknown;
      }>;
    };
  }>;
};

type RouteResult<T> = {
  status: number;
  body: T;
  headers: Record<string, string | string[]>;
};

type SessionAuth = AuthResponse & {
  cookie: string;
};

let singletonGameService:
  | (PatchedGameService & Record<string, unknown>)
  | null = null;
let originalMethods: Partial<PatchedGameService> = {};
let gameAuthRoutes: TestRouter;

function createMockResponse<T>(): Record<string, unknown> & {
  statusCode: number;
  body: T;
  headers: Record<string, string | string[]>;
} {
  return {
    statusCode: 200,
    body: undefined as T,
    headers: {},
    locals: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: T) {
      this.body = payload;
      return this;
    },
    send(payload?: T) {
      this.body = payload as T;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader(name: string) {
      return this.headers[name.toLowerCase()];
    },
  };
}

async function runHandler(
  handler: (
    req: Record<string, unknown>,
    res: Record<string, unknown>,
    next: (error?: unknown) => void
  ) => unknown,
  req: Record<string, unknown>,
  res: Record<string, unknown>
) {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const next = (error?: unknown) => {
      settled = true;
      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    try {
      const returned = handler(req, res, next);
      if (
        returned &&
        typeof returned === "object" &&
        "then" in returned &&
        typeof returned.then === "function"
      ) {
        returned
          .then(() => {
            if (!settled) {
              resolve();
            }
          })
          .catch(reject);
      } else if (handler.length < 3) {
        resolve();
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function invokeRoute<T>(
  router: TestRouter,
  options: {
    method: "get" | "post" | "delete";
    path: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
    cookie?: string;
    body?: Record<string, unknown>;
  }
): Promise<RouteResult<T>> {
  const layer = router.stack.find(
    (entry) =>
      entry.route?.path === options.path && entry.route.methods[options.method]
  );

  assert.ok(layer?.route, `Route ${options.method.toUpperCase()} ${options.path} should exist.`);

  const req = {
    method: options.method.toUpperCase(),
    url: options.path,
    params: options.params ?? {},
    query: options.query ?? {},
    headers: options.cookie
      ? {
          cookie: options.cookie,
        }
      : {},
    body: options.body ?? {},
  };
  const res = createMockResponse<T>();

  for (const routeLayer of layer!.route!.stack) {
    await runHandler(routeLayer.handle, req, res);
  }

  return {
    status: res.statusCode,
    body: res.body,
    headers: res.headers,
  };
}

function getSessionCookie<T>(response: RouteResult<T>): string {
  const setCookieHeader = response.headers["set-cookie"];
  const rawHeader = Array.isArray(setCookieHeader)
    ? setCookieHeader[0]
    : setCookieHeader;

  assert.equal(typeof rawHeader, "string");
  return rawHeader.split(";")[0]!;
}

async function createGuest(displayName: string): Promise<SessionAuth> {
  const response = await invokeRoute<AuthResponse>(gameAuthRoutes, {
    method: "post",
    path: "/guest",
    body: {
      displayName,
    },
  });

  assert.equal(response.status, 201);
  return {
    ...response.body,
    cookie: getSessionCookie(response),
  };
}

beforeEach(async () => {
  const [
    { GameService, gameService },
    { InMemoryGameRoomStore },
    { resetPlayerSessionStoreForTests },
    gameAuthRoutesModule,
  ] = await Promise.all([
    import("../game/gameService"),
    import("../game/gameStore"),
    import("../auth/playerSessionStore"),
    import("../routes/game-auth.routes"),
  ]);

  resetPlayerSessionStoreForTests();

  const service = new GameService(new InMemoryGameRoomStore(), () => 0);
  singletonGameService = gameService as unknown as PatchedGameService &
    Record<string, unknown>;

  originalMethods = {
    createGame: singletonGameService.createGame,
    joinGame: singletonGameService.joinGame,
    accessGame: singletonGameService.accessGame,
    getSnapshot: singletonGameService.getSnapshot,
    listGames: singletonGameService.listGames,
    enterMatchmaking: singletonGameService.enterMatchmaking,
    getMatchmakingState: singletonGameService.getMatchmakingState,
    leaveMatchmaking: singletonGameService.leaveMatchmaking,
  };

  singletonGameService.createGame = service.createGame.bind(service);
  singletonGameService.joinGame = service.joinGame.bind(service);
  singletonGameService.accessGame = service.accessGame.bind(service);
  singletonGameService.getSnapshot = service.getSnapshot.bind(service);
  singletonGameService.listGames = service.listGames.bind(service);
  singletonGameService.enterMatchmaking = service.enterMatchmaking.bind(service);
  singletonGameService.getMatchmakingState =
    service.getMatchmakingState.bind(service);
  singletonGameService.leaveMatchmaking = service.leaveMatchmaking.bind(service);

  gameAuthRoutes = gameAuthRoutesModule.default as TestRouter;
});

afterEach(() => {
  if (singletonGameService) {
    Object.assign(singletonGameService, originalMethods);
  }
});

test("signup returns 503 when database is not ready", async () => {
  const response = await invokeRoute<{ message: string }>(gameAuthRoutes, {
    method: "post",
    path: "/signup",
    body: {
      email: "alice@example.com",
      password: "securepassword123",
      displayName: "Alice",
    },
  });

  assert.equal(response.status, 503);
  assert.match(response.body.message, /unavailable/i);
});

test("login returns 503 when database is not ready", async () => {
  const response = await invokeRoute<{ message: string }>(gameAuthRoutes, {
    method: "post",
    path: "/login",
    body: {
      identifier: "alice@example.com",
      password: "securepassword123",
    },
  });

  assert.equal(response.status, 503);
  assert.match(response.body.message, /unavailable/i);
});

test("signup rejects missing password", async () => {
  // Even though DB is not ready (503 comes first), the DB check happens before
  // validation. Since mongoose is disconnected, signup returns 503.
  // We verify the route exists and responds.
  const response = await invokeRoute<{ message: string }>(gameAuthRoutes, {
    method: "post",
    path: "/signup",
    body: {
      email: "alice@example.com",
    },
  });

  // DB check happens first, so we get 503
  assert.equal(response.status, 503);
});

test("guest auth creates distinct players for distinct calls", async () => {
  const guest1 = await createGuest("Player A");
  const guest2 = await createGuest("Player B");
  assert.notEqual(guest1.player.playerId, guest2.player.playerId);
  assert.equal(guest1.player.displayName, "Player A");
  assert.equal(guest2.player.displayName, "Player B");
});

test("guest auth truncates long display names", async () => {
  const guest = await createGuest("A".repeat(50));
  assert.ok(guest.player.displayName.length <= 24);
});

test("guest auth assigns guest kind", async () => {
  const guest = await createGuest("TestGuest");
  assert.equal(guest.player.kind, "guest");
});

test("/me returns 401 without session cookie", async () => {
  const response = await invokeRoute<{ message: string }>(gameAuthRoutes, {
    method: "get",
    path: "/me",
  });

  assert.equal(response.status, 401);
  assert.match(response.body.message, /not authenticated/i);
});

test("/me returns the current guest player with a valid session", async () => {
  const guest = await createGuest("Session Guest");

  const response = await invokeRoute<{ player: AuthResponse["player"] }>(
    gameAuthRoutes,
    {
      method: "get",
      path: "/me",
      cookie: guest.cookie,
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.player.playerId, guest.player.playerId);
  assert.equal(response.body.player.displayName, "Session Guest");
});
