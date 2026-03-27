import type { TournamentGroupStanding } from "@shared";

export function StandingsTable({
  standings,
  highlightPlayerId,
}: {
  standings: TournamentGroupStanding[];
  highlightPlayerId?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/50 bg-white/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 w-8">#</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2 text-center w-10">W</th>
            <th className="px-3 py-2 text-center w-10">L</th>
            <th className="px-3 py-2 text-center w-10">D</th>
            <th className="px-3 py-2 text-center w-12">Pts</th>
            <th className="px-3 py-2 text-center w-12">+/-</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.playerId}
              className={`border-b last:border-b-0 ${
                s.playerId === highlightPlayerId
                  ? "bg-amber-50/60 font-medium"
                  : ""
              }`}
            >
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 truncate max-w-[160px]">
                {s.displayName}
              </td>
              <td className="px-3 py-2 text-center">{s.wins}</td>
              <td className="px-3 py-2 text-center">{s.losses}</td>
              <td className="px-3 py-2 text-center">{s.draws}</td>
              <td className="px-3 py-2 text-center font-medium">{s.points}</td>
              <td className="px-3 py-2 text-center">
                {s.scoreDiff > 0 ? `+${s.scoreDiff}` : s.scoreDiff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
