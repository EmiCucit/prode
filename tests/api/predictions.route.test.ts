import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks de dependencias del handler ─────────────────────────────

const getSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSession() }));

const checkRateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: () => checkRateLimit(),
  getIp: () => "1.2.3.4",
}));

const upsert = vi.fn();
const getForUser = vi.fn();
const getForUserAndFixture = vi.fn();
vi.mock("@/lib/services/predictions.service", () => ({
  PredictionsService: class {
    upsert = upsert;
    getForUser = getForUser;
    getForUserAndFixture = getForUserAndFixture;
  },
}));
vi.mock("@/lib/data/predictions.repository", () => ({ PredictionsRepository: class {} }));
vi.mock("@/lib/data/results.repository", () => ({ ResultsRepository: class {} }));

import { GET, POST } from "@/app/api/predictions/route";

function post(body: unknown): Request {
  return new Request("https://prode.app/api/predictions", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const validSession = { userId: "user-1", username: "santi" };

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(validSession);
  checkRateLimit.mockResolvedValue({ allowed: true });
  upsert.mockResolvedValue(undefined);
});

// ── POST ──────────────────────────────────────────────────────────

describe("POST /api/predictions", () => {
  it("401 si no hay sesión", async () => {
    getSession.mockResolvedValue(null);
    const res = await POST(post({ fixtureId: 1, homeScore: 1, awayScore: 0 }));
    expect(res.status).toBe(401);
  });

  it("429 si está rate-limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false });
    const res = await POST(post({ fixtureId: 1, homeScore: 1, awayScore: 0 }));
    expect(res.status).toBe(429);
  });

  it("400 si el body no es JSON válido", async () => {
    const res = await POST(post("{ not json"));
    expect(res.status).toBe(400);
  });

  it("400 si faltan campos requeridos", async () => {
    const res = await POST(post({ fixtureId: 1 }));
    expect(res.status).toBe(400);
  });

  it("400 si los scores no son del tipo correcto", async () => {
    const res = await POST(post({ fixtureId: 1, homeScore: "1", awayScore: 0 }));
    expect(res.status).toBe(400);
  });

  it("400 si un score es negativo", async () => {
    const res = await POST(post({ fixtureId: 1, homeScore: -1, awayScore: 0 }));
    expect(res.status).toBe(400);
  });

  it("400 si un score no es entero", async () => {
    const res = await POST(post({ fixtureId: 1, homeScore: 1.5, awayScore: 0 }));
    expect(res.status).toBe(400);
  });

  it("400 si penaltyWinner es inválido", async () => {
    const res = await POST(post({ fixtureId: 1, homeScore: 1, awayScore: 0, penaltyWinner: "x" }));
    expect(res.status).toBe(400);
  });

  it("200 y llama al servicio con datos válidos", async () => {
    const res = await POST(post({ fixtureId: 7, homeScore: 2, awayScore: 1, penaltyWinner: "home" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", fixtureId: 7, homeScore: 2, awayScore: 1, penaltyWinner: "home" }),
    );
  });

  it("acepta penaltyWinner null", async () => {
    const res = await POST(post({ fixtureId: 1, homeScore: 0, awayScore: 0, penaltyWinner: null }));
    expect(res.status).toBe(200);
  });

  it("422 si la ventana de predicción cerró", async () => {
    upsert.mockRejectedValue(new Error("Prediction window is closed"));
    const res = await POST(post({ fixtureId: 1, homeScore: 1, awayScore: 0 }));
    expect(res.status).toBe(422);
  });

  it("404 si el fixture no existe", async () => {
    upsert.mockRejectedValue(new Error("Fixture not found"));
    const res = await POST(post({ fixtureId: 999, homeScore: 1, awayScore: 0 }));
    expect(res.status).toBe(404);
  });

  it("500 ante un error inesperado", async () => {
    upsert.mockRejectedValue(new Error("db exploded"));
    const res = await POST(post({ fixtureId: 1, homeScore: 1, awayScore: 0 }));
    expect(res.status).toBe(500);
  });
});

// ── GET ───────────────────────────────────────────────────────────

function get(qs = ""): Request {
  return new Request(`https://prode.app/api/predictions${qs}`);
}

describe("GET /api/predictions", () => {
  it("401 sin sesión", async () => {
    getSession.mockResolvedValue(null);
    expect((await GET(get())).status).toBe(401);
  });

  it("429 si rate-limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false });
    expect((await GET(get())).status).toBe(429);
  });

  it("400 si fixtureId no es numérico", async () => {
    expect((await GET(get("?fixtureId=abc"))).status).toBe(400);
  });

  it("devuelve una predicción puntual con fixtureId válido", async () => {
    getForUserAndFixture.mockResolvedValue({ fixture_id: 5, home_score: 1, away_score: 0 });
    const res = await GET(get("?fixtureId=5"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ prediction: { fixture_id: 5 } });
    expect(getForUserAndFixture).toHaveBeenCalledWith("user-1", 5);
  });

  it("devuelve todas las predicciones sin fixtureId", async () => {
    getForUser.mockResolvedValue([{ fixture_id: 1 }, { fixture_id: 2 }]);
    const res = await GET(get());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ predictions: [{ fixture_id: 1 }, { fixture_id: 2 }] });
    expect(getForUser).toHaveBeenCalledWith("user-1");
  });
});
