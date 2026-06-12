"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StandingRow } from "@/lib/domain/ranking";
import type { FinishedPrediction } from "@/lib/domain/breakdown";

const MEDALS = ["🥇", "🥈", "🥉"] as const;
const COLS = 6; // columnas de la tabla (para el colSpan de la fila desplegada)
const PAGE_SIZE = 5; // partidos finalizados por página en el desglose

interface Props {
  players: StandingRow[];
  currentUserId?: string;
  /** Predicciones en partidos finalizados, por user_id (más reciente primero). */
  breakdowns?: Record<string, FinishedPrediction[]>;
}

export default function RankingTable({ players, currentUserId, breakdowns = {} }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  function toggle(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null);
    } else {
      setExpandedId(userId);
      setPage(0); // reset de la paginación al abrir otro jugador
    }
  }

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

            const userBreakdown = breakdowns[player.userId] ?? [];
            const canExpand = userBreakdown.length > 0;
            const isExpanded = expandedId === player.userId;

            return (
              <Fragment key={player.userId}>
                <tr
                  onClick={canExpand ? () => toggle(player.userId) : undefined}
                  className={cn(
                    "border-b border-border/30 last:border-0 transition-colors",
                    isTop3 && "bg-primary/5",
                    isMe && "bg-primary/15",
                    canExpand && "cursor-pointer hover:bg-muted/40",
                    isExpanded && "bg-muted/40",
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
                    <div className="flex items-center gap-1.5">
                      {canExpand ? (
                        <button
                          type="button"
                          aria-label={isExpanded ? "Ocultar predicciones" : "Ver predicciones"}
                          aria-expanded={isExpanded}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(player.userId);
                          }}
                          className="-ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </button>
                      ) : (
                        <span className="inline-block w-[1.125rem]" aria-hidden />
                      )}
                      <span className={cn("font-medium", (isTop3 || isMe) && "text-foreground")}>
                        {player.displayName}
                      </span>
                      {isMe && (
                        <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary align-middle">
                          vos
                        </span>
                      )}
                    </div>
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

                {isExpanded && (
                  <tr className="bg-muted/20">
                    <td colSpan={COLS} className="px-2 sm:px-3 py-3">
                      <BreakdownPanel
                        rows={userBreakdown}
                        page={page}
                        onPageChange={setPage}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
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

// ── Desglose de predicciones en partidos finalizados ──────────────────

function BreakdownPanel({
  rows,
  page,
  onPageChange,
}: {
  rows: FinishedPrediction[];
  page: number;
  onPageChange: (p: number) => void;
}) {
  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const slice = rows.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {slice.map((r) => (
          <li
            key={r.fixtureId}
            className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-foreground truncate">
                {r.homeTeamName}{" "}
                <span className="tabular-nums font-bold">{r.homeScore}–{r.awayScore}</span>{" "}
                {r.awayTeamName}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Tu predicción:{" "}
                <span className="tabular-nums text-foreground">
                  {r.predHomeScore}–{r.predAwayScore}
                </span>
                {r.predPenaltyWinner && (
                  <span className="opacity-80">
                    {" "}(pen. {r.predPenaltyWinner === "home" ? r.homeTeamName : r.awayTeamName})
                  </span>
                )}
              </div>
            </div>
            <PointsPill points={r.points} />
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} de {rows.length}
          </span>
          <div className="flex items-center gap-1.5">
            <PagerButton
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </PagerButton>
            <PagerButton
              disabled={page >= pageCount - 1}
              onClick={() => onPageChange(page + 1)}
            >
              Siguiente
            </PagerButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PagerButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "rounded-md border border-border px-2 py-1 text-[11px] font-medium transition-colors",
        disabled
          ? "text-muted-foreground/50 cursor-not-allowed"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      {children}
    </button>
  );
}

function PointsPill({ points }: { points: number }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        points === 4 && "bg-celeste/15 text-celeste",
        points === 3 && "bg-green-500/15 text-green-400",
        points === 2 && "bg-emerald-500/15 text-emerald-400",
        points === 1 && "bg-yellow-500/15 text-yellow-400",
        points === 0 && "bg-muted text-muted-foreground",
      )}
    >
      {points > 0 ? `+${points}` : "0"} pt{points === 1 ? "" : "s"}
    </span>
  );
}
