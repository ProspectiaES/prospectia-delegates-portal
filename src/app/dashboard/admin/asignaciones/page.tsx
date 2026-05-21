import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { AssignmentTable, type ContactRow, type DelegateOption, type ContactGroupOption } from "./AssignmentTable";

export const metadata = { title: "Asignaciones de clientes — Prospectia" };

export default async function AsignacionesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") notFound();

  const admin = createAdminClient();

  const [contactsRes, delegatesRes, assignmentsRes, groupsRes, groupMembersRes] = await Promise.all([
    admin
      .from("holded_contacts")
      .select("id, name, code, type, recommender_id, affiliate_id")
      .is("merged_into_id", null)
      .order("name"),
    // All assignable profiles — no show_in_delegate_list filter (OWNER needs all)
    admin
      .from("profiles")
      .select(`
        id, full_name, delegate_name, kol_id, coordinator_id,
        kol:profiles!profiles_kol_id_fkey(full_name),
        coordinator:profiles!profiles_coordinator_id_fkey(full_name)
      `)
      .in("role", ["DELEGATE", "KOL", "COORDINATOR", "ADMIN", "CONSIGLIERE", "COM6"])
      .order("full_name"),
    admin
      .from("contact_delegates")
      .select("contact_id, delegate_id"),
    admin
      .from("contact_groups")
      .select("id, name, color, holded_tag")
      .order("name"),
    admin
      .from("contact_group_members")
      .select("contact_id, group_id"),
  ]);

  const rawContacts = contactsRes.data ?? [];

  // Collect unique recommender and affiliate IDs for a second-pass lookup
  const recommenderIds = [...new Set(rawContacts.map(c => c.recommender_id).filter(Boolean))] as string[];
  const affiliateIds   = [...new Set(rawContacts.map(c => c.affiliate_id).filter(Boolean))] as string[];

  const [recommenderRes, affiliateRes] = await Promise.all([
    recommenderIds.length > 0
      ? admin.from("holded_contacts").select("id, name").in("id", recommenderIds)
      : Promise.resolve({ data: [] }),
    affiliateIds.length > 0
      ? admin.from("bixgrow_affiliates").select("id, email, first_name, last_name").in("id", affiliateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const recommenderMap: Record<string, string> = {};
  for (const r of recommenderRes.data ?? []) recommenderMap[r.id] = r.name;

  const affiliateMap: Record<string, string> = {};
  for (const a of affiliateRes.data ?? []) {
    affiliateMap[a.id] = (a.first_name || a.last_name)
      ? [a.first_name, a.last_name].filter(Boolean).join(" ")
      : a.email;
  }

  // Build assignment map: contact_id → first delegate_id
  const assignMap: Record<string, string> = {};
  for (const row of assignmentsRes.data ?? []) {
    if (!assignMap[row.contact_id]) assignMap[row.contact_id] = row.delegate_id;
  }

  // Build group membership map: contact_id → group_id[]
  const groupMap: Record<string, string[]> = {};
  for (const row of groupMembersRes.data ?? []) {
    if (!groupMap[row.contact_id]) groupMap[row.contact_id] = [];
    groupMap[row.contact_id].push(row.group_id);
  }

  const contacts: ContactRow[] = rawContacts.map(c => ({
    id:               c.id,
    name:             c.name,
    code:             c.code ?? null,
    type:             c.type ?? null,
    delegate_id:      assignMap[c.id] ?? null,
    recommender_id:   c.recommender_id ?? null,
    recommender_name: c.recommender_id ? (recommenderMap[c.recommender_id] ?? null) : null,
    affiliate_name:   c.affiliate_id   ? (affiliateMap[c.affiliate_id]   ?? null) : null,
    group_ids:        groupMap[c.id] ?? [],
  }));

  type RawDelegate = { // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id: string;
    full_name: string;
    delegate_name: string | null;
    kol_id: string | null;
    coordinator_id: string | null;
    kol: { full_name: string } | { full_name: string }[] | null;
    coordinator: { full_name: string } | { full_name: string }[] | null;
  };

  function pickName(v: { full_name: string } | { full_name: string }[] | null): string | null {
    if (!v) return null;
    return Array.isArray(v) ? (v[0]?.full_name ?? null) : v.full_name;
  }

  const delegates: DelegateOption[] = ((delegatesRes.data ?? []) as unknown as RawDelegate[]).map(d => ({
    id:               d.id,
    full_name:        d.full_name,
    delegate_name:    d.delegate_name,
    kol_id:           d.kol_id,
    kol_name:         pickName(d.kol),
    coordinator_id:   d.coordinator_id,
    coordinator_name: pickName(d.coordinator),
  }));

  const groups: ContactGroupOption[] = (groupsRes.data ?? []).map(g => ({
    id:         g.id,
    name:       g.name,
    color:      g.color,
    holded_tag: g.holded_tag,
  }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#0A0A0A]">Asignaciones de clientes</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Gestiona los actores asignados a cada cliente: delegado, recomendador, grupos y tipo.
          </p>
        </div>
      </div>

      <AssignmentTable contacts={contacts} delegates={delegates} groups={groups} />
    </div>
  );
}
