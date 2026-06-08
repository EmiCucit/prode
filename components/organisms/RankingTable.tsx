import { cn } from "@/lib/utils";
import type { StandingRow } from "@/lib/domain/ranking";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

interface Props {
  players: StandingRow[];
  currentUserId?: string;
}

export default function RankingTable({ players, currentUserId }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left">
            <th className="px-2 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground w-10">#</th>
            <th className="px-2 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground">Jugador</th>
            <th className="px-1.5 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">Pts</th>
            <th className="px-1.5 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">Plenos</th>
            <th className="px-1.5 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">P+B</th>
            <th className="px-1.5 sm:px-3 py-2.5 text-xs font-semibold text-muted-foreground text-right">✓</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, i) => {
            const position = i + 1;
            const isTop3   = position <= 3;
            const isMe     = !!currentUserId && player.userId === currentUserId;
            // Plenos "comunes" (3pts) = exactos sin el bonus de penales
            const plainExact = player.exactResults - player.exactWithBonus;

            return (
              <tr
                key={player.userId}
                className={cn(
                  "border-b border-border/30 last:border-0 transition-colors",
                  isTop3 && "bg-primary/5",
                  isMe && "bg-primary/15",
                )}
              >
                <td
                  className={cn(
                    "px-2 sm:px-3 py-2.5 tabular-nums font-bold text-muted-foreground",
                    isMe && "border-l-2 border-primary",
                  )}
                >
                  {isTop3 ? MEDALS[position - 1] : position}
                </td>
                <td className="px-2 sm:px-3 py-2.5">
                  <span className={cn("font-medium", (isTop3 || isMe) && "text-foreground")}>
                    {player.displayName}
                  </span>
                  {isMe && (
                    <span className="ml-2 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary align-middle">
                      vos
                    </span>
                  )}
                </td>
                <td className="px-1.5 sm:px-3 py-2.5 text-right font-bold tabular-nums text-foreground">
                  {player.totalPoints}
                </td>
                <td className="px-1.5 sm:px-3 py-2.5 text-right tabular-nums text-primary">
                  {plainExact > 0 ? plainExact : "—"}
                </td>
                <td className="px-1.5 sm:px-3 py-2.5 text-right tabular-nums text-primary">
                  {player.exactWithBonus > 0 ? player.exactWithBonus : "—"}
                </td>
                <td className="px-1.5 sm:px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {player.correctOutcomes > 0 ? player.correctOutcomes : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="px-3 py-2 border-t border-border/30 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><b className="text-primary">Plenos</b> resultado exacto (3pts)</span>
        <span><b className="text-primary">P+B</b> pleno + bonus penales (4pts)</span>
        <span><b>✓</b> resultado acertado (1pt)</span>
      </div>
    </div>
  );
}
