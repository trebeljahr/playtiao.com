# Architecture Decisions

This document records the key architectural decisions made in Tiao, the reasoning behind them, and their consequences. Each decision follows the Context / Decision / Consequences format.

---

## 1. Standardized Error Response Format

**Context:** API routes returned errors in two inconsistent formats — some with `{message}` only, others with `{code, message}`. Client code had to parse message strings to determine error types, making programmatic error handling fragile and localization impossible.

**Decision:** All error responses use `{code, message}` format. Codes are uppercase, snake_case, machine-readable identifiers (e.g., `VALIDATION_ERROR`, `DUPLICATE_EMAIL`, `NOT_AUTHENTICATED`). Messages are human-readable sentences for display.

**Consequences:**

- Clients can branch on `code` instead of string-matching messages
- Error messages can be changed without breaking client logic
- Enables future localization (map codes to translated strings)
- Slightly larger response payloads (negligible)

---

## 2. Redis for Stateful Services

> Investigation: [005-stateful-services-storage.md](investigations/005-stateful-services-storage.md)

**Context:** Matchmaking queue, distributed locks, and rate limit counters were all stored in Node.js process memory. This made the server a single point of failure — a restart loses all queued players and active locks. Horizontal scaling is impossible since each instance has its own state.

**Decision:** Extract matchmaking and locking into pluggable abstractions (`MatchmakingStore`, `LockProvider`) with both in-memory and Redis implementations. Rate limiting uses `rate-limit-redis` when available. Redis is **optional** — when `REDIS_URL` is not set, the server falls back to in-memory stores for local development and testing.

**What moved to Redis:**

- Matchmaking queue (Redis Sorted Set, scored by queue time)
- Matchmaking match mapping (Redis String with 5-minute TTL)
- Distributed locks (SETNX + TTL + Lua release script)
- Rate limit counters (via `rate-limit-redis`)

**What stays in-memory:**

- WebSocket connections (socket objects cannot be serialized)
- Abandon timers and clock timers (setTimeout handles; job queue migration planned)
- Lobby connections (socket references)

**Consequences:**

- Enables horizontal scaling when Redis is available
- Matchmaking survives server restarts
- Locks work across instances
- Rate limits are consistent across load-balanced instances
- Local development requires no Redis (in-memory fallback)
- Added dependency: `ioredis`, `rate-limit-redis`

---

## 3. Per-Account Rate Limiting

**Context:** Rate limiting was purely IP-based. Users behind shared proxies (corporate networks, mobile carriers) were unfairly rate-limited together. An attacker on a proxy could exhaust limits for all users on that proxy.

**Decision:** Rate limit key generator uses `playerId` for authenticated requests and falls back to `req.ip` for unauthenticated ones. The player identity is resolved from the session cookie via the existing `getPlayerFromRequest()` function.

**Consequences:**

- Fair per-user limits regardless of IP sharing
- Authenticated users get their own limit buckets
- Unauthenticated endpoints (login, signup, guest creation) still use IP-based limiting
- Slightly higher per-request overhead (session cookie lookup on every rate-limited request)
- Rate limit state is distributed via Redis when available

---

## 4. Session Strategy: better-auth

> Investigation: [002-auth-strategy.md](investigations/002-auth-strategy.md)

**Context:** The server needs to authenticate players across HTTP requests and WebSocket connections. The original implementation used custom HMAC cookie digests, but as OAuth support and more auth features were needed, a managed solution became more practical.

