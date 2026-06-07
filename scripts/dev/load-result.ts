/**
 * DRY-RUN LOCAL — carga un resultado ficticio en un partido.
 *
 * Marca el partido como finalizado (FT, o PEN si hay ganador de penales)
 * y setea el marcador. Esto dispara el cálculo de puntos en la vista
 * `standings` para todas las predicciones de ese fixture.
 *
 * Uso:
 *   npm run dev:load-result -- <fixtureId> <home> <away> [penaltyWinner]
 * Ejemplos:
 *   npm run dev:load-result -- 990001 2 0
 *   npm run dev:load-result -- 990005 1 1 home    (eliminatoria a penales)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServerClient } from "@/lib/supabase/server";

async function main() {
  const [idRaw, homeRaw, awayRaw, penRaw] = process.argv.slice(2);

  if (!idRaw || homeRaw === undefined || awayRaw === undefined) {
    throw new Error(
      "Uso: npm run dev:load-result -- <fixtureId> <home> <away> [penaltyWinner]\n" +
      "Ej:  npm run dev:load-result -- 990001 2 0\n" +
      "     npm run dev:load-result -- 990005 1 1 home",
    );
  }

  const fixtureId = parseInt(idRaw, 10);
  const homeScore = parseInt(homeRaw, 10);
  const awayScore = parseInt(awayRaw, 10);

  if ([fixtureId, homeScore, awayScore].some((n) => Number.isNaN(n)) || homeScore < 0 || awayScore < 0) {
    throw new Error("fixtureId, home y away deben ser enteros no negativos");
  }

  let penaltyWinner: "home" | "away" | null = null;
  if (penRaw !== undefined) {
    if (penRaw !== "home" && penRaw !== "away") {
      throw new Error("penaltyWinner debe ser 'home' o 'away'");
    }
    if (homeScore !== awayScore) {
      throw new Error("Solo hay penales si el partido terminó empatado en el marcador");
    }
    penaltyWinner = penRaw;
  }

  const db = createServerClient();

  // Verificar que el fixture existe
  const { data: fixture, error: findErr } = await db
    .from("results")
    .select("fixture_id, home_team_name, away_team_name, stage")
    .eq("fixture_id", fixtureId)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!fixture) throw new Error(`No existe el fixture ${fixtureId} en la tabla results`);

  const status = penaltyWinner ? "PEN" : "FT";
  const { error } = await db
    .from("results")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      penalty_winner: penaltyWinner,
      penalty_home_score: penaltyWinner ? (penaltyWinner === "home" ? 4 : 3) : null,
      penalty_away_score: penaltyWinner ? (penaltyWinner === "away" ? 4 : 3) : null,
      status,
    })
    .eq("fixture_id", fixtureId);
  if (error) throw new Error(error.message);

  const pen = penaltyWinner ? ` (pen. gana ${penaltyWinner})` : "";
  console.log(
    `✅ Resultado cargado: ${fixture.home_team_name} ${homeScore}–${awayScore} ${fixture.away_team_name}${pen}  [${status}]`,
  );
  console.log("   Verificá el ranking en /ranking o con: npm run dev:standings");
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
