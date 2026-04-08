import { useTranslations } from "next-intl";
import type { PlayerColor, TimeControl, MultiplayerRoomType } from "@shared";
import { PlayerIdentityRow } from "@/components/PlayerIdentityRow";
import { ColorDot, translatePlayerColor } from "@/components/game/GameShared";
import { GameConfigBadge } from "@/components/game/GameConfigBadge";
import { cn } from "@/lib/utils";

type RematchInviteBodyProps = {
  /** The opponent who requested (or will receive) the rematch. Null renders a generic fallback. */
  opponent: {
    playerId?: string;
    displayName?: string;
    profilePicture?: string;
    activeBadges?: string[];
    rating?: number;
    online?: boolean | null;
  } | null;
  /** The color the receiver will play in the rematch (flipped from their seat in the finished game). */
  nextColor?: PlayerColor | null;
  boardSize?: number;
  scoreToWin?: number;
  timeControl?: TimeControl | null;
  roomType?: MultiplayerRoomType;
  currentPlayerId?: string;
  /** Dense layout for sonner toasts. Defaults to the roomier card layout. */
  compact?: boolean;
  className?: string;
};

/**
 * Unified body for rematch invites. Rendered inside:
 *  - the lobby's "Invitations" card (LobbyPage rematch row)
 *  - the global sonner toast in SocialNotificationsContext
 *  - the in-game sonner toast in MultiplayerGamePage
 *
 * All three surfaces now show the same information: opponent identity row,
 * "wants a rematch!" label, color assignment for the rematch, and the full
 * game config (board size, score-to-win, time control, room type) via
 * GameConfigBadge with `showAll` so defaults (19×19, 10pts, unlimited) also
 * surface — rematch cards shouldn't hide settings just because they match
 * the defaults.
 *
 * Actions (accept / decline buttons) are intentionally NOT part of this
 * component — each surface wires them into its own container (toast
 * action/cancel props, or buttons inside a card).
 */
export function RematchInviteBody({
  opponent,
  nextColor,
  boardSize,
  scoreToWin,
  timeControl,
  roomType,
  currentPlayerId,
  compact = false,
  className,
}: RematchInviteBodyProps) {
  const tLobby = useTranslations("lobby");
  const tCommon = useTranslations("common");
  const tGame = useTranslations("game");

  return (
    <div className={cn("min-w-0", compact ? "space-y-1.5" : "space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        {opponent ? (
          <PlayerIdentityRow
            player={opponent}
            currentPlayerId={currentPlayerId}
            linkToProfile={false}
            online={opponent.online ?? null}
            avatarClassName={compact ? "h-6 w-6 shrink-0" : undefined}
            nameClassName={compact ? "text-sm font-medium" : undefined}
            className={cn("min-w-0", compact ? "gap-2" : "gap-3")}
          />
        ) : (
          <span className="text-sm text-[#6b5a45]">{tGame("rematchRequested")}</span>
        )}
        {nextColor && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#dcc7a3] bg-[#fff9ef] px-2 py-0.5 text-xs text-[#6b5a45]">
            <ColorDot color={nextColor} className="h-3 w-3" />
            {tCommon("wouldPlayAs", {
              color: translatePlayerColor(nextColor, tGame) ?? "",
            })}
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-[#8d6a2f]">{tLobby("rematchToastDesc")}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6b5a45]">
        <GameConfigBadge
          boardSize={boardSize}
          scoreToWin={scoreToWin}
          timeControl={timeControl ?? undefined}
          roomType={roomType}
          showAll
        />
      </div>
    </div>
  );
}
