import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import app from "./app";
import { PORT } from "./config/envVars";
import { connectToDB, disconnectFromDB } from "./db";
import { gameService, GameServiceError } from "./game/gameService";
import { getPlayerFromUpgradeRequest } from "./game/playerTokens";
import { ClientToServerMessage } from "../shared/src";

const server = createServer(app);
const websocketServer = new WebSocketServer({ server, path: "/ws" });

function sendJson(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

websocketServer.on("connection", (socket, request) => {
  void (async () => {
    const baseUrl = `http://${request.headers.host || "localhost"}`;
    const url = new URL(request.url || "/ws", baseUrl);
    const gameId = url.searchParams.get("gameId")?.trim().toUpperCase();

    if (!gameId) {
      sendJson(socket, {
        type: "error",
        code: "BAD_CONNECTION",
        message: "A gameId is required to connect.",
      });
      socket.close();
      return;
    }

    const player = await getPlayerFromUpgradeRequest(request);
    if (!player) {
      sendJson(socket, {
        type: "error",
        code: "UNAUTHORIZED",
        message: "That player session is missing or has expired.",
      });
      socket.close();
      return;
    }

    void gameService.connect(gameId, player, socket).catch((error) => {
      const serviceError =
        error instanceof GameServiceError
          ? error
          : new GameServiceError(
              500,
              "WS_CONNECT_FAILED",
              "Unable to connect to that multiplayer room."
            );

      sendJson(socket, {
        type: "error",
        code: serviceError.code,
        message: serviceError.message,
      });
      socket.close();
    });

    socket.on("message", (rawMessage) => {
      void (async () => {
        try {
          const message = JSON.parse(rawMessage.toString()) as ClientToServerMessage;
          await gameService.applyAction(gameId, player, message);
        } catch (error) {
          const serviceError =
            error instanceof GameServiceError
              ? error
              : new GameServiceError(
                  400,
                  "INVALID_MESSAGE",
                  "That move update could not be processed."
                );

          sendJson(socket, {
            type: "error",
            code: serviceError.code,
            message: serviceError.message,
          });
        }
      })();
    });

    socket.on("close", () => {
      void gameService.disconnect(socket);
    });

    socket.on("error", () => {
      void gameService.disconnect(socket);
    });
  })().catch(() => {
    sendJson(socket, {
      type: "error",
      code: "UNAUTHORIZED",
      message: "Unable to validate that player session right now.",
    });
    socket.close();
  });
});

const pruneHandle = setInterval(() => {
  gameService.pruneInactiveRooms(1000 * 60 * 60 * 24);
}, 1000 * 60 * 30);

pruneHandle.unref();

let isShuttingDown = false;

function closeHttpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        if ("code" in error && error.code === "ERR_SERVER_NOT_RUNNING") {
          resolve();
          return;
        }

        reject(error);
        return;
      }

      resolve();
    });
  });
}

function closeWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    websocketServer.close(() => resolve());
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.info(`${signal} received. Closing multiplayer server.`);

  clearInterval(pruneHandle);

  for (const client of websocketServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1001, "Server shutting down");
    }
  }

  const forceExitTimer = setTimeout(() => {
    process.exit(1);
  }, 1000 * 10);
  forceExitTimer.unref();

  try {
    await closeWebSocketServer();
    await closeHttpServer();
    await disconnectFromDB();
    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    console.error("Error while shutting down cleanly:", error);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

async function start(): Promise<void> {
  try {
    await connectToDB();

    server.listen(PORT, () => {
      console.info(`Tiao server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Tiao server:", error);
    process.exit(1);
  }
}

void start();
