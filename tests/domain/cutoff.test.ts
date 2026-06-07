import { describe, it, expect } from "vitest";
import { isPredictionOpen, msUntilCutoff, CUTOFF_MINUTES } from "@/lib/domain/cutoff";

const NOW = new Date("2026-06-15T10:00:00.000Z");
const min = (n: number) => n * 60 * 1000;

describe("isPredictionOpen", () => {
  it("más de 15 min antes del kickoff → abierto", () => {
    const kickoff = new Date(NOW.getTime() + min(20));
    expect(isPredictionOpen(kickoff, NOW)).toBe(true);
  });

  it("exactamente 1 ms más de 15 min → abierto", () => {
    const kickoff = new Date(NOW.getTime() + min(CUTOFF_MINUTES) + 1);
    expect(isPredictionOpen(kickoff, NOW)).toBe(true);
  });

  it("exactamente 15 min antes → cerrado (borde exclusivo)", () => {
    const kickoff = new Date(NOW.getTime() + min(CUTOFF_MINUTES));
    expect(isPredictionOpen(kickoff, NOW)).toBe(false);
  });

  it("14 min antes del kickoff → cerrado", () => {
    const kickoff = new Date(NOW.getTime() + min(14));
    expect(isPredictionOpen(kickoff, NOW)).toBe(false);
  });

  it("kickoff en el pasado → cerrado", () => {
    const kickoff = new Date(NOW.getTime() - min(5));
    expect(isPredictionOpen(kickoff, NOW)).toBe(false);
  });

  it("kickoff en este momento exacto → cerrado", () => {
    expect(isPredictionOpen(NOW, NOW)).toBe(false);
  });

  it("kickoff en 24 horas → abierto", () => {
    const kickoff = new Date(NOW.getTime() + 24 * 60 * min(1));
    expect(isPredictionOpen(kickoff, NOW)).toBe(true);
  });
});

describe("msUntilCutoff", () => {
  it("retorna positivo cuando falta tiempo", () => {
    const kickoff = new Date(NOW.getTime() + min(30));
    expect(msUntilCutoff(kickoff, NOW)).toBe(min(15));
  });

  it("retorna negativo cuando ya cerró", () => {
    const kickoff = new Date(NOW.getTime() + min(10));
    expect(msUntilCutoff(kickoff, NOW)).toBe(-min(5));
  });

  it("retorna 0 en el borde exacto", () => {
    const kickoff = new Date(NOW.getTime() + min(CUTOFF_MINUTES));
    expect(msUntilCutoff(kickoff, NOW)).toBe(0);
  });
});
