import crypto from "node:crypto";
import { TOKEN_SECRET } from "../config/envVars";

/**
 * Opaque bearer tokens for desktop Electron sessions.
 *
 * Web clients use better-auth cookies — they're set on the playtiao.com
 * origin by better-auth and read from Cookie headers.  Desktop Electron
 * loads the app from the `app://tiao/` origin, which has no domain
 * relationship to playtiao.com, so cookies don't transfer.  Instead, the
 * desktop app authenticates once via the OAuth bridge (see
 * `/api/auth/desktop/*`), receives a self-contained signed token, and
 * sends it as `Authorization: Bearer <token>` on every request.
 *
 * Tokens are verified purely from the signature — no database lookup is
 * required to check validity.  The embedded expiry bounds the lifetime,
 * and revocation works by rotating TOKEN_SECRET (which also invalidates
 * web sessions, so it's a nuclear option).  Fine-grained per-user
 * revocation can be added later via a Redis deny-list keyed by nonce.
 *
 * Format:  `v1.<base64url(payloadJson)>.<base64url(hmacSig)>`
 * Payload: `{ userId: string, expiresAt: number (unix ms), nonce: string }`
 */

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_DAYS = 30;

export type DesktopSessionPayload = {
  userId: string;
  expiresAt: number;
  nonce: string;
};

/**
 * Mint a new bearer token for the given userId.  Default TTL matches
 * the 30-day web session lifetime in better-auth config so desktop and
 * web users experience the same sign-in cadence.
 */
export function createSessionToken(userId: string, ttlDays: number = DEFAULT_TTL_DAYS): string {
  if (!userId || typeof userId !== "string") {
    throw new Error("createSessionToken: userId is required");
  }
  if (!Number.isFinite(ttlDays) || ttlDays <= 0) {
    throw new Error("createSessionToken: ttlDays must be a positive number");
  }

  const payload: DesktopSessionPayload = {
    userId,
    expiresAt: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
    // Random nonce makes every minted token unique even if the same
    // userId is signed twice in the same millisecond.  Useful when
    // desktop clients request a token refresh from the server.
    nonce: crypto.randomBytes(16).toString("base64url"),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sigB64 = signPayload(payloadB64);
  return `${TOKEN_VERSION}.${payloadB64}.${sigB64}`;
}

/**
 * Verify a bearer token and return the payload if valid, `null` otherwise.
 *
 * Rejects:
 * - falsy or non-string input
 * - wrong format (not three dot-delimited parts)
 * - wrong version (`v2`, etc. — future-proofing for rotation)
 * - signature mismatch (uses timingSafeEqual)
 * - unparseable JSON payload
 * - payload missing required fields
 * - expired payload (`expiresAt < Date.now()`)
 */
export function verifySessionToken(token: string | undefined | null): DesktopSessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, payloadB64, sigB64] = parts;
  if (version !== TOKEN_VERSION) return null;
  if (!payloadB64 || !sigB64) return null;

  const expectedSigB64 = signPayload(payloadB64);

  // Constant-time comparison to prevent signature-oracle side-channel
  // attacks.  Buffers must be the same length — bail out early if not.
  const actual = Buffer.from(sigB64);
  const expected = Buffer.from(expectedSigB64);
  if (actual.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(actual, expected)) return null;

  let payload: DesktopSessionPayload;
  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    payload = JSON.parse(json) as DesktopSessionPayload;
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload.userId !== "string" ||
    payload.userId.length === 0 ||
    typeof payload.expiresAt !== "number" ||
    !Number.isFinite(payload.expiresAt) ||
    typeof payload.nonce !== "string"
  ) {
    return null;
  }

  if (payload.expiresAt < Date.now()) return null;

  return payload;
}

/**
 * Extract and verify a bearer token from an `Authorization` header.
 * Returns the userId if the header contains a valid token, `null`
 * otherwise.  Accepts headers like `Bearer <token>` (case-sensitive —
 * matches the IETF RFC 6750 spec).
 */
export function extractBearerUserId(authHeader: string | string[] | undefined): string | null {
  if (!authHeader) return null;
  // Express normalizes to string but ws / http.IncomingMessage can
  // deliver string[] if the header is sent twice.  Take the first.
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  const payload = verifySessionToken(token);
  return payload?.userId ?? null;
}

function signPayload(payloadB64: string): string {
  return crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("base64url");
}
