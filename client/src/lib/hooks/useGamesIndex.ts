import { useState, useCallback, useEffect, useRef } from "react";
import { AuthResponse, MultiplayerGamesIndex } from "@shared";
import { listMultiplayerGames } from "../api";
import { toastError } from "../errors";

export function useGamesIndex(auth: AuthResponse | null) {
  const [multiplayerGames, setMultiplayerGames] = useState<MultiplayerGamesIndex>({
    active: [],
    finished: [],
  });
  const [multiplayerGamesLoading, setMultiplayerGamesLoading] = useState(false);
  const [multiplayerGamesLoaded, setMultiplayerGamesLoaded] = useState(false);

  // Reset loaded state when the player identity changes (e.g. after logout)
  const prevPlayerIdRef = useRef(auth?.player.playerId ?? null);
  useEffect(() => {
    const currentPlayerId = auth?.player.playerId ?? null;
    if (currentPlayerId !== prevPlayerIdRef.current) {
      prevPlayerIdRef.current = currentPlayerId;
      setMultiplayerGames({ active: [], finished: [] });
      setMultiplayerGamesLoaded(false);
      setMultiplayerGamesLoading(false);
    }
  }, [auth?.player.playerId]);

  const applyMultiplayerGamesIndex = useCallback((nextGames: MultiplayerGamesIndex) => {
    setMultiplayerGames({
      active: nextGames?.active ?? [],
      finished: nextGames?.finished ?? [],
    });
    setMultiplayerGamesLoaded(true);
  }, []);

  const refreshMultiplayerGames = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!auth) {
        setMultiplayerGames({
          active: [],
          finished: [],
        });
        setMultiplayerGamesLoaded(false);
        setMultiplayerGamesLoading(false);
        return;
      }

      setMultiplayerGamesLoading(true);

      try {
        const response = await listMultiplayerGames();
        applyMultiplayerGamesIndex(response.games);
      } catch (error) {
        if (!options.silent) {
          toastError(error);
        }
      } finally {
        setMultiplayerGamesLoading(false);
      }
    },
    [auth, applyMultiplayerGamesIndex],
  );

  useEffect(() => {
    if (auth && !multiplayerGamesLoaded && !multiplayerGamesLoading) {
      void refreshMultiplayerGames();
    }
  }, [auth, multiplayerGamesLoaded, multiplayerGamesLoading, refreshMultiplayerGames]);

  return {
    multiplayerGames,
    multiplayerGamesLoading,
    multiplayerGamesLoaded,
    refreshMultiplayerGames,
  };
}
