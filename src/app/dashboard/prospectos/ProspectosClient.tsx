"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateProspectoStage } from "@/app/actions/prospectos";
import { STAGES, stageCfg, type ProspectoStage } from "./stages";
import { ExcelImportModal, type ImportRow } from "./ExcelImportModal";

export type { ProspectoStage };
export { STAGES, stageCfg };


// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProspectoRow {
  id: string;
  delegate_id: string;
  delegate_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  stage: ProspectoStage;
  source: string | null;
  holded_contact_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ─── Kanban card ──────────────────────────────────────────────────────────────

function KanbanCard({ p }: { p: ProspectoRow }) {
  const [pending, startT] = useTransition();

  return (
    <Link
      href={`/dashboard/prospectos/${p.id}`}
      className={`block rounded-lg border border-[#E5E7EB] bg-white p-3 hover:border-[#8E0E1A]/30 hover:shadow-sm transition-all ${pending ? "opacity-50" : ""}`}
    >
      <p className="text-[12px] font-semibold text-[#0A0A0A] leading-tight truncate">{p.name}</p>
      {p.company && <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">{p.company}</p>}
      {p.city && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{p.city}</p>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-[#9CA3AF]">{fmtDate(p.created_at)}</span>
        {p.holded_contact_id && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Holded</span>
        )}
      </div>
      {p.delegate_name && (
        <p className="mt-1 text-[10px] text-[#9CA3AF] truncate">{p.delegate_name}</p>
      )}
    </Link>
  );
}

// ─── Kanban view ──────────────────────────────────────────────────────────────

function KanbanView({ prospectos }: { prospectos: ProspectoRow[] }) {
  const byStage = (stage: ProspectoStage) => prospectos.filter(p => p.stage === stage);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {STAGES.map(s => {
          const cards = byStage(s.key);
          return (
            <div key={s.key} className="w-56 shrink-0">
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${s.bg}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`text-[11px] font-semibold ${s.color}`}>{s.label}</span>
                </div>
                <span className={`text-[10px] font-bold ${s.color}`}>{cards.length}</span>
              </div>
              <div className="border border-t-0 border-[#E5E7EB] rounded-b-lg p-2 space-y-2 min-h-[120px] bg-[#FAFAFA]">
                {cards.map(p => <KanbanCard key={p.id} p={p} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({ prospectos, isOwner }: { prospectos: ProspectoRow[]; isOwner: boolean }) {
  if (prospectos.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
              {["Nombre", "Empresa", "Ciudad", "Etapa", "Fuente", isOwner ? "Delegado" : "", "Alta"].filter(Boolean).map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F9FAFB]">
            {prospectos.map(p => {
              const s = stageCfg(p.stage);
              return (
                <tr key={p.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/prospectos/${p.id}`} className="text-sm font-medium text-[#0A0A0A] hover:text-[#8E0E1A]">
                      {p.name}
                    </Link>
                    {p.email && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{p.email}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{p.company ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{p.city ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF] capitalize">{p.source ?? "manual"}</td>
                  {isOwner && <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">{p.delegate_name ?? "—"}</td>}
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF] tabular-nums whitespace-nowrap">{fmtDate(p.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  prospectos: ProspectoRow[];
  isOwner: boolean;
  onImportCSV: (rows: ImportRow[]) => Promise<void>;
}

export function ProspectosClient({ prospectos, isOwner, onImportCSV }: Props) {
  const [view, setView]     = useState<"kanban" | "list">("kanban");
  const [stage, setStage]   = useState<ProspectoStage | "all">("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);

  const filtered = prospectos.filter(p => {
    if (stage !== "all" && p.stage !== stage) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) ||
        (p.company ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar nombre, empresa, email…"
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors w-64 shadow-sm"
        />
        {/* Stage filter */}
        <select
          value={stage}
          onChange={e => setStage(e.target.value as ProspectoStage | "all")}
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none shadow-sm"
        >
          <option value="all">Todas las etapas</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {/* View toggle */}
        <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden shadow-sm">
          <button onClick={() => setView("kanban")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "kanban" ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F9FAFB]"}`}>
            Kanban
          </button>
          <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "list" ? "bg-[#8E0E1A] text-white" : "bg-white text-[#6B7280] hover:bg-[#F9FAFB]"}`}>
            Lista
          </button>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-xs font-medium text-[#6B7280] hover:border-[#0A0A0A] hover:bg-[#F9FAFB] transition-colors shadow-sm"
        >
          Importar Excel / CSV
        </button>
      </div>

      {/* Excel import modal */}
      {showImport && (
        <ExcelImportModal
          onImport={async rows => { await onImportCSV(rows); }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Stage summary pills */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map(s => {
          const cnt = prospectos.filter(p => p.stage === s.key).length;
          if (cnt === 0) return null;
          return (
            <button
              key={s.key}
              onClick={() => setStage(stage === s.key ? "all" : s.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${stage === s.key ? `${s.bg} ${s.color} border-transparent` : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label} <span className="font-bold">{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Views */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white py-16 text-center">
          <p className="text-sm font-medium text-[#0A0A0A]">Sin prospectos{search || stage !== "all" ? " para este filtro" : ""}.</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Crea el primero con «Nuevo prospecto».</p>
        </div>
      ) : view === "kanban" ? (
        <KanbanView prospectos={filtered} />
      ) : (
        <ListView prospectos={filtered} isOwner={isOwner} />
      )}
    </div>
  );
}
