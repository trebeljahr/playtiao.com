/**
 * Tiny try/catch wrapper around `localStorage` so the app doesn't crash
 * in environments where it's unavailable or restricted:
 *
 * - Server-side rendering: `localStorage` is `undefined` entirely.
 * - Safari private browsing (legacy): throws `QuotaExceededError` on
 *   setItem. Modern Safari private mode returns a working stub but
 *   older iOS versions still throw.
 * - Strict cookie / privacy modes in Firefox or Brave can throw
 *   `SecurityError` when any localStorage method is called.
 * - Storage quota exceeded (rare but real for large serialized state).
 *
 * Before this helper, bare `localStorage.getItem(...)` calls in hooks
 * like `useBoardTheme`, `useSoundPreference`, etc. would throw at
 * first render in those environments and take out the whole subtree.
 * Each site used to need its own try/catch; this centralizes it and
 * returns sensible fallbacks.
 */

type Primitive = string | number | boolean | null;

function isAvailable(): boolean {
  try {
    // Not just a typeof check — some browsers expose the `localStorage`
    // property but throw on any actual access. The only reliable test
    // is to try a no-op read.
    if (typeof window === "undefined") return false;
    const key = "__tiao_ls_probe__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

let cachedAvailability: boolean | null = null;

function available(): boolean {
  if (cachedAvailability === null) {
    cachedAvailability = isAvailable();
  }
  return cachedAvailability;
}

export const safeLocalStorage = {
  /**
   * Read a string value from localStorage. Returns the fallback if
   * localStorage is unavailable, the key is absent, or the read throws.
   */
  getItem(key: string, fallback: string | null = null): string | null {
    if (!available()) return fallback;
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Write a string value to localStorage. Returns true on success,
   * false if storage is unavailable or the write failed (quota, etc.).
   * Callers that care about persistence failure should check the
   * return value; callers that don't care (most of them) can ignore it.
   */
  setItem(key: string, value: string): boolean {
    if (!available()) return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Remove a key from localStorage. Silent no-op if storage is
   * unavailable or removal throws.
   */
  removeItem(key: string): void {
    if (!available()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* swallow — removal failures are non-recoverable */
    }
  },

  /**
   * Parse a JSON value from localStorage. Returns the fallback if the
   * key is absent, storage is unavailable, or the stored value is not
   * valid JSON. Useful for values that were stored via setJson below.
   */
  getJson<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  /**
   * Serialize and write a JSON value. Returns true on success.
   * Fails gracefully on circular refs or non-serializable values.
   */
  setJson(key: string, value: unknown): boolean {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      return false;
    }
    return this.setItem(key, serialized);
  },
};

// Re-export the primitive helper so tests can poke at availability cache
export function __resetSafeLocalStorageCacheForTests(): void {
  cachedAvailability = null;
}

// Suppress "unused export" lint for the type helper if caller uses it
export type { Primitive };
