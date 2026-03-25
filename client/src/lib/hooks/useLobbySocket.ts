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
        onGameUpdate();
        // If it just became my turn, show a toast
        if (payload.summary.status === "active" && payload.summary.yourSeat === payload.summary.currentTurn) {
          toast.info(`Your move in ${payload.summary.gameId}`, {
            description: `It's your turn against ${payload.summary.seats[payload.summary.yourSeat === "white" ? "black" : "white"]?.player.displayName || "your opponent"}.`,
            action: {
              label: "Join Game",
              onClick: () => window.location.assign(`/game/${payload.summary.gameId}`),
            },
          });
        }
      }

      if (payload.type === "social-update") {
        onSocialUpdate();
        
        // We could compare previous overview with new one to find EXACTLY what changed,
        // but for now let's just show a general notification for incoming requests/invites
        // if they are new. (This is slightly complex without storing state here).
        // Let's at least show a toast that social status updated.
        toast.success("Social update", {
          description: "Your friends list or game invitations have been updated.",
        });
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
  }, [auth, onGameUpdate, onSocialUpdate]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);
}
