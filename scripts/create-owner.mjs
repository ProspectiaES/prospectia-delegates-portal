/**
 * One-time script: creates the OWNER user in Supabase Auth.
 *
 * Prerequisites:
 *   1. Fill in SUPABASE_SERVICE_ROLE_KEY in .env.local
 *      (Supabase Dashboard → Project Settings → API → service_role key)
 *   2. Run the 002_profiles.sql migration in Supabase SQL Editor
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-owner.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "Add SUPABASE_SERVICE_ROLE_KEY to .env.local and rerun."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const EMAIL    = "lvila@prospectia.es";
const PASSWORD = "7828M@rt1t@";
const FULLNAME = "Lluis Vila Prat";
const ROLE     = "OWNER";

console.log(`Creating user ${EMAIL} …`);

const { data, error } = await supabase.auth.admin.createUser({
  email:         EMAIL,
  password:      PASSWORD,
  email_confirm: true,            // skip email verification
  user_metadata: {
    full_name: FULLNAME,
    role:      ROLE,
  },
});

if (error) {
  // If user already exists just report it
  if (error.message.includes("already")) {
    console.warn("User already exists — no changes made.");
  } else {
    console.error("Auth error:", error.message);
    process.exit(1);
  }
} else {
  console.log(`Auth user created: ${data.user.id}`);

  // Upsert the profile row (trigger does this automatically,
  // but running explicitly ensures consistency)
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: data.user.id, full_name: FULLNAME, role: ROLE });

  if (profileError) {
    console.warn(
      "Profile upsert warning (run 002_profiles.sql migration if not done):",
      profileError.message
    );
  } else {
    console.log("Profile row created.");
  }
}

console.log("\nDone. Login credentials:");
console.log("  Email:    ", EMAIL);
console.log("  Password: ", PASSWORD);
console.log("  Role:     ", ROLE);
