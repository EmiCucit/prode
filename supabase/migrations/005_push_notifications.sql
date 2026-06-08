-- ================================================================
-- 005 — Notificaciones push (Web Push / VAPID)
-- Suscripciones por usuario + control de recordatorios ya enviados.
-- Acceso solo vía service role (RLS habilitado, sin políticas públicas).
-- Ejecutar en ambos proyectos Supabase (dev y prod).
-- ================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT        UNIQUE NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Evita avisar dos veces al mismo usuario por el mismo partido.
CREATE TABLE IF NOT EXISTS reminder_sent (
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fixture_id INTEGER     NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, fixture_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_sent      ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo el service role (server-side) accede a estas tablas.
