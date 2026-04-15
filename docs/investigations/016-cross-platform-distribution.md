# Investigation: Cross-Platform Distribution (Desktop + Mobile)

**Status:** Decided
**Date:** 2026-04-06

## Context

Tiao is a Next.js 14 web app with an Express/WebSocket backend. The goal is to distribute it as:

1. **Steam desktop app** (Windows, macOS, Linux) with Steamworks integration
2. **Mobile app** (iOS App Store, Android Google Play) as a standalone native app
3. **PWA** as an immediate low-effort improvement

The constraints: minimize code duplication, maintain feature parity across platforms, and preserve the quality/native feel on each platform. The app is already ~100% client-side rendered (`use client` on all views) with server features limited to i18n middleware and OG metadata.

## Options Considered

### Desktop: Electron vs Tauri

#### Electron

- Bundles Chromium — large installers (~100-150MB), higher memory (~200-300MB idle)
- Node.js main process — full access to native APIs, filesystem, etc.
- **Battle-tested Steam integration** via `steamworks.js` (Rust-based Node binding)
- Steam overlay works reliably
- Proven at scale: VS Code, Slack, Discord, Figma
- Massive ecosystem, decade of production use

#### Tauri

- Uses OS native webview — tiny bundles (~5-10MB), low memory (~30-40MB idle)
- Rust backend — fast, secure, smaller attack surface
- Tauri 2.0 supports desktop + iOS + Android from one codebase
- **Steam integration is immature** — `tauri-plugin-hal-steamworks` exists but Steam overlay has open issues (tauri-apps/tauri#6196)
- Mobile DX acknowledged by Tauri team as not yet on par with desktop
- System webview varies by OS version (risky on older Android)
- Rust knowledge required for anything beyond basic JS APIs

### Mobile: Capacitor vs React Native vs Flutter vs PWABuilder vs Cordova

#### Capacitor (static export)

- Wraps existing web code in a native WebView shell
- Requires `output: 'export'` in Next.js (static HTML/CSS/JS)
- Blockers for our app: i18n middleware, dynamic routes, generateMetadata with server fetch
- All blockers are solvable: middleware replaced by client-side locale detection, dynamic routes work client-side, metadata irrelevant in native apps
- Native API access via plugins (push notifications, haptics, camera, etc.)
- Active development — Capacitor 8 released December 2025
- Backward-compatible with most Cordova plugins

#### Capacitor (remote URL)

- Points WebView at `https://playtiao.com` — zero code changes
- Apple will reject under Guideline 4.2 ("repackaged website")
- Requires network connectivity, slow startup
- Not viable for App Store distribution

#### React Native

- Renders actual native UI components, not a WebView
- **Requires near-complete UI rewrite** — Tailwind, Framer Motion, Next.js routing don't transfer
- Different styling system (StyleSheet vs CSS), different navigation (React Navigation vs file-based)
- Two frontends to maintain with feature parity — major ongoing cost
- Only justified if the app demands native 60fps interactions a WebView can't deliver

#### Flutter

- Complete rewrite in Dart — nothing from React/TypeScript transfers
- One codebase for all platforms, but Flutter web performance is mediocre
- No straightforward Steam integration
- Only makes sense starting from scratch

#### PWABuilder

- Microsoft tool that packages PWAs for app stores
- Android: Uses Trusted Web Activity (TWA), works well, requires Lighthouse score >= 80
- iOS: Generates WebView wrapper, routinely rejected under Apple Guideline 4.2
- Windows/Microsoft Store: first-class support
- No native API access, no Steam integration
- Quick shortcut for Android Play Store presence

#### Apache Cordova

- Predecessor to Capacitor, same concept (web in native WebView)
- Legacy ecosystem, stagnating plugin support
- Capacitor is its direct successor by the same team (Ionic), strictly better
- No reason to start a new project with Cordova in 2026

### PWA (completing what exists)

- Manifest already in place, just needs service worker + install prompt
- Free "Add to Home Screen" on Android, installable on desktop browsers
- Push notifications on iOS since 16.4 (but only when added to home screen, no rich media)
- No App Store presence, limited native API access
- Complementary to native apps, not a replacement
- ~1-2 days of work

## Decision

Three-phase approach, in order:

### Phase 1: Complete PWA

Add service worker (Serwist or Workbox), register in the app, add install prompt. Gives immediate mobile improvement with minimal effort.

### Phase 2: Capacitor for iOS + Android (static export approach)

Create a `next.config.mobile.mjs` with `output: 'export'` that strips server-only features:

- Replace i18n middleware with client-side locale detection (middleware is irrelevant inside a native app)
- Skip `generateMetadata` server fetches (OG tags irrelevant in native apps)
- Switch `next-intl` to client-only mode
- Dynamic routes work fine client-side since all page components are `use client`

Add native features to satisfy Apple Guideline 4.2: push notifications, haptic feedback, native share sheet.

### Phase 3: Electron for Steam (Windows, macOS, Linux)

Wrap the frontend in Electron. Integrate Steamworks via `steamworks.js` for achievements, overlay, friends, matchmaking. Build for all three platforms via `electron-builder`. Optionally ship a standalone (non-Steam) desktop version for itch.io or direct download.

## Auth Considerations

The app uses `better-auth` with cookie-based sessions. This creates platform-specific challenges:

- **Electron:** Cookies work normally (full Chromium). Minimal auth changes needed.
- **Capacitor:** WebViews don't share cookies with the system browser. Solutions:
  1. Token-based auth bridge: expose `/auth/session-token` endpoint returning a short-lived JWT, use it to establish session in WebView
  2. Use In-App Browser for OAuth (shares cookies with Capacitor WebView)
  3. Configure Capacitor hostname as subdomain of `playtiao.com` with `androidScheme: "https"`
- **WebSocket reconnection:** Mobile OSes aggressively suspend background apps. Need reconnection logic with exponential backoff and state reconciliation on reconnect.

## Consequences

- ~95% code reuse across all platforms (shared web codebase)
- Two build configurations to maintain (web vs mobile static export)
- Auth bridge adds ~1 endpoint and client-side token handling
- Electron + Steamworks is ~500-1000 lines of platform-specific code
- App updates: web deploys instantly, mobile needs app store release or OTA (Capgo/Live Update), Steam auto-updates
- Must test responsive design at all viewport sizes (375px mobile through Steam Big Picture)
