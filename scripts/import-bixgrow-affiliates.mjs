/**
 * One-time script to seed the 4 known BixGrow affiliates.
 * Run: node scripts/import-bixgrow-affiliates.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const affiliates = [
  {
    email:         "lvila@prospectia.es",
    first_name:    "Prospectia",
    last_name:     "SL",
    referral_code: "NT0uVarOnm",
    status:        "Approved",
  },
  {
    email:         "mapeire@gmail.com",
    first_name:    "M. Asunción",
    last_name:     "Peiré",
    referral_code: null,
    status:        "Approved",
  },
  {
    email:         "judithfibla@gmail.com",
    first_name:    "Judit",
    last_name:     "Fibla",
    referral_code: null,
    status:        "Approved",
  },
  {
    email:         "rogedominguez@gmail.com",
    first_name:    "Rogelio",
    last_name:     "Dominguez",
    referral_code: null,
    status:        "Approved",
  },
];

for (const aff of affiliates) {
  // Try to match a Holded contact by email
  const { data: contact } = await db
    .from("holded_contacts")
    .select("id")
    .ilike("email", aff.email)
    .maybeSingle();

  const row = {
    email:         aff.email,
    first_name:    aff.first_name,
    last_name:     aff.last_name,
    status:        aff.status,
    contact_id:    contact?.id ?? null,
    raw:           aff,
    updated_at:    new Date().toISOString(),
  };

  // Only set referral_code if we have one (avoid overwriting with null on re-run)
  if (aff.referral_code) row.referral_code = aff.referral_code;

  const { error } = await db
    .from("bixgrow_affiliates")
    .upsert(row, { onConflict: "email" });

  if (error) {
    console.error(`✗  ${aff.email}:`, error.message);
  } else {
    console.log(`✓  ${aff.email}${contact ? " (linked to Holded)" : ""}`);
  }
}

console.log("Done.");
