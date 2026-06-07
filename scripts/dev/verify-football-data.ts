/**
 * Verifica el acceso al Mundial (competición WC) con el token de
 * football-data.org del free tier. No imprime el token.
 * Uso: npm run dev:verify-fd
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const token = process.env["FOOTBALL_DATA_TOKEN"];
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN no está seteada en .env.local");

  const url = "https://api.football-data.org/v4/competitions/WC/matches";
  const res = await fetch(url, { headers: { "X-Auth-Token": token } });

  console.log(`HTTP ${res.status} ${res.statusText}`);
  const remaining = res.headers.get("x-requests-available-minute");
  if (remaining) console.log(`Requests disponibles este minuto: ${remaining}`);

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    console.log("\n❌ Sin acceso. Mensaje del servidor:");
    console.log("   ", (body as { message?: string })?.message ?? JSON.stringify(body));
    console.log("\n→ Probablemente el Mundial no está en tu plan free, o el token es inválido.");
    process.exit(1);
  }

  const data = body as {
    competition?: { name?: string };
    filters?: { season?: string };
    resultSet?: { count?: number; first?: string; last?: string };
    matches?: Array<{
      id: number;
      utcDate: string;
      status: string;
      stage: string;
      group: string | null;
      homeTeam: { name: string; crest: string | null };
      awayTeam: { name: string; crest: string | null };
      score: { duration: string; fullTime: { home: number | null; away: number | null }; penalties?: { home: number | null; away: number | null } | null };
    }>;
  };

  console.log(`\n✅ Acceso OK a: ${data.competition?.name ?? "WC"}`);
  console.log(`   Temporada (filtro): ${data.filters?.season ?? "—"}`);
  console.log(`   Partidos: ${data.resultSet?.count ?? data.matches?.length ?? 0}`);
  console.log(`   Rango: ${data.resultSet?.first ?? "?"} → ${data.resultSet?.last ?? "?"}`);

  const sample = data.matches?.[0];
  if (sample) {
    console.log("\n   Ejemplo de partido:");
    console.log(`     ${sample.homeTeam.name} vs ${sample.awayTeam.name}`);
    console.log(`     fecha=${sample.utcDate}  status=${sample.status}  stage=${sample.stage}  group=${sample.group ?? "—"}`);
    console.log(`     crest home: ${sample.homeTeam.crest ?? "(null)"}`);
    console.log(`     score.fullTime=${JSON.stringify(sample.score.fullTime)} duration=${sample.score.duration} penalties=${JSON.stringify(sample.score.penalties ?? null)}`);
  }
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
