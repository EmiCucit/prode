# Checklist de QA — Prode Mundial 2026

Lista de verificación previa a subir a producción. Cubre lo que los unit
tests **no** pueden verificar (infra, env, BD real, PWA, seguridad, UX).

> Tests automatizados: `npm test` (133 casos). Build: `npm run build`.
> Ambos deben estar en verde antes de empezar este checklist.

---

## 1. Variables de entorno (producción)

Verificar que estén seteadas en el entorno de deploy (Vercel/host):

- [ ] `AUTH_SECRET` — **≥ 32 caracteres**, aleatorio, distinto al de dev.
      (la app falla al firmar sesión si es más corto)
- [ ] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — proyecto **prod**, no dev.
- [ ] `FOOTBALL_DATA_TOKEN` — válido y con cuota disponible (free tier: 10 req/min).
- [ ] `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — instancia prod.
- [ ] `NODE_ENV=production` (lo setea el host; habilita cookie `secure`).
- [ ] Ningún secreto commiteado: `.env*.local` está en `.gitignore`.

## 2. Base de datos (Supabase prod)

- [ ] Migración `001_initial.sql` aplicada.
- [ ] Migración `002_penalty_scores.sql` aplicada (columnas de penales).
- [ ] Vista `standings` existe y devuelve filas.
- [ ] RLS habilitado en `users`, `results`, `predictions`.
- [ ] **Verificación de puntaje contra BD real** (el test de paridad valida la
      lógica, pero conviene confirmar en datos reales):
  1. Insertar un par de predicciones y un `result` finalizado conocido.
  2. `SELECT * FROM standings;` y comparar `total_points` con lo esperado
     a mano y con `calcPoints` para los mismos datos.
  3. Confirmar tiebreakers: total_points → exact_results → display_name.
- [ ] Fixtures cargados: `npm run sync` poblando `results` desde football-data.org.
- [ ] Usuarios creados: `npm run seed` (los ~10 amigos, con hashes bcrypt).

## 3. Autenticación y sesión

- [ ] Login con credenciales correctas → redirige a `/partidos`.
- [ ] Login con password incorrecto → "Usuario o contraseña incorrectos" (401).
- [ ] Usuario inexistente → mismo mensaje y tiempo similar (anti-enumeración).
- [ ] 6+ intentos fallidos seguidos → 429 "Demasiados intentos" (rate limit).
- [ ] Cookie `session`: `HttpOnly`, `Secure`, `SameSite=Lax` (revisar DevTools).
- [ ] Acceder a `/partidos` o `/ranking` sin sesión → redirige a `/login?next=...`.
- [ ] Token manipulado/expirado → redirige a login y limpia la cookie.
- [ ] Logout → borra cookie y bloquea rutas protegidas.
- [ ] Estando logueado, visitar `/login` → redirige a `/partidos`.

## 4. Predicciones (flujo principal)

- [ ] Cargar predicción en partido futuro (>10 min) → se guarda, persiste al recargar.
- [ ] Editar una predicción existente → se actualiza (upsert por user+fixture).
- [ ] Partido a <10 min del kickoff → formulario bloqueado / 422 al enviar.
- [ ] Partido ya empezado/jugado → no se puede predecir.
- [ ] Scores negativos o no enteros → rechazados (validación cliente y 400 server).
- [ ] `penaltyWinner` solo aparece/aplica en partidos de eliminatoria.
- [ ] `penaltyWinner` enviado en partido de grupo → se ignora (no rompe).
- [ ] Countdown muestra tiempo restante correcto y cambia a "cerrado" al llegar.

## 5. Ranking

- [ ] Tras finalizar partidos, los puntos se reflejan en el ranking.
- [ ] Exacto = 3, resultado correcto = 1, errado = 0.
- [ ] Eliminatoria con penales: bonus +1 si acertó el ganador de penales.
- [ ] Empates resueltos por exact_results y luego nombre (alfabético es).
- [ ] Podio mobile (top-3) y escalera desktop (10) renderizan bien.
- [ ] Predicciones ajenas visibles solo **después** del kickoff (no antes).

## 6. football-data.org (proxy `/api/fixtures`)

- [ ] Lista de partidos carga con datos reales (logos, equipos, horarios).
- [ ] Filtro por estado funciona (Próximos · En vivo · Finalizados).
- [ ] Partidos en vivo revalidan más seguido (~15s).
- [ ] Si football-data.org falla → 502 "Error al obtener partidos" (no rompe la UI).
- [ ] Rate limit del proxy no se dispara en uso normal (60/min).
- [ ] Zona horaria de los kickoffs correcta para los usuarios (AR).

## 7. PWA

- [ ] `manifest.webmanifest` se sirve y es válido (íconos, nombre, theme).
- [ ] Service worker (`/sw.js`) se registra sin errores en consola.
- [ ] App instalable (prompt en mobile/desktop).
- [ ] Funciona offline lo cacheado; degrada con elegancia sin red.
- [ ] Tras un deploy nuevo, el SW actualiza (no sirve assets viejos para siempre).
- [ ] Íconos PNG en `public/icons/` presentes y referenciados.

## 8. Seguridad

- [ ] Rutas protegidas inaccesibles sin sesión (proxy + check en handlers).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en server, nunca expuesta al cliente.
- [ ] No hay endpoints que devuelvan `password_hash` u otros datos sensibles.
- [ ] Rate limiting activo en login, lectura y escritura de predicciones.
- [ ] Inputs validados server-side (no confiar solo en validación cliente).
- [ ] Headers/errores no filtran stack traces ni internals al cliente.

## 9. Build & deploy

- [ ] `npm run build` en verde (sin errores de TypeScript ni de lint).
- [ ] `npm test` en verde (133 tests).
- [ ] Deploy de prueba accesible por HTTPS.
- [ ] `proxy.ts` (no `middleware.ts`) activo — rutas redirigen como se espera.
- [ ] Assets estáticos y rutas del matcher excluidas correctamente del proxy.
- [ ] Logs de prod no muestran errores recurrentes tras navegación básica.

## 10. UX / responsive

- [ ] Mobile (360px), tablet y desktop sin overflow ni cortes.
- [ ] Estados de carga (skeletons) visibles durante streaming.
- [ ] Mensajes de error legibles y accionables (no genéricos crípticos).
- [ ] Navegación (NavBar) funciona entre partidos y ranking.
- [ ] Avatares se muestran correctamente para cada usuario.

---

### Notas

- El test de **paridad SQL↔TS** (`tests/sql/standings-parity.test.ts`) protege
  contra que la vista `standings` y `scoring.ts` se desincronicen. Si tocás la
  lógica de puntaje, actualizá **ambos** y re-ejecutá la migración en Supabase.
- Los handlers HTTP están testeados con mocks; el checklist los valida de punta
  a punta contra infra real (Supabase + Upstash + football-data.org).
