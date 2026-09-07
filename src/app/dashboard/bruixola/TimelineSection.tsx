"use client";

import { useTransition, useActionState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveComentari, deleteComentari, type Activitat, type Comentari, type EntityType } from "@/app/actions/bruixola-negoci";

const ACTION_LABEL: Record<string, string> = {
  creada: "Oportunitat creada",
  canvi_etapa: "Canvi d'etapa",
  tasca_completada: "Tasca completada",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Item = { kind: "activitat"; data: Activitat } | { kind: "comentari"; data: Comentari };

export function TimelineSection({
  entityType, entityId, activitats, comentaris,
}: {
  entityType: EntityType; entityId: string; activitats: Activitat[]; comentaris: Comentari[];
}) {
  const [, formAction, pending] = useActionState(saveComentari, null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const items: Item[] = [
    ...activitats.map(a => ({ kind: "activitat" as const, data: a })),
    ...comentaris.map(c => ({ kind: "comentari" as const, data: c })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

  return (
    <Card>
      <CardHeader><CardTitle>Activitat</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form
          ref={formRef}
          action={formData => { formAction(formData); formRef.current?.reset(); }}
          className="flex gap-2"
        >
          <input type="hidden" name="entity_type" value={entityType} />
          <input type="hidden" name="entity_id" value={entityId} />
          <input
            name="contingut"
            placeholder="Afegeix un comentari…"
            required
            className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]"
          />
          <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Enviar"}</Button>
        </form>

        {items.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Encara no hi ha activitat.</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={`${item.kind}-${item.data.id}`} className="flex items-start justify-between gap-3 text-sm border-b border-[#F3F4F6] last:border-0 pb-3 last:pb-0">
                <div className="min-w-0">
                  {item.kind === "activitat" ? (
                    <>
                      <p className="text-[#374151]">{ACTION_LABEL[item.data.action] ?? item.data.action}</p>
                      {item.data.detail && <p className="text-xs text-[#6B7280]">{item.data.detail}</p>}
                    </>
                  ) : (
                    <p className="text-[#0A0A0A]">{item.data.contingut}</p>
                  )}
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">{fmt(item.data.created_at)}</p>
                </div>
                {item.kind === "comentari" && (
                  <button
                    onClick={() => startTransition(async () => { await deleteComentari(item.data.id, entityType, entityId); })}
                    className="text-[11px] text-[#9CA3AF] hover:text-[#8E0E1A] shrink-0"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
