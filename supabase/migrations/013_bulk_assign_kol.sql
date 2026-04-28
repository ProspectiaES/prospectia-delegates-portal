-- Assign Isabel Solé (KOL) to all existing delegates and all contacts.

DO $$
DECLARE
  isabel_id uuid;
BEGIN
  SELECT id INTO isabel_id FROM profiles WHERE full_name = 'Isabel Solé' AND is_kol = true LIMIT 1;

  IF isabel_id IS NULL THEN
    RAISE EXCEPTION 'KOL profile for Isabel Solé not found';
  END IF;

  -- Assign KOL to all DELEGATE profiles except Isabel herself.
  UPDATE profiles
  SET kol_id = isabel_id
  WHERE role = 'DELEGATE'
    AND id <> isabel_id
    AND kol_id IS NULL;

  -- Assign KOL to all holded_contacts.
  UPDATE holded_contacts
  SET kol_id = isabel_id
  WHERE kol_id IS NULL;
END $$;
