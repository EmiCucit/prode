# Sesión — 2026-06-07

Bitácora de la sesión de trabajo sobre **Prode Mundial 2026**. El foco fue
preparar la app para producción (testing) y migrar el proveedor de datos de
fixtures.

---

## 1. Lo que implementamos hoy

### Testing de cara a producción
- **Suite de tests ampliada de 37 → 116** (Vitest), cubriendo lo que antes no
  tenía cobertura y es lo más riesgoso para prod:
  - `tests/services/predictions.service.test.ts` — orquestación (fixture
    inexistente, ventana cerrada, sanitización de penales grupo vs eliminatoria).
  - `tests/services/fixtures.service.test.ts` — parsing del proveedor (mapeo de
    status, stage, grupo, penales, errores).
  - `tests/auth/session.test.ts` — JWT (firma/verificación, token
    manipulado/expirado, validación del secret, cookies).
  - `tests/api/predictions.route.test.ts` y `tests/api/login.route.test.ts` —
    validación de inputs y mapeo de errores a códigos HTTP (mockeando deps).
  - `tests/lib/ratelimit.test.ts` — `getIp` con headers de proxy.
  - `tests/sql/standings-parity.test.ts` — **paridad entre la vista SQL
    `standings` y `lib/domain/scoring.ts`** (réplica fiel del CASE de la vista,
    comparada contra `calcPoints` en toda la matriz de combinaciones).
- **`tests/QA-CHECKLIST.md`** — checklist de QA manual (env, BD, auth, PWA,
  seguridad, deploy) para lo que no se puede automatizar.

### Tooling de dry-run local
- Flag **`FIXTURES_SOURCE=db`** en `lib/services/fixtures.service.ts`: cuando
  está activo, la UI lee fixtures de la tabla `results` en vez del proveedor
  externo. **Apagado por defecto → prod no se ve afectada.**
- Scripts en `scripts/dev/` (+ npm scripts `dev:*`):
  - `seed-fixtures` — siembra partidos ficticios (IDs 99000x) con kickoffs
    relativos a ahora.
  - `load-result` — marca un partido como finalizado con marcador (y penales).
  - `show-standings` / `show-predictions` — inspección por consola
    (`show-predictions` calcula puntos con `calcPoints`).
  - `clear-fixtures` / `clear-predictions` — limpieza.
  - `verify-football-data` — verifica acceso a la API del Mundial.
  - Documentado en `scripts/dev/README.md`.

### Migración del proveedor de fixtures: api-football → football-data.org
- Reescrito `lib/services/fixtures.service.ts` para **football-data.org v4**
  (endpoint `/competitions/WC/matches`, auth `X-Auth-Token`).
- Mapeo al mismo tipo `Fixture` → dominio, BD, UI y scoring **sin cambios**.
- Tests del servicio actualizados al nuevo formato.

### Mejoras de UX
- `PredictionForm`:
  - Botón **"Actualizar"** se ve apagado (contained + `opacity-50`) y
    deshabilitado cuando no hay cambios respecto de lo guardado, con **tooltip
    estilizado** ("Modificá el resultado cargado para poder actualizar").
  - **Selector de penales** solo visible en eliminatoria **y** si el marcador
    cargado es empate.
- `FixtureCard`: fallback de logo (inicial del equipo en círculo) cuando no hay
  crest → elimina warnings de `<img src="">` y bug de performance.

### Filtros de partidos
- `FilterBar` reducido a **solo estado**: Próximos · En vivo · Finalizados.
- Removido el filtrado por fase/grupo de `FixtureList.tsx` y `partidos/page.tsx`
  (para que parámetros viejos en la URL no filtren sin forma de limpiarlos).

### Git / repo
- Toda la app commiteada (estaba sin commitear salvo el bootstrap).
- Repo público creado: **https://github.com/EmiCucit/prode**.
- Autoría de ambos commits corregida a `Emiliano Cucit <emicu144@gmail.com>`.

---

