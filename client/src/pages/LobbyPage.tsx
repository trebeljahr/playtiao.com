import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type {
  AuthResponse,
  MultiplayerSnapshot,
  MultiplayerGameSummary,
} from "@shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import {
  getOpponentLabel,
  isSummaryYourTurn,
} from "@/components/game/GameShared";
import { useGamesIndex } from "@/lib/hooks/useGamesIndex";
import { useSocialData } from "@/lib/hooks/useSocialData";
import { cn } from "@/lib/utils";
import { createMultiplayerGame, joinMultiplayerGame } from "@/lib/api";
import { toastError } from "@/lib/errors";

type LobbyPageProps = {
  auth: AuthResponse | null;
  onOpenAuth: (mode: "login" | "signup") => void;
  onLogout: () => void;
};

export function LobbyPage({ auth, onOpenAuth, onLogout }: LobbyPageProps) {
  const navigate = useNavigate();
  const { multiplayerGames, refreshMultiplayerGames } = useGamesIndex(auth);

  const { socialOverview, refreshSocialOverview } = useSocialData(auth, true);

  const [navOpen, setNavOpen] = useState(false);
  const [joinGameId, setJoinGameId] = useState("");
  const [multiplayerBusy, setMultiplayerBusy] = useState(false);

  const sortedActiveGames = useMemo(() => {
    return [...multiplayerGames.active].sort((a, b) => {
      const aYourTurn = isSummaryYourTurn(a);
      const bYourTurn = isSummaryYourTurn(b);
      if (aYourTurn && !bYourTurn) return -1;
      if (!aYourTurn && bYourTurn) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [multiplayerGames.active]);

  async function handleCreateRoom() {
    if (!auth) {
      onOpenAuth("login");
      return;
    }

    setMultiplayerBusy(true);
    try {
      const response = await createMultiplayerGame();
      navigate(`/game/${response.snapshot.gameId}`);
    } catch (error) {
      toastError(error);
    } finally {
      setMultiplayerBusy(false);
    }
  }

  async function handleJoinRoom() {
    if (!auth) {
      onOpenAuth("login");
      return;
    }

    if (!joinGameId.trim()) {
      return;
    }

    setMultiplayerBusy(true);
    try {
      const response = await joinMultiplayerGame(
        joinGameId.trim().toUpperCase(),
      );
      navigate(`/game/${response.snapshot.gameId}`);
    } catch (error) {
      toastError(error);
    } finally {
      setMultiplayerBusy(false);
    }
  }

  const paperCard =
    "border-[#d0bb94]/75 bg-[linear-gradient(180deg,rgba(255,250,242,0.96),rgba(244,231,207,0.94))]";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[18rem] bg-[radial-gradient(circle_at_top,_rgba(255,247,231,0.76),_transparent_58%)]" />

      <Navbar
        mode="lobby"
        auth={auth}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((v) => !v)}
        onCloseNav={() => setNavOpen(false)}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-5 pt-20 sm:px-6 lg:px-8 lg:pb-6 lg:pt-20">
        <section className="grid gap-5 lg:grid-cols-2">
          {/* Local Match Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className={cn("h-full overflow-hidden flex flex-col", paperCard)}
            >
              <div className="h-2 bg-[linear-gradient(90deg,#4b3726,#b98d49)]" />
              <CardHeader>
                <Badge className="w-fit bg-[#f4e8d2] text-[#6c543c]">
                  Local
                </Badge>
                <CardTitle className="text-4xl text-[#2b1e14]">
                  Over the Board
                </CardTitle>
                <CardDescription className="text-[#6e5b48]">
                  Play a match on the same board with a friend or practice
                  against an AI opponent.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate("/computer")}
                >
                  Play against a Bot
                </Button>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => navigate("/local")}
                >
                  Play against another Human
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Online Match Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className={cn("h-full overflow-hidden flex flex-col", paperCard)}
            >
              <div className="h-2 bg-[linear-gradient(90deg,#6e4f29,#d2a661)]" />
              <CardHeader>
                <Badge className="w-fit bg-[#f5ead8] text-[#6e5437]">
                  Online
                </Badge>
                <CardTitle className="text-4xl text-[#2b1e14]">
                  Multiplayer
                </CardTitle>
                <CardDescription className="text-[#6e5b48]">
                  Find a quick match or create a private game for a person that
                  you know or join theirs.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-6">
                <Button
                  size="lg"
                  className="w-full h-12 text-lg shadow-md"
                  onClick={() => navigate("/matchmaking")}
                >
                  Quick match
                </Button>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7760]">
                    <span className="h-px flex-1 bg-[#dcc7a2]" />
                    Against someone specific
                    <span className="h-px flex-1 bg-[#dcc7a2]" />
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 min-w-[8rem]"
                      onClick={handleCreateRoom}
                      disabled={multiplayerBusy}
                    >
                      {multiplayerBusy ? "Creating..." : "Create game"}
                    </Button>
                    or
                    <div className="flex flex-[1.5] gap-1">
                      <Input
                        value={joinGameId}
                        onChange={(e) =>
                          setJoinGameId(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, ""),
                          )
                        }
                        placeholder="Existing Game ID"
                        maxLength={6}
                        className="font-mono bg-white/50"
                      />
                      <Button
                        variant="outline"
                        onClick={handleJoinRoom}
                        disabled={multiplayerBusy || !joinGameId}
                      >
                        Join
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {auth?.player.kind === "account" && (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={cn("overflow-hidden", paperCard)}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-2xl text-[#2b1e14]">
                    Active games
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/games")}
                  >
                    View all
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedActiveGames.slice(0, 3).map((game) => {
                    const isYourTurn = isSummaryYourTurn(game);
                    return (
                      <div
                        key={game.gameId}
                        className="flex items-center justify-between rounded-2xl border border-[#d7c39e] bg-[#fffaf3] p-3 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <p className="font-mono font-bold text-[#2b1e14]">
                              {game.gameId}
                            </p>
                            <p className="text-xs text-[#6e5b48]">
                              vs {getOpponentLabel(game, auth.player.playerId)}
                            </p>
                          </div>
                          <Badge
                            className={cn(
                              "ml-2",
                              isYourTurn
                                ? "bg-[#e8f2d8] text-[#4b6537]"
                                : "bg-[#f3e7d5] text-[#6b563e]",
                            )}
                          >
                            {isYourTurn ? "Your move" : "Their move"}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/game/${game.gameId}`)}
                        >
                          Resume
                        </Button>
                      </div>
                    );
                  })}
                  {sortedActiveGames.length === 0 && (
                    <p className="text-center text-sm text-[#6e5b48] py-4">
                      No active games.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={cn("overflow-hidden", paperCard)}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-2xl text-[#2b1e14]">
                    Invitations
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshSocialOverview()}
                  >
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {socialOverview.incomingInvitations.slice(0, 3).map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-2xl border border-[#dcc7a2] bg-[#fffdf7] p-3 shadow-sm"
                    >
                      <div>
                        <p className="font-semibold text-sm text-[#2b1e14]">
                          {inv.sender.displayName}
                        </p>
                        <p className="text-xs text-[#7a6656]">
                          Game {inv.gameId}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/game/${inv.gameId}`)}
                      >
                        Accept
                      </Button>
                    </div>
                  ))}
                  {socialOverview.incomingInvitations.length === 0 && (
                    <p className="text-center text-sm text-[#6e5b48] py-4">
                      No invitations.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </section>
        )}
      </main>
    </div>
  );
}
