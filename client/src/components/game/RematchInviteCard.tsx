import { useTranslations } from "next-intl";
import type { PlayerColor, TimeControl, MultiplayerRoomType } from "@shared";
import { Button } from "@/components/ui/button";
import { RematchInviteBody } from "@/components/game/RematchInviteBody";
import { cn } from "@/lib/utils";

type RematchInviteCardProps = {
  opponent: {
    playerId?: string;
    displayName?: string;
    profilePicture?: string;
    activeBadges?: string[];
    rating?: number;
    online?: boolean | null;
    kind?: "account" | "guest";
  } | null;
  nextColor?: PlayerColor | null;
  boardSize?: number;
  scoreToWin?: number;
  timeControl?: TimeControl | null;
  roomType?: MultiplayerRoomType;
  currentPlayerId?: string;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
  /** Surfaces identifier used in data-testid + aria. */
  testId?: string;
  className?: string;
};

/**
 * Full rematch-invite card: identity body + accept/decline buttons inside the
 * tan-bordered container we use on the lobby. Identical visual treatment
 * regardless of whether it's rendered:
 *   - inline inside the lobby's "Invitations" card (LobbyPage)
 *   - inside a sonner toast via `toast.custom(() => <RematchInviteCard />)`
 *
 * Using `toast.custom` for sonner surfaces is important: sonner's default
 * title/description/button layout constraints the title column to ~200px
 * on a 356px toast after the action buttons steal their share of the flex
 * row, which used to squish the opponent row down to just "(1439)" with
 * the color pill dropped onto its own visual line. `toast.custom` bypasses
 * `data-styled=true` entirely and lets this card control every pixel.
 */
export function RematchInviteCard({
  opponent,
  nextColor,
  boardSize,
  scoreToWin,
  timeControl,
  roomType,
  currentPlayerId,
  onAccept,
  onDecline,
  busy,
  testId,
  className,
}: RematchInviteCardProps) {
  const tCommon = useTranslations("common");

  return (
    <div
      data-testid={testId}
      className={cn(
        "w-full max-w-sm space-y-3 rounded-2xl border border-[#d4b87a] bg-[#fdf6e8] p-4 shadow-[0_4px_16px_rgba(74,55,40,0.15)]",
        className,
      )}
    >
      <RematchInviteBody
        opponent={opponent}
        nextColor={nextColor}
        boardSize={boardSize}
        scoreToWin={scoreToWin}
        timeControl={timeControl}
        roomType={roomType}
        currentPlayerId={currentPlayerId}
      />
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-[#dcc7a2] hover:bg-[#faefd8]"
          onClick={onDecline}
          disabled={busy}
        >
          {tCommon("decline")}
        </Button>
        <Button size="sm" className="flex-1 shadow-xs" onClick={onAccept} disabled={busy}>
          {tCommon("accept")}
        </Button>
      </div>
    </div>
  );
}
