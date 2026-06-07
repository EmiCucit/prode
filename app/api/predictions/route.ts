import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PredictionsService } from "@/lib/services/predictions.service";
import { PredictionsRepository } from "@/lib/data/predictions.repository";
import { ResultsRepository } from "@/lib/data/results.repository";
import { checkRateLimit, getIp } from "@/lib/ratelimit";

function makeService() {
  return new PredictionsService(
    new PredictionsRepository(),
    new ResultsRepository(),
  );
}

// ── GET /api/predictions[?fixtureId=123] ──────────────────────────

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit("pred:read", getIp(request), 60, "1 m");
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const url = new URL(request.url);
  const fixtureIdParam = url.searchParams.get("fixtureId");

  const svc = makeService();

  if (fixtureIdParam !== null) {
    const fixtureId = parseInt(fixtureIdParam, 10);
    if (isNaN(fixtureId)) {
      return NextResponse.json({ error: "fixtureId inválido" }, { status: 400 });
    }
    const prediction = await svc.getForUserAndFixture(session.userId, fixtureId);
    return NextResponse.json({ prediction });
  }

  const predictions = await svc.getForUser(session.userId);
  return NextResponse.json({ predictions });
}

// ── POST /api/predictions ─────────────────────────────────────────

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit("pred:write", getIp(request), 30, "1 m");
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (
    typeof b["fixtureId"] !== "number" ||
    typeof b["homeScore"] !== "number" ||
    typeof b["awayScore"] !== "number"
  ) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  const { fixtureId, homeScore, awayScore } = b as {
    fixtureId: number;
    homeScore: number;
    awayScore: number;
  };

  if (
    !Number.isInteger(homeScore) || homeScore < 0 ||
    !Number.isInteger(awayScore) || awayScore < 0
  ) {
    return NextResponse.json(
      { error: "Los marcadores deben ser enteros no negativos" },
      { status: 400 },
    );
  }

  const penaltyWinner = b["penaltyWinner"];
  if (
    penaltyWinner !== undefined &&
    penaltyWinner !== null &&
    penaltyWinner !== "home" &&
    penaltyWinner !== "away"
  ) {
    return NextResponse.json({ error: "penaltyWinner inválido" }, { status: 400 });
  }

  const svc = makeService();

  try {
    await svc.upsert({
      userId: session.userId,
      fixtureId,
      homeScore,
      awayScore,
      penaltyWinner: penaltyWinner as "home" | "away" | undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Prediction window is closed") {
        return NextResponse.json(
          { error: "El plazo para predecir ya cerró" },
          { status: 422 },
        );
      }
      if (err.message === "Fixture not found") {
        return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
      }
    }
    console.error("[predictions POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
