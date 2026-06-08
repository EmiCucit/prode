-- ================================================================
-- 003 — Desglose del ranking: agrega `exact_with_bonus` a `standings`
-- (plenos que además acertaron el bonus de penales → valen 4pts).
-- No cambia el cálculo de total_points; solo agrega una columna de conteo.
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

  -- Plenos que además acertaron el bonus de penales (valen 4pts).
  -- IMPORTANTE: va al final → CREATE OR REPLACE VIEW solo permite AGREGAR
  -- columnas, no insertarlas en el medio ni renombrar las existentes.
  COUNT(p.id) FILTER (
    WHERE r.status IN ('FT', 'AET', 'PEN')
      AND r.home_score IS NOT NULL
      AND p.home_score = r.home_score
      AND p.away_score = r.away_score
      AND r.stage = 'knockout'
      AND r.penalty_winner IS NOT NULL
      AND p.penalty_winner = r.penalty_winner
  ) AS exact_with_bonus

FROM users u
LEFT JOIN predictions p ON p.user_id = u.id
LEFT JOIN results     r ON r.fixture_id = p.fixture_id
GROUP BY u.id, u.username, u.display_name, u.avatar_key
ORDER BY total_points DESC NULLS LAST,
         exact_results DESC NULLS LAST,
         u.display_name ASC;
