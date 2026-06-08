import { createServerClient } from "@/lib/supabase/server";
import type { IStandingsRepository } from "@/lib/data/interfaces";
import type { StandingRow } from "@/lib/domain/ranking";
import type { DbStandingRow } from "@/lib/data/types";

export class StandingsRepository implements IStandingsRepository {
  async getStandings(): Promise<StandingRow[]> {
    const db = createServerClient();
    const { data, error } = await db
      .from("standings")
      .select("*")
      .order("total_points", { ascending: false })
      .order("exact_results", { ascending: false })
      .order("display_name", { ascending: true });
    if (error) throw new Error(`getStandings: ${error.message}`);

    return ((data ?? []) as DbStandingRow[]).map((row) => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      totalPoints: Number(row.total_points),
      exactResults: Number(row.exact_results),
      // Tolerante: si la migración 003 aún no se aplicó, la columna no existe → 0
      exactWithBonus: row.exact_with_bonus != null ? Number(row.exact_with_bonus) : 0,
      correctOutcomes: Number(row.correct_outcomes),
      predictionsMade: Number(row.predictions_made),
    }));
  }
}
