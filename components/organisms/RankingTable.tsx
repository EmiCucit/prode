import { cn } from "@/lib/utils";
import type { StandingRow } from "@/lib/domain/ranking";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

interface Props {
  players: StandingRow[];
}

export default function RankingTable({ players }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left">
            <th className="px-2 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground w-10">#</th>
            <th className="px-2 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground">Jugador</th>
            <th className="px-2 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">Pts</th>
            <th className="px-2 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">⭐</th>
            <th className="px-2 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">✓</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, i) => {
            const position = i + 1;
            const isTop3   = position <= 3;

            return (
              <tr
                key={player.userId}
                className={cn(
                  "border-b border-border/30 last:border-0 transition-colors",
                  isTop3 && "bg-primary/5",
                )}
              >
                <td className="px-2 sm:px-3 py-2.5 tabular-nums font-bold text-muted-foreground">
                  {isTop3 ? MEDALS[position - 1] : position}
                </td>
                <td className="px-2 sm:px-3 py-2.5">
                  <span className={cn("font-medium", isTop3 && "text-foreground")}>
                    {player.displayName}
                  </span>
                </td>
                <td className="px-2 sm:px-3 py-2.5 text-right font-bold tabular-nums text-foreground">
                  {player.totalPoints}
                </td>
                <td className="px-2 sm:px-3 py-2.5 text-right tabular-nums text-primary">
                  {player.exactResults > 0 ? player.exactResults : "—"}
                </td>
                <td className="px-2 sm:px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {player.correctOutcomes > 0 ? player.correctOutcomes : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="px-3 py-2 border-t border-border/30 flex gap-4 text-xs text-muted-foreground">
        <span>⭐ Plenos</span>
        <span>✓ Resultado</span>
      </div>
    </div>
  );
}
