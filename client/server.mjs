/**
 * Custom Next.js dev/production server that proxies WebSocket upgrade
 * requests to the backend API server. This is needed because Next.js
 * rewrites only handle HTTP, not WebSocket upgrades.
 *
 * Usage:
 *   node server.mjs              (production: PORT, API_URL)
 *   node server.mjs              (dev: PORT, API_PORT, handled by dev.mjs)
 */

import { createServer, request as httpRequest } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const apiTarget =
  process.env.API_URL ||
  `http://127.0.0.1:${process.env.API_PORT || "5005"}`;
const apiUrl = new URL(apiTarget);

const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  handle(req, res, parse(req.url, true));
});

server.on("upgrade", (req, socket, head) => {
  const { pathname } = parse(req.url, true);
  if (
    pathname === "/api/ws" ||
    pathname === "/api/ws/lobby" ||
    pathname === "/ws" ||
    pathname?.startsWith("/api/ws/")
  ) {
    const proxyReq = httpRequest({
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      path: req.url,
      method: req.method,
      headers: req.headers,
    });

    proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
      // Build the raw 101 response to send to the client
      let rawHeader = `HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n`;
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          rawHeader += `${key}: ${v}\r\n`;
        }
      }
      rawHeader += "\r\n";
      socket.write(rawHeader);

      // Push any buffered data back so the pipes pick it up
      if (proxyHead && proxyHead.length) proxySocket.unshift(proxyHead);
      if (head && head.length) socket.unshift(head);

      // Transparent bidirectional pipe
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);

      proxySocket.on("error", () => socket.destroy());
      socket.on("error", () => proxySocket.destroy());
      proxySocket.on("close", () => socket.destroy());
      socket.on("close", () => proxySocket.destroy());
    });

    proxyReq.on("error", (err) => {
      console.warn(`[ws-proxy] ${err.code ?? err.message}`);
      socket.destroy();
    });

    proxyReq.end();
  }
});

server.listen(port, () => {
  console.log(`> Next.js ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
});
