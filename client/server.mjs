/**
 * Minimal custom Next.js server — only needed because Next.js doesn't
 * read the PORT env var natively. WebSocket connections go directly to
 * the backend; Next.js rewrites handle HTTP API proxying.
 *
 * Usage:
 *   node server.mjs              (production: PORT)
 *   node server.mjs              (dev: PORT, handled by dev.mjs)
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

createServer((req, res) => {
  handle(req, res, parse(req.url, true));
}).listen(port, () => {
  console.log(
    `> Next.js ready on http://localhost:${port} (${dev ? "dev" : "production"})`,
  );
});
