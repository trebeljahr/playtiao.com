#!/usr/bin/env node
// Finds free ports for both client and server, then starts both via concurrently.
// Handles port collisions automatically so multiple worktrees can run simultaneously.

import { createServer } from "net";
import { execSync } from "child_process";

function findFreePort(preferred) {
  return new Promise((resolve) => {
    const server = createServer();
    // Listen without specifying a host (binds to ::) to match how the
    // Express server binds — avoids false positives from 127.0.0.1-only checks.
    server.listen(preferred, () => {
      server.close(() => resolve(preferred));
    });
    server.on("error", () => resolve(findFreePort(preferred + 1)));
  });
}

const preferredClient = parseInt(process.env.PORT || "3000", 10);
const clientPort = await findFreePort(preferredClient);
// Start searching for API port above the client port to avoid overlap
const apiPort = await findFreePort(clientPort === preferredClient ? 5005 : clientPort + 1);

console.log(`\n  Client: http://127.0.0.1:${clientPort}`);
console.log(`  Server: http://127.0.0.1:${apiPort}\n`);

try {
  execSync(
    `npx concurrently -k -n client,server -c yellow,cyan` +
    ` "PORT=${clientPort} API_PORT=${apiPort} npm --prefix client run dev"` +
    ` "PORT=${apiPort} npm --prefix server run dev"`,
    { stdio: "inherit" },
  );
} catch {
  process.exit(1);
}
