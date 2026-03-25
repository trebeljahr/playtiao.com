import { useState, useEffect, useCallback } from "react";
import { isGameOver } from "@shared";
import { useLocalGame } from "./useLocalGame";
import {
  COMPUTER_COLOR,
  COMPUTER_THINK_MS,
  applyComputerTurn,
} from "../computer-ai";

export function useComputerGame() {
  const local = useLocalGame();
  const [computerThinking, setComputerThinking] = useState(false);

  useEffect(() => {
    if (
      !isGameOver(local.localGame) &&
      local.localGame.currentTurn === COMPUTER_COLOR &&
      !computerThinking
    ) {
      setComputerThinking(true);

      const timer = setTimeout(() => {
        const result = applyComputerTurn(local.localGame);
        if (result.ok) {
          local.setLocalGame(result.value);
          local.setLocalSelection(null);
          local.setLocalError(null);
        } else {
          local.setLocalError(result.reason);
        }
        setComputerThinking(false);
      }, COMPUTER_THINK_MS);

      return () => clearTimeout(timer);
    }
  }, [local.localGame, computerThinking]);

  const handleBoardClick = useCallback(
    (position: any) => {
      if (computerThinking || local.localGame.currentTurn === COMPUTER_COLOR) {
        return;
      }
      local.handleLocalBoardClick(position);
    },
    [computerThinking, local.localGame.currentTurn, local.handleLocalBoardClick],
  );

  return {
    ...local,
    computerThinking,
    handleLocalBoardClick: handleBoardClick,
    // Disable controls while computer thinks
    controlsDisabled:
      computerThinking || local.localGame.currentTurn === COMPUTER_COLOR,
  };
}
