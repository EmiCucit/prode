import { describe, it, expect } from "vitest";
import { buildBreakdowns, latestFinishedResult } from "@/lib/domain/breakdown";
import type { DbPrediction, DbResult } from "@/lib/data/types";

function result(over: Partial<DbResult> & { fixture_id: number }): DbResult {
  return {
    fixture_id: over.fixture_id,
    home_team_name: over.home_team_name ?? "Local",
    away_team_name: over.away_team_name ?? "Visitante",
    home_team_logo: over.home_team_logo ?? null,
    away_team_logo: over.away_team_logo ?? null,
    home_score: over.home_score ?? null,
    away_score: over.away_score ?? null,
    penalty_winner: over.penalty_winner ?? null,
    penalty_home_score: over.penalty_home_score ?? null,
    penalty_away_score: over.penalty_away_score ?? null,
    stage: over.stage ?? "group",
    round: over.round ?? "Fase de grupos",
    group_name: over.group_name ?? "A",
    kickoff_at: over.kickoff_at ?? "2026-06-11T19:00:00Z",
    status: over.status ?? "FT",
    updated_at: over.updated_at ?? "2026-06-11T21:00:00Z",
  };
}

function pred(over: Partial<DbPrediction> & { fixture_id: number; user_id: string }): DbPrediction {
  return {
    id: over.id ?? `${over.user_id}-${over.fixture_id}`,
    user_id: over.user_id,
    fixture_id: over.fixture_id,
    home_score: over.home_score ?? 0,
    away_score: over.away_score ?? 0,
    penalty_winner: over.penalty_winner ?? null,
    created_at: over.created_at ?? "2026-06-10T00:00:00Z",
    updated_at: over.updated_at ?? "2026-06-10T00:00:00Z",
  };
}

describe("buildBreakdowns", () => {
  it("solo incluye predicciones de partidos finalizados con marcador", () => {
    const results = [
      result({ fixture_id: 1, home_score: 2, away_score: 0, status: "FT" }),
      result({ fixture_id: 2, home_score: null, away_score: null, status: "NS" }), // no jugado
      result({ fixture_id: 3, home_score: null, away_score: null, status: "FT" }), // FT sin marcador
    ];
    const preds = [
      pred({ user_id: "u1", fixture_id: 1, home_score: 2, away_score: 0 }),
      pred({ user_id: "u1", fixture_id: 2, home_score: 1, away_score: 1 }),
      pred({ user_id: "u1", fixture_id: 3, home_score: 0, away_score: 0 }),
    ];

    const out = buildBreakdowns(preds, results);
    expect(out["u1"]).toHaveLength(1);
    expect(out["u1"]![0]!.fixtureId).toBe(1);
  });

  it("calcula los puntos como el ranking (pleno=3, resultado=1, sin=0)", () => {
    const results = [
      result({ fixture_id: 1, home_score: 2, away_score: 0 }),
      result({ fixture_id: 2, home_score: 1, away_score: 1 }),
      result({ fixture_id: 3, home_score: 0, away_score: 3 }),
    ];
    const preds = [
      pred({ user_id: "u1", fixture_id: 1, home_score: 2, away_score: 0 }), // pleno → 3
      pred({ user_id: "u1", fixture_id: 2, home_score: 0, away_score: 0 }), // empate acertado → 1
      pred({ user_id: "u1", fixture_id: 3, home_score: 1, away_score: 0 }), // erró → 0
    ];

    const byFixture = new Map(
      buildBreakdowns(preds, results)["u1"]!.map((r) => [r.fixtureId, r.points]),
    );
    expect(byFixture.get(1)).toBe(3);
    expect(byFixture.get(2)).toBe(1);
    expect(byFixture.get(3)).toBe(0);
  });

  it("suma el bonus de penales (4) solo en eliminatoria", () => {
    const results = [
      result({
        fixture_id: 9, stage: "knockout", round: "Octavos",
        home_score: 1, away_score: 1, penalty_winner: "home", status: "PEN",
      }),
    ];
    const preds = [
      pred({ user_id: "u1", fixture_id: 9, home_score: 1, away_score: 1, penalty_winner: "home" }),
    ];

    expect(buildBreakdowns(preds, results)["u1"]![0]!.points).toBe(4);
  });

  it("ordena por kickoff descendente (más reciente primero)", () => {
    const results = [
      result({ fixture_id: 1, kickoff_at: "2026-06-11T19:00:00Z", home_score: 1, away_score: 0 }),
      result({ fixture_id: 2, kickoff_at: "2026-06-13T19:00:00Z", home_score: 1, away_score: 0 }),
      result({ fixture_id: 3, kickoff_at: "2026-06-12T19:00:00Z", home_score: 1, away_score: 0 }),
    ];
    const preds = [1, 2, 3].map((fid) =>
      pred({ user_id: "u1", fixture_id: fid, home_score: 1, away_score: 0 }),
    );

    expect(buildBreakdowns(preds, results)["u1"]!.map((r) => r.fixtureId)).toEqual([2, 3, 1]);
  });

  it("agrupa por usuario y omite usuarios sin predicciones finalizadas", () => {
    const results = [result({ fixture_id: 1, home_score: 0, away_score: 0 })];
    const preds = [
      pred({ user_id: "u1", fixture_id: 1, home_score: 0, away_score: 0 }),
    ];

    const out = buildBreakdowns(preds, results);
    expect(Object.keys(out)).toEqual(["u1"]);
    expect(out["u2"]).toBeUndefined();
  });
});

describe("latestFinishedResult", () => {
  it("devuelve el partido finalizado más reciente por kickoff", () => {
    const results = [
      result({ fixture_id: 1, kickoff_at: "2026-06-11T19:00:00Z", home_score: 1, away_score: 0 }),
      result({ fixture_id: 2, kickoff_at: "2026-06-13T19:00:00Z", home_score: 2, away_score: 2 }),
      result({ fixture_id: 3, kickoff_at: "2026-06-12T19:00:00Z", home_score: 0, away_score: 1 }),
    ];
    expect(latestFinishedResult(results)?.fixture_id).toBe(2);
  });

  it("ignora partidos sin marcador o no finalizados", () => {
    const results = [
      result({ fixture_id: 1, kickoff_at: "2026-06-11T19:00:00Z", home_score: 1, away_score: 0, status: "FT" }),
      result({ fixture_id: 2, kickoff_at: "2026-06-20T19:00:00Z", home_score: null, away_score: null, status: "NS" }),
      result({ fixture_id: 3, kickoff_at: "2026-06-25T19:00:00Z", home_score: null, away_score: null, status: "FT" }),
    ];
    expect(latestFinishedResult(results)?.fixture_id).toBe(1);
  });

  it("devuelve null si no hay ningún partido finalizado", () => {
    const results = [result({ fixture_id: 1, home_score: null, away_score: null, status: "NS" })];
    expect(latestFinishedResult(results)).toBeNull();
  });
});
