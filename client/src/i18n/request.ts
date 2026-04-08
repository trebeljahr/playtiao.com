import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

// Locate the messages directory relative to this file. Works in both dev
// (reading from source) and production (Next bundles the messages folder
// as part of the server output at the same relative path).
const MESSAGES_DIR = join(process.cwd(), "messages");

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // `fs.readFile` instead of `import(...)` so Turbopack doesn't module-cache
  // the JSON payload in dev. With dynamic `import()` the running dev server
  // serves a stale copy of the messages object forever after the first
  // request — new keys added to `messages/<locale>.json` cause
  // `MISSING_MESSAGE` errors in `LobbyPage` etc. until the server is
  // manually restarted. Reading the file on every request is cheap
  // (~1ms for a few hundred KB) and picks up edits immediately.
  const raw = await readFile(join(MESSAGES_DIR, `${locale}.json`), "utf-8");

  return {
    locale,
    messages: JSON.parse(raw),
  };
});
