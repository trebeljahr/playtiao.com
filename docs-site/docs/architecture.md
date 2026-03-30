---
sidebar_position: 3
title: Architecture
---

# Tiao Architecture

This document describes the system architecture for contributors.

## Table of Contents

- [Monorepo Structure](#monorepo-structure)
- [Game Engine (shared)](#game-engine-shared)
- [Server Layer](#server-layer)
- [Client Layer](#client-layer)
- [Authentication](#authentication)
- [Database](#database)
- [Real-Time Sync](#real-time-sync)
- [Deployment](#deployment)

---

## Monorepo Structure

```
tiao/
├── client/          React + Next.js + Tailwind frontend
├── server/          Express + WebSocket backend
├── shared/          Pure TypeScript game engine + protocol types
├── e2e/             Playwright end-to-end tests
├── docs/            Markdown documentation
└── docs-site/       Docusaurus documentation site (you are here)
```

The three runtime packages — `shared`, `server`, and `client` — form a dependency chain:

```
  client ──> shared <── server
```

`shared` is the foundation. It contains the game engine and all protocol types. Both `client` and `server` depend on it, but never on each other. This guarantees that game rules are defined in exactly one place and enforced identically everywhere.

---

## Game Engine (shared)

The game engine lives in `shared/src/tiao.ts`. It is a collection of **pure functions with zero side effects and no I/O**. This makes it easy to test, easy to reason about, and safe to run on both client and server.

### Board and State

The game is played on a 19x19 board. The core state type:

```typescript
type GameState = {
  positions: TileState[][]; // 19x19 grid
  currentTurn: Player;
  pendingJump: PendingJump | null;
  pendingCaptures: Position[];
  score: { white: number; black: number };
  history: HistoryEntry[];
};
```

### Key Functions

| Function                                                  | Purpose                              |
| --------------------------------------------------------- | ------------------------------------ |
| [`placePiece`][fn-placePiece]                             | Place a stone on the board           |
| [`jumpPiece`][fn-jumpPiece]                               | Execute a jump move                  |
| [`confirmPendingJump`][fn-confirmPendingJump]             | Finalize a multi-step jump sequence  |
| [`undoPendingJumpStep`][fn-undoPendingJumpStep]           | Roll back one step of a pending jump |
| [`undoLastTurn`][fn-undoLastTurn]                         | Undo the most recent completed turn  |
| [`canPlacePiece`][fn-canPlacePiece]                       | Check if a placement is legal        |
| [`getJumpTargets`][fn-getJumpTargets]                     | Get valid destinations for a jump    |
| [`getSelectableJumpOrigins`][fn-getSelectableJumpOrigins] | Get pieces that can initiate a jump  |

### Result Type

Every function returns a `RuleResult<T>`:

```typescript
type RuleResult<T> = { ok: true; value: T } | { ok: false; code: FailureCode; reason: string };
```

This forces callers to handle failures explicitly. Failure codes include:

```
GAME_OVER         OUT_OF_BOUNDS      OCCUPIED
PENDING_JUMP      INVALID_CLUSTER    INVALID_BORDER
NO_PIECE          NOT_YOUR_PIECE     INVALID_JUMP
NO_PENDING_JUMP
```

---

## Server Layer

The server is an Express application with a WebSocket server attached to the same HTTP server.

### GameService

`GameService` (in `server/game/gameService.ts`) is the central orchestrator. It manages:

- **Matchmaking queue** — pairs players into games via a `MatchmakingStore` abstraction (in-memory or Redis-backed)
- **Socket connection maps** — tracks which WebSocket belongs to which player/game
- **Lock system** — room locks, player locks, and a matchmaking lock via a `LockProvider` abstraction (in-memory or Redis-backed) to prevent race conditions under concurrent access

The server auto-detects Redis when `REDIS_URL` is set and falls back to in-memory implementations when it is not configured.

- **Move validation** — `applyAction()` validates every move server-side using the shared game engine before persisting
- **State broadcast** — `broadcastSnapshot()` pushes updated state to all connected players and lobby listeners

### TournamentService

`TournamentService` (in `server/game/tournamentService.ts`) manages tournament lifecycle: creation, registration, bracket generation, match progression, and result tracking. Tournament games are linked to regular `GameRoom` records via `tournamentId` and `tournamentMatchId` fields.

### WebSocket Endpoints

```
/api/ws?gameId=XXXX    Per-game connection (players and spectators)
/api/ws/lobby           Lobby feed (game-update, social-update events)
```

A ping/pong keep-alive runs every 10 seconds to detect stale connections.

### Storage Interface

Game rooms are persisted through a `GameRoomStore` interface:

```
GameRoomStore (interface)
  ├── InMemoryGameRoomStore   used in tests
  └── MongoGameRoomStore      used in production
```

This abstraction keeps the game logic testable without requiring a running database.

---

## Client Layer

The frontend is built with React 18, TypeScript, Next.js 14, and Tailwind CSS. A custom `server.mjs` proxies `/api` and `/ws` requests to the Express backend and serves the Next.js application.

### Pages

Pages live in `client/src/views/`.

| Page                  | Purpose                           |
| --------------------- | --------------------------------- |
| `LobbyPage`           | Live game feed, social activity   |
| `LocalGamePage`       | Two players on one device         |
| `ComputerGamePage`    | Play against the AI               |
| `MultiplayerGamePage` | Online game via WebSocket         |
| `MatchmakingPage`     | Queue for a random opponent       |
| `FriendsPage`         | Friend list and requests          |
| `GamesPage`           | Game library (active + finished)  |
| `ProfilePage`         | User profile and settings         |
| `PublicProfilePage`   | Public player stats and badges    |
| `TournamentListPage`  | Tournament listing and discovery  |
| `TournamentPage`      | Single tournament view (brackets) |
| `CreatorPage`         | Creator/about page                |
| `SetUsernamePage`     | Set username after OAuth sign-up  |
| `TutorialPage`        | Interactive game tutorial         |
| `AdminBadgesPage`     | Admin badge management            |

### Hooks Architecture

Game logic on the client is organized into composable hooks:

```
useLocalGame            Local game state management
  |
  +-- useComputerGame   Wraps useLocalGame + AI move timer
  |
useMultiplayerGame      WebSocket connection, optimistic updates,
                        auto-reconnect with exponential backoff
                        (1.5s -> 3s -> 6s -> max 10s)

useLobbySocket          Lobby WebSocket (game-update, social-update)
useMatchmakingData      Matchmaking queue polling (every 2s)
useSocialData           Friends, friend requests, game invitations
useGamesIndex           Game library (active + finished)
```

### Optimistic Updates

For responsiveness, the multiplayer client applies moves locally before the server confirms them. When the server responds:

- **On success**: the confirmed snapshot replaces the optimistic state (usually identical).
- **On error**: the client rolls back to the last confirmed snapshot.

This gives the game a snappy feel while the server remains the single source of truth.

---

## Authentication

### Session Model

Authentication uses [better-auth](https://www.better-auth.com/) with HttpOnly session cookies backed by MongoDB.

- Session duration: 30 days (refreshed after 24 hours of activity)
- Passwords hashed with bcrypt (10 salt rounds)
- OAuth providers: GitHub, Google, Discord (when configured)
- Anonymous/guest accounts via better-auth's anonymous plugin

Custom routes in `server/routes/game-auth.routes.ts` extend better-auth for Tiao-specific behavior (e.g., login by username, SSO onboarding).

### Player Types

| Type      | Identity                | Persistence                                 |
| --------- | ----------------------- | ------------------------------------------- |
| `guest`   | Anonymous               | Session only, limited to 10 games           |
| `account` | Email/password or OAuth | Full profile, friends, history, tournaments |

### Badge System

Players can earn and display badges on their profiles. Badges are stored in `GameAccount.badges[]` and the active badge in `GameAccount.activeBadges[]`. Admins can grant and revoke badges.

---

## Database

Tiao uses MongoDB. Application collections are managed by Tiao; auth collections are managed by better-auth.

### Application Collections

**GameAccount**

```
{
  _id             matches better-auth user._id
  displayName, profilePicture, bio,
  friends[], receivedFriendRequests[], sentFriendRequests[],
  badges[], activeBadges[],
  rating          { overall: { elo, gamesPlayed } }
  hasSeenTutorial boolean
  isAdmin         boolean
}
```

**GameRoom**

```
{
  roomId          6-character alphanumeric ID
  roomType        "direct" | "matchmaking"
  status          "waiting" | "active" | "finished"
  state           GameState (the full board state)
  players[]       Connected player references
  seats           { white: PlayerId, black: PlayerId }
  rematch         Rematch tracking metadata
  timeControl     { initialMs, incrementMs } | null
  tournamentId    Reference to Tournament (if tournament match)
}
```

**GameInvitation**

```
{
  gameId, senderId, recipientId,
  status          "pending" | "accepted" | "revoked" | "expired"
  expiresAt
}
```

**Tournament**

```
{
  tournamentId    unique string ID
  name, description, creatorId,
  status          "open" | "active" | "finished" | "cancelled"
  settings        TournamentSettings (format, maxParticipants, etc.)
  participants[], rounds[], groups[], knockoutRounds[]
}
```

### Auth Collections (better-auth managed)

better-auth automatically manages `user`, `session`, and `account` collections for authentication state. Tiao's `GameAccount._id` matches `user._id` to link game data with auth data.

### Redis

Redis is optional. When available (configured via `REDIS_URL`), it backs the matchmaking queue, distributed locks, and rate limiting. This enables horizontal scaling across multiple server instances and allows stateful services to survive server restarts. WebSocket connections and game timers remain in-memory on each server instance.

---

## Real-Time Sync

The following diagram shows the full lifecycle of a move in a multiplayer game:

```
Player A (client)                Server                    Player B (client)
  |                                |                          |
  | 1. clicks "place piece"        |                          |
  | 2. optimistic update           |                          |
  |    (apply move locally)        |                          |
  |                                |                          |
  | 3. ws.send({                   |                          |
  |      type: "place-piece",      |                          |
  |      position                  |                          |
  |    })                          |                          |
  |------------------------------->|                          |
  |                                | 4. applyAction()         |
  |                                |    - validate via shared |
  |                                |      game engine         |
  |                                |    - save to MongoDB     |
  |                                |                          |
  |                                | 5. broadcastSnapshot()   |
  |                                |-------- snapshot ------->|
  |                                |                          | 6. update UI
  |<------- confirmed snapshot ----|                          |
  | 7. replace optimistic state    |                          |
  |    with confirmed snapshot     |                          |
  |                                |                          |
  |                                | 8. broadcastLobby()      |
  |                                |    game-update to both   |
  |                                |    players' lobby sockets|
```

Key properties:

- **Server is authoritative.** The shared game engine validates every move on the server. A malicious client cannot cheat.
- **Optimistic updates mask latency.** Players see their moves instantly; the server confirms or rejects asynchronously.
- **Lobby stays in sync.** Lobby listeners receive game-update events so spectators and friend lists reflect current game status.

---

## Tooling

### Code Formatting

All code is formatted with [Prettier](https://prettier.io/). A pre-commit hook (via Husky + lint-staged) automatically formats staged files on every commit. A pre-push hook runs TypeScript type-checking on both the client and server before allowing a push. All tooling is installed and configured automatically by `npm install` -- no manual setup required.

---

## Deployment

### Container Architecture

```
                    Internet
                       |
              +--------+--------+
              |   Node.js       |    client container
              |   Next.js app   |    - serves the frontend
              |  (reverse proxy)|    - proxies /api/* to server
              +--------+--------+
                       |
                  /api/*
                       |
              +--------+--------+
              |   Node.js       |    server container
              |   Express +     |
              |   WebSocket     |
              +--------+--------+
                       |
              +--------+--------+
              |    MongoDB      |
              +-----------------+
              +--------+--------+
              |  Redis (optional)|
              +-----------------+
```

Both containers are deployed as Docker images. The client container runs a Node.js server (`server.mjs`) that serves the Next.js application and reverse-proxies all `/api` and `/ws` requests to the server container. This same-origin setup avoids cross-origin cookie issues with the session cookie.

When Redis is available, the server can scale horizontally — matchmaking state and locks are shared across instances rather than held in a single process. Set the `REDIS_URL` environment variable to configure the connection. Without Redis, the server runs as a single instance with in-memory state, which is sufficient for low-traffic deployments.

### CI/CD Pipeline

The GitHub Actions pipeline runs on every push:

```
build --> test --> push images to GHCR --> deploy via Coolify API
```

1. **Build** — compile shared, server, and client packages
2. **Test** — run unit tests and Playwright E2E tests
3. **Push** — publish Docker images to GitHub Container Registry
4. **Deploy** — trigger deployment through [Coolify webhooks](https://coolify.io/docs/knowledge-base/webhooks)
