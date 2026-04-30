import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, isKolUser } from "@/lib/profile";
import { importProspectosCSV } from "@/app/actions/prospectos";
import { ProspectosClient, type ProspectoRow } from "./ProspectosClient";

export default async function ProspectosPage() {
  const profile = await getProfile();
  if (!profile) return null;

  const admin    = createAdminClient();
  const isOwner  = profile.role === "OWNER" || profile.role === "ADMIN";
  const isKol    = isKolUser(profile);

  // Fetch prospectos with delegate name
  let query = admin
    .from("prospectos")
    .select("*, profiles!prospectos_delegate_id_fkey(full_name)")
    .order("updated_at", { ascending: false });

  if (!isOwner && !isKol) {
    query = query.eq("delegate_id", profile.id);
  } else if (isKol && !isOwner) {
    // KOL sees own + network delegates
    const { data: cdRows } = await admin
      .from("contact_delegates")
      .select("delegate_id");
    const delegateIds = [...new Set((cdRows ?? []).map(r => r.delegate_id as string))];
    delegateIds.push(profile.id);
    query = query.in("delegate_id", delegateIds);
  }

  const { data: rows } = await query;

  const prospectos: ProspectoRow[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id:                r.id as string,
    delegate_id:       r.delegate_id as string,
    delegate_name:     (r.profiles as { full_name?: string } | null)?.full_name ?? null,
    name:              r.name as string,
    email:             r.email as string | null,
    phone:             r.phone as string | null,
    company:           r.company as string | null,
    city:              r.city as string | null,
    stage:             r.stage as ProspectoRow["stage"],
    source:            r.source as string | null,
    holded_contact_id: r.holded_contact_id as string | null,
    converted_at:      r.converted_at as string | null,
    created_at:        r.created_at as string,
    updated_at:        r.updated_at as string,
  }));

  async function handleImport(csvRows: Array<{ name: string; email?: string; phone?: string; company?: string; city?: string }>) {
    "use server";
    await importProspectosCSV(csvRows);
  }

  const counts = {
    total:      prospectos.length,
    activos:    prospectos.filter(p => !["ganado", "perdido"].includes(p.stage)).length,
    ganados:    prospectos.filter(p => p.stage === "ganado").length,
    convertidos: prospectos.filter(p => p.holded_contact_id).length,
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Prospectos</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {counts.total} total · {counts.activos} activos · {counts.ganados} ganados · {counts.convertidos} en Holded
          </p>
        </div>
        <Link
          href="/dashboard/prospectos/nuevo"
          className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors shadow-sm flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 2v10M2 7h10" strokeLinecap="round"/>
          </svg>
          Nuevo prospecto
        </Link>
      </div>

      <ProspectosClient
        prospectos={prospectos}
        isOwner={isOwner}
        onImportCSV={handleImport}
      />

    </div>
  );
}