## 2. Decisiones técnicas (y por qué)

- **football-data.org (free) en vez de api-football ($19/mes)**: el free tier
  incluye el Mundial 2026 (104 partidos, temporada 2026). Resto del mercado más
  caro que api-football. Trade-off aceptado: reescribir la capa de fixtures.
  → Cuenta **directa** en football-data.org (header `X-Auth-Token`), **no por
  RapidAPI** (otro host/key, no compatible con el código).
- **Mantener el vocabulario interno de estados** (códigos estilo api-football:
  `NS/1H/HT/FT/AET/PEN/...`) como estándar normalizado. El transform de
  football-data mapea a esos códigos → no hubo que tocar `StatusBadge`, la vista
  SQL ni los tipos.
- **Status finalizado derivado de `score.duration`** (`REGULAR`→FT,
  `EXTRA_TIME`→AET, `PENALTY_SHOOTOUT`→PEN). Crítico: la vista `standings`
  filtra por FT/AET/PEN y el bonus de penales depende de "PEN".
- **Una sola llamada sin parámetros + filtros en memoria**: los 104 partidos se
  traen en una request cacheable que sirve a cualquier combinación de filtros →
  respeta el límite de 10 req/min del free tier.
- **`FIXTURES_SOURCE=db` como flag (default off)**: única forma de probar el
  flujo completo (predecir + inyectar resultados ficticios) en local sin gastar
  cuota ni depender del proveedor; no afecta prod.
- **Placeholder "A definir"** para equipos null (eliminatorias sin sortear
  devuelven `name: null`, que chocaba con el `NOT NULL` de `results`).
- **Identidad git local al repo** (no global) → la config de trabajo quedó
  intacta. Email personal elegido sobre el noreply (consciente de que queda
  visible en el repo público).

---

## 3. Lo que quedó pendiente

- **Producción**: el proyecto Supabase de prod está **pausado**. Hay que
  restaurarlo (o recrearlo si fue borrado por inactividad >90 días).
- **Migraciones en prod**: aplicar `001_initial.sql` y `002_penalty_scores.sql`
  en el Supabase de producción (en dev ya están).
- **Cron de sincronización**: configurar un job que corra `npm run sync`
  periódicamente durante el torneo para traer resultados reales.
- **Env vars obsoletas**: `API_FOOTBALL_KEY` y `FOOTBALL_SEASON` ya no se usan
  (quedaron marcadas en `.env.example`); se pueden borrar de los envs.
- **Tests de componentes React** (PredictionForm, RankingTable): fuera de
  alcance hasta ahora.
- **Repaso del README** para el repo público (que no exponga datos sensibles).

---

## 4. Próximos pasos sugeridos

1. Restaurar/crear el proyecto Supabase de **producción** y aplicar migraciones.
2. Setear envs de prod (incluido `FOOTBALL_DATA_TOKEN`, `AUTH_SECRET` ≥32 chars
   distinto a dev, Supabase y Upstash de prod).
3. Correr `npm run seed` (usuarios) y un primer `npm run sync` (fixtures) en prod.
4. Configurar el **cron** del `sync` (cada X minutos durante el Mundial).
5. Deploy (Vercel u otro) y recorrer el **checklist de `tests/QA-CHECKLIST.md`**.
6. Borrar las env vars obsoletas de api-football.

---

## 5. Contexto importante para retomar

- **Fecha de hoy**: 2026-06-07. **El Mundial arranca el 2026-06-11.**
- **Modo de datos**: `FIXTURES_SOURCE` está **vacío** en `.env.local` → la app
  usa **datos reales** de football-data.org. Para volver al dry-run, poner
  `FIXTURES_SOURCE=db` y reiniciar `npm run dev`.
- **`FOOTBALL_DATA_TOKEN`** está seteado en `.env.local` (free tier, cuenta
  EmiCucit). El acceso al Mundial está verificado (`npm run dev:verify-fd`).
