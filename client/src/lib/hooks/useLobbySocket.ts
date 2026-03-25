import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { AuthResponse } from "@shared";
import { buildWebSocketUrl } from "../api";

export function useLobbySocket(
  auth: AuthResponse | null,
  onGameUpdate: () => void,
  onSocialUpdate: () => void,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Store callbacks in refs so the socket doesn't reconnect on every render.
  // Without this, inline arrow functions cause connect to get a new identity
  // each render → useEffect tears down and reopens the socket → brief overlap
  // where multiple sockets are alive → server broadcasts to all → duplicate toasts.
  const onGameUpdateRef = useRef(onGameUpdate);
  const onSocialUpdateRef = useRef(onSocialUpdate);
  onGameUpdateRef.current = onGameUpdate;
  onSocialUpdateRef.current = onSocialUpdate;

  const connect = useCallback(() => {
    if (!auth || auth.player.kind !== "account") return;

    const url = new URL(buildWebSocketUrl("lobby"));
    url.pathname = "/api/ws/lobby";
    url.searchParams.delete("gameId");

    const socket = new WebSocket(url.toString());
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as any;

      if (payload.type === "game-update") {
        onGameUpdateRef.current();
        // If it just became my turn, show a toast (deduplicated by game ID)
        if (payload.summary.status === "active" && payload.summary.yourSeat === payload.summary.currentTurn) {
          const opponentSeat = payload.summary.yourSeat === "white" ? "black" : "white";
          const opponentName = payload.summary.seats[opponentSeat]?.player.displayName || "your opponent";
          toast.info(`Your move in ${payload.summary.gameId}`, {
            id: `your-turn-${payload.summary.gameId}`,
            description: `It's your turn against ${opponentName}.`,
            action: {
              label: "Join Game",
              onClick: () => window.location.assign(`/game/${payload.summary.gameId}`),
            },
          });
        }
      }

      if (payload.type === "social-update") {
        onSocialUpdateRef.current();
      }
    };

    socket.onclose = () => {
      socketRef.current = null;
      if (auth && auth.player.kind === "account") {
        reconnectTimerRef.current = window.setTimeout(connect, 3000);
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [auth]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);
}
