import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { createProspecto } from "@/app/actions/prospectos";
import { STAGES } from "../ProspectosClient";

export default async function NuevoProspectoPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const isOwner = profile.role === "OWNER" || profile.role === "ADMIN";

  // Owner can assign to any delegate
  let delegates: { id: string; full_name: string }[] = [];
  if (isOwner) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("role", "DELEGATE")
      .order("full_name");
    delegates = (data ?? []) as typeof delegates;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="max-w-lg">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Nuevo prospecto</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Añade un prospecto a tu pipeline CRM.</p>
        </div>

        <form action={createProspecto} className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">

          {isOwner && delegates.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">Delegado asignado</label>
              <select
                name="delegate_id"
                defaultValue={profile.id}
                className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none shadow-sm"
              >
                <option value={profile.id}>Yo mismo</option>
                {delegates.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Nombre <span className="text-[#8E0E1A]">*</span>
            </label>
            <input
              name="name"
              required
              placeholder="Nombre completo o empresa"
              className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                placeholder="contacto@empresa.es"
                className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">Teléfono</label>
              <input
                name="phone"
                type="tel"
                placeholder="+34 600 000 000"
                className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">Empresa</label>
              <input
                name="company"
                placeholder="Nombre de la empresa"
                className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">Ciudad</label>
              <input
                name="city"
                placeholder="Barcelona"
                className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">Etapa inicial</label>
              <select
                name="stage"
                defaultValue="nuevo"
                className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none shadow-sm"
              >
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">Fuente</label>
              <select
                name="source"
                defaultValue="manual"
                className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none shadow-sm"
              >
                <option value="manual">Manual</option>
                <option value="referido">Referido</option>
                <option value="web">Web</option>
                <option value="evento">Evento</option>
                <option value="linkedin">LinkedIn</option>
                <option value="csv">CSV</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">Notas</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Contexto inicial, cómo contactamos…"
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <a
              href="/dashboard/prospectos"
              className="h-9 px-4 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:border-[#0A0A0A] hover:bg-[#F9FAFB] transition-colors"
            >
              Cancelar
            </a>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors shadow-sm"
            >
              Crear prospecto
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