- **Supabase dev**: proyecto ref `jnhfxedhhisvxhisuhlt` (free → se pausa por
  inactividad; se restaura desde el dashboard). Migraciones 001 + 002 aplicadas.
- **Estado de dev**: `results` con 104 partidos reales (pendientes),
  `predictions` vacío, ranking en 0. (El ranking muestra puntos solo cuando hay
  partidos finalizados — correcto que esté en 0 hasta que empiece el torneo.)
- **Calidad**: `npm test` (116 tests) y `npm run build` en verde.
- **Repo**: https://github.com/EmiCucit/prode (público), rama `master`. Las
  ramas futuras salen de ahí. Identidad git local = personal.
- **Convención clave** (de CLAUDE.md): los puntos NO se guardan en BD, se
  calculan en la vista SQL `standings`; el test de paridad la mantiene
  sincronizada con `scoring.ts`.
- **Usuarios seed**: santi, marian, tuto, chispa, maria, vicky, marti, guada,
  jime, juli (contraseñas en `SEED_PASSWORDS`).

---
---

# Sesión — 2026-06-08

Continuación: salida a producción, CI/CD por Git y nuevas features. Todo
probado en `dev` y promovido a `master` (prod).

## 1. Lo que implementamos

### Retoques previos a prod
- Limpieza de env vars obsoletas de api-football; docs migradas a
  football-data.org (README, CLAUDE, scripts/dev).
- Tests de componentes (Vitest + Testing Library + jsdom): `PredictionForm`,
  `RankingTable`, `AutoRefresh`. Suite total: **136 tests**.
- `scripts/dev/inspect-db.ts` — diagnóstico de una base (tablas, vista,
  migraciones 002/003/005).

### Deploy en Vercel + CI/CD por Git
- Proyecto conectado a Vercel vía Git: **`master` → Production** (Supabase prod),
  **`dev` → Preview** (Supabase dev). Deploy automático por push/merge.
- `vercel.json` fuerza `npm run build` (flag `--webpack` para Serwist).
- `.vercelignore` evita subir `.env*.local`, tests y scripts/dev.
- Env vars por scope en Vercel (Production + Preview-`dev`).
- Preview de `dev` protegido por Deployment Protection (Vercel Authentication).

### Cron de sincronización (GitHub Actions)
- `.github/workflows/sync.yml` corre `npm run sync` cada ~10 min (prod) →
  mantiene `results` al día. El ranking se recalcula solo (vista `standings`).

### Cuatro mejoras de gameplay/UX
- **Sesión 90 días con renovación sliding** (cookie/JWT + re-firma en `proxy.ts`).
- **Cutoff de predicción 15 → 10 min** (`cutoff.ts` + migración 004 RLS).
- **Eliminatorias ocultas** hasta que se confirman ambos equipos
  (`fixtures.service.ts`).
- **Desglose en el ranking**: columnas Plenos (3pts) · P+B (pleno+bonus, 4pts) ·
  ✓ (resultado, 1pt) → migración 003 agrega `exact_with_bonus` a la vista.
- **Resaltado del usuario actual** en la tabla (fondo primary + barra + chip "vos").

### Notificaciones push (Web Push / VAPID)
- Migración 005: `push_subscriptions` + `reminder_sent` (dedup).
- Service worker: handlers `push` y `notificationclick`.
- `/api/push/subscribe` y `/api/push/test`; UI en `/notificaciones`.
- NavBar reordenado: **Partidos · Ranking · Avisos**; "Salir" movido a un
  menú (popover) arriba a la derecha (`UserMenu`).
- Cron `reminders.yml` (cada 30 min): avisa **2 h antes** a quien no predijo
  (ventana por `REMINDER_LEAD_HOURS`, default 2). Mensaje:
  *"⚽ ¡No te olvides de predecir! — {Local} vs {Visitante} arranca pronto…"*.
- Verificado el envío end-to-end en dev (botón "Probar", solo dev) y en prod.

