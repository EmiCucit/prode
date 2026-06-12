// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import RankingTable from "@/components/organisms/RankingTable";
import type { StandingRow } from "@/lib/domain/ranking";
import type { FinishedPrediction } from "@/lib/domain/breakdown";

afterEach(cleanup);

function row(over: Partial<StandingRow> & { displayName: string }): StandingRow {
  return {
    userId: over.userId ?? over.displayName,
    username: over.username ?? over.displayName.toLowerCase(),
    displayName: over.displayName,
    totalPoints: over.totalPoints ?? 0,
    exactResults: over.exactResults ?? 0,
    exactWithBonus: over.exactWithBonus ?? 0,
    correctOutcomes: over.correctOutcomes ?? 0,
    predictionsMade: over.predictionsMade ?? 0,
  };
}

function finished(n: number): FinishedPrediction[] {
  return Array.from({ length: n }, (_, i) => ({
    fixtureId: i + 1,
    homeTeamName: `Local${i + 1}`,
    awayTeamName: `Visita${i + 1}`,
    homeScore: 1,
    awayScore: 0,
    penaltyWinner: null,
    predHomeScore: 1,
    predAwayScore: 0,
    predPenaltyWinner: null,
    points: 3,
    kickoffAt: `2026-06-${String(i + 1).padStart(2, "0")}T19:00:00Z`,
    stage: "group" as const,
    round: "Fase de grupos",
    groupName: "A",
  }));
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
    // plenos, P+B y resultados en 0 se muestran como guion
    expect(within(cero).getAllByText("—")).toHaveLength(3);
  });

  it("separa plenos comunes (3pts) de plenos con bonus (P+B, 4pts)", () => {
    // 3 exactos totales, 1 de ellos con bonus de penales → Plenos=2, P+B=1
    const players = [
      row({ displayName: "Crack", totalPoints: 13, exactResults: 3, exactWithBonus: 1, correctOutcomes: 4 }),
    ];

    render(<RankingTable players={players} />);
    const fila = screen.getByText("Crack").closest("tr")!;
    expect(within(fila).getByText("2")).toBeInTheDocument(); // Plenos = 3 - 1
    expect(within(fila).getByText("1")).toBeInTheDocument(); // P+B
    expect(within(fila).getByText("4")).toBeInTheDocument(); // ✓ Resultado
  });

  it("resalta al usuario actual con el chip 'vos'", () => {
    const players = [
      row({ displayName: "Santi", userId: "u-santi" }),
      row({ displayName: "Marian", userId: "u-marian" }),
    ];

    render(<RankingTable players={players} currentUserId="u-marian" />);

    const marianRow = screen.getByText("Marian").closest("tr")!;
    expect(within(marianRow).getByText("vos")).toBeInTheDocument();

    const santiRow = screen.getByText("Santi").closest("tr")!;
    expect(within(santiRow).queryByText("vos")).not.toBeInTheDocument();
  });

  it("sin currentUserId no resalta a nadie", () => {
    render(<RankingTable players={[row({ displayName: "Santi", userId: "u-santi" })]} />);
    expect(screen.queryByText("vos")).not.toBeInTheDocument();
  });

  it("renderiza sin filas de jugadores cuando la lista está vacía", () => {
    render(<RankingTable players={[]} />);
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(0);
  });

  it("sin desglose no muestra el botón de expandir", () => {
    render(<RankingTable players={[row({ displayName: "Santi", userId: "u1" })]} />);
    expect(screen.queryByLabelText("Ver predicciones")).not.toBeInTheDocument();
  });

  it("toca el ícono y despliega las predicciones de partidos finalizados", () => {
    render(
      <RankingTable
        players={[row({ displayName: "Santi", userId: "u1" })]}
        breakdowns={{ u1: finished(3) }}
      />,
    );

    // Colapsado: no se ven las predicciones
    expect(screen.queryByText(/Tu predicción/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Ver predicciones"));

    // Expandido: aparecen las 3 predicciones
    expect(screen.getAllByText(/Tu predicción/)).toHaveLength(3);
    // Toggle inverso: vuelve a ocultar
    fireEvent.click(screen.getByLabelText("Ocultar predicciones"));
    expect(screen.queryByText(/Tu predicción/)).not.toBeInTheDocument();
  });

  it("pagina de a 5 partidos y navega con Siguiente/Anterior", () => {
    render(
      <RankingTable
        players={[row({ displayName: "Santi", userId: "u1" })]}
        breakdowns={{ u1: finished(7) }}
      />,
    );

    fireEvent.click(screen.getByLabelText("Ver predicciones"));

    // Página 1: 5 de 7
    expect(screen.getAllByText(/Tu predicción/)).toHaveLength(5);
    expect(screen.getByText("1–5 de 7")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Siguiente"));

    // Página 2: las 2 restantes
    expect(screen.getAllByText(/Tu predicción/)).toHaveLength(2);
    expect(screen.getByText("6–7 de 7")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Anterior"));
    expect(screen.getByText("1–5 de 7")).toBeInTheDocument();
  });
});
