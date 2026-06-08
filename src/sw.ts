import {
  CacheFirst,
  NetworkFirst,
  ExpirationPlugin,
  Serwist,
} from "serwist";
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // ── Google Fonts (CacheFirst, 1 year) ──────────────────────
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },

    // ── api-football fixtures proxy (NetworkFirst, 60 s) ───────
    // NEVER serve stale fixture data for prediction form validation
    {
      matcher: /^\/api\/fixtures/,
      handler: new NetworkFirst({
        cacheName: "api-fixtures",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 }),
        ],
      }),
    },

    // ── Predictions GET (NetworkFirst, 30 s) ───────────────────
    // Must be network-first: stale data could confuse the 10-min cutoff UI
    {
      matcher: ({ request }) =>
        new URL(request.url).pathname === "/api/predictions" &&
        request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "api-predictions",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 30 }),
        ],
      }),
    },

    // ── App pages (NetworkFirst, fallback to cache for offline) ─
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },

    // ── Serwist/Next defaults (static assets, images, etc.) ────
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// ── Web Push: mostrar notificación ─────────────────────────────────
self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data?.json() ?? {};
    } catch {
      return {};
    }
  })() as { title?: string; body?: string; url?: string };

  const title = data.title ?? "Prode Mundial 2026";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/partidos" },
    }),
  );
});

// ── Click en la notificación: enfocar/abrir la app ─────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? "/partidos";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
