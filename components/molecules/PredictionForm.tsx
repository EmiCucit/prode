"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ScoreInput from "@/components/atoms/ScoreInput";
import Countdown from "@/components/atoms/Countdown";
import { CUTOFF_MINUTES } from "@/lib/domain/cutoff";

interface Props {
  fixtureId: number;
  stage: "group" | "knockout";
  kickoffAt: string;
  initialHomeScore: number;
  initialAwayScore: number;
  initialPenaltyWinner?: "home" | "away";
  homeTeamName: string;
  awayTeamName: string;
  hasExisting: boolean;
  isOpenInitial: boolean;
}

type SubmitStatus = "idle" | "loading" | "success" | "error";

export default function PredictionForm({
  fixtureId,
  stage,
  kickoffAt,
  initialHomeScore,
  initialAwayScore,
  initialPenaltyWinner,
  homeTeamName,
  awayTeamName,
  hasExisting,
  isOpenInitial,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(isOpenInitial);
  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);
  const [penaltyWinner, setPenaltyWinner] = useState<"home" | "away" | undefined>(
    initialPenaltyWinner,
  );
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cutoffAt = new Date(
    new Date(kickoffAt).getTime() - CUTOFF_MINUTES * 60 * 1000,
  );

  const handleExpire = useCallback(() => setIsOpen(false), []);

  // Los penales solo aplican en eliminatoria y si el marcador es empate
  const showPenalty = stage === "knockout" && homeScore === awayScore;

  // ¿Cambió algo respecto de la predicción guardada?
  const isDirty =
    homeScore !== initialHomeScore ||
    awayScore !== initialAwayScore ||
    (showPenalty && penaltyWinner !== initialPenaltyWinner);

  // Si ya hay predicción guardada y no se modificó, no hay nada que actualizar
  const nothingToSave = hasExisting && !isDirty;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isOpen || nothingToSave) return;

    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixtureId,
          homeScore,
          awayScore,
          penaltyWinner: showPenalty ? penaltyWinner : undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al guardar");
      }

      setStatus("success");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error de red");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  if (!isOpen) {
    return (
      <p className="text-xs text-muted-foreground">
        {hasExisting
          ? `Tu predicción: ${initialHomeScore}–${initialAwayScore}${initialPenaltyWinner ? ` (pen. ${initialPenaltyWinner === "home" ? homeTeamName : awayTeamName})` : ""}`
          : "Predicciones cerradas"}
      </p>
    );
  }

  const busy = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <ScoreInput id={`h-${fixtureId}`} value={homeScore} onChange={setHomeScore} disabled={busy} />
          <span className="text-muted-foreground font-bold">–</span>
          <ScoreInput id={`a-${fixtureId}`} value={awayScore} onChange={setAwayScore} disabled={busy} />
        </div>

        <span className="group relative inline-flex">
          <button
            type="submit"
            // No usamos `disabled` nativo cuando no hay cambios: un botón
            // deshabilitado no dispara hover y el tooltip no se vería. El
            // submit ya está bloqueado en handleSubmit (nothingToSave).
            disabled={busy}
            aria-disabled={nothingToSave || undefined}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-opacity ${
              nothingToSave
                ? "bg-primary text-primary-foreground opacity-50 cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            }`}
          >
            {status === "success" ? "✓ Guardado" : busy ? "Guardando…" : hasExisting ? "Actualizar" : "Guardar"}
          </button>

          {nothingToSave && (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[14rem] -translate-x-1/2 rounded-md border border-border bg-accent px-2.5 py-1.5 text-center text-xs font-light-bold leading-snug text-foreground shadow-lg shadow-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            >
              Modificá el resultado cargado para poder actualizar
              <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-accent" />
            </span>
          )}
        </span>

        <Countdown cutoffAt={cutoffAt} onExpire={handleExpire} />
      </div>

      {showPenalty && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground text-xs">Penales:</span>
          {(["home", "away"] as const).map((side) => (
            <label key={side} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`pen-${fixtureId}`}
                value={side}
                checked={penaltyWinner === side}
                onChange={() => setPenaltyWinner(side)}
                disabled={busy}
                className="accent-primary"
              />
              <span className="text-foreground text-xs">
                {side === "home" ? homeTeamName : awayTeamName}
              </span>
            </label>
          ))}
          {penaltyWinner && (
            <button
              type="button"
              onClick={() => setPenaltyWinner(undefined)}
              className="text-xs text-muted-foreground underline"
            >
              Quitar
            </button>
          )}
        </div>
      )}

      {status === "error" && errorMsg && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </form>
  );
}
