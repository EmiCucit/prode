export interface StandingRow {
  userId: string;
  username: string;
  displayName: string;
  totalPoints: number;
  exactResults: number;
  /** Aciertos del bonus de penales (1pt c/u), sobre pleno o empate acertado. */
  penaltyBonuses: number;
  correctOutcomes: number;
  predictionsMade: number;
}

export function buildRanking(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactResults !== a.exactResults) return b.exactResults - a.exactResults;
    return a.displayName.localeCompare(b.displayName, "es");
  });
}
