"use client";

import { useState, useEffect, useCallback } from "react";

const VAPID_PUBLIC = process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"];
const SHOW_TEST = process.env["NEXT_PUBLIC_PUSH_TEST"] === "1";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

export default function NotificationsManager() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported) {
      // En iOS, Push solo existe dentro de la PWA instalada (iOS 16.4+)
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setState(isIOS && !standalone ? "needs-install" : "unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setState(sub ? "on" : "off");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function activar() {
    setBusy(true);
    setMsg(null);
    try {
      if (!VAPID_PUBLIC) throw new Error("Falta la clave pública VAPID");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        setMsg("Permiso de notificaciones no otorgado.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("No se pudo registrar la suscripción");

      setState("on");
      setMsg("✓ Notificaciones activadas en este dispositivo.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al activar");
    } finally {
      setBusy(false);
    }
  }

  async function desactivar() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setState("off");
      setMsg("Notificaciones desactivadas en este dispositivo.");
    } catch {
      setMsg("No se pudo desactivar");
    } finally {
      setBusy(false);
    }
  }

  async function probar() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      setMsg(res.ok ? "📨 Enviada — debería llegarte en un instante." : data.error ?? "Error");
    } catch {
      setMsg("Error de red");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        Activá las notificaciones para que te avisemos <b className="text-foreground">2 horas antes</b> de
        un partido si todavía no cargaste tu predicción.
      </p>

      {state === "loading" && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {state === "unsupported" && (
        <p className="text-sm text-destructive">Tu navegador no soporta notificaciones push.</p>
      )}

      {state === "needs-install" && (
        <p className="text-sm text-amber-400">
          En iPhone, primero <b>instalá la app</b>: tocá Compartir (□↑) → “Agregar a inicio”, abrila desde
          el ícono y volvé a esta pantalla.
        </p>
      )}

      {state === "denied" && (
        <p className="text-sm text-destructive">
          Bloqueaste las notificaciones. Habilitalas desde los ajustes del navegador/sistema para esta app.
        </p>
      )}

      {state === "off" && (
        <button
          onClick={activar}
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Activando…" : "Activar notificaciones"}
        </button>
      )}

      {state === "on" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            ● Activadas en este dispositivo
          </span>
          <button
            onClick={desactivar}
            disabled={busy}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            Desactivar
          </button>
          {SHOW_TEST && (
            <button
              onClick={probar}
              disabled={busy}
              className="rounded-md border border-primary/50 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              Probar notificación
            </button>
          )}
        </div>
      )}

      {msg && <p className="text-sm text-foreground">{msg}</p>}
    </div>
  );
}
