# Tiao Desktop

Electron wrapper around the Tiao client, shipped as standalone macOS / Windows / Linux
binaries. The renderer is a Next.js static export served from a custom `app://tiao/`
privileged protocol; the main process handles OAuth via a system-browser bridge,
encrypted token persistence via `safeStorage`, and auto-updates via `electron-updater`.

The web build at [playtiao.com](https://playtiao.com) is unaffected by anything in this
directory.

## Dev workflow

Two commands the first time, then two per iteration:

```bash
# First-time: install deps. Already done if you ran `npm install` at the monorepo root.
cd desktop && npm install

# Build the static client export and stage it into desktop/client-bundle/.
# Slow (~30s) — it's a full Next.js production build. Re-run after changing
# any client/ code. An npm preflight (dev:ensure-bundle) auto-runs this on
# first `npm run dev` if the bundle is missing.
npm run dev:build-client

# Launch the Electron window at app://tiao/en/
npm run dev
```

There is **no HMR for the renderer**. Every UI tweak requires re-running
`npm run dev:build-client` and reloading the Electron window (`Cmd+R`) or
restarting `npm run dev`. The upside: identical code paths in dev and production
— the protocol handler and its SPA rewrite logic are tested every single launch.

### Where logs go

- **Renderer logs** (React `console.log`, network errors, CSP violations) →
  the DevTools Console, which auto-opens in dev (`Cmd+Opt+I` to toggle).
- **Main process logs** (`[main] ...`, `[authBridge] ...`, `[protocol] ...`) →
  the terminal where you ran `npm run dev`, **not** DevTools.

### Iterating on main process code

Main process code (`main.cjs`, `src/*.cjs`) does not hot-reload. Kill the Electron
app with `Cmd+Q` and re-run `npm run dev` after every main-side change.

## HMR dev mode (fast renderer iteration)

The production path has no renderer HMR — every CSS or React change requires a
full `next build` into `client-bundle/` and a reload. For fast UI iteration,
use `dev:hmr`, which points the Electron window at a running Next.js dev server
instead of loading the static bundle via `app://tiao/`:

```bash
# Terminal 1: start the regular tiao client dev server
# (from the monorepo root)
npm run dev   # or `npm run client` for just the client

# Terminal 2: launch Electron against it
cd desktop
npm run dev:hmr   # defaults to http://localhost:3000/en/
```

Override the URL if your dev server runs on a different port (e.g. worktrees
default to 3100 per the tiao workflow):

```bash
TIAO_DEV_RENDERER_URL=http://localhost:3100/en/ npm run dev:hmr
```

You get full Next.js Fast Refresh — edits to React components, Tailwind classes,
and CSS hot-reload in the Electron window without a full rebuild.

### What HMR mode skips

HMR mode **bypasses the entire production rendering path**. That's the whole
point — it's faster because it doesn't go through the `app://` protocol
handler. But it means the following are **NOT** exercised:

- **`app://tiao/` protocol handler** — SPA rewrites for `/game/[id]`,
  `/profile/[username]`, `/tournament/[id]`, and the path-traversal guard.
- **`client-bundle/`** — the static export isn't read, isn't even required to
  exist. The preflight check is skipped in this mode.
- **Bearer-token auth path** — because the renderer loads from
  `http://localhost:*`, same-origin cookies flow through the client's
  `server.mjs` proxy, and `api.ts` falls back to cookie auth. The
  `Authorization: Bearer` code path is dead in HMR mode.
- **OAuth via the IPC bridge** — `handleOAuthSignIn` still routes through
  `window.electron.auth.startOAuth(provider)` because `isElectron === true`,
  but the bridge opens the system browser at whatever `TIAO_API_URL` points
  at. Usually works, but sometimes simpler to use username/password login to
  sidestep the browser round-trip entirely.
- **Relaxed Content-Security-Policy** — Next.js HMR websocket needs `ws:` and
  dev mode uses `'unsafe-eval'`. The HMR CSP permits both; the production
  CSP (used by `npm run dev`) does not.

**Rule of thumb:** use `npm run dev:hmr` for UI iteration, use `npm run dev`
for anything that touches Electron-specific behavior — auth bridge,
safeStorage, deep links, protocol handler, SPA rewrite, packaging concerns.

### HMR startup banner

When HMR mode is active, main.cjs prints a banner at startup:

```
[main] HMR mode: loading renderer from http://localhost:3000/en/
[main] The app:// protocol handler, SPA rewrite, and bundled
[main] client-bundle/ are NOT used in this mode.  Auth/OAuth/
[main] safeStorage behavior may differ from a production build.
```

If you don't see this, you're in the regular `dev` path.

## Runtime API URL

The Tiao API base URL (`TIAO_API_URL`) is resolved at **Electron launch
time**, not baked into `client-bundle/` at static-export time. Switching
between local / staging / production only requires relaunching with a
different env var — no rebuild.

```bash
# Default: localhost:5005 (matches the tiao server dev port)
npm run dev

# Point at production
npm run dev:prod
# ↑ sets TIAO_API_URL=https://api.playtiao.com before launching

# Point at staging or a custom host
TIAO_API_URL=https://staging.example.com npm run dev
```

### How the wiring works

1. **`main.cjs`** reads `TIAO_API_URL` at launch via `resolveApiUrl()`
   in `src/config.cjs`. Default: `http://localhost:5005` for unpackaged
   builds, `https://api.playtiao.com` for packaged builds.
2. **`window.cjs`** passes the resolved URL to the sandboxed preload
   via `webPreferences.additionalArguments: ["--tiao-api-url=..."]`.
   This is the sanctioned Electron channel for main→preload data in
   a sandboxed window — env vars don't cross the sandbox reliably.
3. **`preload.cjs`** reads `--tiao-api-url=` out of `process.argv`,
   freezes it onto `window.electron.config.apiUrl`.
4. **`client/src/lib/api.ts`** reads `window.electron.config.apiUrl`
   synchronously at module load time (preload runs before any
   renderer JS, so it's always populated by then). Falls back to
   `NEXT_PUBLIC_DESKTOP_API_URL` if absent (safety net only).
5. **`authBridge.cjs`** uses the same `resolveApiUrl()` helper for
   the main-process `/api/auth/desktop/*` calls so renderer and main
   never drift.

The `NEXT_PUBLIC_DESKTOP_API_URL` build-time env var is still set by
`next.config.mjs` (default: production URL) but is now a fallback
path. In normal operation it's dead code — the runtime value always
wins.

## Architecture

```
desktop/
├── main.cjs          ← entry: preflight, protocol reg, bootstrap
├── preload.cjs       ← contextBridge: window.electron.{config, auth, analytics}
├── package.json      ← scripts + electron-builder config (all platforms)
└── src/
    ├── config.cjs    ← shared resolveApiUrl() used by main + authBridge
    ├── window.cjs    ← BrowserWindow factory, hardened webPreferences, CSP
    ├── protocol.cjs  ← app://tiao/* handler + SPA rewrite + path traversal guard
    ├── menu.cjs      ← native menu, Mac-aware split
    ├── deepLink.cjs  ← tiao:// URL scheme: open-url + second-instance + cold-start
    ├── authBridge.cjs← OAuth start → exchange → safeStorage persist → IPC broadcast
    ├── analytics.cjs ← OpenPanel main-process events, opt-in, persisted prefs
    └── updater.cjs   ← electron-updater, gated behind TIAO_ENABLE_UPDATER=1
```

### The `app://tiao/` protocol

The renderer never runs against a dev server. It's a Next.js static export baked
to `.next-desktop/` and copied into `desktop/client-bundle/`, which the main
process serves via a custom `app://tiao/*` privileged protocol.

Three dynamic routes (`/game/[id]`, `/profile/[username]`,
`/tournament/[id]`) are baked as a single `__spa__` placeholder HTML file in the
static export. The protocol handler rewrites e.g. `/en/game/ABC123/` to serve
`en/game/__spa__/index.html`, and a runtime helper in
`client/src/lib/desktopPathParam.ts` reads the real segment from
`window.location.pathname` once React hydrates. See `src/protocol.cjs` for the
full rewrite logic and path-traversal guard.

### The OAuth bridge

There are no web cookies — the renderer loads from `app://tiao/`, which has no
domain relationship with the API. Login goes through a three-step bridge:

1. **Renderer → main** (`auth:startOAuth`): generates a UUID state and opens the
   system browser at `https://api.playtiao.com/api/auth/desktop/start?provider=...&state=...`.
2. **System browser → OS → main**: after the user completes OAuth, the API
   redirects to `tiao://auth/complete?state=...&code=...`. macOS dispatches this
   via `open-url`; Windows/Linux via `second-instance`. See `src/deepLink.cjs`
   for the platform dance.
3. **Main → API → renderer** (`auth:complete` IPC broadcast): main POSTs
   `{state, code}` to `/api/auth/desktop/exchange`, persists the returned bearer
   token via `safeStorage` (OS keychain), and broadcasts it to the renderer,
   which refetches the player identity via `Authorization: Bearer`.

See `src/authBridge.cjs` for the full state machine + failure cases.

## Manually testing each piece

Test in this order when something's off:

| Surface                       | How to test                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Window loads**              | `npm run dev`. Home page renders in ~1s.                                                                                                                                             |
| **SPA route rewrite**         | Navigate to a game or profile page. `window.location.pathname` shows the real URL, but the protocol handler silently served the `__spa__` placeholder.                               |
| **External links**            | Click a link that opens in a new tab — it should open in your default browser, not the Electron window (see `setWindowOpenHandler` in `main.cjs`).                                   |
| **OAuth flow**                | Click "Sign in with GitHub". System browser opens → complete flow → `tiao://auth/complete` dispatches back → you're signed in. Requires `TIAO_API_URL` pointed at a working backend. |
| **safeStorage persistence**   | Sign in, `Cmd+Q`, relaunch. Still signed in. Encrypted blob lives at `~/Library/Application Support/Tiao/tiao-desktop-auth.enc`.                                                     |
| **Persistence warning toast** | On Linux without libsecret, or in a sandbox without keychain access, the renderer should show a warning toast on startup (`common.desktopPersistenceWarning`).                       |
| **Auto-updater**              | Off by default in dev (gated by `app.isPackaged && TIAO_ENABLE_UPDATER=1`). Real round-trip needs a signed macOS build.                                                              |

Useful DevTools console prods while debugging:

```js
// Confirm the bridge is exposed
window.electron;
// → { isElectron: true, platform: 'darwin', version: 'dev', auth: {...}, analytics: {...} }

// Force a fresh OAuth flow
await window.electron.auth.startOAuth("github");

// Check the current cached token
await window.electron.auth.getToken();

// Check whether OS encryption is available (false means "will re-sign-in on restart")
await window.electron.auth.getPersistenceStatus();

// Wipe persisted auth state
await window.electron.auth.logout();
```

## Building a real installer

### Local unsigned build (macOS)

```bash
cd desktop
npm run dev:build-client     # ensure client-bundle/ is fresh
npm run package              # → desktop/dist/Tiao-0.1.0.dmg (universal binary)
open dist/Tiao-0.1.0.dmg
# Finder mounts it. Drag Tiao.app → Applications. Eject.
```

First launch triggers **"Tiao is damaged and can't be opened"** from Gatekeeper
because the build is unsigned. Three workarounds for local testing:

```bash
# 1. Right-click the .app in Finder → Open. macOS asks once, then remembers.

# 2. Strip the quarantine xattr (silent, good for distributing to testers)
xattr -d com.apple.quarantine /Applications/Tiao.app

# 3. Run directly from the dist/ folder, bypassing "install" entirely
open desktop/dist/mac-universal/Tiao.app
```

`build.mac.hardenedRuntime` and `build.mac.gatekeeperAssess` are intentionally
`false` in `package.json` — they **must be flipped to `true`** when code signing
lands, otherwise Apple's notary service will reject every build. Pointers in
`scripts/release.sh` and `.github/workflows/desktop-release.yml`.

### All platforms

```bash
npm run package:all          # mac dmg + win nsis + win portable + linux AppImage
```

macOS builds **must be produced on a Mac**. Linux and Windows can be cross-built
from any host. The CI workflow (`.github/workflows/desktop-release.yml`) runs
each platform on its native runner on `workflow_dispatch` or `push: desktop-v*`
tag.

### Release env vars

`scripts/release.sh` sources `desktop/.env.release` (git-ignored). Fields:

| Variable                      | Purpose                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `TIAO_DESKTOP_VERSION`        | Baked into `TiaoDesktop/X (darwin)` UA for analytics                                                                  |
| `TIAO_API_URL`                | API base URL (read at **runtime**; default: `https://api.playtiao.com` for packaged, `http://localhost:5005` for dev) |
| `TIAO_OPENPANEL_CLIENT_ID`    | OpenPanel public client id for main-process events                                                                    |
| `TIAO_OPENPANEL_API_URL`      | OpenPanel ingest URL                                                                                                  |
| `APPLE_ID`                    | (signing follow-up) Developer Apple ID email                                                                          |
| `APPLE_APP_SPECIFIC_PASSWORD` | (signing follow-up) app-specific password                                                                             |
| `APPLE_TEAM_ID`               | (signing follow-up) Developer Team ID                                                                                 |

## Security posture

Hardened `webPreferences` on the BrowserWindow (explicit, not just relying on
defaults):

- `contextIsolation: true` — preload globals isolated from renderer globals
- `nodeIntegration: false` — no `require` in the renderer
- `sandbox: true` — OS-level renderer sandbox
- `webSecurity: true` — same-origin policy enforced
- `allowRunningInsecureContent: false` — blocks mixed content

Plus a Content-Security-Policy header installed via `session.webRequest` at
window creation time. The CSP allows `'unsafe-inline'` for scripts because the
Next.js static export emits inline hydration scripts, but blocks external script
origins, `<object>`, `<embed>`, and `<iframe>`. See `src/window.cjs` for the
full policy and the rationale.

The actual XSS → RCE barrier is the webPreferences combo; the CSP is
defense-in-depth on top.

## Common gotchas

Operational problems you hit while developing or shipping today.

- **"Tiao couldn't load its app files."** You forgot `npm run dev:build-client`.
  The `dev:ensure-bundle` preflight will auto-build if the bundle is missing,
  but a stale `client-bundle/` (e.g. from a branch switch) won't trigger it —
  run `npm run dev:build-client` explicitly after switching branches.
- **Main process changes don't take effect.** There's no hot reload for main.
  Kill the app and re-run `npm run dev`.
- **Renderer changes don't take effect.** Re-run `npm run dev:build-client` and
  `Cmd+R` in the Electron window. (Or use HMR mode — see above.)
- **OAuth silently hangs.** Deep-link delivery differs per OS — on macOS it's
  `open-url`, on Windows/Linux it's `second-instance`. If you're running an
  unsigned dev build, the OS protocol registration may be pointing at a stale
  Electron binary; check `src/deepLink.cjs` for the `defaultApp` branch.
- **Main process logs in DevTools.** They're not there — check your terminal.
- **Analytics never fires.** The OpenPanel client id is unset in dev
  (`TIAO_OPENPANEL_CLIENT_ID`), so `track()` short-circuits. Set it in
  `.env.release` to smoke-test.
- **Universal binary is huge.** Yes — one binary containing both arm64 and x64
  code is roughly the sum of the two. If you need a smaller download, change
  `build.mac.target.arch` back to `["arm64", "x64"]` for split builds.

## Future considerations

Things that aren't problems **today** but will bite the moment you touch a
nearby feature. Read this before Phase 3b work, before the first signed
release, and before adding any new native dependency.

### macOS code signing & notarization

The biggest looming piece of work. Phase 3a ships unsigned dmgs, which is
fine for internal testing but means:

- End users see "Tiao is damaged and can't be opened" on first launch
  (Gatekeeper quarantine) and have to right-click → Open.
- `electron-updater` **cannot** apply updates to an unsigned app. Even if
  the updater downloads a new version, `quitAndInstall` fails silently.
- The app can't be distributed via the Mac App Store.

What's needed:

1. **Apple Developer Program** membership ($99/year).
2. **Developer ID Application** certificate exported as a `.p12` file,
   referenced via `CSC_LINK` (base64 data URL or file path) and
   `CSC_KEY_PASSWORD` env vars.
3. **Notarization credentials**: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`
   (generated at appleid.apple.com, NOT your real password), `APPLE_TEAM_ID`.
   The secret hooks are already in `.github/workflows/desktop-release.yml`
   and `desktop/scripts/release.sh` — just populate them.
4. **Flip the hardened runtime flags** in `desktop/package.json`:

   ```json
   "mac": {
     "hardenedRuntime": true,
     "gatekeeperAssess": true
   }
   ```

   Apple's notary service **rejects** signed apps that don't have
   hardenedRuntime enabled. Leaving them false alongside signing creds
   will fail every build at the notarize step with a confusing error.

5. **Entitlements file** (`build/entitlements.mac.plist`) — at minimum:

   ```xml
   <key>com.apple.security.cs.allow-jit</key><true/>
   <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
   <key>com.apple.security.cs.disable-library-validation</key><true/>
   ```

   Required because Electron's V8 uses JIT. The unsigned-memory flag is
   specifically needed for `steamworks.js` and any other native module
   whose libraries weren't signed by Apple.

Budget at least **a full day** for the first signed build — the first
notarization round-trip almost always fails on something, and the error
messages are famously unhelpful.

### Auto-updater requires signed builds

Currently gated behind `TIAO_ENABLE_UPDATER=1` in `src/updater.cjs` for
exactly this reason. The gate flips off in the same commit that lands
macOS signing. Until then:

- CI can build unsigned dmgs and attach to GitHub Releases
- End users download and install manually
- No auto-update notifications, no "Restart to install" dialog

Windows and Linux auto-update are less finicky (Windows Squirrel handles
unsigned builds with SmartScreen warnings, Linux AppImages don't
auto-update natively at all — they need `AppImageUpdate` integration).

### Native modules and the Electron ABI

`steamworks.js` is the first native dependency in the desktop package.
Any future native dep (`better-sqlite3`, `sharp`, `serialport`, etc.)
will need the same two pieces of wiring:

1. **`asarUnpack`** in `build.asarUnpack` — native `.node` files can't
   be loaded from inside the `app.asar` archive. electron-builder extracts
   them to `app.asar.unpacked/` at package time so `require()` works.
2. **Electron ABI match** — `@npm install` gets the `*.node` compiled
   for your **system** Node version, but Electron ships a **different**
   Node internally. Symptom: "Module was compiled against a different
   Node.js version" on app start. Fix: `@electron/rebuild` or the
   per-platform prebuilds supplied by the package itself.

   `steamworks.js` ships prebuilds for each platform, so it "just
   works." Packages without prebuilds need explicit rebuild in
   postinstall.

If a native dep breaks the packaged build but works in dev, the problem
is almost always one of these two.

### macOS permissions (TCC)

Tiao doesn't use camera, microphone, contacts, calendar, or screen
recording **today**. The moment any of those are added:

- `Info.plist` needs a matching `NS<Feature>UsageDescription` string
  explaining why the app wants access. electron-builder lets you set
  these via `build.mac.extendInfo` in `package.json`.
- `build/entitlements.mac.plist` needs the matching
  `com.apple.security.device.<feature>` entitlement.
- Without both, the app either fails silently or gets **killed** by
  macOS with no user-facing error.

The combinations that specifically come up for a game:

| Feature                         | Info.plist key                      | Entitlement                                         |
| ------------------------------- | ----------------------------------- | --------------------------------------------------- |
| Microphone (voice chat)         | `NSMicrophoneUsageDescription`      | `com.apple.security.device.audio-input`             |
| Screen recording (replays)      | `NSScreenCaptureDescription`        | `com.apple.security.device.screen-capture`          |
| Full disk access (save exports) | `NSDocumentsFolderUsageDescription` | `com.apple.security.files.user-selected.read-write` |

### Window state restoration

Every launch creates a fresh 1280×800 window centered on screen — resize
and move state is lost on quit. The user-visible fix is to remember
position/size across launches:

```bash
npm install electron-window-state
```

Then in `src/window.cjs`, wrap the `new BrowserWindow({...})` call with
`windowStateKeeper({ defaultWidth: 1280, defaultHeight: 800 })`. Small
quality-of-life win, not critical, not a regression — just the kind of
polish users expect from a "real" desktop app.

### Tray icon template images

If Tiao ever grows a menu bar icon (for "game invite arrived", "friend
came online", background pending-move badge) — the asset must be a
**template image**:

- Filename: `iconTemplate.png` (the `Template` suffix is load-bearing —
  macOS looks for it)
- Content: black silhouette on transparent background
- Size: 16×16 pt (32×32 px for Retina)

macOS automatically inverts the colors in dark mode and renders the
icon white. Use a colored PNG and it looks wrong in one of the two
modes. No equivalent convention on Windows/Linux — they want real
colored icons.

### Spellcheck dictionaries

Electron's built-in spellcheck only enables `en-US` by default. For a
multi-locale app like Tiao (en/de/es), call
`session.setSpellCheckerLanguages([...])` on window creation when the
user's locale changes. Relevant once there's any user-editable text
(display name, bio, chat) in non-English locales — currently moot
because there's no chat and display name editing is English-only in
the web path too.

### Safari deep-link delivery on older macOS

The `tiao://` URL scheme works reliably on macOS 12+ via `open-url`.
On **macOS 10.15 and older**, Safari needs an explicit
`LSMinimumSystemVersion` in `Info.plist` to register custom schemes
at all, and the delivery can lag or drop silently. Either drop support
for 10.15 (Chromium already dropped it anyway — Electron 27+ requires
macOS 11) or test the deep-link path on those older versions
specifically.

### Single-window assumption in bootstrap

`bootstrap()` in `main.cjs` currently re-registers IPC handlers,
initializes analytics, and calls `loadPersistedToken()` every time
it's invoked. It's called once on `whenReady` and once from the
`activate` handler on macOS (when the dock icon is clicked with no
windows open). Today that's fine because both calls happen sequentially
and the handlers are idempotent, but adding a second BrowserWindow (a
settings window, a game-over modal, a tray-spawned quick-game window)
means auditing every `registerX()` call for idempotency, or splitting
bootstrap into "once per app" and "once per window" phases. Worth
knowing before Phase 3b.
