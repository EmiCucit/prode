"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca los Server Components de la ruta cada `intervalMs` para que los
 * marcadores en vivo se actualicen sin que el usuario recargue a mano.
 *
 * - `router.refresh()` re-ejecuta el render server-side; los datos siguen
 *   sujetos a la Data Cache de Next (revalidate 15s en vivo / 60s), así que
 *   varios clientes comparten la misma llamada a football-data y no se
 *   consume cuota de más.
 * - Se pausa cuando la pestaña está oculta (no refresca en background).
 */
export default function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      router.refresh();
    }, intervalMs);

    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
