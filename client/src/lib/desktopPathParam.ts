/**
 * Runtime resolver for dynamic route parameters in the desktop build.
 *
 * The desktop Electron app ships a static export of the Next.js client
 * (see client/next.config.desktop.mjs).  Static export can only
 * pre-render dynamic routes whose params are known at build time, so
 * the three shareable routes — /game/[gameId], /profile/[username],
 * /tournament/[tournamentId] — use a placeholder `__spa__` param in
 * the desktop build.  That produces ONE HTML file per route which the
 * Electron `app://` protocol handler serves for any real param value:
 *
 *   app://tiao/en/game/ABC123  →  en/game/__spa__/index.html
 *
 * Inside that HTML, React's useParams() returns the bake-time
 * placeholder (`{ gameId: "__spa__" }`) not the real value.  This
 * helper reads the true value from window.location.pathname at
 * runtime and falls back to the bake-time value on the web.
 *
 * Web builds are untouched: on the web, useParams() returns the real
 * value (Next.js SSR renders the route on-demand) and this function
 * passes it through unchanged.
 */

const DESKTOP_SPA_PLACEHOLDER = "__spa__";

type ElectronWindow = {
  electron?: { isElectron?: boolean };
};

/**
 * Resolve a dynamic route segment by reading the current URL when
 * running inside Electron, or returning the bake-time value otherwise.
 *
 * @param prefixSegment  The path segment immediately before the
 *                       dynamic value.  For `/en/game/ABC123` → `"game"`.
 * @param bakeTimeValue  The value `useParams()` returned at call time.
 *                       Used verbatim on the web and during SSR.
 * @returns              The resolved parameter value, or `undefined`
 *                       if it couldn't be recovered.
 */
export function resolveDynamicParam(
  prefixSegment: string,
  bakeTimeValue: string | undefined,
): string | undefined {
  // SSR / Node environment — trust the bake-time value.
  if (typeof window === "undefined") return bakeTimeValue;

  const electron = (window as unknown as ElectronWindow).electron;
  if (!electron?.isElectron) {
    // Web runtime: useParams() already returned the real value.
    return bakeTimeValue;
  }

  // Desktop runtime: the bake-time value is the placeholder.  Parse
  // the URL to recover the true segment value.  Also fall through
  // when the value is NOT the placeholder — this lets the helper be
  // applied to routes that aren't placeholder-baked (defensive).
  if (bakeTimeValue && bakeTimeValue !== DESKTOP_SPA_PLACEHOLDER) {
    return bakeTimeValue;
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const prefixIdx = segments.indexOf(prefixSegment);
  if (prefixIdx < 0 || prefixIdx >= segments.length - 1) return undefined;
  const candidate = segments[prefixIdx + 1];
  // Guard against the placeholder leaking through if the URL somehow
  // matches `/game/__spa__/...` directly (shouldn't happen in practice).
  if (candidate === DESKTOP_SPA_PLACEHOLDER) return undefined;
  return candidate;
}

/** Exported for the three route page files' generateStaticParams. */
export const DESKTOP_SPA_PARAM_VALUE = DESKTOP_SPA_PLACEHOLDER;
