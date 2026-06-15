import { createServerClient } from "@/lib/supabase/server";
import type { IPredictionsRepository, UpsertPredictionParams } from "@/lib/data/interfaces";
import type { DbPrediction, PenaltyWinner, RevealedPrediction } from "@/lib/data/types";

// Forma cruda de la fila al joinear predictions con users. supabase-js tipa la
// relación como objeto o array según la inferencia, por eso aceptamos ambos.
interface RevealUser {
  display_name: string;
  avatar_key: string;
}
interface RevealRow {
  user_id: string;
  fixture_id: number;
  home_score: number;
  away_score: number;
  penalty_winner: PenaltyWinner | null;
  users: RevealUser | RevealUser[] | null;
}

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

  async findAll(): Promise<DbPrediction[]> {
    const db = createServerClient();
    const { data, error } = await db.from("predictions").select("*");
    if (error) throw new Error(`findAll predictions: ${error.message}`);
    return (data ?? []) as DbPrediction[];
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

  /**
   * Predicciones de todos los jugadores para los fixtures dados, con el nombre
   * del jugador (join con users), agrupadas por fixture_id y ordenadas por
   * nombre. Pensado para revelar las predicciones cuando el partido está por
   * empezar; el filtro temporal lo decide quien llama.
   */
  async findRevealedForFixtures(
    fixtureIds: number[],
  ): Promise<Map<number, RevealedPrediction[]>> {
    const map = new Map<number, RevealedPrediction[]>();
    if (fixtureIds.length === 0) return map;

    const db = createServerClient();
    const { data, error } = await db
      .from("predictions")
      .select(
        "user_id, fixture_id, home_score, away_score, penalty_winner, users(display_name, avatar_key)",
      )
      .in("fixture_id", fixtureIds);
    if (error) throw new Error(`findRevealedForFixtures: ${error.message}`);

    const one = <T,>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? (v[0] ?? null) : v;

    for (const row of (data ?? []) as unknown as RevealRow[]) {
      const u = one(row.users);
      const list = map.get(row.fixture_id) ?? [];
      list.push({
        userId: row.user_id,
        displayName: u?.display_name ?? "?",
        avatarKey: u?.avatar_key ?? "",
        homeScore: row.home_score,
        awayScore: row.away_score,
        penaltyWinner: row.penalty_winner,
      });
      map.set(row.fixture_id, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
    }
    return map;
  }
}
