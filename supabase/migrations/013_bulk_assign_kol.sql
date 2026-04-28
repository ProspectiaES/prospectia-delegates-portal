-- Assign Isabel Solé (KOL) to all existing delegates and all contacts.
-- VIHOLABS is excluded: when a VIHOLABS delegate/clients are added, leave kol_id NULL on those rows.

-- Isabel Solé's profile id
DO $$
DECLARE
  isabel_id uuid;
BEGIN
  SELECT id INTO isabel_id FROM profiles WHERE full_name = 'Isabel Solé' AND is_kol = true LIMIT 1;

  IF isabel_id IS NULL THEN
    RAISE EXCEPTION 'KOL profile for Isabel Solé not found';
  END IF;

  -- Assign KOL to all DELEGATE profiles except Isabel herself and any future VIHOLABS delegate.
  -- (VIHOLABS will be identified by delegate_name = 'VIHOLABS' or full_name ILIKE '%viholabs%')
  UPDATE profiles
  SET kol_id = isabel_id
  WHERE role = 'DELEGATE'
    AND id <> isabel_id
    AND kol_id IS NULL
    AND full_name NOT ILIKE '%viholabs%'
    AND (delegate_name IS NULL OR delegate_name NOT ILIKE '%viholabs%');

  -- Assign KOL to all holded_contacts except future VIHOLABS clients.
  -- VIHOLABS clients will be identified by affiliate_id pointing to a VIHOLABS delegate profile.
  -- Since VIHOLABS does not exist yet, this updates all contacts.
  UPDATE holded_contacts
  SET kol_id = isabel_id
  WHERE kol_id IS NULL
    AND affiliate_id NOT IN (
      SELECT id FROM profiles
      WHERE full_name ILIKE '%viholabs%'
         OR delegate_name ILIKE '%viholabs%'
    );
END $$;
