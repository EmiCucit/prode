import { isPredictionOpen } from "@/lib/domain/cutoff";
import type { IPredictionsRepository, IResultsRepository, UpsertPredictionParams } from "@/lib/data/interfaces";

export class PredictionsService {
  constructor(
    private readonly predictions: IPredictionsRepository,
    private readonly results: IResultsRepository,
  ) {}

  async upsert(params: UpsertPredictionParams): Promise<void> {
    const fixture = await this.results.findById(params.fixtureId);

    if (!fixture) {
      throw new Error("Fixture not found");
    }

    if (!isPredictionOpen(new Date(fixture.kickoff_at))) {
      throw new Error("Prediction window is closed");
    }

    // Penalty winner only valid for knockout fixtures
    const sanitized: UpsertPredictionParams = {
      ...params,
      penaltyWinner:
        fixture.stage === "knockout" ? params.penaltyWinner : undefined,
    };

    await this.predictions.upsert(sanitized);
  }

  async getForUser(userId: string) {
    return this.predictions.findByUser(userId);
  }

  async getForUserAndFixture(userId: string, fixtureId: number) {
    return this.predictions.findByUserAndFixture(userId, fixtureId);
  }
}
