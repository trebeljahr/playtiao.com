# Tiao API Reference

Complete REST API and WebSocket protocol reference for Tiao.

## Authentication

Authentication is handled by [better-auth](https://www.better-auth.com/) with HttpOnly session cookies. Sessions are stored in MongoDB and last 30 days (refreshed after 24 hours of activity).

### Authentication Methods

- **Email/password** -- sign up and sign in via better-auth's built-in endpoints
- **OAuth** -- GitHub, Google, and Discord (when configured)
- **Anonymous/guest** -- play without an account (limited to 10 games)

### Built-in Auth Endpoints (better-auth)

These are mounted at `/api/auth/*` and handled directly by better-auth:

| Method | Path                        | Description            |
| ------ | --------------------------- | ---------------------- |
| POST   | `/api/auth/sign-up/email`   | Create account (email) |
| POST   | `/api/auth/sign-in/email`   | Sign in (email)        |
| POST   | `/api/auth/sign-out`        | Sign out               |
| GET    | `/api/auth/session`         | Check session          |
| POST   | `/api/auth/change-password` | Change password        |

OAuth callback endpoints are also mounted here for GitHub, Google, and Discord.

### Player Types

| Type      | Identity                  | Persistence                                 |
| --------- | ------------------------- | ------------------------------------------- |
| `guest`   | Anonymous                 | Session only, limited to 10 games           |
| `account` | Email + password or OAuth | Full profile, friends, history, tournaments |

Social, profile, tournament, and badge endpoints return `403` for guests (account required).

---

## Custom Auth Endpoints

These wrap or extend better-auth for Tiao-specific behavior.

### POST /api/player/login

Login with a username or email. Resolves usernames to email addresses before delegating to better-auth.

**Request:**

```json
{
  "identifier": "myusername",
  "password": "securepass"
}
```

`identifier` can be an email address or a username.

**Response 200:**

```json
{
  "player": {
    "playerId": "abc123",
    "displayName": "myusername",
    "kind": "account",
    "email": "user@example.com",
    "badges": ["supporter"],
    "activeBadges": ["supporter"],
    "rating": 1500
  }
}
```

Sets the session cookie.

**Errors:**

| Status | Reason                         |
| ------ | ------------------------------ |
| 400    | Missing identifier or password |
| 401    | Invalid credentials            |
| 503    | Database unavailable           |

---

### POST /api/player/logout

Server-side session acknowledgment. Session invalidation is handled client-side via better-auth's `signOut()`.

**Response 204:** No body.

---

### GET /api/player/me

Get the current authenticated player identity.

**Response 200:**

```json
{
  "player": {
    "playerId": "abc123",
    "displayName": "myusername",
    "kind": "account",
    "email": "user@example.com",
    "profilePicture": "https://...",
    "hasSeenTutorial": true,
    "badges": ["supporter"],
    "activeBadges": ["supporter"],
    "rating": 1500
  }
}
```

For accounts that signed up via OAuth and haven't set a username yet, the response includes `"needsUsername": true`.

**Errors:**

| Status | Reason            |
| ------ | ----------------- |
| 401    | Not authenticated |

---

### POST /api/player/set-username

Set a valid username after OAuth sign-up. Required before the player can use most features.

**Request:**

```json
{
  "username": "myusername"
}
```

Usernames must be 3-32 characters, lowercase, and can only contain letters, numbers, hyphens, and underscores.

**Response 200:**

```json
{
  "auth": {
    "player": { "...": "PlayerIdentity" }
  }
}
```

**Errors:**

| Status | Reason                  |
| ------ | ----------------------- |
| 400    | Invalid username format |
| 403    | Not an account player   |
| 409    | Username already taken  |

---

### POST /api/player/tutorial-complete

Mark the interactive tutorial as completed for the current account.

**Response 200:**

```json
{
  "auth": {
    "player": { "...": "PlayerIdentity" }
  }
}
```

---

## Player Profile

Account-only endpoints. Guests receive `403`.

### GET /api/player/profile

Get the authenticated user's profile.

**Response 200:**

```json
{
  "profile": {
    "displayName": "myusername",
    "email": "user@example.com",
    "profilePicture": "https://...",
    "badges": ["supporter"],
    "activeBadges": ["supporter"],
    "bio": "I love Tiao!",
    "rating": 1500,
    "gamesPlayed": 42,
    "ratingPercentile": 75,
    "providers": ["credential", "github"],
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-02-20T14:00:00.000Z"
  }
}
```

---

### GET /api/player/profile/:username

Get a public player profile. No authentication required.

**Response 200:**

```json
{
  "profile": {
    "displayName": "alice",
    "profilePicture": "https://...",
    "rating": 1650,
    "gamesPlayed": 100,
    "gamesWon": 60,
    "gamesLost": 40,
    "ratingPercentile": 85,
    "bio": "Tiao enthusiast",
    "badges": ["supporter"],
    "activeBadges": ["supporter"],
    "favoriteBoard": 19,
    "favoriteTimeControl": "5+3",
    "favoriteScore": 10,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors:**

| Status | Reason           |
| ------ | ---------------- |
| 400    | Invalid username |
| 404    | Player not found |

---

### PUT /api/player/profile

Update account profile. All fields are optional, but at least one must be provided.

**Request:**

```json
{
  "displayName": "newname",
  "password": "newsecurepass",
  "currentPassword": "oldsecurepass",
  "bio": "Updated bio"
}
```

`currentPassword` is required when changing the password.

**Response 200:**

```json
{
  "auth": {
    "player": { "...": "PlayerIdentity" }
  },
  "profile": { "...": "AccountProfile" }
}
```

**Errors:**

| Status | Reason                                                             |
| ------ | ------------------------------------------------------------------ |
| 400    | Nothing to update, display name too short/long, password too short |
| 401    | Current password is incorrect                                      |
| 409    | Username already taken                                             |

---

### POST /api/player/profile-picture

Upload a profile picture. Expects `multipart/form-data` with a field named `profilePicture`. Images are resized to 320px wide and converted to JPEG before uploading to S3.

**Request:**

```
Content-Type: multipart/form-data
Field: profilePicture (file)
```

**Response 200:**

```json
{
  "auth": {
    "player": { "...": "PlayerIdentity" }
  },
  "profile": { "...": "AccountProfile" }
}
```

**Errors:**

| Status | Reason           |
| ------ | ---------------- |
| 400    | No file uploaded |

---

## Badges

### PUT /api/player/badges/active

Set the active badge displayed on your profile. Only one badge can be active at a time.

**Request:**

```json
{
  "activeBadges": ["supporter"]
}
```

**Response 200:**

```json
{
  "auth": {
    "player": { "...": "PlayerIdentity" }
  },
  "activeBadges": ["supporter"]
}
```

---

## Games

### GET /api/games

List the authenticated player's games (active and finished).

**Response 200:**

```json
{
  "games": {
    "active": [{ "...": "MultiplayerGameSummary" }],
    "finished": [{ "...": "MultiplayerGameSummary" }]
  }
}
```

---

### POST /api/games

Create a new game room.

**Request (optional):**

```json
{
  "boardSize": 19,
  "scoreToWin": 10,
  "timeControl": {
    "initialMs": 300000,
    "incrementMs": 3000
  }
}
```

All fields are optional. Defaults: 19x19 board, 10 captures to win, no time control.

**Response 201:**

```json
{
  "snapshot": { "...": "MultiplayerSnapshot" }
}
```

---

### DELETE /api/games/:gameId

Cancel a waiting game (before an opponent joins).

**Response 204:** No body.

---

### GET /api/games/:gameId

Get a game snapshot.

**Response 200:**

```json
{
  "snapshot": { "...": "MultiplayerSnapshot" }
}
```

**Errors:**

| Status | Reason         |
| ------ | -------------- |
| 404    | Game not found |

---

### POST /api/games/:gameId/join

Join an existing game room by taking an available seat.

**Response 200:**

```json
{
  "snapshot": { "...": "MultiplayerSnapshot" }
}
```

**Errors:**

| Status | Reason                                     |
| ------ | ------------------------------------------ |
| 409    | Room full, guest active game limit reached |

---

### POST /api/games/:gameId/access

Access a game. Takes a seat if one is available; spectates if the game is full.

**Response 200:**

```json
{
  "snapshot": { "...": "MultiplayerSnapshot" }
}
```

---

### GET /api/games/:gameId/og

Public endpoint returning minimal game metadata for OpenGraph tags. No authentication required.

**Response 200:**

```json
{
  "gameId": "ABC123",
  "status": "active",
  "boardSize": 19,
  "scoreToWin": 10,
  "score": { "white": 5, "black": 3 },
  "white": "Alice",
  "black": "Bob",
  "whiteRating": 1500,
  "blackRating": 1600,
  "timeControl": { "initialMs": 300000, "incrementMs": 3000 },
  "roomType": "direct"
}
```

---

## Matchmaking

### POST /api/matchmaking

Enter the matchmaking queue.

**Request (optional):**

```json
{
  "timeControl": {
    "initialMs": 300000,
    "incrementMs": 3000
  }
}
```

**Response 200:**

```json
{
  "matchmaking": {
    "status": "searching",
    "queuedAt": "2025-03-01T12:00:00.000Z"
  }
}
```

Possible `matchmaking` states:

```json
{ "status": "idle" }
```

```json
{ "status": "searching", "queuedAt": "2025-03-01T12:00:00.000Z" }
```

```json
{ "status": "matched", "snapshot": { "...": "MultiplayerSnapshot" } }
```

---

### GET /api/matchmaking

Get the current matchmaking status.

**Response 200:**

```json
{
  "matchmaking": {
    "status": "idle"
  }
}
```

---

### DELETE /api/matchmaking

Leave the matchmaking queue.

**Response 204:** No body.

---

### POST /api/games/:gameId/test-finish

Force finish a game. Test environment only.

**Request:**

```json
{
  "winner": "white"
}
```

`winner` must be `"white"` or `"black"`.

**Response 200:**

```json
{
  "message": "Game finished."
}
```

**Errors:**

| Status | Reason                       |
| ------ | ---------------------------- |
| 403    | Not allowed outside of tests |

---

## Social

All social endpoints require account authentication. Guests receive `403`.

### GET /api/player/social/overview

Get the full social overview including friends, requests, and invitations.

**Response 200:**

```json
{
  "overview": {
    "friends": [{ "playerId": "def456", "displayName": "Bob", "kind": "account" }],
    "incomingFriendRequests": [
      { "playerId": "ghi789", "displayName": "Charlie", "kind": "account" }
    ],
    "outgoingFriendRequests": [],
    "incomingInvitations": [
      {
        "invitationId": "inv-001",
        "gameId": "ABC123",
        "sender": { "playerId": "def456", "displayName": "Bob" },
        "expiresAt": "2025-03-01T13:00:00.000Z"
      }
    ],
    "outgoingInvitations": []
  }
}
```

---

### GET /api/player/social/search?q=query

Search for players by display name or exact email. Rate-limited.

**Query parameters:**

| Parameter | Required | Description                         |
| --------- | -------- | ----------------------------------- |
| `q`       | Yes      | Search string, minimum 2 characters |

**Response 200:**

```json
{
  "results": [
    {
      "player": {
        "playerId": "def456",
        "displayName": "Bob",
        "kind": "account"
      },
      "relationship": "friend"
    }
  ]
}
```

Possible `relationship` values: `"none"`, `"friend"`, `"incoming-request"`, `"outgoing-request"`.

---

### POST /api/player/social/friend-requests

Send a friend request.

**Request:**

```json
{
  "accountId": "def456"
}
```

**Response 200:**

```json
{
  "message": "Friend request sent."
}
```

**Errors:**

| Status | Reason                                          |
| ------ | ----------------------------------------------- |
| 400    | Missing accountId, cannot add yourself          |
| 404    | Player not found                                |
| 409    | Already friends, pending request already exists |

---

### POST /api/player/social/friend-requests/:accountId/accept

Accept an incoming friend request.

**Response 200:**

```json
{
  "message": "Friend request accepted."
}
```

---

### POST /api/player/social/friend-requests/:accountId/decline

Decline an incoming friend request.

**Response 200:**

```json
{
  "message": "Friend request declined."
}
```

---

### POST /api/player/social/friend-requests/:accountId/cancel

Cancel an outgoing friend request.

**Response 200:**

```json
{
  "message": "Friend request cancelled."
}
```

---

### POST /api/player/social/friends/:accountId/remove

Remove a friend.

**Response 200:**

```json
{
  "message": "Friend removed."
}
```

---

### GET /api/player/social/friends/:friendId/active-games

View a friend's currently active games.

**Response 200:**

```json
{
  "games": [{ "...": "MultiplayerGameSummary" }]
}
```

---

### POST /api/player/social/game-invitations

Send a game invitation to a friend.

**Request:**

```json
{
  "gameId": "ABC123",
  "recipientId": "def456",
  "expiresInMinutes": 60
}
```

`expiresInMinutes` must be between 5 and 10080 (7 days).

**Response 201** (new invitation):

```json
{
  "message": "Invitation sent."
}
```

**Response 200** (re-inviting same person to same game):

```json
{
  "message": "Invitation updated."
}
```

**Errors:**

| Status | Reason                                               |
| ------ | ---------------------------------------------------- |
| 400    | Missing required fields, invalid duration            |
| 403    | Not friends with recipient, not in the game          |
| 409    | Game already finished, recipient already in the game |

---

### POST /api/player/social/game-invitations/:invitationId/revoke

Revoke a sent invitation (sender only).

**Response 200:**

```json
{
  "message": "Invitation revoked."
}
```

---

### POST /api/player/social/game-invitations/:invitationId/decline

Decline a received invitation (recipient only).

**Response 200:**

```json
{
  "message": "Invitation declined."
}
```

---

## Tournaments

All tournament endpoints require account authentication unless otherwise noted.

### GET /api/tournaments

List public tournaments. Optionally filter by status.

**Query parameters:**

| Parameter | Required | Description                                          |
| --------- | -------- | ---------------------------------------------------- |
| `status`  | No       | Filter by status (e.g. `open`, `active`, `finished`) |

**Response 200:**

```json
{
  "tournaments": [{ "...": "TournamentSnapshot" }]
}
```

---

### GET /api/tournaments/my

List the current player's tournaments.

**Response 200:**

```json
{
  "tournaments": [{ "...": "TournamentSnapshot" }]
}
```

---

### POST /api/tournaments

Create a new tournament.

**Request:**

```json
{
  "name": "Weekend Open",
  "description": "A casual weekend tournament",
  "settings": {
    "format": "single-elimination",
    "maxParticipants": 16
  }
}
```

**Response 201:**

```json
{
  "tournament": { "...": "TournamentSnapshot" }
}
```

---

### GET /api/tournaments/:id

Get a tournament snapshot.

**Response 200:**

```json
{
  "tournament": { "...": "TournamentSnapshot" }
}
```

---

### POST /api/tournaments/:id/access

Access a private tournament via invite code.

**Request:**

```json
{
  "inviteCode": "ABC123"
}
```

---

### POST /api/tournaments/:id/register

Register for a tournament.

**Request (optional):**

```json
{
  "inviteCode": "ABC123"
}
```

Invite code is required for private tournaments.

---

### POST /api/tournaments/:id/unregister

Unregister from a tournament.

---

### POST /api/tournaments/:id/start

Start the tournament. Creator/admin only.

---

### POST /api/tournaments/:id/cancel

Cancel the tournament. Creator/admin only.

---

### PUT /api/tournaments/:id/seeding

Update tournament seeds. Admin only.

**Request:**

```json
{
  "seeds": [
    { "playerId": "abc123", "seed": 1 },
    { "playerId": "def456", "seed": 2 }
  ]
}
```

---

### POST /api/tournaments/:id/seeding/randomize

Randomize tournament seeds. Admin only.

---

### PUT /api/tournaments/:id/featured-match

Set the featured match for spectators. Admin only.

**Request:**

```json
{
  "matchId": "match-001"
}
```

Pass `null` to clear.

---

### POST /api/tournaments/:id/matches/:matchId/forfeit

Admin-forfeit a tournament match.

**Request:**

```json
{
  "loserId": "abc123"
}
```

---

## Admin

Admin endpoints require an admin account. A user becomes an admin when `isAdmin: true` is set on their `GameAccount` document in MongoDB (there is no self-service admin promotion).

### How Admin Works

The `requireAdmin` middleware checks two things:

1. The request has a valid account session (not a guest)
2. The account's `isAdmin` field is `true`

If either check fails, the endpoint returns `403`.

### GET /api/player/admin/users/search?q=query

Search users by display name (case-insensitive, up to 20 results).

**Response 200:**

```json
{
  "users": [
    {
      "playerId": "abc123",
      "displayName": "alice",
      "badges": ["supporter"],
      "activeBadges": ["supporter"]
    }
  ]
}
```

---

### POST /api/player/admin/badges/grant

Grant a badge to a player.

**Request:**

```json
{
  "playerId": "abc123",
  "badgeId": "supporter"
}
```

**Response 200:**

```json
{
  "badges": ["supporter"],
  "activeBadges": []
}
```

---

### POST /api/player/admin/badges/revoke

Revoke a badge from a player. Also removes the badge from `activeBadges` if it was being displayed.

**Request:**

```json
{
  "playerId": "abc123",
  "badgeId": "supporter"
}
```

**Response 200:**

```json
{
  "badges": [],
  "activeBadges": []
}
```

---

### Available Badge IDs

| Badge ID            | Tier | Description              |
| ------------------- | ---- | ------------------------ |
| `supporter`         | 1    | Supporter badge          |
| `contributor`       | 1    | Contributor badge        |
| `super-supporter`   | 2    | Animated supporter badge |
| `official-champion` | 2    | Animated champion badge  |
| `creator`           | 3    | Animated rainbow badge   |
| `badge-1`           | 1    | Coral                    |
| `badge-2`           | 1    | Indigo                   |
| `badge-3`           | 2    | Pink (animated)          |
| `badge-4`           | 2    | Cyan (animated)          |
| `badge-5`           | 1    | Stone                    |
| `badge-6`           | 2    | Amber/Red (animated)     |
| `badge-7`           | 3    | Rainbow (animated)       |
| `badge-8`           | 2    | Deep Blue (animated)     |

Tiers: 1 = static gradient, 2 = animated shimmer, 3 = rainbow animation with glow.

Players can display one active badge at a time via `PUT /api/player/badges/active`.

---

### Managing Admin and Badges via mongosh

You can grant admin privileges and badges directly in the database. This is useful for bootstrapping the first admin account or for environments where the admin UI is not yet accessible.

**Connect to MongoDB:**

```bash
# Local development (Docker Compose)
docker compose exec mongo mongosh tiao

# If mongosh is installed locally
mongosh mongodb://localhost:27017/tiao

# Production (replace with your connection string)
mongosh "mongodb+srv://..."
```

**Find a user by username:**

```javascript
db.gameaccounts.findOne({ displayName: "alice" });
```

**Make a user admin:**

```javascript
db.gameaccounts.updateOne({ displayName: "alice" }, { $set: { isAdmin: true } });
```

**Remove admin privileges:**

```javascript
db.gameaccounts.updateOne({ displayName: "alice" }, { $set: { isAdmin: false } });
```

**Grant a badge:**

```javascript
db.gameaccounts.updateOne({ displayName: "alice" }, { $addToSet: { badges: "creator" } });
```

`$addToSet` is used instead of `$push` so the badge is only added if it is not already present.

**Revoke a badge:**

```javascript
db.gameaccounts.updateOne(
  { displayName: "alice" },
  { $pull: { badges: "creator", activeBadges: "creator" } },
);
```

This removes the badge from both `badges` and `activeBadges` in one operation.

**Check a user's admin status and badges:**

```javascript
db.gameaccounts.findOne({ displayName: "alice" }, { isAdmin: 1, badges: 1, activeBadges: 1 });
```

**List all admins:**

```javascript
db.gameaccounts.find({ isAdmin: true }, { displayName: 1 });
```

---

## Health

### GET /api/health

**Response 200:**

```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## WebSocket Protocol

### Game Connection

Connect to a game room via WebSocket:

```
ws://host/api/ws?gameId=ROOM_ID
```

The session cookie is sent automatically by the browser.

#### Client-to-Server Messages

**Place a piece:**

```json
{ "type": "place-piece", "position": { "x": 9, "y": 9 } }
```

**Jump a piece:**

```json
{ "type": "jump-piece", "from": { "x": 5, "y": 5 }, "to": { "x": 7, "y": 5 } }
```

**Confirm a multi-step jump sequence:**

```json
{ "type": "confirm-jump" }
```

**Undo the last pending jump step:**

```json
{ "type": "undo-pending-jump-step" }
```

**Request a rematch (after game ends):**

```json
{ "type": "request-rematch" }
```

**Decline a rematch request:**

```json
{ "type": "decline-rematch" }
```

#### Server-to-Client Messages

**Game snapshot** (sent on connect and after every state change):

```json
{
  "type": "snapshot",
  "snapshot": {
    "gameId": "ABC123",
    "roomType": "direct",
    "status": "active",
    "state": { "...": "full board state" },
    "players": [],
    "seats": { "white": null, "black": null },
    "rematch": null,
    "createdAt": "2025-03-01T12:00:00.000Z",
    "updatedAt": "2025-03-01T12:10:00.000Z"
  }
}
```

**Error:**

```json
{
  "type": "error",
  "code": "NOT_YOUR_TURN",
  "message": "It is not your turn."
}
```

#### Error Codes

| Code                   | Meaning                                     |
| ---------------------- | ------------------------------------------- |
| `NOT_IN_GAME`          | Player is not seated in this game           |
| `NOT_YOUR_TURN`        | It is not the player's turn                 |
| `WAITING_FOR_OPPONENT` | Game has not started yet (missing opponent) |
| `GAME_NOT_FINISHED`    | Cannot request rematch on an active game    |
| `NO_REMATCH_REQUEST`   | Declining when no rematch request exists    |
| `UNKNOWN_ACTION`       | Unrecognized message type                   |

Additional error codes from the game engine's `RuleFailureCode` may be returned for invalid moves.

---

### Lobby Connection

Real-time updates for account players. No client-to-server messages.

```
ws://host/api/ws/lobby
```

Account authentication required.

#### Server-to-Client Messages

**Game update** (sent when any of the player's games changes):

```json
{
  "type": "game-update",
  "summary": { "...": "MultiplayerGameSummary" }
}
```

**Social update** (sent when friends, requests, or invitations change):

```json
{
  "type": "social-update",
  "overview": {
    "friends": [],
    "incomingFriendRequests": [],
    "outgoingFriendRequests": [],
    "incomingInvitations": [],
    "outgoingInvitations": []
  }
}
```

A social update may also arrive without the `overview` field, signaling that the client should re-fetch the overview via REST.

---

## Common Types

### MultiplayerSnapshot

```typescript
{
  gameId: string;             // 6-char room code, e.g. "ABC123"
  roomType: "direct" | "matchmaking";
  status: "waiting" | "active" | "finished";
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  state: GameState;           // Full board state (includes history: TurnRecord[])
  players: PlayerSlot[];
  rematch: { requestedBy: ("white" | "black")[] } | null;
  seats: {
    white: PlayerSlot | null;
    black: PlayerSlot | null;
  };
}
```

### MultiplayerGameSummary

```typescript
{
  gameId: string;
  roomType: "direct" | "matchmaking";
  status: "waiting" | "active" | "finished";
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  currentTurn: "white" | "black";
  historyLength: number;
  winner: "white" | "black" | null;
  yourSeat: "white" | "black" | null;
  score: { white: number; black: number };
  players: PlayerSlot[];
  seats: {
    white: PlayerSlot | null;
    black: PlayerSlot | null;
  };
}
```

### PlayerSlot

```typescript
{
  player: PlayerIdentity;
  online: boolean;
}
```

### PlayerIdentity

```typescript
{
  playerId: string;
  displayName: string;
  kind: "guest" | "account";
  email?: string;
  profilePicture?: string;
  badges?: string[];
  activeBadges?: string[];
  rating?: number;
  hasSeenTutorial?: boolean;
  needsUsername?: boolean;     // true for OAuth accounts without a username
  isAdmin?: boolean;
}
```

### MatchmakingState

```typescript
{ status: "idle" }
| { status: "searching"; queuedAt: string }
| { status: "matched"; snapshot: MultiplayerSnapshot }
```

### TurnRecord (Move History)

The `GameState.history` array contains every move made in the game. Each entry is one of:

```typescript
// Piece placement
{
  type: "put";
  color: "white" | "black";
  position: {
    x: number;
    y: number;
  }
}

// Jump sequence (one or more captures)
{
  type: "jump";
  color: "white" | "black";
  jumps: Array<{
    from: { x: number; y: number };
    over: { x: number; y: number }; // captured piece position
    to: { x: number; y: number };
    color: "white" | "black";
  }>;
}
```

Move history is persisted for all multiplayer games and returned in `MultiplayerSnapshot.state.history`. Use the `replayToMove(history, moveIndex)` utility from the shared package to reconstruct the board state at any point in the game.