## 2. Decisiones técnicas
- **Deploy por Git** en vez de CLI: merges a dev/master redeployan solos.
- **Env de Preview scopeado a la rama `dev`**: el CLI no deja "todas las preview"
  no-interactivo; scopear a `dev` fue la vía (requiere repo Git conectado).
- **Lead-time de recordatorios por env** (no hardcode): test con ventana amplia
  vs. 2 h en prod sin tocar código.
- **Botón "Probar notificación" gated** con `NEXT_PUBLIC_PUSH_TEST` (solo dev).
- **iOS**: el push solo funciona con la **PWA instalada** (iOS 16.4+); por eso
  la PWA + sesión larga son requisito de la feature de avisos.
- **VAPID**: mismo keypair en dev y prod (en env por scope + GH secrets).

## 3. Estado al cierre
- **Prod** (`prode-delta.vercel.app`): todas las features live, migraciones
  001–005 aplicadas, push verificado (suscripción de `chispa`). Crons `sync`
  (10 min) y `reminders` (2 h) activos. 1 predicción real cargada.
- **Supabase prod** ref `kvffonqzcecfnykqpwol`; **dev** ref `jnhfxedhhisvxhisuhlt`
  (ambos con 001–005).
- **Calidad**: `npm test` (136) y `npm run build` en verde.
- Premios definidos para el instructivo: 1° 100 · 2° 30 · 3° 20.

## 4. Pendientes / notas
- **Reactivar Deployment Protection de dev** (quedó público para probar la PWA).
- Warning informativo de GitHub Actions: `checkout@v4`/`setup-node@v4` migran a
  Node 24 (jun/2026) — se puede bumpear, no urge.
- No cambiar la URL `prode-delta.vercel.app` ahora (rompería PWAs instaladas y
  suscripciones push, que son por-origen) — decidido dejarla así.

---
---

# Sesión — 2026-06-11

Primer día del Mundial. Los usuarios reportaron 3 fallas en prod; se
diagnosticaron, se corrigieron y se sumó una feature al ranking. Todo probado
en `dev` (Preview) y promovido a `master` (prod).

## 1. Las 3 fallas reportadas y su causa

- **Marcador no actualiza en vivo (baja)**: el free tier de football-data.org
  no publica el marcador mientras el partido está en juego (`score.fullTime`
  null). No es bug propio; limitación del plan.
- **Resultado final 0–0 para algunos (alta)**: dos factores. (a) El proveedor
  marca `FINISHED` antes de publicar el marcador → llega `score` null. (b)
  `FixtureCard` renderizaba `{homeScore ?? 0}`, mostrando un **falso "0 — 0"**
  indistinguible de un 0–0 real. Quien miraba temprano veía 0–0 sin puntos;
  quien miraba tarde, el resultado correcto. No era por usuario sino por
  **cuándo** miraban.
- **Ranking en cero (altísima)**: el cron de GitHub Actions (nominal cada 10
  min) en horas pico se disparaba **cada 2–4 h**; además un sync escribió `FT`
  con `home_score` null, y la vista `standings` excluye filas con score null →
  ranking en 0 aunque la pantalla de partidos (que lee del proveedor) ya
  mostraba puntos.

## 2. Lo que implementamos

