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
      playVictoryConfetti();
    }
  }, [winner, viewerColor]);
}

function playVictoryConfetti() {
  const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd", "#01a3a4", "#f368e0", "#ff9f43", "#00d2d3"];

  confetti({
    particleCount: 120,
    startVelocity: 45,
    spread: 360,
    origin: { x: 0.5, y: 0.4 },
    colors,
    scalar: 1.2,
    gravity: 0.6,
    ticks: 200,
    shapes: ["circle", "square"],
  });
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
