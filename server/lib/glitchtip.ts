/**
 * GlitchTip (Sentry-compatible) error monitoring — server-side singleton.
 *
 * Env vars (see server/.env.example):
 *   GLITCHTIP_DSN   (required to enable)
 *
 * When DSN is unset the module exports no-op helpers. Safe for dev, CI, tests.
 */
import * as Sentry from "@sentry/node";

const dsn = process.env.GLITCHTIP_DSN;

export const glitchtipEnabled = Boolean(dsn);

if (glitchtipEnabled) {
  Sentry.init({
    dsn: dsn!,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.APP_VERSION ?? "unknown",
  });
}

/**
 * Capture an exception. No-op when DSN is unset.
 * Accepts optional extra context for the event scope.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!glitchtipEnabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

/**
 * Set the current user on the Sentry scope.
 */
export function setUser(user: { id: string; username?: string } | null): void {
  if (!glitchtipEnabled) return;
  Sentry.setUser(user);
}

/**
 * Flush pending events before process exit (graceful shutdown).
 */
export async function flush(timeoutMs = 2000): Promise<void> {
  if (!glitchtipEnabled) return;
  await Sentry.flush(timeoutMs);
}
