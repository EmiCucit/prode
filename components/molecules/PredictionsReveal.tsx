"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RevealedPrediction } from "@/lib/data/types";

interface Props {
  items: RevealedPrediction[];
  currentUserId?: string;
  homeTeamName: string;
  awayTeamName: string;
}

/**
 * Desplegable (cerrado por defecto) con las predicciones de todos los jugadores
 * que cargaron una para el partido. Se muestra solo mientras el partido está en
 * curso. La predicción propia se resalta y va primero.
 */
export default function PredictionsReveal({
  items,
  currentUserId,
  homeTeamName,
  awayTeamName,
}: Props) {
  const [open, setOpen] = useState(false);

  const sorted = [...items].sort((a, b) => {
    const am = a.userId === currentUserId ? 0 : 1;
    const bm = b.userId === currentUserId ? 0 : 1;
    return am - bm || a.displayName.localeCompare(b.displayName, "es");
  });

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Predicciones ({items.length})</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open &&
        (items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nadie cargó una predicción para este partido.
          </p>
        ) : (
          <ul className="space-y-1">
            {sorted.map((p) => {
              const isMe = !!currentUserId && p.userId === currentUserId;
              return (
                <li
                  key={p.userId}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5",
                    isMe ? "bg-primary/15" : "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "min-w-0 truncate text-xs",
                      isMe ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {p.displayName}
                    {isMe && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary align-middle">
                        vos
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">
                    {p.homeScore}–{p.awayScore}
                    {p.penaltyWinner && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        (pen. {p.penaltyWinner === "home" ? homeTeamName : awayTeamName})
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ))}
    </div>
  );
}
