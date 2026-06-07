import { describe, it, expect } from "vitest";
import { buildRanking, type StandingRow } from "@/lib/domain/ranking";

function row(overrides: Partial<StandingRow> & Pick<StandingRow, "displayName" | "totalPoints" | "exactResults">): StandingRow {
  return {
    userId: overrides.displayName,
    username: overrides.displayName.toLowerCase(),
    correctOutcomes: 0,
    predictionsMade: 0,
    ...overrides,
  };
}

describe("buildRanking", () => {
  it("ordena por totalPoints descendente", () => {
    const rows = [
      row({ displayName: "B", totalPoints: 5, exactResults: 1 }),
      row({ displayName: "A", totalPoints: 10, exactResults: 2 }),
      row({ displayName: "C", totalPoints: 3, exactResults: 0 }),
    ];
    const result = buildRanking(rows);
    expect(result.map((r) => r.displayName)).toEqual(["A", "B", "C"]);
  });

  it("desempate por exactResults descendente", () => {
    const rows = [
      row({ displayName: "B", totalPoints: 10, exactResults: 1 }),
      row({ displayName: "A", totalPoints: 10, exactResults: 3 }),
      row({ displayName: "C", totalPoints: 10, exactResults: 2 }),
    ];
    const result = buildRanking(rows);
    expect(result.map((r) => r.displayName)).toEqual(["A", "C", "B"]);
  });

  it("desempate final por displayName alfabético (es)", () => {
    const rows = [
      row({ displayName: "Santi", totalPoints: 10, exactResults: 2 }),
      row({ displayName: "Marian", totalPoints: 10, exactResults: 2 }),
      row({ displayName: "Guada", totalPoints: 10, exactResults: 2 }),
    ];
    const result = buildRanking(rows);
    expect(result.map((r) => r.displayName)).toEqual(["Guada", "Marian", "Santi"]);
  });

  it("array vacío → array vacío", () => {
    expect(buildRanking([])).toEqual([]);
  });

  it("un solo elemento → sin cambios", () => {
    const rows = [row({ displayName: "Solo", totalPoints: 7, exactResults: 2 })];
    expect(buildRanking(rows)).toEqual(rows);
  });

  it("no muta el array original", () => {
    const rows = [
      row({ displayName: "B", totalPoints: 5, exactResults: 0 }),
      row({ displayName: "A", totalPoints: 10, exactResults: 0 }),
    ];
    const original = [...rows];
    buildRanking(rows);
    expect(rows).toEqual(original);
  });

  it("todos con 0 puntos → orden sólo por displayName", () => {
    const rows = [
      row({ displayName: "Vicky", totalPoints: 0, exactResults: 0 }),
      row({ displayName: "Juli", totalPoints: 0, exactResults: 0 }),
      row({ displayName: "Jime", totalPoints: 0, exactResults: 0 }),
    ];
    const result = buildRanking(rows);
    expect(result.map((r) => r.displayName)).toEqual(["Jime", "Juli", "Vicky"]);
  });
});
