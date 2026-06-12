import { createServerClient } from "@/lib/supabase/server";
import { sendToUser } from "@/lib/push/webpush";

const DEFAULT_LEAD_HOURS = 2;
const UNDETERMINED = "A definir";

export interface ReminderSummary {
  /** Horas de anticipación de la ventana usada. */
  windowHours: number;
  /** Cuántos partidos cayeron en la ventana. */
  fixturesInWindow: number;
  /** Detalle por partido al que se le mandó al menos un aviso. */
  notified: { fixture: string; targets: number }[];
  /** Total de push efectivamente despachados. */
  sent: number;
}

export interface SendRemindersOptions {
  /** Override de la ventana (default: REMINDER_LEAD_HOURS o 2). */
  leadHours?: number;
}

/**
 * Avisa por push a usuarios suscriptos que aún no cargaron su predicción para
 * partidos que arrancan dentro de la ventana (`leadHours`). Dedup por
 * (user_id, fixture_id) vía la tabla `reminder_sent`.
 *
 * Compartido por el script `npm run reminders` (cron de GitHub Actions, de
 * respaldo) y el endpoint `/api/cron/reminders` (cron externo más confiable):
 * el schedule de GitHub Actions se atrasa horas en horas pico y se saltea la
 * ventana de 2h por completo → el recordatorio se perdía para siempre.
 */
export async function sendReminders(
  opts: SendRemindersOptions = {},
): Promise<ReminderSummary> {
  const leadHours =
    opts.leadHours ??
    Number(process.env["REMINDER_LEAD_HOURS"] ?? DEFAULT_LEAD_HOURS);

  const db = createServerClient();
  const now = Date.now();
  const until = new Date(now + leadHours * 60 * 60 * 1000).toISOString();
  const nowISO = new Date(now).toISOString();

  const summary: ReminderSummary = {
    windowHours: leadHours,
    fixturesInWindow: 0,
    notified: [],
    sent: 0,
  };

  // Usuarios con al menos un dispositivo suscripto
  const { data: subs } = await db.from("push_subscriptions").select("user_id");
  const subscribed = new Set((subs ?? []).map((s) => s.user_id as string));
  if (subscribed.size === 0) return summary;

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
  summary.fixturesInWindow = upcoming.length;

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
      summary.sent += await sendToUser(uid, payload);
      await db.from("reminder_sent").upsert(
        { user_id: uid, fixture_id: fid },
        { onConflict: "user_id,fixture_id" },
      );
    }
    summary.notified.push({
      fixture: `${f.home_team_name} vs ${f.away_team_name}`,
      targets: targets.length,
    });
  }

  return summary;
}
