import { fetchFixtures } from "@/lib/services/fixtures.service";
import { ResultsRepository } from "@/lib/data/results.repository";
import type { DbResult } from "@/lib/data/types";

export interface SyncSummary {
  total: number;
  finished: number;
}

const FINISHED = new Set(["FT", "AET", "PEN"]);

/**
 * Trae todos los fixtures del Mundial desde football-data.org y los vuelca
 * en la tabla `results` (upsert por fixture_id). El ranking se recalcula solo
 * vía la vista SQL `standings`, así que basta con mantener esta tabla al día.
 *
 * Compartido por el script `npm run sync` (cron de GitHub Actions) y el
 * endpoint `/api/cron/sync` (cron externo más confiable). revalidate=0 →
 * siempre fresh, sin pasar por la Data Cache de Next.
 */
export async function syncFixtures(): Promise<SyncSummary> {
  const fixtures = await fetchFixtures({}, 0);

  const rows: Omit<DbResult, "updated_at">[] = fixtures.map((f) => ({
    fixture_id:         f.fixtureId,
    home_team_name:     f.homeTeam.name,
    away_team_name:     f.awayTeam.name,
    home_team_logo:     f.homeTeam.logo,
    away_team_logo:     f.awayTeam.logo,
    home_score:         f.homeScore,
    away_score:         f.awayScore,
    penalty_winner:     f.penaltyWinner,
    penalty_home_score: f.penaltyHomeScore,
    penalty_away_score: f.penaltyAwayScore,
    stage:              f.stage,
    round:              f.round,
    group_name:         f.groupName,
    kickoff_at:         f.kickoffAt,
    status:             f.status,
  }));

  await new ResultsRepository().upsertMany(rows);

  const finished = rows.filter((r) => FINISHED.has(r.status)).length;
  return { total: rows.length, finished };
}
