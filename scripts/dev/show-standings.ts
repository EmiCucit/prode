/**
 * DRY-RUN LOCAL — imprime la vista `standings` por consola.
 * Útil para verificar el cálculo de puntos sin abrir el navegador.
 * Uso: npm run dev:standings
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServerClient } from "@/lib/supabase/server";

async function main() {
  const db = createServerClient();
  const { data, error } = await db
    .from("standings")
    .select("display_name, total_points, exact_results, correct_outcomes, predictions_made");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    display_name: string;
    total_points: number;
    exact_results: number;
    correct_outcomes: number;
    predictions_made: number;
  }>;

  // La vista ya ordena por puntos; reforzamos por si acaso.
  rows.sort((a, b) =>
    b.total_points - a.total_points ||
    b.exact_results - a.exact_results ||
    a.display_name.localeCompare(b.display_name, "es"),
  );

  console.log("\n🏆 RANKING (vista standings)\n");
  console.log("  #  Jugador        Pts  Exactos  Aciertos  Predich.");
  console.log("  ─────────────────────────────────────────────────");
  rows.forEach((r, i) => {
    const pos = String(i + 1).padStart(2);
    const name = r.display_name.padEnd(13);
    const pts = String(r.total_points).padStart(4);
    const ex = String(r.exact_results).padStart(7);
    const co = String(r.correct_outcomes).padStart(8);
    const pm = String(r.predictions_made).padStart(8);
    console.log(`  ${pos}  ${name}${pts}  ${ex}  ${co}  ${pm}`);
  });
  console.log("");
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
