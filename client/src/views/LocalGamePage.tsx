"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Navbar } from "@/components/Navbar";
import { TiaoBoard } from "@/components/game/TiaoBoard";
import { translatePlayerColor } from "@/components/game/GameShared";
import { GameConfigDialog } from "@/components/game/GameConfigDialog";
import { GameSidePanel } from "@/components/game/GameSidePanel";
import { useGameConfig } from "@/lib/hooks/useGameConfig";
import { useLocalGame } from "@/lib/hooks/useLocalGame";
import { useLocalClock } from "@/lib/hooks/useLocalClock";
import { useStonePlacementSound } from "@/lib/useStonePlacementSound";
import { useWinConfetti } from "@/lib/useWinConfetti";
import { useGameOverDialog } from "@/lib/hooks/useGameOverDialog";
import { isGameOver, getWinner } from "@shared";

export function LocalGamePage() {
  const { auth, onOpenAuth, onLogout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("game");
  const tCommon = useTranslations("common");
  const tLobby = useTranslations("lobby");
  const [navOpen, setNavOpen] = useState(false);

  // Unified game setup: the dialog is the one and only configuration UI.
  // Opens automatically on a plain /local visit (non-dismissable so the
  // user must submit), skipped when ?autostart=… is present in the URL.
  const config = useGameConfig("local");
  const [setupOpen, setSetupOpen] = useState(true);

  const gameSettings = { boardSize: config.boardSize, scoreToWin: config.scoreToWin };
  const local = useLocalGame(gameSettings);

  // Auto-start from query params (e.g. from lobby dialog or rematch links).
  // Hydrate the config hook from the URL so the setup dialog reflects these
  // values if the user later opens it via "New Game".
  const autoStartRef = useRef(false);
  useEffect(() => {
    if (autoStartRef.current) return;
    if (searchParams.has("autostart")) {
      autoStartRef.current = true;
      const bs = parseInt(searchParams.get("boardSize") || "19", 10);
      const stw = parseInt(searchParams.get("scoreToWin") || "10", 10);
      const tcInitial = searchParams.get("tcInitial");
      const tcIncrement = searchParams.get("tcIncrement");
      config.setValues({
        boardSize: bs,
        scoreToWin: stw,
        timeControl:
          tcInitial && tcIncrement
            ? { initialMs: Number(tcInitial), incrementMs: Number(tcIncrement) }
            : null,
      });
      local.resetLocalGame({ boardSize: bs, scoreToWin: stw });
      setSetupOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, local.resetLocalGame]);

  const gameOver = isGameOver(local.localGame);
  const winner = gameOver ? getWinner(local.localGame) : null;
  const isDraw = gameOver && !winner;

  // Clock
  const { clock, resetClock } = useLocalClock(
    config.timeControl,
    local.localGame.currentTurn,
    gameOver,
    local.localGame.history,
  );

  // Timeout triggers a win for the other side
  const timeoutWinner = clock.timedOut ? (clock.timedOut === "white" ? "black" : "white") : null;
  const effectiveWinner = winner ?? timeoutWinner;
  const effectiveGameOver = gameOver || !!timeoutWinner;

  useStonePlacementSound(local.localGame);
  useWinConfetti(effectiveWinner);

  const { open: gameOverDialogOpen, setOpen: setGameOverDialogOpen } =
    useGameOverDialog(effectiveGameOver);

  const localStatusTitle = isDraw
    ? t("draw")
    : timeoutWinner
      ? t("winsOnTime", { color: translatePlayerColor(timeoutWinner, t) as string })
      : winner
        ? t("wins", { color: translatePlayerColor(winner!, t) as string })
        : t("toMove", { color: translatePlayerColor(local.localGame.currentTurn, t) as string });

  const boardWrapStyle = {
    maxWidth: "min(100%, calc(100dvh - 5rem))",
    aspectRatio: "1/1",
  };

  function handleStartGame() {
    local.resetLocalGame({
      boardSize: config.boardSize,
      scoreToWin: config.scoreToWin,
    });
    resetClock();
    setSetupOpen(false);
  }

  function handleNewGame() {
    // Open the setup dialog so the player can adjust settings before
    // starting the next game. The live board stays visible behind the
    // dialog, which reduces the page's feeling of "jumping back to a
    // separate screen" between games.
    setSetupOpen(true);
  }

  function handleRematchSameSettings() {
    local.resetLocalGame({
      boardSize: config.boardSize,
      scoreToWin: config.scoreToWin,
    });
    resetClock();
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(255,247,231,0.76),transparent_58%)]" />

      <Navbar
        mode="lobby"
        auth={auth}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((v) => !v)}
        onCloseNav={() => setNavOpen(false)}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />

      <main className="mx-auto flex max-w-416 flex-col gap-5 px-4 pb-3 pt-16 sm:px-6 sm:pt-5 lg:px-6 lg:pb-4 xl:pt-2">
        <section className="grid gap-3 xl:min-h-[calc(100dvh-1rem)] xl:content-center xl:gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <div className="flex items-center justify-center xl:items-start xl:justify-end">
            <div className="isolate mx-auto w-full" style={boardWrapStyle}>
              <TiaoBoard
                state={local.localGame}
                selectedPiece={local.localSelection}
                jumpTargets={local.localJumpTargets}
                confirmReady={true}
                lastMove={local.lastMove}
                onPointClick={effectiveGameOver ? undefined : local.handleLocalBoardClick}
                onUndoLastJump={local.handleLocalUndoPendingJump}
                onConfirmJump={local.handleLocalConfirmPendingJump}
                disabled={effectiveGameOver}
              />
            </div>
          </div>

          <GameSidePanel
            gameState={local.localGame}
            scorePulse={local.localScorePulse}
            clock={config.timeControl ? clock : undefined}
            timeControl={config.timeControl}
            badge={tLobby("overTheBoard")}
            statusTitle={localStatusTitle}
            onUndo={local.handleLocalUndoTurn}
            undoDisabled={local.localGame.history.length === 0}
            gameOver={effectiveGameOver}
            gameOverActions={
              <>
                <Button variant="secondary" onClick={handleNewGame}>
                  {t("newGame")}
                </Button>
                <Button variant="ghost" onClick={() => router.push("/")}>
                  {tCommon("backToLobby")}
                </Button>
              </>
            }
          />
        </section>
      </main>

      <GameConfigDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        title={t("gameSetup")}
        config={config}
        submitLabel={t("startGame")}
        onSubmit={handleStartGame}
        closeable={false}
      />

      <Dialog
        open={gameOverDialogOpen}
        onOpenChange={setGameOverDialogOpen}
        title={
          isDraw
            ? t("draw")
            : timeoutWinner
              ? t("winsOnTime", { color: translatePlayerColor(timeoutWinner, t) as string })
              : t("wins", { color: translatePlayerColor(effectiveWinner!, t) as string })
        }
        description={isDraw ? t("drawNoMoves") : t("wonDesc")}
      >
        <div className="grid gap-2">
          <Button
            onClick={() => {
              setGameOverDialogOpen(false);
              handleNewGame();
            }}
          >
            {t("newGame")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setGameOverDialogOpen(false);
              handleRematchSameSettings();
            }}
          >
            {t("rematchSameSettings")}
          </Button>
          <Button variant="ghost" onClick={() => router.push("/")}>
            {tCommon("backToLobby")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
