/**
 * Envía recordatorios push a usuarios suscriptos que aún no cargaron su
 * predicción para partidos que arrancan pronto.
 *
 * Ventana configurable con REMINDER_LEAD_HOURS (default 2). Dedup por
 * (user_id, fixture_id) vía la tabla reminder_sent.
 *
 * La lógica vive en `lib/services/reminders.ts`, compartida con el endpoint
 * `/api/cron/reminders` (cron externo confiable). Este script es el respaldo
 * que corre por GitHub Actions / manualmente.
 *
 * Uso: npm run reminders
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sendReminders } from "@/lib/services/reminders";

async function main() {
  const summary = await sendReminders();

  console.log(`🔔 Recordatorios — ventana: próximas ${summary.windowHours}h`);
  console.log(`   ${summary.fixturesInWindow} partido(s) en la ventana.`);
  for (const n of summary.notified) {
    console.log(`   ${n.fixture}: ${n.targets} aviso(s).`);
  }
  console.log(`✅ Listo. ${summary.sent} push enviado(s).`);
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
