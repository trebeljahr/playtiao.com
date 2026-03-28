import { useState, useEffect, useCallback, useRef } from "react";
import type { TimeControl, PlayerColor } from "@shared";

export type LocalClockState = {
  white: number;
  black: number;
  running: boolean;
  timedOut: PlayerColor | null;
};

/**
 * Client-side chess clock for local (over-the-board) timed games.
 * Tracks remaining time per side, switches on turn change, applies
 * increment after moves, and detects timeout.
 */
export function useLocalClock(
  timeControl: TimeControl,
  currentTurn: PlayerColor,
  gameOver: boolean,
  historyLength: number,
) {
  const [clock, setClock] = useState<LocalClockState>(() => ({
    white: timeControl?.initialMs ?? 0,
    black: timeControl?.initialMs ?? 0,
    running: false,
    timedOut: null,
  }));

  const lastTurnRef = useRef(currentTurn);
  const lastHistoryLenRef = useRef(historyLength);
  const lastTickRef = useRef(Date.now());

  // Reset clock when timeControl changes (new game)
  useEffect(() => {
    setClock({
      white: timeControl?.initialMs ?? 0,
      black: timeControl?.initialMs ?? 0,
      running: false,
      timedOut: null,
    });
    lastTurnRef.current = currentTurn;
    lastHistoryLenRef.current = historyLength;
    lastTickRef.current = Date.now();
  }, [timeControl?.initialMs, timeControl?.incrementMs]);

  // Detect turn change (a move was made) → apply increment to the player who just moved
  useEffect(() => {
    if (!timeControl || gameOver || clock.timedOut) return;

    if (historyLength > lastHistoryLenRef.current && currentTurn !== lastTurnRef.current) {
      const movedColor = lastTurnRef.current;
      setClock((prev) => ({
        ...prev,
        running: true,
        [movedColor]: prev[movedColor] + (timeControl.incrementMs ?? 0),
      }));
      lastTickRef.current = Date.now();
    }

    lastTurnRef.current = currentTurn;
    lastHistoryLenRef.current = historyLength;
  }, [currentTurn, historyLength, timeControl, gameOver, clock.timedOut]);

  // Start the clock after the first move
  useEffect(() => {
    if (!timeControl || gameOver || clock.timedOut) return;
    if (historyLength > 0 && !clock.running) {
      setClock((prev) => ({ ...prev, running: true }));
      lastTickRef.current = Date.now();
    }
  }, [historyLength, timeControl, gameOver, clock.timedOut, clock.running]);

  // Tick the clock every 100ms
  useEffect(() => {
    if (!timeControl || !clock.running || gameOver || clock.timedOut) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      setClock((prev) => {
        const newTime = Math.max(0, prev[currentTurn] - elapsed);
        const timedOut = newTime <= 0 ? currentTurn : null;
        return {
          ...prev,
          [currentTurn]: newTime,
          timedOut: timedOut ?? prev.timedOut,
          running: timedOut ? false : prev.running,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [timeControl, clock.running, clock.timedOut, currentTurn, gameOver]);

  // Stop clock when game is over
  useEffect(() => {
    if (gameOver) {
      setClock((prev) => ({ ...prev, running: false }));
    }
  }, [gameOver]);

  const reset = useCallback(() => {
    setClock({
      white: timeControl?.initialMs ?? 0,
      black: timeControl?.initialMs ?? 0,
      running: false,
      timedOut: null,
    });
    lastTickRef.current = Date.now();
  }, [timeControl]);

  return { clock, resetClock: reset };
}
