import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import NotificationsManager from "@/components/molecules/NotificationsManager";

export const metadata = { title: "Notificaciones" };

export default async function NotificacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Notificaciones</h1>
      <NotificationsManager />
    </main>
  );
}
