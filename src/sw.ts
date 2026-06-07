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
    // Must be network-first: stale data could confuse the 15-min cutoff UI
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
