import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import {
  AssignmentTable,
  type ContactRow,
  type DelegateOption,
  type ContactGroupOption,
  type ActorOption,
  type AffiliateOption,
} from "./AssignmentTable";

export const metadata = { title: "Asignaciones de clientes — Prospectia" };

export default async function AsignacionesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") notFound();

  const admin = createAdminClient();

  // ── Step 1: parallel fetches that don't depend on each other ─────────────────
  const [contactsRes, profilesRes, assignmentsRes, groupsRes, groupMembersRes, affiliatesRes] =
    await Promise.all([
      admin
        .from("holded_contacts")
        .select("id, name, code, type, recommender_id, affiliate_id, assigned_kol_id, assigned_coordinator_id")
        .is("merged_into_id", null)
        .order("name"),

      // All assignable profiles — no show_in_delegate_list filter (admin view)
      admin
        .from("profiles")
        .select("id, full_name, delegate_name, role, kol_id, coordinator_id")
        .in("role", ["DELEGATE", "KOL", "COORDINATOR", "ADMIN", "CONSIGLIERE", "COM6"])
        .order("full_name"),

      admin.from("contact_delegates").select("contact_id, delegate_id"),

      admin.from("contact_groups").select("id, name, color, holded_tag").order("name"),

      admin.from("contact_group_members").select("contact_id, group_id"),

      admin.from("bixgrow_affiliates").select("id, email, first_name, last_name").order("email"),
    ]);

  const rawContacts = contactsRes.data ?? [];
  const rawProfiles = profilesRes.data ?? [];

  // ── Step 2: look up kol/coordinator names for delegate profiles ──────────────
  const linkedProfileIds = [
    ...new Set([
      ...rawProfiles.map(p => p.kol_id).filter(Boolean),
      ...rawProfiles.map(p => p.coordinator_id).filter(Boolean),
      // kol/coordinator assigned directly to contacts
      ...rawContacts.map(c => c.assigned_kol_id).filter(Boolean),
      ...rawContacts.map(c => c.assigned_coordinator_id).filter(Boolean),
    ]),
  ] as string[];

  // ── Step 3: look up recommender names ───────────────────────────────────────
  const recommenderIds = [...new Set(rawContacts.map(c => c.recommender_id).filter(Boolean))] as string[];

  const [linkedProfilesRes, recommenderRes] = await Promise.all([
    linkedProfileIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", linkedProfileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    recommenderIds.length > 0
      ? admin.from("holded_contacts").select("id, name").in("id", recommenderIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  // ── Build lookup maps ────────────────────────────────────────────────────────
  const profileNameMap: Record<string, string> = {};
  for (const p of linkedProfilesRes.data ?? []) profileNameMap[p.id] = p.full_name;

  const recommenderMap: Record<string, string> = {};
  for (const r of recommenderRes.data ?? []) recommenderMap[r.id] = r.name;

  const affiliateNameMap: Record<string, string> = {};
  for (const a of affiliatesRes.data ?? []) {
    affiliateNameMap[a.id] = (a.first_name || a.last_name)
      ? [a.first_name, a.last_name].filter(Boolean).join(" ")
      : a.email;
  }

  const assignMap: Record<string, string> = {};
  for (const row of assignmentsRes.data ?? []) {
    if (!assignMap[row.contact_id]) assignMap[row.contact_id] = row.delegate_id;
  }

  const groupMap: Record<string, string[]> = {};
  for (const row of groupMembersRes.data ?? []) {
    if (!groupMap[row.contact_id]) groupMap[row.contact_id] = [];
    groupMap[row.contact_id].push(row.group_id);
  }

  // ── Build typed arrays ───────────────────────────────────────────────────────
  const contacts: ContactRow[] = rawContacts.map(c => ({
    id:                      c.id,
    name:                    c.name,
    code:                    c.code ?? null,
    type:                    c.type ?? null,
    delegate_id:             assignMap[c.id] ?? null,
    recommender_id:          c.recommender_id ?? null,
    recommender_name:        c.recommender_id ? (recommenderMap[c.recommender_id] ?? null) : null,
    affiliate_id:            c.affiliate_id ?? null,
    affiliate_name:          c.affiliate_id ? (affiliateNameMap[c.affiliate_id] ?? null) : null,
    assigned_kol_id:         c.assigned_kol_id ?? null,
    assigned_kol_name:       c.assigned_kol_id ? (profileNameMap[c.assigned_kol_id] ?? null) : null,
    assigned_coordinator_id: c.assigned_coordinator_id ?? null,
    assigned_coordinator_name: c.assigned_coordinator_id ? (profileNameMap[c.assigned_coordinator_id] ?? null) : null,
    group_ids:               groupMap[c.id] ?? [],
  }));

  const delegates: DelegateOption[] = rawProfiles.map(p => ({
    id:           p.id,
    full_name:    p.full_name,
    delegate_name: p.delegate_name,
    role:         p.role,
    kol_name:     p.kol_id ? (profileNameMap[p.kol_id] ?? null) : null,
    coordinator_name: p.coordinator_id ? (profileNameMap[p.coordinator_id] ?? null) : null,
  }));

  // KOL and coordinator can be any profile in the system (no role restriction)
  const kolOptions: ActorOption[] = rawProfiles.map(p => ({ id: p.id, name: p.delegate_name ?? p.full_name }));
  const coordinatorOptions: ActorOption[] = rawProfiles.map(p => ({ id: p.id, name: p.delegate_name ?? p.full_name }));

  const affiliates: AffiliateOption[] = (affiliatesRes.data ?? []).map(a => ({
    id:   a.id,
    name: affiliateNameMap[a.id],
  }));

  const groups: ContactGroupOption[] = (groupsRes.data ?? []).map(g => ({
    id:         g.id,
    name:       g.name,
    color:      g.color,
    holded_tag: g.holded_tag,
  }));

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#0A0A0A]">Asignaciones de clientes</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Gestiona todos los actores asignados a cada cliente.
        </p>
      </div>

      <AssignmentTable
        contacts={contacts}
        delegates={delegates}
        kolOptions={kolOptions}
        coordinatorOptions={coordinatorOptions}
        affiliates={affiliates}
        groups={groups}
      />
    </div>
  );
}
