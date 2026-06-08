export type Stage = "group" | "knockout";
export type PenaltyWinner = "home" | "away";
export type MatchStatus =
  | "NS" | "1H" | "HT" | "2H" | "ET" | "BT" | "P"
  | "FT" | "AET" | "PEN"
  | "SUSP" | "INT" | "ABD" | "AWD" | "WO";

export const FINISHED_STATUSES: MatchStatus[] = ["FT", "AET", "PEN"];

export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  avatar_key: string;
  created_at: string;
}

export interface DbResult {
  fixture_id: number;
  home_team_name: string;
  away_team_name: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner: PenaltyWinner | null;
  penalty_home_score: number | null;
  penalty_away_score: number | null;
  stage: Stage;
  round: string;
  group_name: string | null;
  kickoff_at: string;
  status: MatchStatus;
  updated_at: string;
}

export interface DbPrediction {
  id: string;
  user_id: string;
  fixture_id: number;
  home_score: number;
  away_score: number;
  penalty_winner: PenaltyWinner | null;
  created_at: string;
  updated_at: string;
}

export interface DbStandingRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_key: string;
  predictions_made: number;
  total_points: number;
  exact_results: number;
  exact_with_bonus: number;
  correct_outcomes: number;
}
