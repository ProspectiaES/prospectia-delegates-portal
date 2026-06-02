import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SimStatus } from "@/lib/economic-engine/types";

export const metadata = { title: "Motor Econòmic — Simulacions" };

const STATUS_BADGE: Record<SimStatus, string> = {
  draft:    "bg-gray-100 text-gray-600",
  active:   "bg-emerald-50 text-emerald-700",
  archived: "bg-[#F3F4F6] text-[#9CA3AF]",
};
const STATUS_LABEL: Record<SimStatus, string> = {
  draft: "Esborrany", active: "Activa", archived: "Arxivada",
};

const fmtEuro = (n: number | null) => n == null ? "—"
  : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default async function EconomicEnginePage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const admin = createAdminClient();
  const { data: sims } = await admin
    .from("economic_simulations")
    .select("id, name, project_type, status, net_sale_price, currency, estructura_pct, logistics_pct, is_performance_reference, updated_at")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  const simulations = (sims ?? []) as {
    id: string; name: string; project_type: string; status: SimStatus;
    net_sale_price: number | null; estructura_pct: number; logistics_pct: number;
    is_performance_reference: boolean; updated_at: string;
  }[];

  return (
    <div className="max-w-5xl mx-auto px-5 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Motor Econòmic</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Simulador d&apos;escenaris econòmics — marges, comissions, promocions.
            La simulació <strong>referència P&L</strong> s&apos;injecta automàticament al Motor Econòmic mensual.
          </p>
        </div>
        <Link href="/dashboard/economic-engine/new"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-[#8E0E1A] text-white hover:bg-[#7A0C17] transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 2v10M2 7h10" strokeLinecap="round" />
          </svg>
          Nova simulació
        </Link>
      </div>

      {/* Simulacions */}
      {simulations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center">
          <p className="text-[#9CA3AF] text-sm">Cap simulació. Crea-ne una per simular escenaris econòmics.</p>
          <Link href="/dashboard/economic-engine/new"
            className="inline-flex mt-4 items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] transition-colors">
            + Nova simulació
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {simulations.map(s => (
            <Link key={s.id} href={`/dashboard/economic-engine/${s.id}`}
              className="group rounded-2xl border border-[#E5E7EB] bg-white p-5 hover:border-[#8E0E1A]/30 hover:shadow-md transition-all space-y-3">

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-[#0A0A0A] group-hover:text-[#8E0E1A] transition-colors truncate">{s.name}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5 capitalize">
                    {s.project_type === "national" ? "Nacional" : "Internacional"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.is_performance_reference && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#8E0E1A] border border-[#FECACA] uppercase tracking-wider">
                      Ref. P&L
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Preu net</p>
                  <p className="text-base font-bold text-[#0A0A0A] mt-0.5 tabular-nums">{fmtEuro(s.net_sale_price)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Estructura</p>
                  <p className="text-base font-bold text-[#0A0A0A] mt-0.5">{s.estructura_pct}%</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Logística</p>
                  <p className="text-base font-bold text-[#0A0A0A] mt-0.5">
                    {s.project_type === "international" ? "—" : `${s.logistics_pct}%`}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-[#D1D5DB]">
                Actualitzat {new Date(s.updated_at).toLocaleDateString("es-ES")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
