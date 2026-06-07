import type { Stage, MatchStatus } from "@/lib/data/types";

const FD_BASE = "https://api.football-data.org/v4";
const WORLD_CUP_CODE = "WC";

// ── Public type ────────────────────────────────────────────────────

export interface Fixture {
  fixtureId: number;
  homeTeam: { name: string; logo: string };
  awayTeam: { name: string; logo: string };
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: "home" | "away" | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  stage: Stage;
  round: string;
  groupName: string | null;
  kickoffAt: string;
  status: MatchStatus;
}

export interface FetchFixturesParams {
  round?: string;
  date?: string;
  status?: string;
  from?: string;
  to?: string;
}

// ── football-data.org raw types (internal) ────────────────────────

interface FdScorePart {
  home: number | null;
  away: number | null;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status:
    | "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED"
    | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";
  stage: string;
  group: string | null;
  homeTeam: { id: number | null; name: string | null; crest: string | null };
  awayTeam: { id: number | null; name: string | null; crest: string | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime: FdScorePart;
    halfTime: FdScorePart;
    penalties?: FdScorePart | null;
  };
}

interface FdResponse {
  matches?: FdMatch[];
  message?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function getToken(): string {
  const token = process.env["FOOTBALL_DATA_TOKEN"];
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN env var is not set");
  return token;
}

// Mapea el status de football-data al vocabulario interno (códigos
// estilo api-football) que ya usan la UI, StatusBadge y la vista SQL.
function mapStatus(m: FdMatch): MatchStatus {
  switch (m.status) {
    case "SCHEDULED":
    case "TIMED":
      return "NS";
    case "IN_PLAY":
      return "1H"; // en juego (football-data no distingue el tiempo)
    case "PAUSED":
      return "HT";
    case "FINISHED":
      // Distinguir FT/AET/PEN es clave: la vista standings filtra por
      // estos códigos y el bonus de penales depende de "PEN".
      if (m.score.duration === "PENALTY_SHOOTOUT") return "PEN";
      if (m.score.duration === "EXTRA_TIME") return "AET";
      return "FT";
    case "SUSPENDED":
    case "POSTPONED":
      return "SUSP";
    case "CANCELLED":
      return "ABD";
    case "AWARDED":
      return "AWD";
    default:
      return "NS";
  }
}

function mapStage(stage: string): Stage {
  return stage === "GROUP_STAGE" ? "group" : "knockout";
}

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Fase de grupos",
  LAST_32: "Dieciseisavos de final",
  LAST_16: "Octavos de final",
  QUARTER_FINALS: "Cuartos de final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer puesto",
  FINAL: "Final",
};

function roundLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage.replaceAll("_", " ").toLowerCase();
}

function extractGroup(group: string | null): string | null {
  if (!group) return null;
  const m = group.match(/GROUP_([A-Z])/i);
  return m?.[1]?.toUpperCase() ?? null;
}

function penaltyWinnerFrom(pens: FdScorePart | null | undefined): "home" | "away" | null {
  if (!pens || pens.home === null || pens.away === null) return null;
  if (pens.home > pens.away) return "home";
  if (pens.away > pens.home) return "away";
  return null;
}

function transform(m: FdMatch): Fixture {
  const pens = m.score.penalties ?? null;
  return {
    fixtureId: m.id,
    // En eliminatorias aún sin definir, football-data manda name=null.
    homeTeam: { name: m.homeTeam.name ?? "A definir", logo: m.homeTeam.crest ?? "" },
    awayTeam: { name: m.awayTeam.name ?? "A definir", logo: m.awayTeam.crest ?? "" },
    homeScore: m.score.fullTime.home,
    awayScore: m.score.fullTime.away,
    penaltyWinner: penaltyWinnerFrom(pens),
    penaltyHomeScore: pens?.home ?? null,
    penaltyAwayScore: pens?.away ?? null,
    stage: mapStage(m.stage),
    round: roundLabel(m.stage),
    groupName: extractGroup(m.group),
    kickoffAt: m.utcDate,
    status: mapStatus(m),
  };
}

// Filtros en memoria (football-data no expone todos por query, y así
// una sola llamada sin parámetros sirve a cualquier combinación de
// filtros → comparte caché y minimiza requests contra el límite free).
function applyFilters(fixtures: Fixture[], params: FetchFixturesParams): Fixture[] {
  let out = fixtures;
  if (params.status) {
    const allowed = params.status.split("-");
    out = out.filter((f) => allowed.includes(f.status));
  }
  if (params.date) {
    out = out.filter((f) => f.kickoffAt.startsWith(params.date!));
  }
  if (params.from) out = out.filter((f) => f.kickoffAt.slice(0, 10) >= params.from!);
  if (params.to) out = out.filter((f) => f.kickoffAt.slice(0, 10) <= params.to!);
  return out;
}

// ── Main export ────────────────────────────────────────────────────

/**
 * Fetches World Cup fixtures from football-data.org (free tier).
 * Trae todos los partidos en una sola llamada y filtra en memoria.
 * revalidate controla el TTL de la Data Cache de Next.js (segundos).
 * Pasar 0 para siempre fresco (p.ej. desde scripts fuera de Next.js).
 */
export async function fetchFixtures(
  params: FetchFixturesParams = {},
  revalidate = 60,
): Promise<Fixture[]> {
  // Modo dry-run local: leer fixtures de la tabla `results` en vez del
  // proveedor externo. Permite probar el flujo completo (predecir +
  // cargar resultados ficticios). Apagado por defecto → prod no se ve afectada.
  if (process.env["FIXTURES_SOURCE"] === "db") {
    return fetchFixturesFromDb(params);
  }

  // URL constante (sin query) → todas las combinaciones de filtros
  // comparten la misma entrada de caché.
  const url = `${FD_BASE}/competitions/${WORLD_CUP_CODE}/matches`;

  const fetchOptions: RequestInit & { next?: { revalidate: number } } =
    revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } };

  const res = await fetch(url, {
    ...fetchOptions,
    headers: { "X-Auth-Token": getToken() },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as FdResponse | null;
    throw new Error(
      `football-data ${res.status}: ${body?.message ?? res.statusText}`,
    );
  }

  const data = (await res.json()) as FdResponse;
  const fixtures = (data.matches ?? []).map(transform);
  return applyFilters(fixtures, params);
}

// ── Fuente alternativa: tabla `results` (solo dry-run local) ───────

/**
 * Lee fixtures desde la tabla `results` y los mapea al tipo público
 * `Fixture`. Se usa cuando FIXTURES_SOURCE=db para pruebas locales.
 */
async function fetchFixturesFromDb(params: FetchFixturesParams): Promise<Fixture[]> {
  // Import dinámico: solo carga supabase cuando el flag está activo.
  const { ResultsRepository } = await import("@/lib/data/results.repository");
  const rows = await new ResultsRepository().findAll();

  const fixtures: Fixture[] = rows.map((r) => ({
    fixtureId: r.fixture_id,
    homeTeam: { name: r.home_team_name, logo: r.home_team_logo ?? "" },
    awayTeam: { name: r.away_team_name, logo: r.away_team_logo ?? "" },
    homeScore: r.home_score,
    awayScore: r.away_score,
    penaltyWinner: r.penalty_winner,
    penaltyHomeScore: r.penalty_home_score,
    penaltyAwayScore: r.penalty_away_score,
    stage: r.stage,
    round: r.round,
    groupName: r.group_name,
    kickoffAt: r.kickoff_at,
    status: r.status,
  }));

  return applyFilters(fixtures, params);
}
