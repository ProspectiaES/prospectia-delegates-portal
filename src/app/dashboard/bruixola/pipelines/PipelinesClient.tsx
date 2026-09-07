"use client";

import { useState, useTransition, useActionState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  savePipeline, deletePipeline, saveStage, deleteStage,
  type Pipeline, type Stage,
} from "@/app/actions/bruixola-negoci";

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function PipelineForm({ initial, onClose }: { initial?: Pipeline; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(savePipeline, null);
  if (state?.success) { onClose(); return null; }

  return (
    <form action={formAction} className="p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#0A0A0A]">{initial ? "Editar pipeline" : "Nou pipeline"}</h3>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom *</label>
        <input name="nom" defaultValue={initial?.nom} required className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Descripció</label>
        <textarea name="descripcio" defaultValue={initial?.descripcio ?? ""} rows={2} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Ordre</label>
        <input name="sort_order" type="number" defaultValue={initial?.sort_order ?? 0} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Desant…" : "Desar"}</Button>
      </div>
    </form>
  );
}

function StageForm({ pipelineId, initial, onClose }: { pipelineId: string; initial?: Stage; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveStage, null);
  if (state?.success) { onClose(); return null; }

  return (
    <form action={formAction} className="p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#0A0A0A]">{initial ? "Editar etapa" : "Nova etapa"}</h3>
      <input type="hidden" name="pipeline_id" value={pipelineId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom *</label>
        <input name="nom" defaultValue={initial?.nom} required className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Ordre</label>
          <input name="sort_order" type="number" defaultValue={initial?.sort_order ?? 0} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Probabilitat %</label>
          <input name="probabilitat" type="number" min={0} max={100} defaultValue={initial?.probabilitat ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Color</label>
          <input name="color" type="color" defaultValue={initial?.color ?? "#8E0E1A"} className="w-full h-9 border border-[#E5E7EB] rounded-lg px-1" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">SLA (dies)</label>
          <input name="max_dies" type="number" defaultValue={initial?.max_dies ?? ""} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>
      </div>
      <div className="flex items-center gap-4 pt-1">
        <label className="flex items-center gap-1.5 text-xs text-[#374151]">
          <input type="checkbox" name="es_guanyat" value="true" defaultChecked={initial?.es_guanyat} /> Compta com a guanyat
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[#374151]">
          <input type="checkbox" name="es_perdut" value="true" defaultChecked={initial?.es_perdut} /> Compta com a perdut
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Desant…" : "Desar"}</Button>
      </div>
    </form>
  );
}

export function PipelinesClient({ pipelines, stagesByPipeline }: { pipelines: Pipeline[]; stagesByPipeline: Record<string, Stage[]> }) {
  const [pipelineModal, setPipelineModal] = useState<{ open: boolean; initial?: Pipeline }>({ open: false });
  const [stageModal, setStageModal] = useState<{ open: boolean; pipelineId: string; initial?: Stage } | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Pipelines</h1>
        <Button onClick={() => setPipelineModal({ open: true })}>+ Nou pipeline</Button>
      </div>

      {pipelines.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-[#9CA3AF]">Cap pipeline creat encara.</CardContent></Card>
      ) : (
        pipelines.map(pl => (
          <Card key={pl.id}>
            <CardHeader>
              <div>
                <CardTitle>{pl.nom}</CardTitle>
                {pl.descripcio && <p className="text-xs text-[#6B7280] mt-0.5">{pl.descripcio}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setStageModal({ open: true, pipelineId: pl.id })}>+ Etapa</Button>
                <button onClick={() => setPipelineModal({ open: true, initial: pl })} className="text-xs text-[#6B7280] hover:text-[#0A0A0A]">Editar</button>
                <button
                  onClick={() => { if (confirm(`Eliminar pipeline "${pl.nom}" i totes les seves etapes?`)) startTransition(async () => { await deletePipeline(pl.id); }); }}
                  className="text-xs text-[#6B7280] hover:text-[#8E0E1A]"
                >
                  Eliminar
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {(stagesByPipeline[pl.id] ?? []).length === 0 ? (
                <p className="text-sm text-[#9CA3AF]">Cap etapa encara.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(stagesByPipeline[pl.id] ?? []).map(s => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color ?? "#9CA3AF" }} />
                      <span className="text-sm text-[#0A0A0A]">{s.nom}</span>
                      {s.probabilitat != null && <Badge variant="neutral">{s.probabilitat}%</Badge>}
                      {s.es_guanyat && <Badge variant="success">Guanyat</Badge>}
                      {s.es_perdut && <Badge variant="danger">Perdut</Badge>}
                      <button onClick={() => setStageModal({ open: true, pipelineId: pl.id, initial: s })} className="text-[11px] text-[#6B7280] hover:text-[#0A0A0A]">✎</button>
                      <button
                        onClick={() => { if (confirm(`Eliminar etapa "${s.nom}"?`)) startTransition(async () => { await deleteStage(s.id); }); }}
                        className="text-[11px] text-[#6B7280] hover:text-[#8E0E1A]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {pipelineModal.open && (
        <Overlay onClose={() => setPipelineModal({ open: false })}>
          <PipelineForm initial={pipelineModal.initial} onClose={() => setPipelineModal({ open: false })} />
        </Overlay>
      )}
      {stageModal?.open && (
        <Overlay onClose={() => setStageModal(null)}>
          <StageForm pipelineId={stageModal.pipelineId} initial={stageModal.initial} onClose={() => setStageModal(null)} />
        </Overlay>
      )}
    </div>
  );
}