**Decision:** Migrate from custom HMAC session handling to [better-auth](https://www.better-auth.com/), a TypeScript-first auth library with built-in support for email/password, OAuth providers, anonymous sessions, and session management. better-auth uses HttpOnly cookies and stores sessions in MongoDB via its MongoDB adapter.

**Why better-auth over custom sessions:**

- Built-in OAuth support (GitHub, Google, Discord) without writing provider integrations
- Anonymous/guest accounts as a first-class plugin
- Session management (30-day duration, auto-refresh) handled by the library
- Password hashing (bcrypt), rate limiting, and security best practices included
- Custom routes can still wrap better-auth APIs (e.g., login by username)

**Consequences:**

- Auth state split across better-auth collections (`user`, `session`, `account`) and Tiao's `GameAccount`
- `GameAccount._id` matches `user._id` to link game data with auth data
- Custom login route resolves usernames to emails before delegating to better-auth
- `TOKEN_SECRET` serves as fallback for `BETTER_AUTH_SECRET`
- SameSite=Lax + HttpOnly + Secure flags for cookie security

---

## 5. Game State in Single MongoDB Document

> Investigation: [006-database-choice.md](investigations/006-database-choice.md)

**Context:** Each multiplayer game needs persistent state including the board, move history, scores, clock times, and metadata. Options considered: single document, event sourcing, separate collections for state vs. history.

**Decision:** Store the entire game state as a single MongoDB document (`GameRoom`). The `state` field is `Schema.Types.Mixed` containing the full `GameState` object (board positions, history, scores, pending jumps).

**Why not event sourcing:**

- Games are short (typically < 200 moves, completing in minutes)
- Turn-based game with low write frequency (one move per turn)
- Single document = atomic reads/writes without transactions
- No need for replay/audit infrastructure at this scale

**Consequences:**

- Simple query model (find by gameId, get everything)
- Document grows with each move (acceptable for < 200 moves)
- List queries fetch full state even when only metadata is needed (mitigated with `.limit()`)
- Atomic state transitions without distributed transactions
- If games grow very long, document size could become a concern (MongoDB 16MB limit)

---

## 6. WebSocket Architecture

> Investigations: [009-websocket-library.md](investigations/009-websocket-library.md), [001-websocket-server-framework.md](investigations/001-websocket-server-framework.md)

**Context:** The game requires real-time bidirectional communication for move updates, clock synchronization, rematch/takeback negotiation, and lobby notifications.

**Decision:** Single `ws.WebSocketServer` instance handling two connection types:

- `/api/ws?gameId=XXXX` — per-game connections for move updates
- `/api/ws/lobby` — lobby connections for matchmaking and social notifications

Messages are JSON-serialized and dispatched through `GameService.applyAction()`. Server validates every move using the shared game engine before broadcasting.

**Current limitation:** All WebSocket connections must terminate at the same server instance. Cross-instance broadcasting is not yet implemented.

**Future path:** Redis Pub/Sub channels per game room. Each instance subscribes to rooms where it has active connections. Broadcast publishes to Redis; local instances relay to their sockets.

**Consequences:**

- Simple, direct socket ↔ memory model with low latency
- Ping/pong heartbeat (10s) detects stale connections
- Origin validation prevents Cross-Site WebSocket Hijacking
- Single-instance bottleneck for concurrent connections (~10K practical limit per instance)

---

## 7. Shared Game Engine (Pure Functions)

**Context:** Both client and server need to validate game rules. Duplicating logic creates desync risk. Trusting the client is insecure.

**Decision:** Game rules are implemented as pure functions in `shared/src/tiao.ts`. Both client and server import from the same package. Functions take `GameState` and return `RuleResult<T>` (success with new state, or failure with code/reason). No side effects, no I/O.

**Client usage:** Optimistic UI updates — the client runs the rule engine locally to provide instant feedback, then sends the move to the server. If the server rejects it, the client reverts to the server-confirmed state.

**Server usage:** Authoritative validation — every move is validated using the same functions before persisting. The server is the single source of truth.

**Consequences:**

- Consistent behavior between client and server (same code, same edge cases)
- Cheating requires breaking the server, not just the client
- Larger client bundle (game engine code shipped to browser)
- Game logic changes require deploying both client and server
- Pure functions are trivially testable (no mocks needed)

---

## 8. Dual Authentication: Guest + Account

> Investigation: [002-auth-strategy.md](investigations/002-auth-strategy.md)

**Context:** The game should be accessible immediately (no signup wall) but also support persistent profiles, friends, and match history.

**Decision:** Two player types share a common `PlayerIdentity` shape:

- **Guest:** Instant creation, no credentials, ephemeral UUID, limited to one unfinished multiplayer game. Session-only persistence.
- **Account:** Email/password (bcrypt), persistent profile, friends list, game history, profile pictures. Full social features.

**Consequences:**

- Zero friction for first-time players (play immediately)
- Social features (friends, invitations, history) require an account
- Guest → Account upgrade is a separate flow (no automatic migration of guest games)
- Matchmaking mixes guests and accounts (no separate queues)
- Moderation: accounts can be banned, guests are ephemeral
- Guest smurf risk in matchmaking (mitigated by single-game limit)

---

## 9. Image Processing: Client + Server Resize

**Context:** Profile picture uploads need to be resized and optimized. The client runs on devices with varying network speeds.

**Decision:** Dual resize pipeline:

- **Client-side (canvas):** Crops to square, resizes to 512x512, compresses to JPEG at 85% quality. Provides instant preview and reduces upload payload (~30KB).
- **Server-side (Jimp):** Resizes to 320px width, converts to JPEG. Ensures consistent dimensions regardless of client behavior. Uploads to S3.

**Why both:**

- Client resize gives instant feedback and smaller uploads (important for mobile)
- Server resize guarantees uniformity (browser canvas quality varies)
- Defense in depth: even if client is modified, server produces consistent output

**Consequences:**

- Fast perceived upload (small payload after client resize)
- Consistent storage format (server normalizes everything to 320px JPEG)
- Upload limit: 512KB (after client resize, typical images are ~30KB)
- MIME type whitelist: JPEG, PNG, WebP, GIF (SVG rejected to prevent script injection)

---

## 10. Vite to Next.js 14 App Router Migration (Completed)

> Investigation: [007-client-framework.md](investigations/007-client-framework.md)

**Context:** The client was originally a Vite-powered React SPA with react-router-dom. The SPA model was limiting: no server-side rendering for SEO, no social sharing meta tags (Open Graph), and no control over initial HTML for performance.

**Decision:** Migrated to Next.js 14 App Router. This required:

- Replacing react-router-dom with Next.js file-system routing (`app/` directory)
- Creating a custom `server.mjs` wrapping Next.js with `http-proxy` for WebSocket proxying — same-origin session cookies don't work with cross-origin WebSocket connections
- Extracting auth state from `App.tsx` into an `AuthContext` provider
- Renaming `src/pages/` to `src/views/` to avoid Next.js Pages Router conflict
- Converting `VITE_*` environment variables to `NEXT_PUBLIC_*`
- Changing production Dockerfile from Nginx static serving to `node server.mjs`
- Changing SameSite cookie from `Strict` to `Lax` for Next.js navigation behavior

**Consequences:**

- SSR enables SEO and social sharing meta tags
- Custom `server.mjs` adds a proxy layer but enables same-origin cookies for WebSocket auth
- Production deployment requires a Node.js runtime (no longer static files)
- Vitest decoupled from build tool via standalone `vitest.config.mts`
- Larger deployment footprint but better user experience on first load

---

## 11. Tournament System Architecture

**Context:** The game needed a competitive structure beyond individual matches. Players requested organized tournaments with brackets, standings, and progression. The tournament system needed to integrate with the existing GameService and WebSocket infrastructure without disrupting normal game flow.

**Decision:** A dedicated tournament layer with its own service (`tournamentService.ts`), MongoDB model, REST API (12 endpoints), and WebSocket notifications. Three tournament formats supported:

- **Single Elimination:** Standard bracket, losers are eliminated
- **Round Robin:** Every player plays every other player, standings by points
- **Groups + Knockout:** Group stage (round-robin) followed by single-elimination bracket

Key design choices:

- Tournament games are regular games with special lifecycle rules (deferred timers, no rematch, auto-drop on disconnect)
- Bracket generation uses circle method (round-robin) and snake-seeding (elimination)
- GameService completion callbacks trigger automatic round advancement
- Shared tournament types in `shared/src/tournament.ts` for client-server consistency
- Player data assembled dynamically from `GameAccount` (no denormalized copies)

**Consequences:**

- Tournament games reuse the existing game engine and WebSocket infrastructure
- Round advancement is automatic — no manual intervention after tournament starts
- Tournament-specific UI (brackets, standings, match cards) is a significant client-side addition
- The `tournamentService.ts` is the largest single service file (~1100 lines) — potential candidate for decomposition
- Forfeit and auto-drop mechanics add complexity to the game lifecycle

---

## 12. Horizontal Scaling: Redis Pub/Sub + BullMQ

> Related: [ADR #2 — Redis for Stateful Services](#2-redis-for-stateful-services), [ADR #6 — WebSocket Architecture](#6-websocket-architecture)

**Context:** ADR #2 moved matchmaking and locks to Redis, enabling multi-instance deployments for stateless HTTP requests. However, three concerns remained single-instance only:

1. **WebSocket broadcasting** — `broadcastSnapshot()` and lobby notifications only send to sockets on the local process. A player connected to instance A never receives moves published by instance B.
2. **Timers** — Clock timers, guest abandon timers, and first-move timers use `setTimeout`, which is lost on restart and can't be shared across instances.
3. **Background jobs** — The matchmaking sweep (`setInterval`) runs on every instance (wasteful races), and GDPR data exports use `setImmediate` (single-process only).

**Decision:** Two new pluggable abstractions following the same interface + Redis/InMemory pattern established in ADR #2:

### Broadcaster (Redis Pub/Sub)

Interface `Broadcaster` with `publishRoom`, `publishLobby`, `publishLobbyAll` methods. Each instance subscribes to Redis Pub/Sub channels for rooms and players it has active WebSocket connections for. Messages include an instance UUID to prevent echo (a publisher doesn't relay its own messages back to itself).

- Channels: `tiao:ws:room:{roomId}`, `tiao:ws:lobby:{playerId}`, `tiao:ws:lobby:all`
- Local delivery is synchronous (no Redis round-trip for sockets on the publishing instance)
- Subscribe/unsubscribe tied to connect/disconnect lifecycle in `GameService`

### TimerScheduler (BullMQ)

Interface `TimerScheduler` with schedule/cancel methods for each timer type. Three BullMQ queues with delayed jobs replace the three in-memory `setTimeout` Maps:

- `tiao:timer:clock` — fires when a player's clock runs out
- `tiao:timer:abandon` — fires 5 minutes after a guest disconnects
- `tiao:timer:first-move` — fires when the first-move deadline passes

Jobs use deterministic IDs (`clock:{roomId}`, `abandon:{roomId}:{playerId}`, `first-move:{roomId}`) so scheduling is idempotent and cancellation is a simple `queue.remove(jobId)`. Workers run in-process (no separate worker deployment needed). All handlers defensively re-verify the condition from the database before acting, making them safe for at-least-once delivery.

### Background Jobs (BullMQ)

- **Matchmaking sweep**: BullMQ repeatable job (every 5s) replaces `setInterval`. Only one instance picks up each occurrence — no duplicate matching races.
- **GDPR data export**: BullMQ job replaces `setImmediate`. Any instance can process the export.

**Why BullMQ:**

| Alternative                       | Why not                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Custom Redis ZRANGEBYSCORE poller | Reinvents atomicity, retries, stalled-job recovery, and cleanup — all solved by BullMQ |
| Agenda (MongoDB-based queues)     | Higher latency, lower throughput; Redis is already in the stack                        |
| node-cron / setInterval           | In-memory only — exactly the problem being solved                                      |

BullMQ adds ~2MB of dependencies, is well-maintained (5K+ GitHub stars), and has been used in production for background jobs since 2011 (originally as Bull, rewritten as BullMQ).

**Consequences:**

- Multi-instance deployment is now possible: spin up N API servers behind a load balancer, point all at the same Redis + MongoDB, and WebSocket broadcasts, timers, and background jobs work correctly across all instances
- `restoreClockTimers()` becomes a no-op with BullMQ (jobs persist in Redis and survive restarts)
- Single-instance deployments still work without Redis (InMemory fallbacks for all interfaces)
- Redis becomes a hard requirement for multi-instance deployments (already was, via ADR #2)
- Added dependency: `bullmq`
- Graceful shutdown must close BullMQ workers and Redis Pub/Sub subscribers

---

## 13. Cross-Platform Distribution Strategy

> Investigation: [016-cross-platform-distribution.md](investigations/016-cross-platform-distribution.md)

**Context:** Tiao needs to ship beyond the browser — on Steam (Windows, macOS, Linux), iOS App Store, and Google Play. The app is a Next.js 14 frontend with an Express/WebSocket backend. Nearly all UI logic is client-side (`use client`), with server features limited to i18n middleware and OG metadata generation. The goal is maximum code reuse with minimal platform-specific rewrites.

**Decision:** Three-phase rollout:

1. **PWA** — Complete the existing PWA shell (add service worker + install prompt). Immediate improvement, ~1-2 days.
2. **Capacitor (static export)** — Wrap the app in Capacitor for iOS + Android. Use a separate `next.config.mobile.mjs` with `output: 'export'` that strips server-only features (i18n middleware, generateMetadata). Add push notifications and haptics to satisfy Apple Guideline 4.2.
3. **Electron + Steamworks.js** — Wrap the frontend in Electron for Steam distribution. Integrate Steamworks SDK via `steamworks.js` for achievements, overlay, and friends. Optionally ship a standalone (non-Steam) desktop build for itch.io or direct download.

**Why not Tauri:** Steam overlay has open issues, Steamworks integration is immature (no equivalent of `steamworks.js`), mobile DX not yet on par with desktop. Revisit when Tauri's Steam ecosystem matures.

**Why not React Native / Flutter:** Both require near-complete UI rewrites. The WebView approach via Capacitor reuses ~95% of existing code. A card/board game doesn't need 60fps native rendering.

**Why not Cordova:** Legacy predecessor to Capacitor, stagnating ecosystem. Capacitor is its successor by the same team and is strictly better.

**Auth adaptation:** Electron cookies work natively. Capacitor requires a token-based auth bridge (short-lived JWT from `/auth/session-token` to establish WebView session) since mobile WebViews don't share cookies with the system browser.

**Consequences:**

- ~95% code reuse across web, mobile, and desktop
- Two Next.js build configurations (web with SSR, mobile with static export)
- One auth bridge endpoint for mobile OAuth flow
- Electron wrapper + Steam integration is ~500-1000 lines of platform-specific code
- Must maintain responsive design across 375px (mobile) through 1920px+ (desktop/Steam Big Picture)
- App update cadence differs: web deploys instantly, mobile needs store release or OTA, Steam auto-updates
