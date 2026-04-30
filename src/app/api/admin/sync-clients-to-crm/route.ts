import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

export async function POST() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // All contacts with type=1 (clients)
  const { data: contacts } = await admin
    .from("holded_contacts")
    .select("id, name, email, phone, mobile, city, country_code, first_synced_at")
    .eq("type", 1);

  if (!contacts || contacts.length === 0) return NextResponse.json({ created: 0, skipped: 0 });

  // Which ones already have a prospecto?
  const { data: existing } = await admin
    .from("prospectos")
    .select("holded_contact_id")
    .not("holded_contact_id", "is", null);
  const existingIds = new Set((existing ?? []).map(p => p.holded_contact_id as string));

  const toCreate = contacts.filter(c => !existingIds.has(c.id));
  if (toCreate.length === 0) return NextResponse.json({ created: 0, skipped: contacts.length });

  // Primary delegate per contact (earliest assignment)
  const contactIds = toCreate.map(c => c.id);
  const { data: links } = await admin
    .from("contact_delegates")
    .select("contact_id, delegate_id, assigned_at")
    .in("contact_id", contactIds)
    .order("assigned_at", { ascending: true });

  const delegateMap = new Map<string, string>();
  for (const l of (links ?? [])) {
    if (!delegateMap.has(l.contact_id)) delegateMap.set(l.contact_id, l.delegate_id);
  }

  // OWNER profile as fallback delegate
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "OWNER")
    .limit(1)
    .maybeSingle();
  const ownerFallback = owner?.id ?? null;

  const now = new Date().toISOString();
  const records = toCreate.map(c => ({
    delegate_id:       delegateMap.get(c.id) ?? ownerFallback,
    name:              c.name,
    email:             (c.email as string | null) || null,
    phone:             (c.phone as string | null) || (c.mobile as string | null) || null,
    city:              (c.city as string | null) || null,
    country:           (c.country_code as string | null) || "ES",
    holded_contact_id: c.id,
    stage:             "seguimiento" as const,
    source:            "holded",
    converted_at:      (c.first_synced_at as string | null) ?? now,
  }));

  let created = 0;
  for (let i = 0; i < records.length; i += 100) {
    const { error } = await admin.from("prospectos").insert(records.slice(i, i + 100));
    if (!error) created += Math.min(100, records.length - i);
  }

  return NextResponse.json({ created, skipped: existingIds.size });
}
