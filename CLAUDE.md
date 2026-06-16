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
- Cutoff de predicción: **10 min** antes del kickoff (`lib/domain/cutoff.ts` + RLS migración 004) — mantener ambos en sync
- Revelar predicciones de todos: solo mientras el partido está **en curso** (`isLive`, `LIVE_STATUSES`), desplegable cerrado por defecto (`PredictionsReveal.tsx`); datos vía `PredictionsRepository.findRevealedForFixtures`
- Migraciones SQL: 001 inicial · 002 penales · 003 desglose (`exact_with_bonus`) · 004 cutoff 10min · 005 push. DDL se aplica a mano en el SQL Editor (dev y prod)
- Deploy por Git en Vercel: `dev` → Preview (Supabase dev), `master` → Production (Supabase prod). Env vars por scope
- Sync de resultados: **cron externo (cron-job.org) cada 5 min** pega a `/api/cron/sync` (protegido por `CRON_SECRET`, header `Authorization: Bearer …` o `?secret=`). GitHub Actions `sync.yml` (~10 min) queda de respaldo. Plan Vercel Hobby → Vercel Cron no sirve (1×/día)
- Recordatorios push: **cron externo (cron-job.org) cada 15 min** pega a `/api/cron/reminders` (mismo `CRON_SECRET`; override de ventana con `?lead_hours=`). GitHub Actions `reminders.yml` (30 min) queda de respaldo — **el schedule de Actions se atrasa horas y se salteaba la ventana de 2 h** (por eso nunca llegaban los avisos)
- Crons en GitHub Actions (solo respaldo): `sync.yml` (~10 min) y `reminders.yml` (30 min)
- Lógica compartida en `lib/services/sync.ts` y `lib/services/reminders.ts` (las usan los scripts `npm run sync` / `npm run reminders` y los endpoints `/api/cron/sync` / `/api/cron/reminders`)
- Push (Web Push/VAPID): suscripción en `/api/push/subscribe`, envío en `lib/push/webpush.ts`. En iOS requiere la PWA instalada (16.4+)

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

## Post-lanzamiento (en prod)
- [x] Deploy en Vercel + CI/CD por Git (dev→preview, master→prod)
- [x] Cron de sincronización de resultados (GitHub Actions)
- [x] Sesión 90 días con renovación sliding (PWA iOS)
- [x] Cutoff de predicción 15 → 10 min
- [x] Eliminatorias ocultas hasta confirmarse los equipos
- [x] Desglose del ranking: Plenos · P+B · ✓ (+ resaltado del usuario actual)
- [x] Notificaciones push (VAPID): UI en /notificaciones, cron de recordatorios 2 h antes
- Detalle completo de esta etapa en `SESION.md` (sesión 2026-06-08)

## Mundial en curso (sesión 2026-06-11)
- [x] Fix marcador: sin falso "0 — 0" cuando el proveedor aún no publicó el score (`FixtureCard`)
- [x] Sync confiable: endpoint `/api/cron/sync` + cron-job.org cada 5 min (resuelve el ranking en 0 por atrasos de GitHub Actions)
- [x] Desglose del ranking: ícono por jugador que despliega sus predicciones en partidos finalizados (últimos 5 + paginación)
- [x] Texto "Último resultado calculado" arriba del ranking
- [x] CI: bump de actions a v5 (Node 24)
- Detalle completo en `SESION.md` (sesión 2026-06-11)

## Recordatorios confiables (sesión 2026-06-12)
- [x] Fix: los recordatorios push no llegaban en prod porque corrían **solo** por GitHub Actions, cuyo schedule se atrasa 2–4 h y se saltea la ventana de 2 h. Solución: endpoint `/api/cron/reminders` + cron externo (mismo patrón que `sync`)

## Partidos: revelar predicciones + filtros (sesión 2026-06-15)
- [x] Desplegable (cerrado por defecto) con las predicciones de todos, visible **solo con el partido en curso**; la propia resaltada y primera (`PredictionsReveal.tsx` + `findRevealedForFixtures`)
- [x] Filtro **"Próximos" por defecto** al entrar a `/partidos`; pills siempre seleccionan (sin toggle-off ni vista "Todos")
- [x] **Finalizados ordenados por finalización** (kickoff desc como proxy); resto cronológico ascendente
- [x] Probado en prod (OK). Detalle en `SESION.md` (sesión 2026-06-15)

## Comandos
- `npm run dev` — desarrollo
- `npm run build` — producción
- `npm test` — vitest run
- `npm run test:watch` — vitest watch
- `npm run seed` / `npm run sync` / `npm run reminders` — usuarios / fixtures / recordatorios push
