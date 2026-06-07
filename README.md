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
| Datos de partidos | api-football v3 (league 1, season 2026) |
| PWA | @serwist/next — service worker con caching offline |
| Tests | Vitest (37 tests de dominio puro) |
| Deploy | Vercel |

---

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá todos los valores:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|---|---|
| `API_FOOTBALL_KEY` | API key de [api-football.com](https://api-football.com) |
| `SUPABASE_URL` | URL del proyecto Supabase (Settings → API) |
| `SUPABASE_ANON_KEY` | Anon/public key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **solo server-side, nunca exponer al cliente** |
| `UPSTASH_REDIS_REST_URL` | URL de la base Redis en [Upstash](https://upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Token de la base Redis |
| `AUTH_SECRET` | Secreto para firmar JWT (mínimo 32 caracteres). Generá con: `openssl rand -base64 32` |
| `SEED_PASSWORDS` | Contraseñas en texto plano separadas por coma, mismo orden que los 10 jugadores. **Solo en `.env.local`, nunca commitear.** |

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

# 5. Sincronizar fixtures desde api-football → tabla results
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
3. Pegá y ejecutá el contenido completo de [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).

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

Ejecutar periódicamente durante el torneo (recomendado: cada 30 min). Opciones:

- **Vercel Cron**: agregar a `vercel.json` un endpoint `/api/sync` con schedule `"*/30 * * * *"`.
- **GitHub Actions**: workflow con `schedule: cron: '*/30 * * * *'` que corre `npm run sync`.

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
npm test                 # 37 tests unitarios (dominio puro)
npm run test:watch       # Vitest en modo watch
npm run seed             # Inserta/actualiza los 10 usuarios en Supabase
npm run sync             # Sincroniza fixtures de api-football a la tabla results
npm run generate-icons   # Regenera los íconos PNG pixel-art en public/icons/
```

---

## Deploy en Vercel

### 1. Subir a GitHub y conectar en Vercel

1. Crear repo en GitHub y hacer push del código.
2. En [vercel.com](https://vercel.com): **New Project** → importar el repo.

### 2. Build command

Vercel detecta Next.js automáticamente. Asegurate de que el build command sea:

```
npm run build
```

> El script ya incluye `--webpack` internamente (`"build": "next build --webpack"`). Este flag es **necesario** para que Serwist compile el service worker.

### 3. Variables de entorno

En **Settings → Environment Variables**, agregar todas las de `.env.example` con sus valores de producción.

La `SUPABASE_SERVICE_ROLE_KEY` solo debe estar en el entorno de producción/preview de Vercel; nunca en el cliente.

### 4. Dominio y HTTPS

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

> **Garantía de integridad**: aunque la UI esté cacheada, el servidor **siempre valida el plazo de 15 minutos** antes de aceptar predicciones. El modo offline no permite bypasear el cierre de predicciones.

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
  api/
    auth/login|logout/    Route Handlers de auth (bcrypt + JWT)
    fixtures/             Proxy api-football (API key solo en server)
    predictions/          CRUD predicciones con rate limiting

components/
  atoms/      StatusBadge · Countdown · ScoreInput · NavBar · SerwistRegistration
  molecules/  FixtureCard · PredictionForm · FilterBar · PodiumSlot
  organisms/  FixtureList · RankingPodium · RankingTable · skeletons
  avatars/    10 avatares SVG pixel-art + componente índice Avatar

lib/
  domain/     calcPoints · isPredictionOpen · buildRanking  (puro, testeable)
  data/       repositorios Supabase + interfaces
  services/   fixtures.service · predictions.service
  auth/       session.ts (JWT)
  ratelimit.ts

scripts/
  seed-users.ts      Seed de los 10 jugadores
  sync-fixtures.ts   Sincronización api-football → results
  generate-icons.ts  Generación íconos PNG

supabase/migrations/
  001_initial.sql    SQL completo (tablas + vista standings + RLS)

src/
  sw.ts              Service worker (compilado durante npm run build)

tests/domain/        37 tests unitarios Vitest
```
