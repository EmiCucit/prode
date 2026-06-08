import webpush from "web-push";
import { createServerClient } from "@/lib/supabase/server";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface DbSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:admin@prode.local";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys no configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

type Db = ReturnType<typeof createServerClient>;

/** Envía a una lista de suscripciones; borra las que el browser reporta muertas. */
async function sendToSubscriptions(
  db: Db,
  subs: DbSubscription[],
  payload: PushPayload,
): Promise<number> {
  configure();
  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 → suscripción expirada o cancelada: limpiarla
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }),
  );

  return sent;
}

/** Envía un push a todas las suscripciones de un usuario. Devuelve cuántas se enviaron. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  const db = createServerClient();
  const { data } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  return sendToSubscriptions(db, (data ?? []) as DbSubscription[], payload);
}

export { sendToSubscriptions };
