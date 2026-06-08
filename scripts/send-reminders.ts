/**
 * Envía recordatorios push a usuarios suscriptos que aún no cargaron su
 * predicción para partidos que arrancan pronto.
 *
 * Ventana configurable con REMINDER_LEAD_HOURS (default 2). Dedup por
 * (user_id, fixture_id) vía la tabla reminder_sent.
 *
 * Uso: npm run reminders   (cron de GitHub Actions o manual)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServerClient } from "@/lib/supabase/server";
import { sendToUser } from "@/lib/push/webpush";

const LEAD_HOURS = Number(process.env["REMINDER_LEAD_HOURS"] ?? "2");
const UNDETERMINED = "A definir";

async function main() {
  const db = createServerClient();
  const now = Date.now();
  const until = new Date(now + LEAD_HOURS * 60 * 60 * 1000).toISOString();
  const nowISO = new Date(now).toISOString();

  console.log(`🔔 Recordatorios — ventana: próximas ${LEAD_HOURS}h`);

  // Usuarios con al menos un dispositivo suscripto
  const { data: subs } = await db.from("push_subscriptions").select("user_id");
  const subscribed = new Set((subs ?? []).map((s) => s.user_id as string));
  if (subscribed.size === 0) {
    console.log("   No hay usuarios suscriptos. Nada que hacer.");
    return;
  }

  // Partidos que arrancan dentro de la ventana y aún no empezaron
  const { data: fixtures, error } = await db
    .from("results")
    .select("fixture_id, home_team_name, away_team_name, kickoff_at, stage, status")
    .eq("status", "NS")
    .gt("kickoff_at", nowISO)
    .lte("kickoff_at", until);
  if (error) throw new Error(error.message);

  const upcoming = (fixtures ?? []).filter(
    (f) =>
      f.stage !== "knockout" ||
      (f.home_team_name !== UNDETERMINED && f.away_team_name !== UNDETERMINED),
  );
  console.log(`   ${upcoming.length} partido(s) en la ventana.`);

  let totalSent = 0;

  for (const f of upcoming) {
    const fid = f.fixture_id as number;

    const [{ data: preds }, { data: sentRows }] = await Promise.all([
      db.from("predictions").select("user_id").eq("fixture_id", fid),
      db.from("reminder_sent").select("user_id").eq("fixture_id", fid),
    ]);
    const predicted = new Set((preds ?? []).map((p) => p.user_id as string));
    const alreadySent = new Set((sentRows ?? []).map((r) => r.user_id as string));

    const targets = [...subscribed].filter(
      (uid) => !predicted.has(uid) && !alreadySent.has(uid),
    );
    if (targets.length === 0) continue;

    const payload = {
      title: "⚽ ¡No te olvides de predecir!",
      body: `${f.home_team_name} vs ${f.away_team_name} arranca pronto y todavía no cargaste tu predicción.`,
      url: "/partidos",
    };

    for (const uid of targets) {
      const sent = await sendToUser(uid, payload);
      totalSent += sent;
      await db.from("reminder_sent").upsert(
        { user_id: uid, fixture_id: fid },
        { onConflict: "user_id,fixture_id" },
      );
    }
    console.log(`   ${f.home_team_name} vs ${f.away_team_name}: ${targets.length} aviso(s).`);
  }

  console.log(`✅ Listo. ${totalSent} push enviado(s).`);
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
