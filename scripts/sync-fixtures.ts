/**
 * Sincroniza la tabla `results` con los datos de api-football.
 * Ejecutar manualmente o configurar como cron en Vercel/GitHub Actions.
 * Uso: npm run sync
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { fetchFixtures } from "@/lib/services/fixtures.service";
import { ResultsRepository } from "@/lib/data/results.repository";
import type { DbResult } from "@/lib/data/types";

async function main() {
  console.log("🔄 Sincronizando fixtures con api-football...\n");

  // revalidate=0 → siempre fresh (no Next.js cache fuera del runtime)
  const fixtures = await fetchFixtures({}, 0);
  console.log(`   ${fixtures.length} fixtures recibidos de api-football`);

  const rows: Omit<DbResult, "updated_at">[] = fixtures.map((f) => ({
    fixture_id:     f.fixtureId,
    home_team_name: f.homeTeam.name,
    away_team_name: f.awayTeam.name,
    home_team_logo: f.homeTeam.logo,
    away_team_logo: f.awayTeam.logo,
    home_score:     f.homeScore,
    away_score:     f.awayScore,
    penalty_winner:     f.penaltyWinner,
    penalty_home_score: f.penaltyHomeScore,
    penalty_away_score: f.penaltyAwayScore,
    stage:          f.stage,
    round:          f.round,
    group_name:     f.groupName,
    kickoff_at:     f.kickoffAt,
    status:         f.status,
  }));

  const repo = new ResultsRepository();
  await repo.upsertMany(rows);

  const finished = rows.filter((r) =>
    ["FT", "AET", "PEN"].includes(r.status),
  ).length;

  console.log(`\n✅ Sincronizados ${rows.length} fixtures`);
  console.log(`   ${finished} finalizados | ${rows.length - finished} pendientes/en juego`);
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
