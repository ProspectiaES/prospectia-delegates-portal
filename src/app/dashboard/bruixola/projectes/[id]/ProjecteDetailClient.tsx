"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  saveOportunitat, deleteOportunitat,
  saveTasca, toggleTasca, deleteTasca,
  type Organitzacio, type Oportunitat, type Tasca, type Pipeline, type Stage, type TipusTasca,
} from "@/app/actions/bruixola-negoci";

const TIPUS_LABEL: Record<string, string> = {
  prospecte: "Prospecte", client: "Client", partner: "Partner",
  proveidor: "Proveïdor", distribuidor: "Distribuïdor", altre: "Altre",
};
const TIPUS_TASCA_LABEL: Record<TipusTasca, string> = { trucada: "Trucada", reunio: "Reunió", email: "Email", tasca: "Tasca" };
const fmtEuro = (n: number | null, moneda: string | null) =>
  n == null ? null : new Intl.NumberFormat("es-ES", { style: "currency", currency: moneda ?? "EUR", maximumFractionDigits: 0 }).format(n);

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Oportunitat form (scoped to this projecte) ────────────────────────────

function OportunitatForm({
  projecteId, empresaId, organitzacions, pipelines, stages, onClose,
}: {
  projecteId: string; empresaId: string | null;
  organitzacions: Organitzacio[]; pipelines: Pipeline[]; stages: Stage[]; onClose: () => void;
}) {
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(saveOportunitat, null);
  if (state?.success) { onClose(); return null; }

  const stagesForPipeline = stages.filter(s => s.pipeline_id === pipelineId).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <form action={formAction} className="p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#0A0A0A]">Nova oportunitat</h3>
      <input type="hidden" name="projecte_id" value={projecteId} />
      {empresaId && <input type="hidden" name="empresa_id" value={empresaId} />}
      {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom *</label>
        <input name="nom" required
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Organització *</label>
        <select name="organitzacio_id" required
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
          <option value="">— Selecciona —</option>
          {organitzacions.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Pipeline</label>
          <select name="pipeline_id" value={pipelineId} onChange={e => setPipelineId(e.target.value)}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Etapa inicial</label>
          <select name="stage_id" defaultValue={stagesForPipeline[0]?.id ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
            {stagesForPipeline.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Ona</label>
        <input name="ona" className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Valor potencial (€)</label>
        <input name="valor_potencial" type="number" step="0.01" className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Pròxima acció</label>
          <input name="proxima_accio" className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Data</label>
          <input name="proxima_accio_data" type="date" className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
        <textarea name="notes" rows={2} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Desant…" : "Desar"}</Button>
      </div>
    </form>
  );
}

// ─── Tasca form ─────────────────────────────────────────────────────────────

function TascaForm({ projecteId, onClose }: { projecteId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveTasca, null);
  if (state?.success) { onClose(); return null; }

  return (
    <form action={formAction} className="p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#0A0A0A]">Nova tasca</h3>
      <input type="hidden" name="projecte_id" value={projecteId} />
      {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Títol *</label>
        <input name="titol" required className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Tipus</label>
          <select name="tipus" defaultValue="tasca" className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
            {Object.entries(TIPUS_TASCA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Data límit</label>
          <input name="data_limit" type="date" className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Hora</label>
          <input name="hora" type="time" className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Descripció</label>
        <textarea name="descripcio" rows={2} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Desant…" : "Desar"}</Button>
      </div>
    </form>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function ProjecteDetailClient({
  projecteId, empresaId, oportunitats, organitzacions, tasques, pipelines, stages,
}: {
  projecteId: string;
  empresaId: string | null;
  oportunitats: Oportunitat[];
  organitzacions: Organitzacio[];
  tasques: Tasca[];
  pipelines: Pipeline[];
  stages: Stage[];
}) {
  const [oppModalOpen, setOppModalOpen] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [, startTransition] = useTransition();

  const orgById = Object.fromEntries(organitzacions.map(o => [o.id, o]));
  const stageById = Object.fromEntries(stages.map(s => [s.id, s]));
  const pendents = tasques.filter(t => !t.completada);
  const completades = tasques.filter(t => t.completada);

  return (
    <div className="space-y-6">
      {/* Oportunitats */}
      <Card>
        <CardHeader>
          <CardTitle>Prospectes ({oportunitats.length})</CardTitle>
          <Button size="sm" onClick={() => setOppModalOpen(true)} disabled={organitzacions.length === 0 || pipelines.length === 0}>
            + Nova oportunitat
          </Button>
        </CardHeader>
        <CardContent>
          {organitzacions.length === 0 && (
            <p className="text-xs text-[#9CA3AF] mb-3">Cal crear organitzacions al pipeline global abans de poder-les afegir aquí.</p>
          )}
          {oportunitats.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">Cap prospecte encara.</p>
          ) : (
            <div className="space-y-2">
              {oportunitats.map(op => {
                const org = orgById[op.organitzacio_id];
                const stage = op.stage_id ? stageById[op.stage_id] : undefined;
                const overdue = isOverdue(op.proxima_accio_data);
                return (
                  <Link key={op.id} href={`/dashboard/bruixola/oportunitats/${op.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] p-3 hover:border-[#8E0E1A] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A]">{org?.nom ?? op.nom}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {org && <Badge variant="default">{TIPUS_LABEL[org.tipus] ?? org.tipus}</Badge>}
                        {op.ona && <Badge variant="neutral">{op.ona}</Badge>}
                        {op.valor_potencial != null && <Badge variant="default">{fmtEuro(op.valor_potencial, op.moneda)}</Badge>}
                      </div>
                      {op.proxima_accio && (
                        <p className="text-[11px] text-[#6B7280] mt-1">
                          {op.proxima_accio}
                          {op.proxima_accio_data && (
                            <span className={overdue ? "text-[#8E0E1A] font-semibold ml-1" : "ml-1"}>
                              · {new Date(op.proxima_accio_data).toLocaleDateString("es-ES")}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {stage && (
                        <Badge variant={stage.es_guanyat ? "success" : stage.es_perdut ? "danger" : "warning"}>
                          {stage.nom}
                        </Badge>
                      )}
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); if (confirm(`Eliminar "${org?.nom ?? op.nom}"?`)) startTransition(async () => { await deleteOportunitat(op.id); }); }}
                        className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A]"
                      >
                        Eliminar
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasques */}
      <Card>
        <CardHeader>
          <CardTitle>Tasques ({pendents.length} pendents)</CardTitle>
          <Button size="sm" onClick={() => setTaskModal(true)}>+ Nova tasca</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasques.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">Cap tasca registrada.</p>
          ) : (
            <>
              {pendents.map(t => {
                const overdue = t.data_limit ? isOverdue(t.data_limit) : false;
                return (
                  <div key={t.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      onChange={() => startTransition(async () => { await toggleTasca(t.id, projecteId, true); })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0A0A0A]">{t.titol}</p>
                      {t.descripcio && <p className="text-xs text-[#6B7280]">{t.descripcio}</p>}
                    </div>
                    {t.data_limit && (
                      <Badge variant={overdue ? "danger" : "warning"}>
                        {new Date(t.data_limit).toLocaleDateString("es-ES")}
                      </Badge>
                    )}
                    <button
                      onClick={() => startTransition(async () => { await deleteTasca(t.id, projecteId); })}
                      className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A]"
                    >
                      Eliminar
                    </button>
                  </div>
                );
              })}
              {completades.length > 0 && (
                <div className="pt-2 border-t border-[#F3F4F6] space-y-2">
                  <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Completades</p>
                  {completades.map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked
                        onChange={() => startTransition(async () => { await toggleTasca(t.id, projecteId, false); })}
                      />
                      <p className="text-sm text-[#9CA3AF] line-through flex-1">{t.titol}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {oppModalOpen && (
        <Overlay onClose={() => setOppModalOpen(false)}>
          <OportunitatForm projecteId={projecteId} empresaId={empresaId} organitzacions={organitzacions} pipelines={pipelines} stages={stages} onClose={() => setOppModalOpen(false)} />
        </Overlay>
      )}
      {taskModal && (
        <Overlay onClose={() => setTaskModal(false)}>
          <TascaForm projecteId={projecteId} onClose={() => setTaskModal(false)} />
        </Overlay>
      )}
    </div>
  );
}
