import { createServerClient } from "@/lib/supabase/server";
import type { IResultsRepository } from "@/lib/data/interfaces";
import type { DbResult } from "@/lib/data/types";

export class ResultsRepository implements IResultsRepository {
  async findAll(): Promise<DbResult[]> {
    const db = createServerClient();
    const { data, error } = await db
      .from("results")
      .select("*")
      .order("kickoff_at", { ascending: true });
    if (error) throw new Error(`findAll results: ${error.message}`);
    return (data ?? []) as DbResult[];
  }

  async findById(fixtureId: number): Promise<DbResult | null> {
    const db = createServerClient();
    const { data, error } = await db
      .from("results")
      .select("*")
      .eq("fixture_id", fixtureId)
      .maybeSingle();
    if (error) throw new Error(`findById result: ${error.message}`);
    return (data ?? null) as DbResult | null;
  }

  async upsertMany(results: Omit<DbResult, "updated_at">[]): Promise<void> {
    if (results.length === 0) return;
    const db = createServerClient();
    const { error } = await db
      .from("results")
      .upsert(results, { onConflict: "fixture_id" });
    if (error) throw new Error(`upsertMany results: ${error.message}`);
  }
}
