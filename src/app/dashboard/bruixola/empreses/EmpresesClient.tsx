"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { saveEmpresa, type Empresa } from "@/app/actions/bruixola";

interface FormState { error?: string; success?: boolean }

// saveEmpresa (bruixola.ts) returns void — wrap it to fit useActionState's
// (prevState, formData) => newState shape without touching that file.
async function saveEmpresaAction(_prev: FormState | null, formData: FormData): Promise<FormState> {
  try {
    await saveEmpresa(formData);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error en desar" };
  }
}

function EmpresaForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveEmpresaAction, null);
  if (state?.success) { onClose(); return null; }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <form action={formAction} className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">Nova empresa</h3>
          {state?.error && <p className="text-xs text-[#8E0E1A] bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Nom *</label>
            <input name="nom" required
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Tipus</label>
            <input name="tipus" placeholder="Fabricant, distribuïdor, propi…"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Sector</label>
            <input name="sector"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Descripció</label>
            <textarea name="descripcio" rows={3}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
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

export function EmpresesClient({ empreses }: { empreses: Empresa[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Les meves empreses</h1>
        <Button onClick={() => setOpen(true)}>+ Nova empresa</Button>
      </div>

      {empreses.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-[#9CA3AF]">Encara no hi ha cap empresa registrada.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empreses.map(e => (
            <Link key={e.id} href={`/dashboard/bruixola/empreses/${e.id}`}>
              <Card className="h-full hover:border-[#8E0E1A] transition-colors">
                <CardHeader>
                  <CardTitle>{e.nom}</CardTitle>
                  <Badge variant={e.activa ? "success" : "neutral"}>{e.activa ? "Activa" : "Inactiva"}</Badge>
                </CardHeader>
                <CardContent className="space-y-1">
                  {e.tipus && <p className="text-xs text-[#6B7280]">{e.tipus}</p>}
                  {e.sector && <p className="text-xs text-[#9CA3AF]">{e.sector}</p>}
                  {e.descripcio && <p className="text-xs text-[#6B7280] line-clamp-2 mt-2">{e.descripcio}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {open && <EmpresaForm onClose={() => setOpen(false)} />}
    </>
  );
}
