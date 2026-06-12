/**
 * Sincroniza la tabla `results` con los datos de football-data.org.
 * Ejecutar manualmente o vía el cron de GitHub Actions (.github/workflows/sync.yml).
 * Uso: npm run sync
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { syncFixtures } from "@/lib/services/sync";

async function main() {
  console.log("🔄 Sincronizando fixtures con football-data.org...\n");

  const { total, finished } = await syncFixtures();

  console.log(`✅ Sincronizados ${total} fixtures`);
  console.log(`   ${finished} finalizados | ${total - finished} pendientes/en juego`);
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
