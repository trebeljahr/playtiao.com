import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TimeControl } from "@shared";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Navbar } from "@/components/Navbar";
import { TiaoBoard } from "@/components/game/TiaoBoard";
import {
  GamePanelBrand,
  AnimatedScoreTile,
  formatPlayerColor,
} from "@/components/game/GameShared";
import { GameConfigPanel } from "@/components/game/GameConfigPanel";
import { useLocalGame } from "@/lib/hooks/useLocalGame";
import { useLocalClock } from "@/lib/hooks/useLocalClock";
import { useStonePlacementSound } from "@/lib/useStonePlacementSound";
import { useWinConfetti } from "@/lib/useWinConfetti";
import { isGameOver, getWinner } from "@shared";
import { formatClockTime } from "@/components/game/GameClock";
import { cn } from "@/lib/utils";

export function LocalGamePage() {
  const { auth, onOpenAuth, onLogout } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  // Config state
  const [configuring, setConfiguring] = useState(true);
  const [boardSize, setBoardSize] = useState(19);
  const [scoreToWin, setScoreToWin] = useState(10);
  const [timeControl, setTimeControl] = useState<TimeControl>(null);

  const gameSettings = { boardSize, scoreToWin };
  const local = useLocalGame(gameSettings);

  const gameOver = isGameOver(local.localGame);
  const winner = gameOver ? getWinner(local.localGame) : null;
  const isDraw = gameOver && !winner;

  // Clock
  const { clock, resetClock } = useLocalClock(
    timeControl,
    local.localGame.currentTurn,
    gameOver,
    local.localGame.history.length,
  );

  // Timeout triggers a win for the other side
  const timeoutWinner = clock.timedOut ? (clock.timedOut === "white" ? "black" : "white") : null;
  const effectiveWinner = winner ?? timeoutWinner;
  const effectiveGameOver = gameOver || !!timeoutWinner;

  useStonePlacementSound(local.localGame);
  useWinConfetti(effectiveWinner);

  const [gameOverDialogOpen, setGameOverDialogOpen] = useState(false);
  const prevGameOverRef = useRef(false);

  useEffect(() => {
    if (effectiveGameOver && !prevGameOverRef.current) {
      prevGameOverRef.current = true;
      const id = setTimeout(() => setGameOverDialogOpen(true), 600);
      return () => clearTimeout(id);
    }
    if (!effectiveGameOver) {
      prevGameOverRef.current = false;
      setGameOverDialogOpen(false);
    }
  }, [effectiveGameOver]);

  const localStatusTitle = isDraw
    ? "Draw!"
    : timeoutWinner
      ? `${formatPlayerColor(timeoutWinner)} wins on time!`
      : winner
        ? `${formatPlayerColor(winner)} wins!`
        : `${formatPlayerColor(local.localGame.currentTurn)} to move`;

  const paperCard =
    "border-[#d0bb94]/75 bg-[linear-gradient(180deg,rgba(255,250,242,0.96),rgba(244,231,207,0.94))]";

  const boardWrapStyle = {
    maxWidth: "min(100%, calc(100dvh - 5rem))",
    aspectRatio: "1/1",
  };

  function handleStartGame() {
    local.resetLocalGame();
    resetClock();
    setConfiguring(false);
  }

  function handleNewGame() {
    setConfiguring(true);
    local.resetLocalGame();
    resetClock();
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[18rem] bg-[radial-gradient(circle_at_top,_rgba(255,247,231,0.76),_transparent_58%)]" />

      <Navbar
        mode="local"
        auth={auth}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((v) => !v)}
        onCloseNav={() => setNavOpen(false)}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />

      <main className="mx-auto flex max-w-[104rem] flex-col gap-5 px-4 pb-3 pt-16 sm:px-6 sm:pt-5 lg:px-6 lg:pb-4 xl:pt-2">
        {configuring ? (
          <section className="flex items-center justify-center py-12">
            <Card className={cn(paperCard, "w-full max-w-md")}>
              <CardHeader>
                <GamePanelBrand />
                <CardTitle className="text-[#2b1e14]">
                  Game Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GameConfigPanel
                  mode="local"
                  boardSize={boardSize}
                  onBoardSizeChange={setBoardSize}
                  scoreToWin={scoreToWin}
                  onScoreToWinChange={setScoreToWin}
                  timeControl={timeControl}
                  onTimeControlChange={setTimeControl}
                  submitLabel="Start Game"
                  onSubmit={handleStartGame}
                />
              </CardContent>
            </Card>
          </section>
        ) : (
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

            <div className="mx-auto w-full max-w-[calc(100dvh-5rem)] space-y-4 xl:mx-0 xl:w-auto xl:min-w-[20rem] xl:max-w-[28rem]">
              <div className="mx-auto w-full xl:mx-0">
                <Card className={paperCard}>
                  <CardHeader>
                    <GamePanelBrand />
                    <Badge className="w-fit bg-[#f4e8d2] text-[#6c543c]">
                      Over the Board{timeControl ? ` — ${formatClockTime(timeControl.initialMs)}${timeControl.incrementMs ? `+${timeControl.incrementMs / 1000}` : ""}` : ""}
                    </Badge>
                    <CardTitle className="text-[#2b1e14]">
                      {localStatusTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 gap-4">
                      <AnimatedScoreTile
                        label="Black"
                        value={local.localGame.score.black}
                        pulseKey={local.localScorePulse.black}
                        className="rounded-3xl border border-black/10 bg-[linear-gradient(180deg,#39312b,#14100d)] p-5 text-[#f9f2e8] shadow-[0_18px_32px_-26px_rgba(0,0,0,0.9)]"
                        labelClassName="text-xs uppercase tracking-[0.24em] text-[#d9cec2]"
                        scoreToWin={local.localGame.scoreToWin}
                        clockMs={timeControl ? clock.black : undefined}
                        clockActive={timeControl !== null && clock.running && local.localGame.currentTurn === "black"}
                      />
                      <AnimatedScoreTile
                        label="White"
                        value={local.localGame.score.white}
                        pulseKey={local.localScorePulse.white}
                        className="rounded-3xl border border-[#d3c3ad] bg-[linear-gradient(180deg,#fffef8,#efe4d1)] p-5 text-[#2b1e14] shadow-[0_18px_32px_-26px_rgba(84,61,36,0.45)]"
                        labelClassName="text-xs uppercase tracking-[0.24em] text-[#847261]"
                        scoreToWin={local.localGame.scoreToWin}
                        clockMs={timeControl ? clock.white : undefined}
                        clockActive={timeControl !== null && clock.running && local.localGame.currentTurn === "white"}
                      />
                    </div>

                    {!effectiveGameOver && (
                      <div className="grid gap-2">
                        <Button
                          variant="secondary"
                          onClick={local.handleLocalUndoTurn}
                        >
                          Undo turn
                        </Button>
                      </div>
                    )}

                    {effectiveWinner && (
                      <div className="grid gap-2 border-t border-[#dbc6a2] pt-4">
                        <Button variant="secondary" onClick={handleNewGame}>
                          New game
                        </Button>
                        <Button variant="ghost" onClick={() => router.push("/")}>
                          Back to lobby
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}
      </main>

      <Dialog
        open={gameOverDialogOpen}
        onOpenChange={setGameOverDialogOpen}
        title={
          isDraw
            ? "Draw!"
            : timeoutWinner
              ? `${formatPlayerColor(timeoutWinner)} wins on time!`
              : `${formatPlayerColor(effectiveWinner!)} wins!`
        }
        description={isDraw ? "No moves remaining. Ready for another round?" : "Great game! Ready for another round?"}
      >
        <div className="grid gap-2">
          <Button onClick={() => { setGameOverDialogOpen(false); handleNewGame(); }}>
            New game
          </Button>
          <Button variant="secondary" onClick={() => { setGameOverDialogOpen(false); handleStartGame(); }}>
            Rematch (same settings)
          </Button>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Back to lobby
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
