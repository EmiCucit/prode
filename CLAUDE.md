@AGENTS.md

# Prode Mundial 2026

App de predicciones del Mundial para grupo cerrado de ~10 amigos.

## Stack
- Next.js 16.2.6 (Turbopack, App Router)
- TypeScript strict + noUncheckedIndexedAccess
- Tailwind v4 (tema via CSS, sin tailwind.config.ts)
- shadcn/ui (Radix, new-york style)
- Supabase (Postgres + RLS)
- Upstash Redis (rate limiting)
- @serwist/next (PWA)
- Vitest (tests unitarios)

## Convenciones importantes
- En Next.js 16 el archivo proxy es `proxy.ts` (no `middleware.ts`) con `export function proxy(...)`
- Tailwind v4: tema definido en `app/globals.css` con `@theme inline { --color-* }`
- Service worker en `src/sw.ts` con tsconfig propio `tsconfig.sw.json`
- Todo acceso a Supabase server-side usa service role; client.ts es para futura realtime
- Puntos NO se guardan en BD: se calculan en la vista SQL `standings`
- football-data.org v4: competición WC, auth `X-Auth-Token`, proxy en `app/api/fixtures/route.ts`

## Pasos completados
- [x] Paso 1: Arquitectura y SQL
- [x] Paso 2: Setup base
- [x] Paso 3: Dominio (calcPoints, isPredictionOpen, buildRanking + 37 tests)
- [x] Paso 4: Capa de datos (repositorios, PredictionsService, SQL migration)
- [x] Paso 5: Auth (login/logout handlers, JWT session, proxy.ts, seed script)
- [x] Paso 6: api-football proxy + rate limiting en todos los handlers
- [x] Paso 7: Pantalla de partidos (streaming, filtros URL, countdown, PredictionForm)
- [x] Paso 8: 10 avatares SVG pixel-art (bailando/celebrando/observando) + índice Avatar
- [x] Paso 9: Pantalla de ranking (podio mobile top-3 + desktop escalera 10, RankingTable, NavBar)
- [x] Paso 10: PWA (Serwist SW con caching strategies, íconos PNG generados, registro SW)
- [x] Paso 11: README completo, .gitignore actualizado, limpieza de archivos — PROYECTO COMPLETO

## Comandos
- `npm run dev` — desarrollo
- `npm run build` — producción
- `npm test` — vitest run
- `npm run test:watch` — vitest watch
