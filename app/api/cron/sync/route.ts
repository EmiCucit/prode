import { NextResponse } from "next/server";
import { syncFixtures } from "@/lib/services/sync";

// Nunca cachear ni prerenderizar: cada hit ejecuta el sync.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint de sincronización para un cron externo (p.ej. cron-job.org) más
 * confiable que el schedule de GitHub Actions, que en horas pico se dispara
 * con varias horas de atraso. Protegido por CRON_SECRET.
 *
 * Autenticación (cualquiera de las dos, según lo que permita el cron):
 *   - Header  `Authorization: Bearer <CRON_SECRET>`
 *   - Query   `?secret=<CRON_SECRET>`
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env["CRON_SECRET"];
  if (!secret) return false; // sin secret configurado no se autoriza nada

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  return new URL(request.url).searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const summary = await syncFixtures();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[cron/sync]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
