/**
 * GlitchTip (Sentry-compatible) error monitoring — client-side singleton.
 *
 * Env vars:
 *   NEXT_PUBLIC_GLITCHTIP_DSN   (required to enable; build-time only)
 *
 * When DSN is unset all exports are no-ops. Safe for dev and CI.
 */
import * as Sentry from "@sentry/browser";

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN;

export const glitchtipEnabled = Boolean(dsn);

if (typeof window !== "undefined" && glitchtipEnabled) {
  Sentry.init({
    dsn: dsn!,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!glitchtipEnabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export function setUser(user: { id: string; username?: string } | null): void {
  if (!glitchtipEnabled) return;
  Sentry.setUser(user);
}
