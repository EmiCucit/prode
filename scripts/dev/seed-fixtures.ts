/**
 * DRY-RUN LOCAL — siembra partidos ficticios en la tabla `results`.
 *
 * Los kickoffs son relativos al momento de ejecución para que la ventana
 * de predicción quede abierta durante la prueba. IDs en rango 99000x para
 * no chocar con los fixture_id reales de api-football.
 *
 * Requiere FIXTURES_SOURCE=db en .env.local para que la UI los muestre.
 * Uso: npm run dev:seed-fixtures
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { ResultsRepository } from "@/lib/data/results.repository";
import type { DbResult } from "@/lib/data/types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const at = (ms: number) => new Date(now + ms).toISOString();

type Seed = Omit<DbResult, "updated_at" | "home_team_logo" | "away_team_logo"
  | "home_score" | "away_score" | "penalty_winner"
  | "penalty_home_score" | "penalty_away_score">;

const FIXTURES: Seed[] = [
  // ── Fase de grupos — ventana ABIERTA (kickoff futuro) ──
  { fixture_id: 990001, home_team_name: "Argentina", away_team_name: "Arabia Saudita",
    stage: "group", round: "Group A - 1", group_name: "A", kickoff_at: at(2 * DAY), status: "NS" },
  { fixture_id: 990002, home_team_name: "México", away_team_name: "Polonia",
    stage: "group", round: "Group A - 1", group_name: "A", kickoff_at: at(2 * DAY + 3 * HOUR), status: "NS" },
  { fixture_id: 990003, home_team_name: "Brasil", away_team_name: "Serbia",
    stage: "group", round: "Group B - 1", group_name: "B", kickoff_at: at(3 * DAY), status: "NS" },
  { fixture_id: 990004, home_team_name: "Suiza", away_team_name: "Camerún",
    stage: "group", round: "Group B - 1", group_name: "B", kickoff_at: at(3 * DAY + 3 * HOUR), status: "NS" },

  // ── Eliminatorias — ventana ABIERTA (para probar penales) ──
  { fixture_id: 990005, home_team_name: "España", away_team_name: "Portugal",
    stage: "knockout", round: "Round of 16", group_name: null, kickoff_at: at(5 * DAY), status: "NS" },
  { fixture_id: 990006, home_team_name: "Francia", away_team_name: "Inglaterra",
    stage: "knockout", round: "Quarter-finals", group_name: null, kickoff_at: at(6 * DAY), status: "NS" },

  // ── Casos borde ──
  // Cierra pronto (kickoff en 5 min → ventana ya cerrada, faltan <10 min)
  { fixture_id: 990007, home_team_name: "Alemania", away_team_name: "Japón",
    stage: "group", round: "Group C - 1", group_name: "C", kickoff_at: at(5 * 60 * 1000), status: "NS" },
  // Kickoff en el pasado → ventana cerrada
  { fixture_id: 990008, home_team_name: "Croacia", away_team_name: "Bélgica",
    stage: "group", round: "Group C - 1", group_name: "C", kickoff_at: at(-3 * HOUR), status: "NS" },
];

async function main() {
  const rows: Omit<DbResult, "updated_at">[] = FIXTURES.map((f) => ({
    ...f,
    home_team_logo: null,
    away_team_logo: null,
    home_score: null,
    away_score: null,
    penalty_winner: null,
    penalty_home_score: null,
    penalty_away_score: null,
  }));

  await new ResultsRepository().upsertMany(rows);

  console.log(`✅ ${rows.length} partidos ficticios sembrados en \`results\`:\n`);
  for (const f of FIXTURES) {
    const mins = Math.round((new Date(f.kickoff_at).getTime() - now) / 60000);
    const when = mins < 0 ? `hace ${-mins} min` : mins < 120 ? `en ${mins} min` : `en ${Math.round(mins / 60)} h`;
    console.log(`   ${f.fixture_id}  ${f.home_team_name} vs ${f.away_team_name}  [${f.stage}]  kickoff ${when}`);
  }
  console.log("\n💡 Asegurate de tener FIXTURES_SOURCE=db en .env.local y reiniciar `npm run dev`.");
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
