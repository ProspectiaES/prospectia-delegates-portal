"use client";

import { useState, useTransition, useActionState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  saveOrganitzacio, deleteOrganitzacio, saveOportunitat, deleteOportunitat,
  type Organitzacio, type Oportunitat, type TipusOrganitzacio, type EstatOportunitat,
} from "@/app/actions/bruixola-negoci";

const TIPUS_LABEL: Record<TipusOrganitzacio, string> = {
  prospecte: "Prospecte", client: "Client", partner: "Partner",
  proveidor: "Proveïdor", distribuidor: "Distribuïdor", altre: "Altre",
};

const ESTAT_COLUMNS: { key: EstatOportunitat; label: string }[] = [
  { key: "nou", label: "Nou" },
  { key: "contactat", label: "Contactat" },
  { key: "qualificat", label: "Qualificat" },
  { key: "proposta", label: "Proposta" },
  { key: "guanyat", label: "Guanyat" },
  { key: "perdut", label: "Perdut" },
];

const fmtEuro = (n: number | null) =>
  n == null ? null : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// ─── Overlay panel ──────────────────────────────────────────────────────────

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Organització form ──────────────────────────────────────────────────────

function OrganitzacioForm({ initial, onClose }: { initial?: Organitzacio; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveOrganitzacio, null);
  if (state?.success) { onClose(); return null; }

  return (
    <form action={formAction} className="p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#0A0A0A]">{initial ? "Editar organització" : "Nova organització"}</h3>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom *</label>
        <input name="nom" defaultValue={initial?.nom} required
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Tipus</label>
          <select name="tipus" defaultValue={initial?.tipus ?? "prospecte"}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
            {Object.entries(TIPUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">País</label>
          <input name="pais" defaultValue={initial?.pais ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Sector</label>
        <input name="sector" defaultValue={initial?.sector ?? ""}
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Contacte</label>
        <input name="contacte" defaultValue={initial?.contacte ?? ""} placeholder="Nom, email, telèfon…"
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
        <textarea name="notes" defaultValue={initial?.notes ?? ""} rows={3}
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Desant…" : "Desar"}</Button>
      </div>
    </form>
  );
}

// ─── Oportunitat form ───────────────────────────────────────────────────────

function OportunitatForm({
  initial, organitzacions, empreses, onClose,
}: {
  initial?: Oportunitat;
  organitzacions: Organitzacio[];
  empreses: { id: string; nom: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveOportunitat, null);
  if (state?.success) { onClose(); return null; }

  return (
    <form action={formAction} className="p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#0A0A0A]">{initial ? "Editar oportunitat" : "Nova oportunitat"}</h3>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom *</label>
        <input name="nom" defaultValue={initial?.nom} required
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Organització *</label>
        <select name="organitzacio_id" defaultValue={initial?.organitzacio_id ?? ""} required
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
          <option value="">— Selecciona —</option>
          {organitzacions.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Empresa pròpia</label>
        <select name="empresa_id" defaultValue={initial?.empresa_id ?? ""}
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
          <option value="">— Cap —</option>
          {empreses.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Estat</label>
          <select name="estat" defaultValue={initial?.estat ?? "nou"}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
            {ESTAT_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Ona</label>
          <input name="ona" defaultValue={initial?.ona ?? ""} placeholder="OLA 0, 1A, 1B…"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Valor potencial (€)</label>
        <input name="valor_potencial" type="number" step="0.01" defaultValue={initial?.valor_potencial ?? ""}
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Pròxima acció</label>
          <input name="proxima_accio" defaultValue={initial?.proxima_accio ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Data</label>
          <input name="proxima_accio_data" type="date" defaultValue={initial?.proxima_accio_data ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
        <textarea name="notes" defaultValue={initial?.notes ?? ""} rows={3}
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Desant…" : "Desar"}</Button>
      </div>
    </form>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function ProspeccioClient({
  organitzacions, oportunitats, empreses,
}: {
  organitzacions: Organitzacio[];
  oportunitats: Oportunitat[];
  empreses: { id: string; nom: string }[];
}) {
  const [orgModal, setOrgModal] = useState<{ open: boolean; initial?: Organitzacio }>({ open: false });
  const [oppModal, setOppModal] = useState<{ open: boolean; initial?: Oportunitat }>({ open: false });
  const [, startTransition] = useTransition();

  const orgById = Object.fromEntries(organitzacions.map(o => [o.id, o]));

  return (
    <div className="space-y-8">
      {/* ── Organitzacions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Organitzacions ({organitzacions.length})</h2>
          <Button size="sm" onClick={() => setOrgModal({ open: true })}>+ Nova organització</Button>
        </div>
        {organitzacions.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-[#9CA3AF]">Cap organització registrada encara.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {organitzacions.map(o => (
              <Card key={o.id}>
                <CardHeader>
                  <CardTitle>{o.nom}</CardTitle>
                  <Badge variant="default">{TIPUS_LABEL[o.tipus]}</Badge>
                </CardHeader>
                <CardContent className="space-y-1">
                  {o.pais && <p className="text-xs text-[#6B7280]">{o.pais}{o.sector ? ` · ${o.sector}` : ""}</p>}
                  {o.contacte && <p className="text-xs text-[#9CA3AF]">{o.contacte}</p>}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setOrgModal({ open: true, initial: o })} className="text-xs text-[#6B7280] hover:text-[#0A0A0A]">Editar</button>
                    <button
                      onClick={() => { if (confirm(`Eliminar "${o.nom}"?`)) startTransition(async () => { await deleteOrganitzacio(o.id); }); }}
                      className="text-xs text-[#6B7280] hover:text-[#8E0E1A]"
                    >
                      Eliminar
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Pipeline ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Pipeline ({oportunitats.length})</h2>
          <Button
            size="sm"
            onClick={() => setOppModal({ open: true })}
            disabled={organitzacions.length === 0}
          >
            + Nova oportunitat
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {ESTAT_COLUMNS.map(col => {
            const items = oportunitats.filter(o => o.estat === col.key);
            return (
              <div key={col.key} className="space-y-2">
                <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-1">
                  {col.label} ({items.length})
                </p>
                {items.map(op => {
                  const org = orgById[op.organitzacio_id];
                  const overdue = isOverdue(op.proxima_accio_data);
                  return (
                    <Card key={op.id} className="cursor-pointer hover:border-[#8E0E1A] transition-colors" onClick={() => setOppModal({ open: true, initial: op })}>
                      <CardContent className="space-y-1.5">
                        <p className="text-sm font-semibold text-[#0A0A0A]">{op.nom}</p>
                        {org && <p className="text-xs text-[#6B7280]">{org.nom}</p>}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {op.ona && <Badge variant="neutral">{op.ona}</Badge>}
                          {op.valor_potencial != null && <Badge variant="default">{fmtEuro(op.valor_potencial)}</Badge>}
                        </div>
                        {op.proxima_accio && (
                          <div className="pt-1">
                            <p className="text-[11px] text-[#6B7280]">{op.proxima_accio}</p>
                            {op.proxima_accio_data && (
                              <Badge variant={overdue ? "danger" : "warning"}>
                                {new Date(op.proxima_accio_data).toLocaleDateString("es-ES")}
                              </Badge>
                            )}
                          </div>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); if (confirm(`Eliminar "${op.nom}"?`)) startTransition(async () => { await deleteOportunitat(op.id); }); }}
                          className="text-[11px] text-[#9CA3AF] hover:text-[#8E0E1A] pt-1"
                        >
                          Eliminar
                        </button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {orgModal.open && (
        <Overlay onClose={() => setOrgModal({ open: false })}>
          <OrganitzacioForm initial={orgModal.initial} onClose={() => setOrgModal({ open: false })} />
        </Overlay>
      )}
      {oppModal.open && (
        <Overlay onClose={() => setOppModal({ open: false })}>
          <OportunitatForm initial={oppModal.initial} organitzacions={organitzacions} empreses={empreses} onClose={() => setOppModal({ open: false })} />
        </Overlay>
      )}
    </div>
  );
}
