-- ================================================================
-- Prode Mundial 2026 — migración inicial
-- Ejecutar en el SQL Editor de Supabase (o con supabase db push)
-- ================================================================

-- ── Tablas ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  display_name  TEXT        NOT NULL,
  avatar_key    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fixture metadata + resultados. Poblada desde api-football vía
-- scripts/sync-fixtures.ts. Scores NULL hasta que el partido termina.
CREATE TABLE IF NOT EXISTS results (
  fixture_id      INTEGER     PRIMARY KEY,
  home_team_name  TEXT        NOT NULL,
  away_team_name  TEXT        NOT NULL,
  home_team_logo  TEXT,
  away_team_logo  TEXT,
  home_score      INTEGER     CHECK (home_score >= 0),
  away_score      INTEGER     CHECK (away_score >= 0),
  penalty_winner  TEXT        CHECK (penalty_winner IN ('home', 'away')),
  stage           TEXT        NOT NULL CHECK (stage IN ('group', 'knockout')),
  round           TEXT        NOT NULL,
  group_name      TEXT,
  kickoff_at      TIMESTAMPTZ NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'NS',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fixture_id     INTEGER     NOT NULL REFERENCES results(fixture_id),
  home_score     INTEGER     NOT NULL CHECK (home_score >= 0),
  away_score     INTEGER     NOT NULL CHECK (away_score >= 0),
  penalty_winner TEXT        CHECK (penalty_winner IN ('home', 'away')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fixture_id)
);

-- ── Índices ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_predictions_user_id    ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_fixture_id ON predictions(fixture_id);
CREATE INDEX IF NOT EXISTS idx_results_kickoff_at     ON results(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_results_status         ON results(status);

-- ── Trigger: updated_at automático ───────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_set_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER results_set_updated_at
  BEFORE UPDATE ON results
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Vista standings ───────────────────────────────────────────────
-- Los puntos NO se guardan; se calculan aquí cruzando predictions
-- con results. Tiebreaker: total_points → exact_results → display_name.

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
  ) AS correct_outcomes

FROM users u
LEFT JOIN predictions p ON p.user_id = u.id
LEFT JOIN results     r ON r.fixture_id = p.fixture_id
GROUP BY u.id, u.username, u.display_name, u.avatar_key
ORDER BY total_points DESC NULLS LAST,
         exact_results DESC NULLS LAST,
         u.display_name ASC;

-- ── Row Level Security ────────────────────────────────────────────
-- IMPORTANTE: los Route Handlers usan service role (bypass RLS).
-- Estas políticas son defensa en profundidad para el anon key.
-- La variable app.current_user_id se setea server-side antes de
-- cualquier query sensible con el anon key.

ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- users: lectura pública (necesaria para ranking y perfiles)
CREATE POLICY "users_select_all"
  ON users FOR SELECT USING (true);

-- results: solo lectura (escritura exclusiva del service role)
CREATE POLICY "results_select_all"
  ON results FOR SELECT USING (true);

-- predictions: lectura pública (se muestran predicciones ajenas post-kickoff)
CREATE POLICY "predictions_select_all"
  ON predictions FOR SELECT USING (true);

-- predictions: INSERT propio, solo si el partido no cerró
CREATE POLICY "predictions_insert_own"
  ON predictions FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', true)
    AND EXISTS (
      SELECT 1 FROM results r
      WHERE r.fixture_id = predictions.fixture_id
        AND r.kickoff_at > NOW() + INTERVAL '15 minutes'
    )
  );

-- predictions: UPDATE propio, mismo control de tiempo
CREATE POLICY "predictions_update_own"
  ON predictions FOR UPDATE
  USING  (user_id::text = current_setting('app.current_user_id', true))
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', true)
    AND EXISTS (
      SELECT 1 FROM results r
      WHERE r.fixture_id = predictions.fixture_id
        AND r.kickoff_at > NOW() + INTERVAL '15 minutes'
    )
  );
