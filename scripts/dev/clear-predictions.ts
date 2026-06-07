/**
 * DRY-RUN LOCAL — borra TODAS las predicciones (limpieza de pruebas).
 * Solo para entornos de prueba. Uso: npm run dev:clear-predictions
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServerClient } from "@/lib/supabase/server";

async function main() {
  const db = createServerClient();
  const { error, count } = await db
    .from("predictions")
    .delete({ count: "exact" })
    .gte("fixture_id", 0); // match-all (delete requiere un filtro)
  if (error) throw new Error(error.message);
  console.log(`🧹 ${count ?? 0} predicciones eliminadas.`);
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
