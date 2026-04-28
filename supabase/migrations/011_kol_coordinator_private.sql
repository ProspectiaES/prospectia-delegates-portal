-- Extend role enum to include KOL, COORDINATOR, COM6
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['OWNER','ADMIN','DELEGATE','KOL','COORDINATOR','COM6']));

-- Private delegate flag: is_private hides from KOL/non-OWNER views
-- show_in_delegate_list: lets OWNER profile appear in delegate lists (PROSPECTIA CASA)
-- delegate_name: display alias used in delegate list instead of full_name
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_private           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_delegate_list BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delegate_name         TEXT;

-- KOL, Coordinator, Commission 6 assignments on clients
ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS kol_id          UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS coordinator_id  UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS commission_6_id UUID REFERENCES profiles(id);
