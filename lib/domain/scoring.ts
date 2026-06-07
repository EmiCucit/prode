export type Stage = "group" | "knockout";

export interface Prediction {
  homeScore: number;
  awayScore: number;
  penaltyWinner?: "home" | "away";
}

export interface Result {
  homeScore: number;
  awayScore: number;
  penaltyWinner?: "home" | "away";
  stage: Stage;
}

function outcomeOf(s: { homeScore: number; awayScore: number }): "home" | "away" | "draw" {
  if (s.homeScore > s.awayScore) return "home";
  if (s.homeScore < s.awayScore) return "away";
  return "draw";
}

export function calcPoints(prediction: Prediction, result: Result): number {
  const isExact =
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore;

  const isCorrectOutcome = outcomeOf(prediction) === outcomeOf(result);

  const basePoints = isExact ? 3 : isCorrectOutcome ? 1 : 0;

  const penaltyBonus =
    result.stage === "knockout" &&
    result.penaltyWinner !== undefined &&
    prediction.penaltyWinner === result.penaltyWinner
      ? 1
      : 0;

  return basePoints + penaltyBonus;
}
