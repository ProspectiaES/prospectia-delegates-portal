"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveProducte, deleteProducte } from "@/app/actions/bruixola-negoci";
import type { Producte } from "@/app/actions/bruixola";

function ProducteForm({ empresaId, onClose }: { empresaId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveProducte, null);
  if (state?.success) { onClose(); return null; }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <form action={formAction} className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">Nou producte</h3>
          <input type="hidden" name="empresa_id" value={empresaId} />
          {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom *</label>
            <input name="nom" required placeholder="Ex: Tadalafil ODF"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Tipus</label>
            <select name="tipus" defaultValue="producte"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
              <option value="producte">Producte</option>
              <option value="servei">Servei</option>
              <option value="subscripcio">Subscripció</option>
              <option value="event">Event</option>
              <option value="formacio">Formació</option>
              <option value="plataforma">Plataforma</option>
              <option value="altre">Altre</option>
            </select>
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

export function ProductesSection({ empresaId, productes }: { empresaId: string; productes: Producte[] }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productes ({productes.length})</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>+ Nou producte</Button>
      </CardHeader>
      <CardContent>
        {productes.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Cap producte registrat.</p>
        ) : (
          <div className="space-y-3">
            {productes.map(p => (
              <div key={p.id} className="flex items-start justify-between gap-4 pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
                <Link href={`/dashboard/bruixola/productes/${p.id}`} className="min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors">{p.nom}</p>
                  {p.descripcio && <p className="text-xs text-[#6B7280] mt-0.5">{p.descripcio}</p>}
                </Link>
                <button
                  onClick={() => { if (confirm(`Eliminar "${p.nom}"?`)) startTransition(async () => { await deleteProducte(p.id, empresaId); }); }}
                  className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] shrink-0"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {open && <ProducteForm empresaId={empresaId} onClose={() => setOpen(false)} />}
    </Card>
  );
}
