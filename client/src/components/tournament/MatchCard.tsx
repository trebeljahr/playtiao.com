import type { TournamentMatch } from "@shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function statusLabel(status: TournamentMatch["status"]): string {
  switch (status) {
    case "pending":
      return "Upcoming";
    case "active":
      return "Live";
    case "finished":
      return "Finished";
    case "forfeit":
      return "Forfeit";
    case "bye":
      return "Bye";
  }
}

function statusColor(status: TournamentMatch["status"]): string {
  switch (status) {
    case "active":
      return "border-green-400 bg-green-50 text-green-700";
    case "finished":
    case "forfeit":
      return "border-slate-300 bg-slate-50 text-slate-600";
    case "bye":
      return "border-amber-300 bg-amber-50 text-amber-700";
    default:
      return "";
  }
}

export function MatchCard({
  match,
  currentPlayerId,
  featured,
}: {
  match: TournamentMatch;
  currentPlayerId?: string;
  featured?: boolean;
}) {
  const navigate = useNavigate();
  const isMyMatch =
    currentPlayerId &&
    match.players.some((p) => p?.playerId === currentPlayerId);

  return (
    <div
      className={`rounded-xl border p-3 ${
        featured
          ? "border-amber-400/60 bg-amber-50/40"
          : "border-white/50 bg-white/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 space-y-1">
          {match.players.map((player, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm ${
                match.winner && player?.playerId === match.winner
                  ? "font-semibold"
                  : match.winner
                    ? "text-muted-foreground"
                    : ""
              }`}
            >
              <span className="w-5 text-right text-xs text-muted-foreground">
                #{player?.seed ?? "?"}
              </span>
              <span className="truncate">
                {player?.displayName ?? "TBD"}
              </span>
              {match.status !== "pending" && match.status !== "bye" && (
                <span className="text-xs text-muted-foreground">
                  {match.score[i]}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge className={statusColor(match.status)}>
            {statusLabel(match.status)}
          </Badge>
          {match.roomId && match.status === "active" && (
            <Button
              size="sm"
              variant={isMyMatch ? "default" : "outline"}
              onClick={() => navigate(`/game/${match.roomId}`)}
            >
              {isMyMatch ? "Play" : "Watch"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
