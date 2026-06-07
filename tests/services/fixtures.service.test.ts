import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchFixtures } from "@/lib/services/fixtures.service";

// El transform es interno; lo ejercitamos a través de fetchFixtures
// mockeando la respuesta de football-data.org.

interface RawOverrides {
  id?: number;
  stage?: string;
  group?: string | null;
  status?: string;
  duration?: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
  ftHome?: number | null;
  ftAway?: number | null;
  penHome?: number | null;
  penAway?: number | null;
  penalties?: boolean; // si incluir el nodo penalties
  date?: string;
  homeCrest?: string | null;
}

function rawMatch(o: RawOverrides = {}) {
  return {
    id: o.id ?? 100,
    utcDate: o.date ?? "2026-06-15T18:00:00Z",
    status: o.status ?? "TIMED",
    stage: o.stage ?? "GROUP_STAGE",
    group: o.group === undefined ? "GROUP_A" : o.group,
    homeTeam: { id: 1, name: "Argentina", crest: o.homeCrest === undefined ? "arg.svg" : o.homeCrest },
    awayTeam: { id: 2, name: "Brasil", crest: "bra.svg" },
    score: {
      winner: null,
      duration: o.duration ?? "REGULAR",
      fullTime: { home: o.ftHome ?? null, away: o.ftAway ?? null },
      halfTime: { home: null, away: null },
      penalties: o.penalties
        ? { home: o.penHome ?? null, away: o.penAway ?? null }
        : null,
    },
  };
}

function mockApi(matches: unknown[], opts: { ok?: boolean; status?: number; message?: string } = {}) {
  const body = opts.message ? { message: opts.message } : { matches };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status: opts.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

describe("fetchFixtures / transform (football-data.org)", () => {
  beforeEach(() => {
    vi.stubEnv("FOOTBALL_DATA_TOKEN", "test-token");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("mapea los campos básicos de un partido", async () => {
    mockApi([rawMatch({ id: 555, status: "FINISHED", ftHome: 2, ftAway: 1 })]);
    const [f] = await fetchFixtures();
    expect(f).toMatchObject({
      fixtureId: 555,
      homeTeam: { name: "Argentina", logo: "arg.svg" },
      awayTeam: { name: "Brasil", logo: "bra.svg" },
      homeScore: 2,
      awayScore: 1,
      status: "FT",
      kickoffAt: "2026-06-15T18:00:00Z",
    });
  });

  it("crest null → logo string vacío", async () => {
    mockApi([rawMatch({ homeCrest: null })]);
    const [f] = await fetchFixtures();
    expect(f!.homeTeam.logo).toBe("");
  });

  it("stage GROUP_STAGE → group", async () => {
    mockApi([rawMatch({ stage: "GROUP_STAGE" })]);
    const [f] = await fetchFixtures();
    expect(f!.stage).toBe("group");
  });

  it("stage de eliminatoria → knockout", async () => {
    mockApi([rawMatch({ stage: "LAST_16", group: null })]);
    const [f] = await fetchFixtures();
    expect(f!.stage).toBe("knockout");
    expect(f!.round).toBe("Octavos de final");
  });

  it("extrae la letra del grupo (GROUP_H → H)", async () => {
    mockApi([rawMatch({ group: "GROUP_H" })]);
    const [f] = await fetchFixtures();
    expect(f!.groupName).toBe("H");
  });

  it("groupName null si no hay grupo", async () => {
    mockApi([rawMatch({ group: null })]);
    const [f] = await fetchFixtures();
    expect(f!.groupName).toBeNull();
  });

  // ── Mapeo de status ──
  it.each([
    ["SCHEDULED", "REGULAR", "NS"],
    ["TIMED", "REGULAR", "NS"],
    ["IN_PLAY", "REGULAR", "1H"],
    ["PAUSED", "REGULAR", "HT"],
    ["FINISHED", "REGULAR", "FT"],
    ["FINISHED", "EXTRA_TIME", "AET"],
    ["FINISHED", "PENALTY_SHOOTOUT", "PEN"],
    ["POSTPONED", "REGULAR", "SUSP"],
    ["CANCELLED", "REGULAR", "ABD"],
  ] as const)("status %s/%s → %s", async (status, duration, expected) => {
    mockApi([rawMatch({ status, duration })]);
    const [f] = await fetchFixtures();
    expect(f!.status).toBe(expected);
  });

  // ── Penales ──
  it("penaltyWinner home cuando penales home > away", async () => {
    mockApi([rawMatch({ status: "FINISHED", duration: "PENALTY_SHOOTOUT", ftHome: 1, ftAway: 1, penalties: true, penHome: 4, penAway: 2 })]);
    const [f] = await fetchFixtures();
    expect(f!.penaltyWinner).toBe("home");
    expect(f!.penaltyHomeScore).toBe(4);
    expect(f!.penaltyAwayScore).toBe(2);
  });

  it("penaltyWinner away cuando penales away > home", async () => {
    mockApi([rawMatch({ status: "FINISHED", duration: "PENALTY_SHOOTOUT", ftHome: 0, ftAway: 0, penalties: true, penHome: 2, penAway: 4 })]);
    const [f] = await fetchFixtures();
    expect(f!.penaltyWinner).toBe("away");
  });

  it("sin nodo penalties → penaltyWinner null", async () => {
    mockApi([rawMatch({ status: "FINISHED", ftHome: 2, ftAway: 1 })]);
    const [f] = await fetchFixtures();
    expect(f!.penaltyWinner).toBeNull();
    expect(f!.penaltyHomeScore).toBeNull();
  });

  it("preserva scores null para partidos no jugados", async () => {
    mockApi([rawMatch({ status: "TIMED", ftHome: null, ftAway: null })]);
    const [f] = await fetchFixtures();
    expect(f!.homeScore).toBeNull();
    expect(f!.awayScore).toBeNull();
  });

  // ── Filtros en memoria ──
  it("filtra por status (FT-AET-PEN deja solo finalizados)", async () => {
    mockApi([
      rawMatch({ id: 1, status: "TIMED" }),
      rawMatch({ id: 2, status: "FINISHED", duration: "REGULAR" }),
      rawMatch({ id: 3, status: "FINISHED", duration: "PENALTY_SHOOTOUT" }),
    ]);
    const res = await fetchFixtures({ status: "FT-AET-PEN" });
    expect(res.map((f) => f.fixtureId)).toEqual([2, 3]);
  });

  it("filtra por fecha", async () => {
    mockApi([
      rawMatch({ id: 1, date: "2026-06-15T18:00:00Z" }),
      rawMatch({ id: 2, date: "2026-06-16T18:00:00Z" }),
    ]);
    const res = await fetchFixtures({ date: "2026-06-16" });
    expect(res.map((f) => f.fixtureId)).toEqual([2]);
  });

  // ── Errores / config ──
  it("respuesta vacía → array vacío", async () => {
    mockApi([]);
    expect(await fetchFixtures()).toEqual([]);
  });

  it("lanza con el mensaje del servidor si la respuesta no es ok", async () => {
    mockApi([], { status: 403, message: "Restricted resource" });
    await expect(fetchFixtures()).rejects.toThrow(/football-data 403.*Restricted resource/);
  });

  it("lanza si falta FOOTBALL_DATA_TOKEN", async () => {
    vi.stubEnv("FOOTBALL_DATA_TOKEN", "");
    mockApi([]);
    await expect(fetchFixtures()).rejects.toThrow(/FOOTBALL_DATA_TOKEN/);
  });
});
