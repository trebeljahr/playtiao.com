import { useCallback, useEffect, useState } from "react";
import type { MyNextMatchResult } from "@shared";
import { getMyNextTournamentMatch } from "@/lib/api";
import { useLobbyMessage } from "@/lib/LobbySocketContext";

/**
 * Fetches the server's decision about what this player should do next in
 * the given tournament. The returned `result` powers the post-game CTA
 * (next match / view results / spectate while waiting) in
 * MultiplayerGamePage.
 *
 * Refreshes automatically on `tournament-update` and
 * `tournament-match-ready` messages so the client reacts the instant the
 * bracket moves forward — without relying on the 10-second post-game
 * redirect timer for correctness.
 */
export function useTournamentNextMatch(tournamentId: string | null) {
  const [result, setResult] = useState<MyNextMatchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!tournamentId) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const { result } = await getMyNextTournamentMatch(tournamentId);
      setResult(result);
    } catch {
      // Silent — the caller falls back to "back to tournament" if this fails.
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLobbyMessage(
    useCallback(
      (payload) => {
        if (!tournamentId) return;
        if (
          (payload.type === "tournament-update" ||
            payload.type === "tournament-match-ready" ||
            payload.type === "tournament-round-complete") &&
          payload.tournamentId === tournamentId
        ) {
          void refresh();
        }
      },
      [tournamentId, refresh],
    ),
  );

  return { result, loading, refresh };
}
