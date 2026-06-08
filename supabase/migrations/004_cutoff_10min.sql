-- ================================================================
-- 004 — Cambia el cutoff de predicción de 15 a 10 minutos
-- Mantener sincronizado con lib/domain/cutoff.ts (CUTOFF_MINUTES).
-- Ejecutar en ambos proyectos Supabase (dev y prod).
-- ================================================================

DROP POLICY IF EXISTS "predictions_insert_own" ON predictions;
CREATE POLICY "predictions_insert_own"
  ON predictions FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', true)
    AND EXISTS (
      SELECT 1 FROM results r
      WHERE r.fixture_id = predictions.fixture_id
        AND r.kickoff_at > NOW() + INTERVAL '10 minutes'
    )
  );

DROP POLICY IF EXISTS "predictions_update_own" ON predictions;
CREATE POLICY "predictions_update_own"
  ON predictions FOR UPDATE
  USING  (user_id::text = current_setting('app.current_user_id', true))
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', true)
    AND EXISTS (
      SELECT 1 FROM results r
      WHERE r.fixture_id = predictions.fixture_id
        AND r.kickoff_at > NOW() + INTERVAL '10 minutes'
    )
  );
