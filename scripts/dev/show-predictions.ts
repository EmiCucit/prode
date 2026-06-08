/**
 * DRY-RUN LOCAL — lista las predicciones cargadas, agrupadas por
 * jugador, con el resultado real y los puntos (vía calcPoints) cuando
 * el partido está finalizado. Uso: npm run dev:predictions
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServerClient } from "@/lib/supabase/server";
import { calcPoints } from "@/lib/domain/scoring";
import type { Stage } from "@/lib/data/types";

const FINISHED = new Set(["FT", "AET", "PEN"]);

interface ResultJoin {
  home_team_name: string;
  away_team_name: string;
  stage: Stage;
  status: string;
  home_score: number | null;
  away_score: number | null;
  penalty_winner: "home" | "away" | null;
}

async function main() {
  const db = createServerClient();

  const { data, error } = await db
    .from("predictions")
    .select(
      "fixture_id, home_score, away_score, penalty_winner, " +
      "users(display_name), " +
      "results(home_team_name, away_team_name, stage, status, home_score, away_score, penalty_winner)",
    )
    .order("fixture_id", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Array<{
    fixture_id: number;
    home_score: number;
    away_score: number;
    penalty_winner: "home" | "away" | null;
    users: { display_name: string } | { display_name: string }[] | null;
    results: ResultJoin | ResultJoin[] | null;
  }>;

  const one = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  console.log(`\n📋 PREDICCIONES (${rows.length})\n`);
  const byUser = new Map<string, typeof rows>();
  for (const p of rows) {
    const name = one(p.users)?.display_name ?? "?";
    if (!byUser.has(name)) byUser.set(name, []);
    byUser.get(name)!.push(p);
  }

  for (const [name, ps] of byUser) {
    console.log(`👤 ${name}`);
    for (const p of ps) {
      const r = one(p.results);
      const match = r ? `${r.home_team_name} vs ${r.away_team_name}` : `#${p.fixture_id}`;
      const pen = p.penalty_winner ? ` (pen. ${p.penalty_winner})` : "";
      let suffix = "";
      if (r && FINISHED.has(r.status) && r.home_score !== null && r.away_score !== null) {
        const pts = calcPoints(
          { homeScore: p.home_score, awayScore: p.away_score, penaltyWinner: p.penalty_winner ?? undefined },
          { homeScore: r.home_score, awayScore: r.away_score, penaltyWinner: r.penalty_winner ?? undefined, stage: r.stage },
        );
        const realPen = r.penalty_winner ? ` (pen. ${r.penalty_winner})` : "";
        suffix = `  → real ${r.home_score}–${r.away_score}${realPen}  = ${pts} pt${pts !== 1 ? "s" : ""}`;
      }
      console.log(`   ${match}: ${p.home_score}–${p.away_score}${pen}${suffix}`);
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
