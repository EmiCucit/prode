import type { StandingRow } from "@/lib/domain/ranking";
import type { DbPrediction, DbResult, PenaltyWinner } from "@/lib/data/types";

export interface UpsertPredictionParams {
  userId: string;
  fixtureId: number;
  homeScore: number;
  awayScore: number;
  penaltyWinner?: PenaltyWinner;
}

export interface IPredictionsRepository {
  upsert(params: UpsertPredictionParams): Promise<void>;
  findAll(): Promise<DbPrediction[]>;
  findByUser(userId: string): Promise<DbPrediction[]>;
  findByUserAndFixture(userId: string, fixtureId: number): Promise<DbPrediction | null>;
  findAllForFixture(fixtureId: number): Promise<DbPrediction[]>;
}

export interface IResultsRepository {
  findAll(): Promise<DbResult[]>;
  findById(fixtureId: number): Promise<DbResult | null>;
  upsertMany(results: Omit<DbResult, "updated_at">[]): Promise<void>;
}

export interface IStandingsRepository {
  getStandings(): Promise<StandingRow[]>;
}
