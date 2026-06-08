// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import PredictionForm from "@/components/molecules/PredictionForm";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

// kickoff lejano → la ventana de predicción está abierta y el Countdown no expira
const FAR_KICKOFF = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

type Overrides = Partial<React.ComponentProps<typeof PredictionForm>>;

function renderForm(over: Overrides = {}) {
  const props = {
    fixtureId: 101,
    stage: "group" as const,
    kickoffAt: FAR_KICKOFF,
    initialHomeScore: 0,
    initialAwayScore: 0,
    homeTeamName: "Argentina",
    awayTeamName: "Brasil",
    hasExisting: false,
    isOpenInitial: true,
    ...over,
  };
  return render(<PredictionForm {...props} />);
}

beforeEach(() => {
  refresh.mockClear();
  vi.unstubAllGlobals();
});

afterEach(cleanup);

describe("PredictionForm — ventana cerrada", () => {
  it("muestra la predicción guardada cuando está cerrada y ya había una", () => {
    renderForm({
      isOpenInitial: false,
      hasExisting: true,
      initialHomeScore: 2,
      initialAwayScore: 1,
    });
    expect(screen.getByText("Tu predicción: 2–1")).toBeInTheDocument();
  });

  it("incluye al ganador de penales en el texto de la predicción guardada", () => {
    renderForm({
      isOpenInitial: false,
      hasExisting: true,
      stage: "knockout",
      initialHomeScore: 1,
      initialAwayScore: 1,
      initialPenaltyWinner: "away",
    });
    expect(screen.getByText("Tu predicción: 1–1 (pen. Brasil)")).toBeInTheDocument();
  });

  it("muestra 'Predicciones cerradas' cuando está cerrada y no había predicción", () => {
    renderForm({ isOpenInitial: false, hasExisting: false });
    expect(screen.getByText("Predicciones cerradas")).toBeInTheDocument();
  });
});

describe("PredictionForm — botón Actualizar/Guardar", () => {
  it("etiqueta 'Guardar' cuando no hay predicción previa", () => {
    renderForm({ hasExisting: false });
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("etiqueta 'Actualizar', queda deshabilitado y muestra tooltip si no hay cambios", () => {
    renderForm({ hasExisting: true, initialHomeScore: 1, initialAwayScore: 0 });
    const btn = screen.getByRole("button", { name: "Actualizar" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText("Modificá el resultado cargado para poder actualizar"),
    ).toBeInTheDocument();
  });

  it("no envía request si no hay cambios respecto de lo guardado", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForm({ hasExisting: true, initialHomeScore: 1, initialAwayScore: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PredictionForm — penales", () => {
  it("muestra el selector de penales solo en eliminatoria con empate", () => {
    renderForm({ stage: "knockout", initialHomeScore: 0, initialAwayScore: 0 });
    expect(screen.getByText("Penales:")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Argentina" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Brasil" })).toBeInTheDocument();
  });

  it("no muestra penales en partido de grupo aunque sea empate", () => {
    renderForm({ stage: "group", initialHomeScore: 0, initialAwayScore: 0 });
    expect(screen.queryByText("Penales:")).not.toBeInTheDocument();
  });
});

describe("PredictionForm — envío exitoso", () => {
  it("envía la predicción y muestra confirmación tras modificar el marcador", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderForm({ hasExisting: false, initialHomeScore: 0, initialAwayScore: 0 });

    // +1 al marcador local → el formulario queda "dirty"
    fireEvent.click(screen.getAllByLabelText("Sumar")[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/predictions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      fixtureId: 101,
      homeScore: 1,
      awayScore: 0,
      penaltyWinner: undefined,
    });

    expect(await screen.findByText("✓ Guardado")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("muestra el error del servidor si la request falla", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Ventana cerrada" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderForm({ hasExisting: false });

    fireEvent.click(screen.getAllByLabelText("Sumar")[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ventana cerrada")).toBeInTheDocument();
  });
});
