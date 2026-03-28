import type { MultiplayerGameSummary, PlayerColor } from "@shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatPlayerColor,
  formatFinishReason,
  formatGameTimestamp,
  describeResult,
  getPlayerResult,
  PlayerOverviewAvatar,
  EmptySeatAvatar,
  RoomCodeCopyPill,
} from "./GameShared";
import { GameConfigBadge } from "./GameConfigBadge";
import { formatClockTime } from "./GameClock";
import { cn } from "@/lib/utils";

type MatchHistoryCardProps = {
  game: MultiplayerGameSummary;
  playerId: string;
  copiedId: string | null;
  onCopy: () => void;
  onReview: () => void;
};

function ColorDot({ color }: { color: PlayerColor }) {
  return (
    <span
      className={cn(
        "inline-block h-3 w-3 shrink-0 rounded-full border",
        color === "white"
          ? "border-[#ddd2bf] bg-[radial-gradient(circle_at_30%_28%,#fffdfa,#f4eee3_58%,#d9ccb8)]"
          : "border-[#191410] bg-[radial-gradient(circle_at_30%_28%,#5d554f,#2d2622_58%,#0f0c0b)]",
      )}
    />
  );
}

function PlayerRow({
  player,
  color,
  score,
  isYou,
  isWinner,
  clockMs,
}: {
  player: { displayName?: string; profilePicture?: string } | null;
  color: PlayerColor;
  score: number;
  isYou: boolean;
  isWinner: boolean;
  clockMs?: number | null;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-xl px-3 py-2",
      isWinner ? "bg-black/[0.04]" : "",
    )}>
      <ColorDot color={color} />
      {player ? (
        <PlayerOverviewAvatar player={player} className="h-6 w-6" />
      ) : (
        <EmptySeatAvatar className="h-6 w-6" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#2b1e14]">
        {player?.displayName ?? "Unknown"}
        {isYou && <span className="ml-1 text-[#8d7760]">(you)</span>}
      </span>
      <span className={cn(
        "font-mono text-lg font-bold tabular-nums",
        isWinner ? "text-[#2b1e14]" : "text-[#9a8770]",
      )}>
        {score}
      </span>
      {clockMs != null && (
        <span className="font-mono text-xs tabular-nums text-[#9a8770]">
          {formatClockTime(clockMs)}
        </span>
      )}
    </div>
  );
}

export function MatchHistoryCard({
  game,
  playerId,
  copiedId,
  onCopy,
  onReview,
}: MatchHistoryCardProps) {
  const result = getPlayerResult(game);
  const whitePlayer = game.seats.white?.player ?? null;
  const blackPlayer = game.seats.black?.player ?? null;
  const isWhiteYou = whitePlayer?.playerId === playerId;
  const isBlackYou = blackPlayer?.playerId === playerId;
  const whiteWon = game.winner === "white";
  const blackWon = game.winner === "black";

  const resultBg = result === "won"
    ? "border-[#a3c98a]/60 bg-[#f4fae9]"
    : result === "lost"
      ? "border-[#dba8a0]/60 bg-[#fdf3f1]"
      : "border-[#d7c39e] bg-white/40";

  return (
    <div className={cn("rounded-2xl border p-4 space-y-3", resultBg)}>
      {/* Header: result badge + reason + timestamp + review */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {result && (
            <Badge className={cn(
              "text-xs font-semibold",
              result === "won"
                ? "bg-[#3d7a1e] text-white"
                : "bg-[#b5443a] text-white",
            )}>
              {result === "won" ? "Won" : "Lost"}
            </Badge>
          )}
          {!result && game.winner && (
            <Badge className="bg-[#f3e7d5] text-[#6b563e] text-xs font-semibold">
              {formatPlayerColor(game.winner)} won
            </Badge>
          )}
          <span className="text-xs text-[#9a8770]">
            {describeResult(result, game.finishReason) || formatFinishReason(game.finishReason, game.scoreToWin)}
          </span>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={onReview}>
          Review
        </Button>
      </div>

      {/* Player rows with scores */}
      <div className="space-y-1 rounded-xl border border-black/5 bg-white/50 p-1">
        <PlayerRow
          player={whitePlayer}
          color="white"
          score={game.score.white}
          isYou={isWhiteYou}
          isWinner={whiteWon}
          clockMs={game.clockMs?.white}
        />
        <PlayerRow
          player={blackPlayer}
          color="black"
          score={game.score.black}
          isYou={isBlackYou}
          isWinner={blackWon}
          clockMs={game.clockMs?.black}
        />
      </div>

      {/* Footer: game info pills */}
      <div className="flex flex-wrap items-center gap-2">
        <RoomCodeCopyPill
          gameId={game.gameId}
          copied={copiedId === game.gameId}
          onCopy={onCopy}
        />
        <GameConfigBadge
          boardSize={game.boardSize}
          scoreToWin={game.scoreToWin}
          timeControl={game.timeControl}
          roomType={game.roomType}
        />
        <span className="text-xs text-[#9a8770]">
          {formatGameTimestamp(game.updatedAt)} · {game.historyLength} moves
        </span>
      </div>
    </div>
  );
}
