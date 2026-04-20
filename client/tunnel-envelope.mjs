/**
 * Helpers for the /_e GlitchTip/Sentry envelope tunnel in server.mjs.
 *
 * Kept in its own module so unit tests can import the builder without
 * pulling server.mjs's top-level `await app.prepare()`, which would
 * otherwise boot a full Next.js instance for every test file.
 */

/**
 * Parse a Sentry envelope body and build the forwarding URL for
 * GlitchTip ingestion. The Sentry browser SDK in `tunnel` mode puts
 * the DSN in the envelope header's `dsn` field and sends NO
 * `X-Sentry-Auth` header and NO `?sentry_key=` query param (see
 * @sentry/core/build/cjs/api.js:43 — `return tunnel ? tunnel : …`).
 * GlitchTip's /api/<projectId>/envelope/ endpoint refuses envelope-
 * header-only auth with `403 {"detail": "Denied"}`, so we synthesize
 * the classic auth query string from the parsed DSN here.
 *
 * Returns `{ targetPath }` on success or throws on malformed envelope.
 */
export function buildGlitchtipEnvelopeTarget(body) {
  const header = JSON.parse(body.toString().split("\n")[0]);
  const dsnUrl = new URL(header.dsn);
  const projectId = dsnUrl.pathname.replace(/^\//, "");
  const publicKey = dsnUrl.username;
  if (!projectId || !publicKey) {
    throw new Error("Envelope DSN is missing project ID or public key");
  }
  const query = `sentry_key=${encodeURIComponent(publicKey)}&sentry_version=7`;
  return { targetPath: `/api/${projectId}/envelope/?${query}` };
}
