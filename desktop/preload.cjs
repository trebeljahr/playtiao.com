// @ts-check
/**
 * Preload script — runs BEFORE any renderer code, with access to a
 * privileged subset of Node APIs.  The `contextBridge` pattern below
 * exposes a narrow, read-only surface on `window.electron` that the
 * renderer (the Next.js static bundle) can use without granting it
 * direct `require()` access.
 *
 * Commit 8 ships a minimal stub — only `isElectron` and `platform`
 * are exposed.  The `auth` and `deepLink` surfaces land in commit 9,
 * alongside the `tiao://` handler and safeStorage token persistence.
 *
 * Any changes here must stay in sync with the type assertions in
 * `client/src/lib/api.ts` and `client/src/lib/AuthContext.tsx` —
 * those cast `window.electron` to an inline shape, so missing
 * properties silently become `undefined` rather than triggering a
 * typecheck error.
 */

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  platform: process.platform,
  version: process.env.TIAO_DESKTOP_VERSION || "dev",
  // auth + deepLink land in commit 9.
});
