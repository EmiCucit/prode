import { cn, formatMatchTime } from "@/lib/utils";
import { calcPoints } from "@/lib/domain/scoring";
import { isPredictionOpen } from "@/lib/domain/cutoff";
import StatusBadge from "@/components/atoms/StatusBadge";
import PredictionForm from "@/components/molecules/PredictionForm";
import type { Fixture } from "@/lib/services/fixtures.service";
import type { DbPrediction } from "@/lib/data/types";

const FINISHED = new Set(["FT", "AET", "PEN"]);

function PointsBadge({ pts }: { pts: number }) {
  // Puntajes posibles: 0, 1, 3 (base) + 0/1 de bonus por penales → 0,1,2,3,4.
  const label =
    pts === 4
      ? "⭐ Exacto + pen"
      : pts === 3
        ? "⭐ Exacto"
        : pts === 2
          ? "✓ Resultado + pen"
          : pts === 1
            ? "✓ Resultado"
            : "✗ Sin puntos";

  return (
    <span
      className={cn(
        "text-xs font-semibold",
        pts === 4 && "text-celeste",
        pts === 3 && "text-green-400",
        pts === 2 && "text-emerald-400",
        pts === 1 && "text-yellow-400",
        pts === 0 && "text-muted-foreground",
      )}
    >
      {label} ({pts} pt{pts !== 1 ? "s" : ""})
    </span>
  );
}

function TeamLogo({ logo, name }: { logo: string; name: string }) {
  // Sin logo (p.ej. fixtures locales o dato faltante de api-football):
  // mostramos la inicial en un círculo en vez de un <img src=""> roto.
  if (!logo) {
    return (
      <div
        aria-label={name}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground"
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={name}
      width={32}
      height={32}
      className="h-8 w-8 object-contain"
    />
  );
}

interface Props {
  fixture: Fixture;
  prediction: DbPrediction | null;
}

export default function FixtureCard({ fixture, prediction }: Props) {
  const {
    fixtureId, homeTeam, awayTeam, homeScore, awayScore,
    penaltyWinner, penaltyHomeScore, penaltyAwayScore,
    stage, round, kickoffAt, status,
  } = fixture;

  const isFinished = FINISHED.has(status);
  const isLive = ["1H", "2H", "ET", "P", "HT", "BT"].includes(status);
  const isOpenInitial = isPredictionOpen(new Date(kickoffAt));
  // football-data (free tier) a veces marca el partido como FINISHED o
  // IN_PLAY antes de publicar el marcador → score null. Distinguir esto de
  // un 0–0 real es clave: nunca mostrar "0 — 0" cuando todavía no hay dato.
  const hasScore = homeScore !== null && awayScore !== null;

  const pts =
    isFinished && prediction && homeScore !== null && awayScore !== null
      ? calcPoints(
          {
            homeScore: prediction.home_score,
            awayScore: prediction.away_score,
            penaltyWinner: prediction.penalty_winner ?? undefined,
          },
          { homeScore, awayScore, penaltyWinner: penaltyWinner ?? undefined, stage },
        )
      : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <StatusBadge status={status} />
        <span>{stage === "group" && fixture.groupName ? `Grupo ${fixture.groupName}` : round}</span>
      </div>

      {/* Teams + score */}
      <div className="flex items-center justify-between gap-2">
        {/* Home */}
        <div className="flex flex-col items-center gap-1 w-24 sm:w-32 text-center">
          <TeamLogo logo={homeTeam.logo} name={homeTeam.name} />
          <span className="text-sm font-medium leading-tight">{homeTeam.name}</span>
        </div>

        {/* Score / time */}
        <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
          {isLive || isFinished ? (
            <>
              <span className="text-2xl font-bold tabular-nums">
                {hasScore ? `${homeScore} — ${awayScore}` : "– — –"}
              </span>
              {!hasScore && (
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  {isFinished ? "Resultado pendiente de actualizar" : "Marcador no disponible"}
                </span>
              )}
              {penaltyWinner && (
                <span className="text-xs text-muted-foreground">
                  {penaltyHomeScore !== null && penaltyAwayScore !== null ? (
                    <>
                      Penales: <span className="font-semibold text-foreground tabular-nums">{penaltyHomeScore}–{penaltyAwayScore}</span>{" "}
                      <span className="opacity-70">
                        ({penaltyWinner === "home" ? homeTeam.name : awayTeam.name})
                      </span>
                    </>
                  ) : (
                    <>Pen. {penaltyWinner === "home" ? homeTeam.name : awayTeam.name}</>
                  )}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {formatMatchTime(kickoffAt)}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-1 w-24 sm:w-32 text-center">
          <TeamLogo logo={awayTeam.logo} name={awayTeam.name} />
          <span className="text-sm font-medium leading-tight">{awayTeam.name}</span>
        </div>
      </div>

      {/* Prediction area */}
      <div className="border-t border-border/50 pt-3">
        {isFinished ? (
          prediction ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Tu predicción:{" "}
                <span className="font-semibold text-foreground">
                  {prediction.home_score}–{prediction.away_score}
                  {prediction.penalty_winner &&
                    ` (pen. ${prediction.penalty_winner === "home" ? homeTeam.name : awayTeam.name})`}
                </span>
              </span>
              {pts !== null && <PointsBadge pts={pts} />}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin predicción</p>
          )
        ) : (
          <PredictionForm
            fixtureId={fixtureId}
            stage={stage}
            kickoffAt={kickoffAt}
            initialHomeScore={prediction?.home_score ?? 0}
            initialAwayScore={prediction?.away_score ?? 0}
            initialPenaltyWinner={prediction?.penalty_winner ?? undefined}
            homeTeamName={homeTeam.name}
            awayTeamName={awayTeam.name}
            hasExisting={prediction !== null}
            isOpenInitial={isOpenInitial}
          />
        )}
      </div>
    </div>
  );
}
