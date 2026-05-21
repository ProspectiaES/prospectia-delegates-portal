import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { AssignmentTable, type ContactRow, type DelegateOption } from "./AssignmentTable";

export const metadata = { title: "Asignaciones de clientes — Prospectia" };

export default async function AsignacionesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") notFound();

  const admin = createAdminClient();

  const [contactsRes, delegatesRes, assignmentsRes] = await Promise.all([
    // All contacts
    admin
      .from("holded_contacts")
      .select("id, name, code, payment_method")
      .order("name"),
    // All delegate profiles with their KOL and coordinator names
    admin
      .from("profiles")
      .select(`
        id, full_name, delegate_name, kol_id, coordinator_id,
        kol:profiles!profiles_kol_id_fkey(full_name),
        coordinator:profiles!profiles_coordinator_id_fkey(full_name)
      `)
      .in("role", ["DELEGATE", "KOL", "COORDINATOR", "ADMIN", "CONSIGLIERE", "COM6"])
      .eq("show_in_delegate_list", true)
      .order("full_name"),
    // All assignments (contact_id → delegate_id)
    admin
      .from("contact_delegates")
      .select("contact_id, delegate_id"),
  ]);

  // Build assignment map: contact_id → delegate_id (take first if multiple)
  const assignMap: Record<string, string> = {};
  for (const row of assignmentsRes.data ?? []) {
    if (!assignMap[row.contact_id]) {
      assignMap[row.contact_id] = row.delegate_id;
    }
  }

  const contacts: ContactRow[] = (contactsRes.data ?? []).map(c => ({
    id:             c.id,
    name:           c.name,
    code:           c.code ?? null,
    delegate_id:    assignMap[c.id] ?? null,
    payment_method: c.payment_method ?? null,
  }));

  type RawDelegate = {
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#0A0A0A]">Asignaciones de clientes</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Gestiona qué delegado es responsable de cada cliente.
          </p>
        </div>
      </div>

      <AssignmentTable contacts={contacts} delegates={delegates} />
    </div>
  );
}
