import { useEffect, useRef } from "react";
import type { GameState } from "@shared";
import { useSoundEnabled } from "./useSoundPreference";

function countPieces(state: GameState) {
  return state.positions.reduce(
    (total, row) => total + row.filter((cell) => cell !== null).length,
    0
  );
}

let cachedAudio: HTMLAudioElement | null = null;

function playMoveSound() {
  if (!cachedAudio) {
    cachedAudio = new Audio("/move.mp3");
  }
  cachedAudio.currentTime = 0;
  cachedAudio.play().catch(() => undefined);
}

export function useStonePlacementSound(state: GameState | null) {
  const previousPieceCount = useRef<number | null>(null);
  const soundEnabled = useSoundEnabled();

  useEffect(() => {
    if (!state) {
      previousPieceCount.current = null;
      return;
    }

    const nextPieceCount = countPieces(state);
    if (
      previousPieceCount.current !== null &&
      nextPieceCount > previousPieceCount.current &&
      soundEnabled
    ) {
      playMoveSound();
    }

    previousPieceCount.current = nextPieceCount;
  }, [state, soundEnabled]);
}
