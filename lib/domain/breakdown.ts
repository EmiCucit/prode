import { calcPoints } from "@/lib/domain/scoring";
import type { Stage } from "@/lib/domain/scoring";
import type { DbPrediction, DbResult, PenaltyWinner } from "@/lib/data/types";

/**
 * Una predicción del usuario sobre un partido ya finalizado, con el resultado
 * real y los puntos ya calculados. Serializable (solo strings/numbers) para
 * pasarse de un Server Component al RankingTable cliente.
 */
export interface FinishedPrediction {
  fixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  penaltyWinner: PenaltyWinner | null;
  predHomeScore: number;
  predAwayScore: number;
  predPenaltyWinner: PenaltyWinner | null;
  points: number;
  kickoffAt: string;
  stage: Stage;
  round: string;
  groupName: string | null;
}

const FINISHED = new Set(["FT", "AET", "PEN"]);

/**
 * El partido finalizado (con marcador) más reciente por kickoff, o null si
 * todavía no hay ninguno. Se usa para aclarar en el ranking hasta qué partido
 * están calculados los puntos.
 */
export function latestFinishedResult(results: DbResult[]): DbResult | null {
  let latest: DbResult | null = null;
  for (const r of results) {
    if (!FINISHED.has(r.status) || r.home_score === null || r.away_score === null) continue;
    if (!latest || r.kickoff_at > latest.kickoff_at) latest = r;
  }
  return latest;
}

/**
 * Para cada usuario, arma la lista de sus predicciones en partidos ya
 * finalizados (status FT/AET/PEN y con marcador cargado), ordenadas por
 * kickoff descendente (el más reciente primero) y con los puntos calculados
 * con la misma `calcPoints` que alimenta el ranking. Devuelve un Record
 * indexado por user_id, listo para serializar al cliente.
 */
export function buildBreakdowns(
  predictions: DbPrediction[],
  results: DbResult[],
): Record<string, FinishedPrediction[]> {
  const finishedById = new Map<number, DbResult>();
  for (const r of results) {
    if (FINISHED.has(r.status) && r.home_score !== null && r.away_score !== null) {
      finishedById.set(r.fixture_id, r);
    }
  }

  const byUser: Record<string, FinishedPrediction[]> = {};
  for (const p of predictions) {
    const r = finishedById.get(p.fixture_id);
    if (!r || r.home_score === null || r.away_score === null) continue;

    const points = calcPoints(
      {
        homeScore: p.home_score,
        awayScore: p.away_score,
        penaltyWinner: p.penalty_winner ?? undefined,
      },
      {
        homeScore: r.home_score,
        awayScore: r.away_score,
        penaltyWinner: r.penalty_winner ?? undefined,
        stage: r.stage,
      },
    );

    (byUser[p.user_id] ??= []).push({
      fixtureId: p.fixture_id,
      homeTeamName: r.home_team_name,
      awayTeamName: r.away_team_name,
      homeScore: r.home_score,
      awayScore: r.away_score,
      penaltyWinner: r.penalty_winner,
      predHomeScore: p.home_score,
      predAwayScore: p.away_score,
      predPenaltyWinner: p.penalty_winner,
      points,
      kickoffAt: r.kickoff_at,
      stage: r.stage,
      round: r.round,
      groupName: r.group_name,
    });
  }

  for (const list of Object.values(byUser)) {
    list.sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt));
  }
  return byUser;
}
