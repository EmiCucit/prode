export const CUTOFF_MINUTES = 15;

/**
 * Returns true if there is still time to submit a prediction.
 * Predictions close exactly CUTOFF_MINUTES before kickoff (exclusive).
 */
export function isPredictionOpen(kickoffAt: Date, now: Date = new Date()): boolean {
  return kickoffAt.getTime() - now.getTime() > CUTOFF_MINUTES * 60 * 1000;
}

export function msUntilCutoff(kickoffAt: Date, now: Date = new Date()): number {
  return kickoffAt.getTime() - now.getTime() - CUTOFF_MINUTES * 60 * 1000;
}
