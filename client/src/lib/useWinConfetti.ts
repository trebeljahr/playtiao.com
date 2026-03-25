import { useEffect, useRef, useState, createElement } from "react";
import confetti from "canvas-confetti";
import type { PlayerColor } from "@shared";

type WinConfettiOptions = {
  /** The player viewing the result. When null (local mode), confetti always plays. */
  viewerColor?: PlayerColor | null;
};

const BANNER_DURATION_MS = 2200;

export function useWinConfetti(
  winner: PlayerColor | null,
  options: WinConfettiOptions = {},
) {
  const { viewerColor = null } = options;
  const lastWinnerRef = useRef<PlayerColor | null>(null);
  const [bannerText, setBannerText] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);

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
      setBannerText("You lost");
    } else {
      playVictoryConfetti();
      setBannerText(viewerColor !== null ? "You won!" : `${winner === "white" ? "White" : "Black"} wins!`);
    }
    setBannerVisible(true);

    const timer = setTimeout(() => {
      setBannerVisible(false);
    }, BANNER_DURATION_MS);

    return () => clearTimeout(timer);
  }, [winner, viewerColor]);

  const resultBanner =
    bannerText !== null
      ? createElement(
          "div",
          {
            key: "win-banner",
            className: `pointer-events-none fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${bannerVisible ? "opacity-100" : "opacity-0"}`,
            onTransitionEnd: () => {
              if (!bannerVisible) setBannerText(null);
            },
          },
          createElement(
            "div",
            {
              className:
                "rounded-3xl border border-[#d0bb94]/60 bg-[linear-gradient(180deg,rgba(255,250,242,0.97),rgba(244,231,207,0.95))] px-12 py-6 shadow-[0_24px_48px_-16px_rgba(37,23,13,0.35)]",
            },
            createElement(
              "p",
              { className: "font-display text-5xl tracking-tight text-[#2b1e14]" },
              bannerText,
            ),
          ),
        )
      : null;

  return { resultBanner };
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
