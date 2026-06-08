import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sendToUser } from "@/lib/push/webpush";
import { checkRateLimit, getIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit("push-test", getIp(request), 5, "1 m");
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas pruebas, esperá un momento" }, { status: 429 });
  }

  try {
    const sent = await sendToUser(session.userId, {
      title: "Prode Mundial 2026",
      body: "🔔 Notificación de prueba — ¡funciona!",
      url: "/partidos",
    });
    if (sent === 0) {
      return NextResponse.json(
        { error: "No hay dispositivos suscriptos en esta cuenta" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[push test]", err);
    return NextResponse.json({ error: "Error al enviar la notificación" }, { status: 500 });
  }
}
