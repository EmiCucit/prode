import { createServerClient } from "@/lib/supabase/server";
import type { IPredictionsRepository, UpsertPredictionParams } from "@/lib/data/interfaces";
import type { DbPrediction } from "@/lib/data/types";

export class PredictionsRepository implements IPredictionsRepository {
  async upsert(params: UpsertPredictionParams): Promise<void> {
    const db = createServerClient();
    const { error } = await db.from("predictions").upsert(
      {
        user_id: params.userId,
        fixture_id: params.fixtureId,
        home_score: params.homeScore,
        away_score: params.awayScore,
        penalty_winner: params.penaltyWinner ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,fixture_id" },
    );
    if (error) throw new Error(`upsert prediction: ${error.message}`);
  }

  async findByUser(userId: string): Promise<DbPrediction[]> {
    const db = createServerClient();
    const { data, error } = await db
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .order("fixture_id", { ascending: true });
    if (error) throw new Error(`findByUser: ${error.message}`);
    return (data ?? []) as DbPrediction[];
  }

  async findByUserAndFixture(
    userId: string,
    fixtureId: number,
  ): Promise<DbPrediction | null> {
    const db = createServerClient();
    const { data, error } = await db
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .eq("fixture_id", fixtureId)
      .maybeSingle();
    if (error) throw new Error(`findByUserAndFixture: ${error.message}`);
    return (data ?? null) as DbPrediction | null;
  }

  async findAllForFixture(fixtureId: number): Promise<DbPrediction[]> {
    const db = createServerClient();
    const { data, error } = await db
      .from("predictions")
      .select("*")
      .eq("fixture_id", fixtureId);
    if (error) throw new Error(`findAllForFixture: ${error.message}`);
    return (data ?? []) as DbPrediction[];
  }
}
