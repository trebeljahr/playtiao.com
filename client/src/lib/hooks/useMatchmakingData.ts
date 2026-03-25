import { useState, useCallback } from "react";
import { AuthResponse, MatchmakingState, MultiplayerSnapshot } from "@shared";
import { enterMatchmaking, leaveMatchmaking } from "../api";
import { toastError } from "../errors";

export function useMatchmakingData(
  auth: AuthResponse | null,
  onMatched: (snapshot: MultiplayerSnapshot) => void,
) {
  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({
    status: "idle",
  });
  const [matchmakingBusy, setMatchmakingBusy] = useState(false);

  const stopMatchmaking = useCallback(
    async (options: { silent?: boolean } = {}) => {
      try {
        await leaveMatchmaking();
        setMatchmaking({ status: "idle" });
      } catch (error) {
        if (!options.silent) {
          toastError(error);
        }
      }
    },
    [],
  );

  const handleEnterMatchmaking = useCallback(async () => {
    if (!auth) {
      return;
    }

    setMatchmakingBusy(true);

    try {
      const response = await enterMatchmaking();
      setMatchmaking(response.matchmaking);

      if (response.matchmaking.status === "matched") {
        onMatched(response.matchmaking.snapshot);
        await stopMatchmaking({ silent: true });
      }
    } catch (error) {
      toastError(error);
    } finally {
      setMatchmakingBusy(false);
    }
  }, [auth, onMatched, stopMatchmaking]);

  const handleCancelMatchmaking = useCallback(async () => {
    setMatchmakingBusy(true);
    try {
      await stopMatchmaking({ silent: false });
    } finally {
      setMatchmakingBusy(false);
    }
  }, [stopMatchmaking]);

  return {
    matchmaking,
    setMatchmaking,
    matchmakingBusy,
    handleEnterMatchmaking,
    handleCancelMatchmaking,
    stopMatchmaking,
  };
}
