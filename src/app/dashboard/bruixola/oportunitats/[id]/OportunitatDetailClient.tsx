"use client";

import { useState, useTransition, useActionState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  saveOportunitat, deleteOportunitat, saveTasca, toggleTasca, deleteTasca,
  type Oportunitat, type Pipeline, type Stage, type Persona, type StageHistoryEntry,
  type Tasca, type TipusTasca,
} from "@/app/actions/bruixola-negoci";

const fmtEuro = (n: number | null, moneda: string | null) =>
  n == null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: moneda ?? "EUR", maximumFractionDigits: 0 }).format(n);

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("es-ES") : "—";
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

const TIPUS_TASCA_LABEL: Record<TipusTasca, string> = { trucada: "Trucada", reunio: "Reunió", email: "Email", tasca: "Tasca" };

function TascaForm({ projecteId, oportunitatId, onClose }: { projecteId: string; oportunitatId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveTasca, null);
  if (state?.success) { onClose(); return null; }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <form action={formAction} className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">Nova tasca</h3>
          <input type="hidden" name="projecte_id" value={projecteId} />
          <input type="hidden" name="oportunitat_id" value={oportunitatId} />
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
      </div>
    </div>
  );
}

export function OportunitatDetailClient({
  oportunitat, pipelines, stages, persones, stageHistory, tasques,
}: {
  oportunitat: Oportunitat;
  pipelines: Pipeline[];
  stages: Stage[];
  persones: Persona[];
  stageHistory: StageHistoryEntry[];
  tasques: Tasca[];
}) {
  const [pipelineId, setPipelineId] = useState(oportunitat.pipeline_id ?? pipelines[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(saveOportunitat, null);
  const [taskModal, setTaskModal] = useState(false);
  const [, startTransition] = useTransition();

  const stagesForPipeline = stages.filter(s => s.pipeline_id === pipelineId).sort((a, b) => a.sort_order - b.sort_order);
  const currentStage = stages.find(s => s.id === oportunitat.stage_id);
  const stageById = Object.fromEntries(stages.map(s => [s.id, s]));

  const pendents = tasques.filter(t => !t.completada);
  const completades = tasques.filter(t => t.completada);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dades del deal · {fmtEuro(oportunitat.valor_potencial, oportunitat.moneda)}</CardTitle>
          {currentStage && (
            <Badge variant={currentStage.es_guanyat ? "success" : currentStage.es_perdut ? "danger" : "warning"}>
              {currentStage.nom}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="id" value={oportunitat.id} />
            <input type="hidden" name="organitzacio_id" value={oportunitat.organitzacio_id} />
            <input type="hidden" name="empresa_id" value={oportunitat.empresa_id ?? ""} />
            <input type="hidden" name="projecte_id" value={oportunitat.projecte_id ?? ""} />
            {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom</label>
              <input name="nom" defaultValue={oportunitat.nom} required className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
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
                <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Etapa</label>
                <select name="stage_id" defaultValue={oportunitat.stage_id ?? ""}
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
                  <option value="">— Selecciona —</option>
                  {stagesForPipeline.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Valor</label>
                <input name="valor_potencial" type="number" step="0.01" defaultValue={oportunitat.valor_potencial ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Moneda</label>
                <select name="moneda" defaultValue={oportunitat.moneda ?? "EUR"} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
                  <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Probabilitat %</label>
                <input name="probabilitat" type="number" min={0} max={100} defaultValue={oportunitat.probabilitat ?? currentStage?.probabilitat ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Persona de contacte</label>
              <select name="persona_id" defaultValue={oportunitat.persona_id ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
                <option value="">— Cap —</option>
                {persones.map(p => <option key={p.id} value={p.id}>{p.nom} {p.cognoms}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Pròxima acció</label>
                <input name="proxima_accio" defaultValue={oportunitat.proxima_accio ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Data</label>
                <input name="proxima_accio_data" type="date" defaultValue={oportunitat.proxima_accio_data ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
              </div>
            </div>

            {currentStage?.es_perdut && (
              <div>
                <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Motiu de pèrdua</label>
                <input name="lost_reason" defaultValue={oportunitat.lost_reason ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
              <textarea name="notes" defaultValue={oportunitat.notes ?? ""} rows={3} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => { if (confirm("Eliminar aquesta oportunitat?")) startTransition(async () => { await deleteOportunitat(oportunitat.id); }); }}
                className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A]"
              >
                Eliminar oportunitat
              </button>
              <Button type="submit" disabled={pending}>{pending ? "Desant…" : "Desar canvis"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {stageHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Historial d&apos;etapes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stageHistory.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-[#374151]">
                  {h.from_stage_id ? (stageById[h.from_stage_id]?.nom ?? "—") : "—"} → {h.to_stage_id ? (stageById[h.to_stage_id]?.nom ?? "—") : "—"}
                </span>
                <span className="text-xs text-[#9CA3AF]">{fmtDateTime(h.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tasques ({pendents.length} pendents)</CardTitle>
          <Button size="sm" onClick={() => setTaskModal(true)}>+ Nova tasca</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasques.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">Cap tasca vinculada.</p>
          ) : (
            <>
              {pendents.map(t => {
                const overdue = t.data_limit ? isOverdue(t.data_limit) : false;
                return (
                  <div key={t.id} className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1" onChange={() => startTransition(async () => { await toggleTasca(t.id, t.projecte_id, true); })} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0A0A0A]">{TIPUS_TASCA_LABEL[t.tipus]}: {t.titol}</p>
                      {t.descripcio && <p className="text-xs text-[#6B7280]">{t.descripcio}</p>}
                    </div>
                    {t.data_limit && <Badge variant={overdue ? "danger" : "warning"}>{fmtDate(t.data_limit)}{t.hora ? ` ${t.hora}` : ""}</Badge>}
                    <button onClick={() => startTransition(async () => { await deleteTasca(t.id, t.projecte_id); })} className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A]">Eliminar</button>
                  </div>
                );
              })}
              {completades.map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  <input type="checkbox" checked onChange={() => startTransition(async () => { await toggleTasca(t.id, t.projecte_id, false); })} />
                  <p className="text-sm text-[#9CA3AF] line-through flex-1">{t.titol}</p>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {taskModal && oportunitat.projecte_id && (
        <TascaForm projecteId={oportunitat.projecte_id} oportunitatId={oportunitat.id} onClose={() => setTaskModal(false)} />
      )}
    </div>
  );
}
