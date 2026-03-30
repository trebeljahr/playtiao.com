"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RequireAccount } from "@/components/RequireAccount";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameConfigBadge } from "@/components/game/GameConfigBadge";
import { MatchHistoryCard } from "@/components/game/MatchHistoryCard";
import { Navbar } from "@/components/Navbar";
import {
  getSummaryStatusLabel,
  isSummaryYourTurn,
  translatePlayerColor,
} from "@/components/game/GameShared";
import { PlayerIdentityRow } from "@/components/PlayerIdentityRow";
import { useGamesIndex } from "@/lib/hooks/useGamesIndex";
import { useLobbyMessage } from "@/lib/LobbySocketContext";
import { cancelMultiplayerGame } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function GamesPage() {
  const t = useTranslations("games");
  const tCommon = useTranslations("common");
  const tGame = useTranslations("game");
  const { auth, onOpenAuth, onLogout } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { multiplayerGames, refreshMultiplayerGames } = useGamesIndex(auth);

  // Real-time updates for games page
  useLobbyMessage((payload) => {
    if (payload.type === "game-update") {
      void refreshMultiplayerGames({ silent: true });
    }
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteGame = useCallback(
    async (gameId: string) => {
      setDeletingId(gameId);
      try {
        await cancelMultiplayerGame(gameId);
        void refreshMultiplayerGames({ silent: true });
      } catch {
        // best-effort
      } finally {
        setDeletingId(null);
      }
    },
    [refreshMultiplayerGames],
  );

  const handleCopy = useCallback((gameId: string) => {
    void navigator.clipboard.writeText(gameId);
    setCopiedId(gameId);
    setTimeout(() => setCopiedId((prev) => (prev === gameId ? null : prev)), 1800);
  }, []);

  const paperCard =
    "border-[#d0bb94]/75 bg-[linear-gradient(180deg,rgba(255,250,242,0.96),rgba(244,231,207,0.94))]";

  return (
    <RequireAccount>
      {() => (
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[18rem] bg-[radial-gradient(circle_at_top,_rgba(255,247,231,0.76),_transparent_58%)]" />

          <Navbar
            mode="lobby"
            auth={auth}
            navOpen={navOpen}
            onToggleNav={() => setNavOpen(!navOpen)}
            onCloseNav={() => setNavOpen(false)}
            onOpenAuth={onOpenAuth}
            onLogout={onLogout}
          />

          <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-5 pt-20 sm:px-6 lg:px-8 lg:pb-6 lg:pt-20">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-display font-bold text-[#2b1e14]">{t("title")}</h1>
            </div>

            <section className="space-y-6">
              <Card className={paperCard}>
                <CardHeader>
                  <CardTitle>{t("activeGames")}</CardTitle>
                  <CardDescription>{t("activeGamesDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {[...multiplayerGames.active]
                    .sort((a, b) => {
                      const aYourTurn = isSummaryYourTurn(a) ? 1 : 0;
                      const bYourTurn = isSummaryYourTurn(b) ? 1 : 0;
                      if (aYourTurn !== bYourTurn) return bYourTurn - aYourTurn;
                      // Within your-turn games, show ones where opponent is online first
                      const aOpponentOnline =
                        (a.yourSeat === "white" ? a.seats.black : a.seats.white)?.online ?? false;
                      const bOpponentOnline =
                        (b.yourSeat === "white" ? b.seats.black : b.seats.white)?.online ?? false;
                      if (aOpponentOnline !== bOpponentOnline) return aOpponentOnline ? -1 : 1;
                      return 0;
                    })
                    .map((game) => {
                      const isYourTurn = isSummaryYourTurn(game);
                      const opponent =
                        game.yourSeat === "white"
                          ? game.seats.black?.player
                          : game.seats.white?.player;
                      const yourColor =
                        translatePlayerColor(game.yourSeat ?? null, tGame) ?? game.yourSeat;
                      const opponentScore =
                        game.yourSeat === "white" ? game.score.black : game.score.white;
                      const yourScore =
                        game.yourSeat === "white" ? game.score.white : game.score.black;
                      const scoreToWin = game.scoreToWin ?? 10;
                      return (
                        <div
                          key={game.gameId}
                          className="flex flex-col gap-2 rounded-2xl border border-[#d7c39e] bg-white/40 p-4"
                        >
                          {/* Row 1: playing as color + your score + resume */}
                          <div className="flex items-center justify-between gap-2">
                            {game.yourSeat && (
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className="text-xs text-[#6b563e]">
                                  {tCommon("playingAs", { color: "" })}
                                </span>
                                <span
                                  className={cn(
                                    "inline-block h-2.5 w-2.5 shrink-0 rounded-full border",
                                    game.yourSeat === "white"
                                      ? "border-[#ddd2bf] bg-[radial-gradient(circle_at_30%_28%,#fffdfa,#f4eee3_58%,#d9ccb8)]"
                                      : "border-[#191410] bg-[radial-gradient(circle_at_30%_28%,#5d554f,#2d2622_58%,#0f0c0b)]",
                                  )}
                                />
                                <span className="text-xs font-medium text-[#2b1e14]">
                                  {yourColor}
                                </span>
                                <span className="font-mono text-xs tabular-nums text-[#6b563e]">
                                  {yourScore}
                                  <span className="font-normal opacity-50">/{scoreToWin}</span>
                                </span>
                              </div>
                            )}
                            <Button size="sm" onClick={() => router.push(`/game/${game.gameId}`)}>
                              {tCommon("resume")}
                            </Button>
                          </div>

                          {/* Row 2: vs. opponent + opponent score */}
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 text-xs text-[#8d7760]">vs.</span>
                            {opponent && (
                              <PlayerIdentityRow
                                player={opponent}
                                linkToProfile={false}
                                className="min-w-0"
                                avatarClassName="h-5 w-5"
                                nameClassName="text-sm font-medium"
                              />
                            )}
                            <span className="shrink-0 font-mono text-sm tabular-nums text-[#6b563e]">
                              {opponentScore}
                              <span className="text-xs font-normal opacity-50">/{scoreToWin}</span>
                            </span>
                          </div>

                          {/* Row 3: status badge + config + cancel */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={cn(
                                  "text-[10px]",
                                  isYourTurn
                                    ? "bg-[#e8f2d8] text-[#4b6537] animate-pulse"
                                    : "bg-[#f3e7d5] text-[#6b563e]",
                                )}
                              >
                                {getSummaryStatusLabel(game, tGame)}
                              </Badge>
                              <GameConfigBadge
                                boardSize={game.boardSize}
                                scoreToWin={game.scoreToWin}
                                timeControl={game.timeControl}
                                roomType={game.roomType}
                                compact
                              />
                            </div>
                            {game.status === "waiting" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-[#a0887a] hover:bg-red-50 hover:text-[#8b3a2a]"
                                onClick={() => handleDeleteGame(game.gameId)}
                                disabled={deletingId === game.gameId}
                              >
                                {deletingId === game.gameId ? "…" : tCommon("cancel")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {multiplayerGames.active.length === 0 && (
                    <p className="col-span-full py-8 text-center text-sm text-[#6e5b48]">
                      {t("noActiveGames")}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className={paperCard}>
                <CardHeader>
                  <CardTitle>{t("matchHistory")}</CardTitle>
                  <CardDescription>{t("matchHistoryDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {multiplayerGames.finished.map((game) => (
                    <MatchHistoryCard
                      key={game.gameId}
                      game={game}
                      playerId={auth!.player.playerId}
                      copiedId={copiedId}
                      onCopy={() => handleCopy(game.gameId)}
                      onReview={() => router.push(`/game/${game.gameId}`)}
                    />
                  ))}
                  {multiplayerGames.finished.length === 0 && (
                    <p className="col-span-full py-8 text-center text-sm text-[#6e5b48]">
                      {t("noMatchHistory")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      )}
    </RequireAccount>
  );
}
