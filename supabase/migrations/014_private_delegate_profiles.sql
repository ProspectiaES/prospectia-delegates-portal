-- Create two private virtual delegate profiles visible only to OWNER.
-- No KOL or coordinator assigned.
-- POC (poc@prospectia.es):                international commerce.
-- PROSPECTIA (prospectia.nacional@prospectia.es): national commerce.
--
-- Auth users were created via the Supabase Auth Admin API (required due to profiles.id FK).
-- This migration only sets the profile flags — auth users must exist beforehand.

UPDATE profiles
SET is_private            = true,
    show_in_delegate_list = true,
    delegate_name         = 'POC',
    kol_id                = NULL,
    coordinator_id        = NULL
WHERE id = 'ffb02228-99f2-4693-aa37-2677518c9bb7';

UPDATE profiles
SET is_private            = true,
    show_in_delegate_list = true,
    delegate_name         = 'PROSPECTIA',
    kol_id                = NULL,
    coordinator_id        = NULL
WHERE id = 'b20fbc03-95a5-405b-9379-f69e8cbbcc75';
