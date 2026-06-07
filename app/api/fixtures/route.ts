import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { fetchFixtures, type FetchFixturesParams } from "@/lib/services/fixtures.service";
import { checkRateLimit, getIp } from "@/lib/ratelimit";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit("fixtures", getIp(request), 60, "1 m");
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const url = new URL(request.url);

  const params: FetchFixturesParams = {
    round:  url.searchParams.get("round")  ?? undefined,
    date:   url.searchParams.get("date")   ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    from:   url.searchParams.get("from")   ?? undefined,
    to:     url.searchParams.get("to")     ?? undefined,
  };

  // Live matches revalidate more frequently
  const isLive = params.status?.includes("1H") || params.status?.includes("2H");
  const revalidate = isLive ? 15 : 60;

  try {
    const fixtures = await fetchFixtures(params, revalidate);
    return NextResponse.json(
      { fixtures },
      {
        headers: {
          "Cache-Control": `s-maxage=${revalidate}, stale-while-revalidate`,
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[fixtures proxy]", message);
    return NextResponse.json({ error: "Error al obtener partidos" }, { status: 502 });
  }
}
