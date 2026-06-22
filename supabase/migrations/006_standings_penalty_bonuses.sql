-- ================================================================
-- 006 — Desglose aditivo del ranking: agrega `penalty_bonuses`
-- (TODOS los aciertos del bonus de penales, valgan 1pt cada uno,
-- sin importar si la base fue un pleno o un empate acertado).
--
-- Reemplaza conceptualmente a `exact_with_bonus` (003): aquella solo
-- contaba los plenos con bonus y dejaba invisible el bonus pegado a un
-- resultado acertado no exacto. Con esta columna el desglose cierra:
--   total_points = 3·exact_results + 1·correct_outcomes + 1·penalty_bonuses
--
-- No cambia el cálculo de total_points; solo agrega una columna de conteo.
-- `exact_with_bonus` se mantiene (CREATE OR REPLACE VIEW no permite quitar
-- ni reordenar columnas existentes) aunque la UI ya no la use.
-- Mantener la lógica de puntos en paridad con lib/domain/scoring.ts.
-- Ejecutar en ambos proyectos Supabase (dev y prod).
-- ================================================================

CREATE OR REPLACE VIEW standings AS
SELECT
  u.id           AS user_id,
  u.username,
  u.display_name,
  u.avatar_key,

  COUNT(p.id) FILTER (
    WHERE r.status IN ('FT', 'AET', 'PEN') AND r.home_score IS NOT NULL
  ) AS predictions_made,

  COALESCE(SUM(
    CASE
      WHEN p.home_score = r.home_score
       AND p.away_score = r.away_score                        THEN 3
      WHEN (p.home_score > p.away_score AND r.home_score > r.away_score)
        OR (p.home_score < p.away_score AND r.home_score < r.away_score)
        OR (p.home_score = p.away_score AND r.home_score = r.away_score)
                                                              THEN 1
      ELSE 0
    END
    +
    CASE
      WHEN r.stage = 'knockout'
       AND r.penalty_winner IS NOT NULL
       AND p.penalty_winner = r.penalty_winner                THEN 1
      ELSE 0
    END
  ) FILTER (
    WHERE r.status IN ('FT', 'AET', 'PEN') AND r.home_score IS NOT NULL
  ), 0) AS total_points,

  COUNT(p.id) FILTER (
    WHERE r.status IN ('FT', 'AET', 'PEN')
      AND r.home_score IS NOT NULL
      AND p.home_score = r.home_score
      AND p.away_score = r.away_score
  ) AS exact_results,

  COUNT(p.id) FILTER (
    WHERE r.status IN ('FT', 'AET', 'PEN')
      AND r.home_score IS NOT NULL
      AND NOT (p.home_score = r.home_score AND p.away_score = r.away_score)
      AND (
        (p.home_score > p.away_score AND r.home_score > r.away_score) OR
        (p.home_score < p.away_score AND r.home_score < r.away_score) OR
        (p.home_score = p.away_score AND r.home_score = r.away_score)
      )
  ) AS correct_outcomes,

  -- (003) Plenos que además acertaron el bonus de penales (4pts).
  -- Se mantiene por compatibilidad de la vista; la UI ya no la usa.
  COUNT(p.id) FILTER (
    WHERE r.status IN ('FT', 'AET', 'PEN')
      AND r.home_score IS NOT NULL
      AND p.home_score = r.home_score
      AND p.away_score = r.away_score
      AND r.stage = 'knockout'
      AND r.penalty_winner IS NOT NULL
      AND p.penalty_winner = r.penalty_winner
  ) AS exact_with_bonus,

  -- (006) TODOS los aciertos del bonus de penales (1pt c/u), sin exigir
  -- pleno: el bonus vale lo mismo venga de un pleno o de un empate acertado.
  -- IMPORTANTE: va al final → CREATE OR REPLACE VIEW solo permite AGREGAR
  -- columnas, no insertarlas en el medio ni renombrar las existentes.
  COUNT(p.id) FILTER (
    WHERE r.status IN ('FT', 'AET', 'PEN')
      AND r.home_score IS NOT NULL
      AND r.stage = 'knockout'
      AND r.penalty_winner IS NOT NULL
      AND p.penalty_winner = r.penalty_winner
  ) AS penalty_bonuses

FROM users u
LEFT JOIN predictions p ON p.user_id = u.id
LEFT JOIN results     r ON r.fixture_id = p.fixture_id
GROUP BY u.id, u.username, u.display_name, u.avatar_key
ORDER BY total_points DESC NULLS LAST,
         exact_results DESC NULLS LAST,
         u.display_name ASC;
