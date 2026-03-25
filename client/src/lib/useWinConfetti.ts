import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { PlayerColor } from "@shared";

type WinConfettiOptions = {
  /** The player viewing the result. When null (local mode), confetti always plays. */
  viewerColor?: PlayerColor | null;
};

export function useWinConfetti(
  winner: PlayerColor | null,
  options: WinConfettiOptions = {},
) {
  const { viewerColor = null } = options;
  const lastWinnerRef = useRef<PlayerColor | null>(null);

  useEffect(() => {
    if (!winner) {
      lastWinnerRef.current = null;
      return;
    }

    if (lastWinnerRef.current === winner) {
      return;
    }

    lastWinnerRef.current = winner;

    const isLoser = viewerColor !== null && winner !== viewerColor;

    if (isLoser) {
      playDefeatParticles();
    } else {
      playVictoryConfetti(winner);
    }
  }, [winner, viewerColor]);
}

function playVictoryConfetti(winner: PlayerColor) {
  const duration = 1400;
  const endTime = Date.now() + duration;
  const colors =
    winner === "black"
      ? ["#1a1410", "#5f554d", "#e0c28a", "#f7ecda"]
      : ["#f7f3ea", "#d7cab8", "#e0c28a", "#7f6445"];

  const frame = () => {
    confetti({
      particleCount: 5,
      startVelocity: 20,
      spread: 70,
      origin: {
        x: 0.15 + Math.random() * 0.7,
        y: 0.18 + Math.random() * 0.08,
      },
      colors,
      scalar: 0.95,
    });

    if (Date.now() < endTime) {
      window.requestAnimationFrame(frame);
    }
  };

  frame();
}

function playDefeatParticles() {
  const duration = 1800;
  const endTime = Date.now() + duration;
  const colors = ["#8b7355", "#a69278", "#c4b49a", "#d6cbb8"];

  const frame = () => {
    confetti({
      particleCount: 2,
      startVelocity: 8,
      spread: 160,
      gravity: 0.35,
      drift: 0.6 + Math.random() * 0.8,
      origin: { x: Math.random(), y: -0.05 },
      colors,
      scalar: 1.2,
      shapes: ["circle"],
      ticks: 300,
    });

    if (Date.now() < endTime) {
      window.requestAnimationFrame(frame);
    }
  };

  frame();
}
