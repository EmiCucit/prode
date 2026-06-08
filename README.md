# Prode Mundial 2026

App de predicciones del Mundial 2026 para grupo cerrado de amigos (~10 jugadores).
Desplegada en Vercel, instalable como PWA.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| UI | shadcn/ui + Tailwind v4, tema oscuro celeste/blanco |
| Base de datos | Supabase (Postgres + RLS) |
| Auth | JWT firmado (jose) + cookie httpOnly |
| Rate limiting | Upstash Redis (@upstash/ratelimit) |
| Datos de partidos | football-data.org v4 (competición WC, free tier) |
| PWA | @serwist/next — service worker con caching offline |
| Notificaciones | Web Push (VAPID, `web-push`) — recordatorios 2 h antes |
| Tests | Vitest (dominio, servicios, auth, API, componentes y paridad SQL) |
| Deploy | Vercel |

---

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá todos los valores:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|---|---|
| `FOOTBALL_DATA_TOKEN` | Token de [football-data.org](https://www.football-data.org/client/register) (free tier; cubre la competición WC) |
| `SUPABASE_URL` | URL del proyecto Supabase (Settings → API) |
| `SUPABASE_ANON_KEY` | Anon/public key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **solo server-side, nunca exponer al cliente** |
| `UPSTASH_REDIS_REST_URL` | URL de la base Redis en [Upstash](https://upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Token de la base Redis |
| `AUTH_SECRET` | Secreto para firmar JWT (mínimo 32 caracteres). Generá con: `openssl rand -base64 32` |
| `SEED_PASSWORDS` | Contraseñas en texto plano separadas por coma, mismo orden que los 10 jugadores. **Solo en `.env.local`, nunca commitear.** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID (Web Push). Generá el par con `npx web-push generate-vapid-keys`. |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID — **solo server-side**. |
| `VAPID_SUBJECT` | Contacto VAPID, ej. `mailto:tu@email.com`. |
| `REMINDER_LEAD_HOURS` | Opcional. Antelación del recordatorio push (default `2`). |
| `FIXTURES_SOURCE` | Opcional (solo dev). `db` lee fixtures de la tabla `results` en vez de football-data.org (dry-run). **Vacío en producción.** Ver [`scripts/dev/README.md`](scripts/dev/README.md). |
| `NEXT_PUBLIC_PUSH_TEST` | Opcional (solo dev). `1` muestra el botón "Probar notificación" en `/notificaciones`. |

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# editar .env.local con tus valores

# 3. Crear tablas y vista en Supabase (ver sección SQL más abajo)

# 4. Seed de usuarios
npm run seed

# 5. Sincronizar fixtures desde football-data.org → tabla results
npm run sync

# 6. Levantar dev server
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## Base de datos — Supabase

### Crear tablas, vista y políticas RLS

1. Abrí tu proyecto en [app.supabase.com](https://app.supabase.com).
2. Ir a **SQL Editor**.
3. Pegá y ejecutá, **en orden**, el contenido completo de:
   - [`001_initial.sql`](supabase/migrations/001_initial.sql) — tablas, vista `standings`, RLS.
   - [`002_penalty_scores.sql`](supabase/migrations/002_penalty_scores.sql) — columnas de penales.
   - [`003_standings_breakdown.sql`](supabase/migrations/003_standings_breakdown.sql) — `exact_with_bonus` (desglose del ranking).
   - [`004_cutoff_10min.sql`](supabase/migrations/004_cutoff_10min.sql) — cutoff de predicción a 10 min (RLS).
   - [`005_push_notifications.sql`](supabase/migrations/005_push_notifications.sql) — tablas de notificaciones push.

El script crea:

- **`users`** — jugadores con `password_hash` (bcrypt, nunca texto plano).
- **`results`** — metadata de fixtures + marcadores. Poblada por `npm run sync`.
- **`predictions`** — predicciones por jugador. Único por `(user_id, fixture_id)`.
- **Vista `standings`** — puntos calculados en tiempo real (no se persisten puntos).
- **Trigger `set_updated_at`** — actualiza `updated_at` automáticamente en INSERT/UPDATE.
- **RLS habilitado** — acceso de lectura pública, escritura solo propia con control de tiempo.

### Sistema de puntos

Los puntos **no se guardan** en la BD. La vista `standings` los calcula cruzando `predictions` con `results`:

| Resultado | Puntos |
|---|---|
| Marcador exacto | **3** |
| Ganador/empate correcto (sin exacto) | **1** |
| Sin acierto | **0** |
| + Penales correctos (solo eliminatoria, si el partido fue a penales) | **+1** |
| Máximo posible por partido | **4** |

Desempate: `total_points DESC` → `exact_results DESC` → `display_name ASC`.

### Mantener `results` actualizado

```bash
npm run sync
```

Ya está automatizado con **GitHub Actions** (`.github/workflows/sync.yml`, cada ~10 min, corre `npm run sync` con los secrets del repo). El ranking se recalcula solo (vista `standings`) al finalizar cada partido. Se puede correr a mano desde la pestaña **Actions** (`workflow_dispatch`).

---

## Seed de usuarios

Las contraseñas se pasan por `.env.local`. **Nunca commitear contraseñas.**

Orden de los 10 jugadores (mismo orden para `SEED_PASSWORDS`):
`santi, marian, tuto, chispa, maria, vicky, marti, guada, jime, juli`

```bash
# En .env.local — separadas por coma, sin espacios extra:
SEED_PASSWORDS=pass1,pass2,pass3,pass4,pass5,pass6,pass7,pass8,pass9,pass10

# Ejecutar (upsert — seguro de correr múltiples veces)
npm run seed
```

---

## Comandos

```bash
npm run dev              # Dev server con Turbopack (sin service worker)
npm run build            # Build de producción (webpack, compila el service worker)
npm run start            # Servidor de producción local
npm test                 # 136 tests (dominio, servicios, auth, API, componentes, paridad SQL)
npm run test:watch       # Vitest en modo watch
npm run seed             # Inserta/actualiza los 10 usuarios en Supabase
npm run sync             # Sincroniza fixtures de football-data.org a la tabla results
npm run reminders        # Envía recordatorios push a quien no predijo (cron 2h antes)
npm run generate-icons   # Regenera los íconos PNG pixel-art en public/icons/
```

> Para probar el flujo completo en local sin pegarle al proveedor (sembrar
> partidos y resultados ficticios), ver los scripts `dev:*` documentados en
> [`scripts/dev/README.md`](scripts/dev/README.md).

---

## Deploy en Vercel

El proyecto está conectado a Vercel vía Git, con **deploy automático por rama**:

| Rama | Entorno Vercel | Base de datos | URL |
|---|---|---|---|
| `master` (Production Branch) | **Production** | Supabase **prod** | `prode-delta.vercel.app` |
| `dev` | **Preview** | Supabase **dev** | URL estable de la rama (`prode-git-dev-…vercel.app`) |

Cada push/merge a `master` redeploya **producción**; cada push/merge a `dev` redeploya el **entorno de testeo**. El flujo de trabajo es: desarrollar contra `dev`, validar en su preview, y mergear a `master` para publicar.

### Build command

Definido en `vercel.json` → `npm run build` (que es `next build --webpack`). El flag `--webpack` es **necesario** para que Serwist compile el service worker (Turbopack no lo soporta en build).

### Variables de entorno

Se configuran por **scope** en **Settings → Environment Variables**:

- **Production** → credenciales de prod (Supabase prod, Upstash prod, `AUTH_SECRET` propio de prod, `FOOTBALL_DATA_TOKEN`).
- **Preview (rama `dev`)** → credenciales de dev (Supabase dev, etc.).

`SUPABASE_SERVICE_ROLE_KEY` solo vive server-side en Vercel; nunca se expone al cliente. `.vercelignore` evita subir los `.env*.local`.

### Sincronización de resultados (cron)

`results` se mantiene al día con **GitHub Actions** (`.github/workflows/sync.yml`, cada ~10 min), que corre `npm run sync` con los secrets del repo. El ranking se recalcula solo (vista SQL `standings`) al finalizar cada partido.

Los **recordatorios push** corren con otro workflow (`.github/workflows/reminders.yml`, cada 30 min → `npm run reminders`): avisan **2 h antes** a los usuarios suscriptos que aún no cargaron su predicción (ventana en `REMINDER_LEAD_HOURS`, dedup por `reminder_sent`). Ambos se pueden disparar a mano desde **Actions** (`workflow_dispatch`).

### Dominio y HTTPS

Vercel provee HTTPS automáticamente. Los service workers **solo funcionan en HTTPS** (o `localhost`).

---

## PWA — Instalación y modo offline

### Testear localmente

El service worker solo se registra en `NODE_ENV=production`:

```bash
npm run build   # compila con service worker
npm run start   # servidor en http://localhost:3000
```

### Instalar como app

**Android / Chrome:**
1. Abrí la app en Chrome.
2. Menú (⋮) → "Instalar app" o "Agregar a pantalla de inicio".

**iOS / Safari (14+):**
1. Abrí la app en Safari.
2. Botón compartir (□↑) → "Agregar a pantalla de inicio" → "Agregar".

### Verificar modo offline

1. Abrir **Chrome DevTools** → **Application** → **Service Workers**.
2. Verificar que el SW esté en estado `activated`.
3. **Network** → tildar "Offline".
4. Recargar — la app debe mostrar el último estado cacheado.

### Estrategias de caché

| Recurso | Estrategia | Offline |
|---|---|---|
| Assets estáticos Next.js | Precache (CacheFirst) | ✅ Siempre disponible |
| Íconos y manifest | Precache | ✅ Siempre disponible |
| Fuentes Google | CacheFirst, 1 año | ✅ Después de 1ra carga |
| `/api/fixtures` | NetworkFirst, fallback 5s | ✅ Último estado cacheado |
| `/api/predictions` GET | NetworkFirst, fallback 5s | ✅ Último estado cacheado |
| Navegación de páginas | NetworkFirst, fallback 5s | ✅ Último estado cacheado |
| `POST` (auth, predicciones) | Sin caché | ❌ Requiere conexión |

> **Garantía de integridad**: aunque la UI esté cacheada, el servidor **siempre valida el plazo de 10 minutos** antes de aceptar predicciones. El modo offline no permite bypasear el cierre de predicciones.

### Regenerar íconos

Los íconos son pixel-art generados con Node.js puro (sin dependencias de imagen):

```bash
# Editar el diseño en scripts/generate-icons.ts y regenerar:
npm run generate-icons
```

Los archivos generados van a `public/icons/` y se incluyen en el precache del SW automáticamente en el próximo `npm run build`.

---

## Estructura del proyecto

```
app/
  (auth)/login/           Login page
  (protected)/
    layout.tsx            Auth guard + NavBar
    partidos/             Lista de partidos, filtros y predicciones
    ranking/              Podio + tabla de posiciones
    notificaciones/       Activar push + botón de prueba (dev)
  api/
    auth/login|logout/    Route Handlers de auth (bcrypt + JWT)
    fixtures/             Proxy football-data.org (token solo en server)
    predictions/          CRUD predicciones con rate limiting
    push/subscribe|test/  Suscripción y envío de prueba de Web Push

components/
  atoms/      StatusBadge · Countdown · ScoreInput · NavBar · UserMenu · AutoRefresh · SerwistRegistration
  molecules/  FixtureCard · PredictionForm · FilterBar · PodiumSlot · NotificationsManager
  organisms/  FixtureList · RankingPodium · RankingTable · skeletons
  avatars/    10 avatares SVG pixel-art + componente índice Avatar

lib/
  domain/     calcPoints · isPredictionOpen · buildRanking  (puro, testeable)
  data/       repositorios Supabase + interfaces
  services/   fixtures.service · predictions.service
  auth/       session.ts (JWT)
  push/       webpush.ts (envío Web Push con VAPID)
  ratelimit.ts

scripts/
  seed-users.ts       Seed de los 10 jugadores
  sync-fixtures.ts    Sincronización football-data.org → results
  send-reminders.ts   Recordatorios push 2 h antes (cron)
  generate-icons.ts   Generación íconos PNG
  dev/                Herramientas de dry-run local + inspect-db — ver su README

supabase/migrations/   001 inicial · 002 penales · 003 desglose · 004 cutoff 10min · 005 push

.github/workflows/     sync.yml (resultados) · reminders.yml (push)

src/
  sw.ts              Service worker (caching + push/notificationclick)

tests/                136 tests Vitest
  domain/             scoring · cutoff · ranking (lógica pura)
  services/           fixtures · predictions
  auth/               session (JWT)
  api/                login · predictions (handlers con mocks)
  components/         PredictionForm · RankingTable · AutoRefresh (jsdom + Testing Library)
  lib/                ratelimit
  sql/                paridad vista standings ↔ scoring.ts
  QA-CHECKLIST.md     checklist de QA manual previo a prod
```
