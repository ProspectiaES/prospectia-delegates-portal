-- ============================================================
-- Resultat de l'anàlisi IA per document
-- Migració 038
-- ============================================================

ALTER TABLE strategic_actor_documents
  ADD COLUMN IF NOT EXISTS resultat_ia TEXT;
