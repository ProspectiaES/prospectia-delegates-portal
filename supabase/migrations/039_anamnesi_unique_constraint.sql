-- Fix: add UNIQUE constraint on (user_id, ordre) so upsert works correctly.
-- Without this, ON CONFLICT (user_id, ordre) throws a PostgreSQL error that
-- the Supabase client swallows silently → responses never persist.

-- Remove old null-resposta rows from the previous dynamic-question system
-- (they have ordres that don't match the new fixed 1-25 schema).
DELETE FROM bruixola_anamnesi WHERE resposta IS NULL;

-- Add the UNIQUE constraint needed for upsert to work
ALTER TABLE bruixola_anamnesi
  ADD CONSTRAINT bruixola_anamnesi_user_ordre_unique UNIQUE (user_id, ordre);
