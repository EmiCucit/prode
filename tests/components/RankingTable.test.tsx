// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import RankingTable from "@/components/organisms/RankingTable";
import type { StandingRow } from "@/lib/domain/ranking";

afterEach(cleanup);

function row(over: Partial<StandingRow> & { displayName: string }): StandingRow {
  return {
    userId: over.userId ?? over.displayName,
    username: over.username ?? over.displayName.toLowerCase(),
    displayName: over.displayName,
    totalPoints: over.totalPoints ?? 0,
    exactResults: over.exactResults ?? 0,
    correctOutcomes: over.correctOutcomes ?? 0,
    predictionsMade: over.predictionsMade ?? 0,
  };
}

describe("RankingTable", () => {
  it("renderiza una fila por jugador, en el orden recibido", () => {
    const players = [
      row({ displayName: "Santi" }),
      row({ displayName: "Marian" }),
      row({ displayName: "Tuto" }),
    ];

    render(<RankingTable players={players} />);

    const bodyRows = screen.getAllByRole("row").slice(1); // saltea el header
    expect(bodyRows).toHaveLength(3);
    expect(within(bodyRows[0]!).getByText("Santi")).toBeInTheDocument();
    expect(within(bodyRows[1]!).getByText("Marian")).toBeInTheDocument();
    expect(within(bodyRows[2]!).getByText("Tuto")).toBeInTheDocument();
  });

  it("muestra medallas para el top 3 y número de posición para el resto", () => {
    const players = [
      row({ displayName: "A" }),
      row({ displayName: "B" }),
      row({ displayName: "C" }),
      row({ displayName: "D" }),
    ];

    render(<RankingTable players={players} />);

    expect(screen.getByText("🥇")).toBeInTheDocument();
    expect(screen.getByText("🥈")).toBeInTheDocument();
    expect(screen.getByText("🥉")).toBeInTheDocument();
    // el cuarto no lleva medalla, lleva el número 4
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("muestra puntos y métricas; usa '—' cuando plenos/resultados están en 0", () => {
    const players = [
      row({ displayName: "Goleador", totalPoints: 12, exactResults: 3, correctOutcomes: 5 }),
      row({ displayName: "Cero", totalPoints: 0, exactResults: 0, correctOutcomes: 0 }),
    ];

    render(<RankingTable players={players} />);

    const top = screen.getByText("Goleador").closest("tr")!;
    expect(within(top).getByText("12")).toBeInTheDocument();
    expect(within(top).getByText("3")).toBeInTheDocument();
    expect(within(top).getByText("5")).toBeInTheDocument();

    const cero = screen.getByText("Cero").closest("tr")!;
    // plenos y resultados en 0 se muestran como guion
    expect(within(cero).getAllByText("—")).toHaveLength(2);
  });

  it("renderiza sin filas de jugadores cuando la lista está vacía", () => {
    render(<RankingTable players={[]} />);
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(0);
  });
});
