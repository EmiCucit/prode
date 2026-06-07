import { describe, it, expect } from "vitest";
import { calcPoints, type Prediction, type Result } from "@/lib/domain/scoring";

const group = (homeScore: number, awayScore: number): Result => ({
  homeScore,
  awayScore,
  stage: "group",
});

const knockout = (
  homeScore: number,
  awayScore: number,
  penaltyWinner?: "home" | "away",
): Result => ({ homeScore, awayScore, penaltyWinner, stage: "knockout" });

const predict = (
  homeScore: number,
  awayScore: number,
  penaltyWinner?: "home" | "away",
): Prediction => ({ homeScore, awayScore, penaltyWinner });

// ── Fase de grupos ────────────────────────────────────────────────

describe("calcPoints — grupo", () => {
  it("resultado exacto → 3 pts", () => {
    expect(calcPoints(predict(2, 1), group(2, 1))).toBe(3);
  });

  it("empate exacto → 3 pts", () => {
    expect(calcPoints(predict(0, 0), group(0, 0))).toBe(3);
  });

  it("ganador local correcto, marcador incorrecto → 1 pt", () => {
    expect(calcPoints(predict(3, 1), group(1, 0))).toBe(1);
  });

  it("ganador visitante correcto, marcador incorrecto → 1 pt", () => {
    expect(calcPoints(predict(0, 2), group(0, 1))).toBe(1);
  });

  it("empate correcto, marcador incorrecto → 1 pt", () => {
    expect(calcPoints(predict(1, 1), group(2, 2))).toBe(1);
  });

  it("resultado completamente errado → 0 pts", () => {
    expect(calcPoints(predict(2, 0), group(0, 1))).toBe(0);
  });

  it("predijo ganador pero hubo empate → 0 pts", () => {
    expect(calcPoints(predict(2, 1), group(1, 1))).toBe(0);
  });

  it("predijo empate pero hubo ganador → 0 pts", () => {
    expect(calcPoints(predict(1, 1), group(2, 1))).toBe(0);
  });

  it("resultado exacto con penalty_winner no suma bonus en grupos", () => {
    expect(calcPoints(predict(1, 1, "home"), group(1, 1))).toBe(3);
  });
});

// ── Eliminatorias (sin penales en el resultado) ───────────────────

describe("calcPoints — eliminatoria sin penales", () => {
  it("resultado exacto → 3 pts (sin bonus de penales)", () => {
    expect(calcPoints(predict(2, 1, "home"), knockout(2, 1))).toBe(3);
  });

  it("ganador correcto, marcador incorrecto → 1 pt", () => {
    expect(calcPoints(predict(3, 0, "home"), knockout(1, 0))).toBe(1);
  });

  it("resultado errado con penalty_winner en predicción → 0 pts", () => {
    expect(calcPoints(predict(0, 1, "away"), knockout(2, 0))).toBe(0);
  });
});

// ── Eliminatorias con penales ─────────────────────────────────────

describe("calcPoints — eliminatoria con penales", () => {
  it("exacto + penalty correcto → 4 pts", () => {
    expect(calcPoints(predict(1, 1, "home"), knockout(1, 1, "home"))).toBe(4);
  });

  it("exacto + penalty incorrecto → 3 pts", () => {
    expect(calcPoints(predict(1, 1, "away"), knockout(1, 1, "home"))).toBe(3);
  });

  it("exacto + sin predicción de penalty → 3 pts", () => {
    expect(calcPoints(predict(1, 1), knockout(1, 1, "home"))).toBe(3);
  });

  it("outcome correcto + penalty correcto → 2 pts", () => {
    expect(calcPoints(predict(2, 2, "away"), knockout(1, 1, "away"))).toBe(2);
  });

  it("outcome correcto + penalty incorrecto → 1 pt", () => {
    expect(calcPoints(predict(2, 2, "home"), knockout(1, 1, "away"))).toBe(1);
  });

  it("outcome correcto + sin predicción de penalty → 1 pt", () => {
    expect(calcPoints(predict(2, 2), knockout(1, 1, "home"))).toBe(1);
  });

  it("outcome incorrecto + penalty correcto → 1 pt (solo bonus)", () => {
    expect(calcPoints(predict(2, 0, "home"), knockout(1, 1, "home"))).toBe(1);
  });

  it("outcome incorrecto + penalty incorrecto → 0 pts", () => {
    expect(calcPoints(predict(2, 0, "away"), knockout(1, 1, "home"))).toBe(0);
  });
});
