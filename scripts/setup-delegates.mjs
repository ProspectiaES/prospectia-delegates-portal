// Run once: creates the 3 delegate users in Supabase Auth + their profiles.
// Usage: node scripts/setup-delegates.mjs

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const SUPABASE_URL = "https://amqulpbjsoydboryyrwf.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtcXVscGJqc295ZGJvcnl5cndmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAyNzk3OCwiZXhwIjoyMDkyNjAzOTc4fQ.bICMTtEEyaNpYS6GaZEx5htUGU4tdv6_SzC7r-_5EMk";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function genPassword() {
  return "Prt@" + randomBytes(6).toString("hex");
}

const delegates = [
  { email: "issasole@hotmail.com",   full_name: "Isabel Solé"  },
  { email: "rcuxart@hotmail.com",    full_name: "Roser Cuxart" },
  { email: "judithfibla@gmail.com",  full_name: "Judith Fibla" },
];

async function main() {
  // 1. Ensure owner has role in user_metadata
  const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const owner = allUsers.find((u) => u.email === "lvila@prospectia.es");
  if (owner) {
    if (owner.user_metadata?.role !== "OWNER") {
      await admin.auth.admin.updateUserById(owner.id, {
        user_metadata: { ...owner.user_metadata, role: "OWNER", full_name: "Lluis Vila Prat" },
      });
      console.log("✅ Owner metadata updated:", owner.email);
    } else {
      console.log("✅ Owner already set:", owner.email);
    }
  } else {
    console.warn("⚠️  Owner user lvila@prospectia.es not found");
  }

  // 2. Create delegate users
  const credentials = [];

  for (const d of delegates) {
    const password = genPassword();
    const existing = allUsers.find((u) => u.email === d.email);

    let userId;
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: { full_name: d.full_name, role: "DELEGATE" },
        email_confirm: true,
      });
      if (error) { console.error(`❌ Error updating ${d.email}:`, error.message); continue; }
      userId = existing.id;
      console.log(`✅ Updated: ${d.email}`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: d.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: d.full_name, role: "DELEGATE" },
      });
      if (error) { console.error(`❌ Error creating ${d.email}:`, error.message); continue; }
      userId = data.user.id;
      console.log(`✅ Created: ${d.email}`);
    }

    // Upsert profile (trigger may already have done this)
    await admin.from("profiles").upsert(
      { id: userId, full_name: d.full_name, role: "DELEGATE" },
      { onConflict: "id" }
    );

    credentials.push({ name: d.full_name, email: d.email, password });
  }

  console.log("\n══════════════════════════════════════");
  console.log("  CREDENCIALES DE ACCESO AL PORTAL");
  console.log("══════════════════════════════════════");
  console.log("  URL: https://dashboard.prospectia.es\n");
  for (const c of credentials) {
    console.log(`  ${c.name}`);
    console.log(`    Email:      ${c.email}`);
    console.log(`    Contraseña: ${c.password}\n`);
  }
  console.log("══════════════════════════════════════");
}

main().catch(console.error);
