# Investigation: WebSocket Server Framework

**Status:** Blocked
**Date:** 2026-03-28
**Attempted:** 2026-04-13

## Context

The server uses Express 5 + raw `ws` WebSocket library. As the game grows, WebSocket throughput and concurrent connection capacity become increasingly important. Investigated whether replacing Express with a faster alternative could meaningfully improve performance on a single VPS box.

## Options Considered

### Express + ws (current)

- ~15K HTTP req/s, ~435K WS msg/s
- Massive middleware ecosystem (helmet, cors, morgan, rate-limit, multer all in use)
- Very mature, well-understood, huge community (~65K stars)
- Single-instance practical limit of ~5-10K concurrent WebSocket connections

### uWebSockets.js (via ultimate-express)

- C++ WebSocket/HTTP server with Node.js bindings
- ~57K HTTP req/s (via ultimate-express drop-in), ~2.5M WS msg/s (~10x over ws)
- ultimate-express is a drop-in Express 4 replacement — existing routes and middleware work unchanged
- WebSocket API differs from `ws` — needs rewrite of connection handling
- Single maintainer (Alex Hultman), not on npm (GitHub releases only), platform-specific binaries
- ~30-50K concurrent WS connections on same hardware

### uWebSockets.js (raw)

- ~94K HTTP req/s, ~2.5M WS msg/s
- Own routing API, no Express compatibility — full HTTP rewrite required
- Maximum possible performance but highest migration effort

### Hono + Bun native

- Hono: modern TypeScript-first framework on Web Standards (Fetch API), ~80-130K HTTP req/s on Bun
- Bun: JavaScript runtime replacing Node.js, native WS via uWS internally (~2.5M msg/s)
- Express middleware is **incompatible** with Hono — helmet, cors, morgan, rate-limit, multer all need replacements
- `bcrypt` (native C++ addon) may break on Bun — would need `bcryptjs` or `@node-rs/bcrypt`
- ~10-20% more real-world capacity than ultimate-express, but 5-10x more migration effort

### Soketi

- Self-hosted Pusher-protocol WebSocket service, built on uWS
- **Not a good fit** — designed for channel-based pub/sub, not custom game state messaging
- Would require separate process + Pusher SDK adoption + complete WS rewrite
- Maintenance concerns (infrequent updates, growing issue backlog)

## Analysis

The key insight is that **WebSocket throughput gains come from uWebSockets.js, which both the ultimate-express and Bun paths use**. The framework layer (Express vs Hono) only affects HTTP routing overhead, which is <1% of real response time when MongoDB queries take 5-50ms.

On a typical VPS (2-4 cores, 4-8GB RAM):

| Metric                    | Express + ws       | ultimate-express + uWS | Hono + Bun         |
| ------------------------- | ------------------ | ---------------------- | ------------------ |
| Concurrent WS connections | ~5-10K             | ~30-50K                | ~30-50K            |
| Real HTTP latency         | ~5-50ms (DB-bound) | ~5-50ms (DB-bound)     | ~5-50ms (DB-bound) |
| WS message throughput     | 1x                 | ~10x                   | ~10x (same uWS)    |
| Migration effort          | —                  | Low (1-2 days)         | High (1-2 weeks)   |

The real VPS bottlenecks are MongoDB queries, Redis lookups, and game logic CPU — not framework overhead.

## Recommendation

**ultimate-express + uWebSockets.js native WS** was the pragmatic choice on paper.

Higher-leverage capacity improvements (independent of framework choice):

- MongoDB query optimization / connection pooling
- Moving hot game state to Redis
- Horizontal scaling with Redis Pub/Sub (already planned in ADR #6)

## 2026-04-13 Migration Attempt — Blocked

Attempted the migration to `ultimate-express` + `ultimate-ws`. Found a fatal incompatibility:

**`ultimate-express` + `mongoose` breaks HTTP routing.** After `mongoose.connect()` completes, all routes registered via `app.use(path, router)` silently stop matching and return 404. Routes registered directly with `app.get()` continue to work. This was proven by testing the same request before and after mongoose connects:

- Before `mongoose.connect()`: routes match (503 / DB not ready)
- After `mongoose.connect()`: routes 404 (gone from uWS route table)

The root cause: `ultimate-express` uses uWebSockets.js's C++ router internally. This router appears to finalize/freeze its route table after certain I/O events. Mongoose's MongoDB driver (which uses `net.Socket` and DNS resolution) triggers this finalization, making all subsequently-dispatched Express Router middleware invisible to uWS.

**Other issues discovered during the attempt:**

1. `ultimate-express` cannot mount the same Express Router instance at two different base paths (it caches path info on the router). Workaround: function delegation `(req, res, next) => router(req, res, next)`.
2. `ultimate-ws`'s TypeScript declarations use an incompatible `export =` form, requiring `require()` casts instead of `import`.
3. `ultimate-express`'s `UltimateExpress` type is not assignable to `Express`/`Application` from `@types/express` due to differing `listen()` signatures. Requires `as any` casts at the bridge points.
4. `@types/express@5` (pulled in by `@types/multer`) conflicts with ultimate-express's bundled `@types/express@4`, creating type mismatches for `Request`/`Response`/`Router` across module boundaries.
5. `ultimate-ws`'s close event doesn't pass a `reason` Buffer (unlike `ws`), causing `reason.toString()` to crash.

**Conclusion:** The ultimate-express path is not viable with our mongoose-based stack. Future options:

- **Raw uWebSockets.js** (high effort): Replace Express entirely with uWS routing + a `GameSocket` abstraction. Requires rewriting all HTTP routes and middleware.
- **Separate uWS process** for WebSockets only, with Redis Pub/Sub bridging game state between the Express API server and the uWS WS server. This is essentially the horizontal scaling path from ADR #6.
- **Wait** for ultimate-express to fix the mongoose compatibility issue, or for the `ws` library to improve throughput (unlikely — the gap is architectural, not incremental).
- **Re-evaluate when scale demands it.** The current Express + ws stack handles the current load fine. The 5-10K concurrent WS connection limit is far above current usage.
