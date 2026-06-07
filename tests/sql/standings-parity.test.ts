import { describe, it, expect } from "vitest";
import { calcPoints, type Prediction, type Result, type Stage } from "@/lib/domain/scoring";

/**
 * PARIDAD SQL ↔ TypeScript
 * ────────────────────────────────────────────────────────────────
 * Los puntos NO se guardan en BD: se calculan en DOS lugares con la
 * MISMA lógica que debe mantenerse sincronizada:
 *   1. lib/domain/scoring.ts  (calcPoints) — usado en la UI/cliente
 *   2. la vista SQL `standings` (supabase/migrations/001_initial.sql)
 *      — fuente de verdad del ranking que ven los usuarios
 *
 * `sqlStandingsPoints` es una RÉPLICA FIEL de las expresiones CASE de
 * la vista. Si este test falla, la vista SQL y scoring.ts divergieron:
 * actualizá AMBOS y volvé a ejecutar la migración en Supabase.
 *
 * Réplica de 001_initial.sql, líneas 88-104:
 *
 *   COALESCE(SUM(
 *     CASE
 *       WHEN p.home_score = r.home_score AND p.away_score = r.away_score THEN 3
 *       WHEN (p.home_score > p.away_score AND r.home_score > r.away_score)
 *         OR (p.home_score < p.away_score AND r.home_score < r.away_score)
 *         OR (p.home_score = p.away_score AND r.home_score = r.away_score) THEN 1
 *       ELSE 0
 *     END
 *     +
 *     CASE
 *       WHEN r.stage = 'knockout' AND r.penalty_winner IS NOT NULL
 *        AND p.penalty_winner = r.penalty_winner THEN 1
 *       ELSE 0
 *     END
 *   ), 0)
 */
function sqlStandingsPoints(p: Prediction, r: Result): number {
  // ── CASE base ──
  let base: number;
  if (p.homeScore === r.homeScore && p.awayScore === r.awayScore) {
    base = 3;
  } else if (
    (p.homeScore > p.awayScore && r.homeScore > r.awayScore) ||
    (p.homeScore < p.awayScore && r.homeScore < r.awayScore) ||
    (p.homeScore === p.awayScore && r.homeScore === r.awayScore)
  ) {
    base = 1;
  } else {
    base = 0;
  }

  // ── CASE bonus de penales ──
  // En SQL, p.penalty_winner = r.penalty_winner es false (no NULL-true)
  // cuando p.penalty_winner es NULL, así que el bonus no aplica.
  const bonus =
    r.stage === "knockout" &&
    r.penaltyWinner != null &&
    p.penaltyWinner != null &&
    p.penaltyWinner === r.penaltyWinner
      ? 1
      : 0;

  return base + bonus;
}

const STAGES: Stage[] = ["group", "knockout"];
const WINNERS: (("home" | "away") | undefined)[] = ["home", "away", undefined];
const SCORES = [0, 1, 2, 3];

describe("paridad standings (SQL) ↔ calcPoints (TS)", () => {
  it("coinciden en toda la matriz de combinaciones", () => {
    const mismatches: string[] = [];

    for (const stage of STAGES) {
      for (const ph of SCORES) for (const pa of SCORES)
      for (const rh of SCORES) for (const ra of SCORES)
      for (const pw of WINNERS) for (const rw of WINNERS) {
        const prediction: Prediction = { homeScore: ph, awayScore: pa, penaltyWinner: pw };
        const result: Result = { homeScore: rh, awayScore: ra, penaltyWinner: rw, stage };

        const ts = calcPoints(prediction, result);
        const sql = sqlStandingsPoints(prediction, result);

        if (ts !== sql) {
          mismatches.push(
            `stage=${stage} pred=${ph}-${pa}(${pw ?? "-"}) result=${rh}-${ra}(${rw ?? "-"}) → TS=${ts} SQL=${sql}`,
          );
        }
      }
    }

    expect(mismatches, mismatches.slice(0, 10).join("\n")).toHaveLength(0);
  });

  // Casos puntuales documentando el contrato compartido
  it("exacto en grupo = 3 en ambos", () => {
    const pr: Prediction = { homeScore: 2, awayScore: 1 };
    const re: Result = { homeScore: 2, awayScore: 1, stage: "group" };
    expect(calcPoints(pr, re)).toBe(3);
    expect(sqlStandingsPoints(pr, re)).toBe(3);
  });

  it("exacto + penal correcto en eliminatoria = 4 en ambos", () => {
    const pr: Prediction = { homeScore: 1, awayScore: 1, penaltyWinner: "home" };
    const re: Result = { homeScore: 1, awayScore: 1, penaltyWinner: "home", stage: "knockout" };
    expect(calcPoints(pr, re)).toBe(4);
    expect(sqlStandingsPoints(pr, re)).toBe(4);
  });
});
