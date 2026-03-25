import { useState, useEffect, useCallback, useRef } from "react";
import type { PlayerColor } from "@shared";
import { isGameOver, undoLastTurn } from "@shared";
import { useLocalGame } from "./useLocalGame";
import {
  COMPUTER_THINK_MS,
  randomComputerColor,
  requestComputerMove,
  applyComputerTurnPlan,
  type AIDifficulty,
} from "../computer-ai";

const AI_LINGER_MS = 600;

export function useComputerGame(difficulty: AIDifficulty = 3) {
  const local = useLocalGame();
  const [computerColor, setComputerColor] = useState<PlayerColor>(randomComputerColor);
  const [computerThinking, setComputerThinking] = useState(false);
  const [thinkProgress, setThinkProgress] = useState(0);

  // Track the game history length that triggered the current search.
  // This prevents re-triggering for the same position and handles strict mode:
  // cleanup doesn't need to reset computerThinking because the ref guards re-entry.
  const searchedForRef = useRef(-1);

  // Ref to cancel the current AI operation (search + timeouts)
  const cancelRef = useRef<(() => void) | null>(null);

  const needsMove =
    !isGameOver(local.localGame) &&
    local.localGame.currentTurn === computerColor;

  useEffect(() => {
    if (!needsMove) {
      searchedForRef.current = -1;
      return;
    }

    // Don't re-trigger if we already started a search for this game state
    const histLen = local.localGame.history.length;
    if (searchedForRef.current === histLen) return;
    searchedForRef.current = histLen;

    setComputerThinking(true);
    setThinkProgress(0);
    let cancelled = false;
    const startTime = Date.now();
    const gameAtRequest = local.localGame;

    const { promise, cancel: cancelWorker } = requestComputerMove(
      gameAtRequest,
      difficulty,
      (progress) => {
        if (!cancelled) setThinkProgress(progress);
      },
      computerColor,
    );

    const doCancel = () => {
      cancelled = true;
      cancelWorker();
      searchedForRef.current = -1;
      setComputerThinking(false);
      setThinkProgress(0);
    };

    cancelRef.current = doCancel;

    promise
      .then((plan) => {
        if (cancelled) return;
        if (!plan) {
          setComputerThinking(false);
          setThinkProgress(0);
          searchedForRef.current = -1;
          cancelRef.current = null;
          return;
        }

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, COMPUTER_THINK_MS - elapsed);

        setTimeout(() => {
          if (cancelled) return;

          const result = applyComputerTurnPlan(gameAtRequest, plan);
          if (result.ok) {
            local.setLocalGame(result.value);
            local.setLocalSelection(null);
            local.setLocalError(null);

            setTimeout(() => {
              if (cancelled) return;
              setComputerThinking(false);
              setThinkProgress(0);
              cancelRef.current = null;
            }, AI_LINGER_MS);
          } else {
            local.setLocalError(result.reason);
            setComputerThinking(false);
            setThinkProgress(0);
            cancelRef.current = null;
          }
        }, remaining);
      })
      .catch(() => {
        if (!cancelled) {
          setComputerThinking(false);
          setThinkProgress(0);
          searchedForRef.current = -1;
          cancelRef.current = null;
        }
      });

    return () => {
      doCancel();
      cancelRef.current = null;
    };
  }, [needsMove, local.localGame, difficulty, computerColor]);

  const handleBoardClick = useCallback(
    (position: any) => {
      if (computerThinking || local.localGame.currentTurn === computerColor) {
        return;
      }
      local.handleLocalBoardClick(position);
    },
    [
      computerThinking,
      computerColor,
      local.localGame.currentTurn,
      local.handleLocalBoardClick,
    ],
  );

  // Undo for AI games: cancel AI thinking if active, then undo moves
  // until it's the player's turn again.
  const handleUndoForAI = useCallback(() => {
    // 1. Cancel any in-flight AI operation
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }

    let state = local.localGame;

    // 2. If it's currently the computer's turn (AI was thinking but hadn't
    //    moved yet), we just need to undo the player's last move.
    //    If it's the player's turn, the AI already moved, so undo the AI's
    //    move first, then undo the player's move before it.
    if (state.currentTurn !== computerColor && state.history.length > 0) {
      // Undo the AI's last move first
      const undoAI = undoLastTurn(state);
      if (undoAI.ok) {
        state = undoAI.value;
      }
    }

    // 3. Now undo the player's last move
    if (state.history.length > 0) {
      const undoPlayer = undoLastTurn(state);
      if (undoPlayer.ok) {
        state = undoPlayer.value;
      }
    }

    local.setLocalGame(state);
    local.setLocalSelection(null);
    local.setLocalError(null);
  }, [local.localGame, computerColor, local.setLocalGame, local.setLocalSelection, local.setLocalError]);

  const resetComputerGame = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    setComputerColor(randomComputerColor());
    local.resetLocalGame();
  }, [local.resetLocalGame]);

  return {
    ...local,
    computerColor,
    computerThinking,
    thinkProgress,
    handleLocalBoardClick: handleBoardClick,
    handleLocalUndoTurn: handleUndoForAI,
    resetLocalGame: resetComputerGame,
    controlsDisabled:
      computerThinking || local.localGame.currentTurn === computerColor,
  };
}
