import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PredictionsService } from "@/lib/services/predictions.service";
import type {
  IPredictionsRepository,
  IResultsRepository,
  UpsertPredictionParams,
} from "@/lib/data/interfaces";
import type { DbResult, DbPrediction, Stage } from "@/lib/data/types";

// ── Fakes en memoria ──────────────────────────────────────────────

function makeFixture(overrides: Partial<DbResult> = {}): DbResult {
  return {
    fixture_id: 1,
    home_team_name: "Argentina",
    away_team_name: "Brasil",
    home_team_logo: null,
    away_team_logo: null,
    home_score: null,
    away_score: null,
    penalty_winner: null,
    penalty_home_score: null,
    penalty_away_score: null,
    stage: "group",
    round: "Group A",
    group_name: "A",
    // Por defecto, muy en el futuro → ventana abierta
    kickoff_at: "2099-01-01T00:00:00.000Z",
    status: "NS",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

class FakeResultsRepo implements IResultsRepository {
  constructor(private fixture: DbResult | null) {}
  async findById(): Promise<DbResult | null> {
    return this.fixture;
  }
  async findAll(): Promise<DbResult[]> {
    return this.fixture ? [this.fixture] : [];
  }
  async upsertMany(): Promise<void> {}
}

class FakePredictionsRepo implements IPredictionsRepository {
  upsert = vi.fn<(p: UpsertPredictionParams) => Promise<void>>(async () => {});
  findByUser = vi.fn<() => Promise<DbPrediction[]>>(async () => []);
  findByUserAndFixture = vi.fn<() => Promise<DbPrediction | null>>(async () => null);
  findAllForFixture = vi.fn<() => Promise<DbPrediction[]>>(async () => []);
}

function makeService(fixture: DbResult | null) {
  const preds = new FakePredictionsRepo();
  const svc = new PredictionsService(preds, new FakeResultsRepo(fixture));
  return { svc, preds };
}

const baseParams: UpsertPredictionParams = {
  userId: "user-1",
  fixtureId: 1,
  homeScore: 2,
  awayScore: 1,
};

describe("PredictionsService.upsert", () => {
  let now: Date;
  beforeEach(() => {
    now = new Date("2026-06-15T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lanza 'Fixture not found' si el fixture no existe", async () => {
    const { svc, preds } = makeService(null);
    await expect(svc.upsert(baseParams)).rejects.toThrow("Fixture not found");
    expect(preds.upsert).not.toHaveBeenCalled();
  });

  it("lanza 'Prediction window is closed' si faltan <15 min para el kickoff", async () => {
    const kickoff = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const { svc, preds } = makeService(makeFixture({ kickoff_at: kickoff }));
    await expect(svc.upsert(baseParams)).rejects.toThrow("Prediction window is closed");
    expect(preds.upsert).not.toHaveBeenCalled();
  });

  it("lanza 'Prediction window is closed' si el kickoff ya pasó", async () => {
    const kickoff = new Date(now.getTime() - 60 * 1000).toISOString();
    const { svc } = makeService(makeFixture({ kickoff_at: kickoff }));
    await expect(svc.upsert(baseParams)).rejects.toThrow("Prediction window is closed");
  });

  it("permite guardar si faltan >15 min para el kickoff", async () => {
    const kickoff = new Date(now.getTime() + 20 * 60 * 1000).toISOString();
    const { svc, preds } = makeService(makeFixture({ kickoff_at: kickoff }));
    await svc.upsert(baseParams);
    expect(preds.upsert).toHaveBeenCalledOnce();
  });

  it("descarta penaltyWinner en partidos de fase de grupos", async () => {
    const { svc, preds } = makeService(makeFixture({ stage: "group" }));
    await svc.upsert({ ...baseParams, penaltyWinner: "home" });
    expect(preds.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ penaltyWinner: undefined }),
    );
  });

  it("conserva penaltyWinner en partidos de eliminatoria", async () => {
    const { svc, preds } = makeService(makeFixture({ stage: "knockout", round: "Round of 16" }));
    await svc.upsert({ ...baseParams, penaltyWinner: "away" });
    expect(preds.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ penaltyWinner: "away" }),
    );
  });

  it("propaga el resto de los campos sin alterar", async () => {
    const { svc, preds } = makeService(makeFixture({ stage: "knockout" }));
    await svc.upsert({ ...baseParams, homeScore: 3, awayScore: 0 });
    expect(preds.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", fixtureId: 1, homeScore: 3, awayScore: 0 }),
    );
  });
});

describe("PredictionsService — lecturas", () => {
  it("getForUser delega en findByUser", async () => {
    const { svc, preds } = makeService(null);
    await svc.getForUser("user-9");
    expect(preds.findByUser).toHaveBeenCalledWith("user-9");
  });

  it("getForUserAndFixture delega en findByUserAndFixture", async () => {
    const { svc, preds } = makeService(null);
    await svc.getForUserAndFixture("user-9", 42);
    expect(preds.findByUserAndFixture).toHaveBeenCalledWith("user-9", 42);
  });
});
