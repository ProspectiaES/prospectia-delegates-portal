-- ============================================================
-- DOCUMENTS PER ACTORS ESTRATÈGICS
-- Migració 036
-- Documents pujats per anàlisi IA: PDF, TXT, DOCX
-- ============================================================

CREATE TABLE IF NOT EXISTS strategic_actor_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID NOT NULL REFERENCES strategic_actors(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_fitxer    TEXT NOT NULL,
  tipus_fitxer  TEXT,          -- MIME type: application/pdf, text/plain, etc.
  mida_bytes    BIGINT,
  storage_path  TEXT NOT NULL, -- path dins del bucket "actor-documents"
  notes         TEXT,          -- context del document per a la IA
  analitzat     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE strategic_actor_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON strategic_actor_documents
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Storage policies per al bucket actor-documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('actor-documents', 'actor-documents', false, 52428800)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "actor_docs_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'actor-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "actor_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'actor-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "actor_docs_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'actor-documents' AND auth.uid() IS NOT NULL);