- **`FixtureCard`**: nunca mostrar un falso 0–0. Con score null muestra
  `– — –` + leyenda ("Resultado pendiente de actualizar" en FT, "Marcador no
  disponible" en vivo). Se corrigió además el `PointsBadge` para el caso de
  **2 pts** (resultado acertado + bonus de penales), que antes se etiquetaba
  mal como "Sin puntos".
- **Sync confiable**: nuevo endpoint **`/api/cron/sync`** (route handler GET)
  protegido por **`CRON_SECRET`** (header `Authorization: Bearer …` o
  `?secret=`). La lógica se extrajo a `lib/services/sync.ts`, compartida por el
  script `npm run sync` y el endpoint. `proxy.ts` deja pasar `/api/cron` sin
  sesión (lo protege el secret).
- **CI**: bump de `actions/checkout` y `actions/setup-node` a **v5** (Node 24)
  en `sync.yml` y `reminders.yml` — GitHub forzaba Node 24 el 16/jun.
- **Feature ranking — desglose por jugador**: ícono (chevron) en cada fila con
  predicciones en partidos finalizados; al tocarlo (o la fila) despliega sus
  predicciones vs. el resultado real con los puntos calculados, **ordenadas de
  más reciente a más vieja, de a 5, con paginación** Anterior/Siguiente.
  `RankingTable` pasó a client component; la data se arma server-side en
  `lib/domain/breakdown.ts` (`buildBreakdowns`) y se pasa serializada. Se sumó
  `PredictionsRepository.findAll()`.
- **Texto "Último resultado calculado"** arriba del ranking: muestra el partido
  finalizado más reciente (`latestFinishedResult` en `breakdown.ts`).
- **Tests**: +11 (≈155 en total): `tests/domain/breakdown.test.ts`
  (buildBreakdowns + latestFinishedResult) y expansión/paginación en
  `RankingTable.test.tsx`.

## 3. Salida a prod y configuración del cron externo

- Commit en `dev` → merge ff a `master` → deploy de prod automático.
- **`CRON_SECRET` seteado en Vercel** (Production + Preview/dev) por CLI.
  Escollo: el primer `vercel env add` por pipe de PowerShell dejó el valor
  **mangleado** (no coincidía) → endpoint daba 401. Se resolvió **re-agregando
  el secret desde un archivo por redirección** (`cmd /c "vercel env add … <
  file"`, bytes exactos sin newline) y **redeployando prod** (los env vars se
  capturan por-deployment).
- **Cron externo en cron-job.org** (plan de Vercel es **Hobby** → Vercel Cron
  solo corre 1×/día, no sirve): GET a
  `https://prode-delta.vercel.app/api/cron/sync` **cada 5 min** con el header
  `Authorization: Bearer <CRON_SECRET>`. GitHub Actions queda de respaldo.
- **Verificación**: logs de Vercel mostraron el 401→200 tras corregir el header
  del cron, y el `updated_at` de `results` en prod avanza en cada corrida.

## 4. Decisiones técnicas

- **Endpoint + cron externo** en vez de depender solo de GitHub Actions: el
  schedule de Actions se atrasa horas en horas pico; un cron dedicado cada 5
  min es la fuente confiable, con Actions de red de seguridad.
- **`CRON_SECRET` compatible con la convención de Vercel Cron** (Bearer
  automático) por si en el futuro pasan a Pro: el endpoint ya funcionaría sin
  cambios.
- **Puntos calculados server-side** para el desglose (misma `calcPoints` del
  ranking) y pasados serializados → el client solo pinta; sin lógica duplicada.
- **Cargar todas las predicciones/resultados de una** para el ranking (~10
  usuarios) en vez de lazy-load por usuario: dataset chico, sin endpoint extra
  ni rate-limit.

## 5. Estado al cierre

- **Prod** (`prode-delta.vercel.app`): 3 fallas resueltas, feature del ranking
  live, sync cada 5 min vía cron-job.org (verificado 200 + `updated_at`
  avanzando). `CRON_SECRET` en Vercel (Prod + Preview/dev).
- **Calidad**: `npm test` (~155) y `npm run build` en verde.
- **Limpieza**: predicciones de demo borradas de dev
  (`npm run dev:clear-predictions`), server local frenado.

## 6. Pendientes / notas

- **Marcador en vivo**: sin fix gratis (limitación del free tier). El `– — –`
  evita la confusión; para live scores reales haría falta un tier pago.
- Si algún día pasan a **Vercel Pro**: se puede mover el cron a `vercel.json`
  (`crons: [{ path: "/api/cron/sync", schedule: "*/5 * * * *" }]`) y desactivar
  cron-job.org y/o el de GitHub Actions.
