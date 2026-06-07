# Dry-run local — guía de pruebas

Herramientas para probar el flujo completo (login → predecir → cargar
resultados → ver ranking) **en local pegándole a Supabase dev**, sin
depender de api-football. Útil para validar antes de subir a producción.

## Cómo funciona

La pantalla de partidos normalmente lee de **api-football**. Para el dry-run
activamos un flag que la hace leer de la tabla `results` (donde sembramos
partidos ficticios con kickoffs futuros). Así podemos:

1. Predecir sobre partidos con la ventana abierta.
2. Inyectar resultados ficticios a mano (imposible con datos en vivo).
3. Verificar que el ranking (vista SQL `standings`) calcula bien los puntos.

El flag es `FIXTURES_SOURCE=db` en `.env.local`. **Apagado (vacío) en
producción** → la app usa api-football normalmente.

## Setup (una vez)

En `.env.local`:

```
FIXTURES_SOURCE=db
```

Asegurate de tener los usuarios seedeados (`npm run seed`) y la migración
`002_penalty_scores.sql` aplicada en el proyecto Supabase.

## Flujo de prueba

```bash
# 1. Sembrar 8 partidos ficticios (grupos + eliminatorias + casos borde)
npm run dev:seed-fixtures

# 2. Levantar la app y predecir desde el navegador
npm run dev                      # http://localhost:3000
#    Logueate con 2+ usuarios (santi, marian, …) y cargá predicciones.
#    Partidos abiertos para predecir: 990001–990006
#    Casos borde (deben verse cerrados): 990007 (cutoff), 990008 (pasado)

# 3. Ver qué predijo cada uno
npm run dev:predictions

# 4. Cargar resultados ficticios (dispara el cálculo de puntos)
npm run dev:load-result -- 990001 2 0          # marcador normal
npm run dev:load-result -- 990005 0 0 away     # eliminatoria a penales

# 5. Verificar el ranking
npm run dev:standings            # o abrir http://localhost:3000/ranking

# 6. Limpiar todo al terminar
npm run dev:clear-fixtures       # borra los 99000x + sus predicciones
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev:seed-fixtures` | Siembra 8 partidos ficticios (IDs 99000x) con kickoffs relativos a ahora |
| `npm run dev:predictions` | Lista las predicciones cargadas por jugador |
| `npm run dev:load-result -- <id> <h> <a> [home\|away]` | Marca un partido como finalizado con ese marcador (el 4º arg = ganador de penales, solo si hay empate) |
| `npm run dev:standings` | Imprime la vista `standings` por consola |
| `npm run dev:clear-fixtures` | Borra los partidos 99000x y sus predicciones |

## Volver a modo producción (datos reales de api-football)

Cuando tengas la subscripción de api-football y quieras ver los partidos
reales del Mundial:

1. En `.env.local`, **apagá el flag**: dejá `FIXTURES_SOURCE=` vacío (o borrá la línea).
2. Confirmá `FOOTBALL_SEASON=2026` (requiere plan pago de api-football).
3. Reiniciá `npm run dev`.
4. Poblá la tabla `results` con los fixtures reales: `npm run sync`.
   (En prod esto se corre periódicamente para traer horarios y resultados.)

> Los partidos ficticios (99000x) y los reales pueden convivir en `results`
> sin chocar (rangos de ID distintos), pero conviene correr
> `npm run dev:clear-fixtures` antes de pasar a datos reales para no
> ensuciar el ranking.
