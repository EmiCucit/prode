-- ================================================================
-- 002 — Agrega marcadores de penales a la tabla results
-- Ejecutar en ambos proyectos Supabase (dev y prod)
-- ================================================================

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS penalty_home_score INTEGER CHECK (penalty_home_score >= 0),
  ADD COLUMN IF NOT EXISTS penalty_away_score INTEGER CHECK (penalty_away_score >= 0);
