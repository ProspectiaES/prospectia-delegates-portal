-- ============================================================
-- Afegir camp pregunta_ia a strategic_actor_documents
-- Migració 037
-- ============================================================

ALTER TABLE strategic_actor_documents
  ADD COLUMN IF NOT EXISTS pregunta_ia TEXT;
