-- Consolida les columnes duplicades de KOL i coordinador.
-- assigned_kol_id / assigned_coordinator_id eren aliases de kol_id / coordinator_id.
-- La fitxa del client (font de veritat) sempre llegeix kol_id i coordinator_id.

UPDATE holded_contacts
  SET kol_id = assigned_kol_id
  WHERE assigned_kol_id IS NOT NULL AND kol_id IS NULL;

UPDATE holded_contacts
  SET coordinator_id = assigned_coordinator_id
  WHERE assigned_coordinator_id IS NOT NULL AND coordinator_id IS NULL;
