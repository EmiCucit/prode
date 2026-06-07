/**
 * DRY-RUN LOCAL — elimina los partidos ficticios (99000x) y sus
 * predicciones asociadas. Deja la base de dev limpia tras la prueba.
 * Uso: npm run dev:clear-fixtures
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServerClient } from "@/lib/supabase/server";

const MIN_ID = 990000;
const MAX_ID = 999999;

async function main() {
  const db = createServerClient();

  // Predicciones primero (FK → results.fixture_id)
  const { error: predErr, count: predCount } = await db
    .from("predictions")
    .delete({ count: "exact" })
    .gte("fixture_id", MIN_ID)
    .lte("fixture_id", MAX_ID);
  if (predErr) throw new Error(`borrando predicciones: ${predErr.message}`);

  const { error: resErr, count: resCount } = await db
    .from("results")
    .delete({ count: "exact" })
    .gte("fixture_id", MIN_ID)
    .lte("fixture_id", MAX_ID);
  if (resErr) throw new Error(`borrando results: ${resErr.message}`);

  console.log(`🧹 Limpieza completa: ${resCount ?? 0} partidos y ${predCount ?? 0} predicciones eliminadas.`);
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
