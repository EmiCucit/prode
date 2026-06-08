/**
 * Diagnóstico de una base Supabase: reporta tablas, vista y columnas clave.
 * Uso: tsx scripts/dev/inspect-db.ts [archivo-env]   (default .env.local)
 *
 * No imprime secretos: solo el ref del proyecto (subdominio de SUPABASE_URL).
 */
import { config } from "dotenv";
const envFile = process.argv[2] ?? ".env.local";
config({ path: envFile });

import { createServerClient } from "@/lib/supabase/server";

async function count(db: ReturnType<typeof createServerClient>, table: string) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) return `ERROR (${error.message})`;
  return `${count ?? 0} filas`;
}

async function main() {
  const url = process.env["SUPABASE_URL"] ?? "(sin SUPABASE_URL)";
  const ref = url.replace(/^https?:\/\//, "").split(".")[0];
  console.log(`\n📦 Env: ${envFile}`);
  console.log(`   Proyecto Supabase ref: ${ref}\n`);

  const db = createServerClient();

  console.log(`  users        : ${await count(db, "users")}`);
  console.log(`  results      : ${await count(db, "results")}`);
  console.log(`  predictions  : ${await count(db, "predictions")}`);
  console.log(`  standings    : ${await count(db, "standings")}`);

  // Migración 002: columnas de penales en results
  const { error: penErr } = await db
    .from("results")
    .select("penalty_home_score, penalty_away_score")
    .limit(1);
  console.log(
    `  002 (penales): ${penErr ? `FALTA (${penErr.message})` : "OK (columnas presentes)"}`,
  );
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
