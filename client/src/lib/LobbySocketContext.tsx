import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import type { AuthResponse, LobbyClientMessage } from "@shared";
import { buildWebSocketUrl } from "./api";
import { createReconnectScheduler } from "./reconnect";

// The server sends a zoo of loosely-typed messages on this channel
// (game-update, social-update, achievement-*, tournament-*,
// player-identity-update, matchmaking:*). Consumers narrow by `type` at runtime
// rather than sharing a discriminated union — see `LobbyServerMessage` in
// shared/src/protocol.ts for the subset that is formally typed.
type LobbyMessageHandler = (payload: Record<string, unknown>) => void;

type LobbySocketContextValue = {
  subscribe: (handler: LobbyMessageHandler) => () => void;
  sendMessage: (message: LobbyClientMessage) => void;
};

const LobbySocketContext = createContext<LobbySocketContextValue>({
  subscribe: () => () => {},
  sendMessage: () => {},
});

export function useLobbyMessage(handler: LobbyMessageHandler) {
  const { subscribe } = useContext(LobbySocketContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return subscribe((payload) => handlerRef.current(payload));
  }, [subscribe]);
}

export function useLobbySocket() {
  return useContext(LobbySocketContext);
}

export function LobbySocketProvider({
  auth,
  children,
}: {
  auth: AuthResponse | null;
  children: React.ReactNode;
}) {
  const subscribersRef = useRef<Set<LobbyMessageHandler>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  // Queue of outbound messages sent while the socket is closed/reconnecting.
  // Flushed on the next `open` event so a matchmaking page that mounts during
  // a reconnect doesn't silently drop its `matchmaking:enter`.
  const pendingRef = useRef<LobbyClientMessage[]>([]);

  const subscribe = useCallback((handler: LobbyMessageHandler) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  const sendMessage = useCallback((message: LobbyClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      pendingRef.current.push(message);
    }
  }, []);

  useEffect(() => {
    // Lobby socket now supports both accounts and guests: matchmaking relies on
    // socket lifetime for queue cleanup, so guests need a channel too.
    if (!auth) return;

    const reconnect = createReconnectScheduler(connect, {
      baseDelayMs: 1500,
      maxDelayMs: 10000,
    });

    function connect() {
      const url = new URL(buildWebSocketUrl("lobby"));
      url.pathname = "/api/ws/lobby";
      url.searchParams.delete("gameId");

      const socket = new WebSocket(url.toString());
      socketRef.current = socket;

      socket.onopen = () => {
        reconnect.reset();
        // Flush any messages that were enqueued while the socket was down.
        const pending = pendingRef.current;
        pendingRef.current = [];
        for (const message of pending) {
          socket.send(JSON.stringify(message));
        }
      };

      socket.onmessage = (event) => {
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        for (const handler of subscribersRef.current) {
          handler(payload);
        }
      };

      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        reconnect.schedule();
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      reconnect.clear();
      socketRef.current?.close();
      socketRef.current = null;
      pendingRef.current = [];
    };
  }, [auth]);

  return (
    <LobbySocketContext.Provider value={{ subscribe, sendMessage }}>
      {children}
    </LobbySocketContext.Provider>
  );
}
