import type { TimeControl, MultiplayerRoomType } from "@shared";

type GameConfigBadgeProps = {
  boardSize?: number;
  scoreToWin?: number;
  timeControl?: TimeControl;
  roomType?: MultiplayerRoomType;
  compact?: boolean;
};

function formatTimeControl(tc: TimeControl): string | null {
  if (!tc) return null;
  const mins = Math.floor(tc.initialMs / 60_000);
  const incSec = Math.round(tc.incrementMs / 1_000);
  return incSec > 0 ? `${mins}+${incSec}` : `${mins} min`;
}

function formatRoomType(roomType: MultiplayerRoomType): string | null {
  switch (roomType) {
    case "tournament":
      return "Tournament";
    case "matchmaking":
      return "Matchmaking";
    default:
      return null;
  }
}

export function GameConfigBadge({
  boardSize,
  scoreToWin,
  timeControl,
  roomType,
  compact,
}: GameConfigBadgeProps) {
  const parts: string[] = [];

  if (roomType) {
    const label = formatRoomType(roomType);
    if (label) parts.push(label);
  }

  if (boardSize && boardSize !== 19) {
    parts.push(`${boardSize}x${boardSize}`);
  }

  if (scoreToWin && scoreToWin !== 10) {
    parts.push(compact ? `${scoreToWin}pts` : `${scoreToWin} to win`);
  }

  const tcLabel = formatTimeControl(timeControl ?? null);
  if (tcLabel) parts.push(tcLabel);

  if (parts.length === 0) return null;

  return (
    <span className="text-xs text-[#8d7760]">
      {parts.join(" · ")}
    </span>
  );
}
