import { NextResponse } from "next/server";
import { sendReminders } from "@/lib/services/reminders";

// Nunca cachear ni prerenderizar: cada hit ejecuta los recordatorios.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint de recordatorios push para un cron externo (p.ej. cron-job.org) más
 * confiable que el schedule de GitHub Actions, que en horas pico se dispara con
 * varias horas de atraso y se saltea la ventana de 2h. Protegido por CRON_SECRET.
 *
 * Autenticación (cualquiera de las dos, según lo que permita el cron):
 *   - Header  `Authorization: Bearer <CRON_SECRET>`
 *   - Query   `?secret=<CRON_SECRET>`
 *
 * Override opcional de ventana para pruebas: `?lead_hours=6`.
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

  const leadParam = new URL(request.url).searchParams.get("lead_hours");
  const leadHours = leadParam ? Number(leadParam) : undefined;
  const opts =
    leadHours !== undefined && Number.isFinite(leadHours) ? { leadHours } : {};

  try {
    const summary = await sendReminders(opts);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[cron/reminders]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
