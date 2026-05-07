import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { RateForm } from "./RateForm";

export default async function RecomendadoresPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const admin = createAdminClient();

  // All contacts that are referenced as recommender_id by at least one other contact
  const { data: rows } = await admin
    .from("holded_contacts")
    .select("id, name, city, recommender_rate")
    .not("recommender_id", "is", null)
    .order("name", { ascending: true });

  // Distinct recommender IDs actually referenced
  const refIds = [...new Set((rows ?? []).map(r => (r as { recommender_id?: string }).recommender_id).filter(Boolean))] as string[];

  // Fetch the actual recommender contacts
  const { data: recommenders } = refIds.length > 0
    ? await admin.from("holded_contacts").select("id, name, city, recommender_rate").in("id", refIds).order("name")
    : { data: [] };

  // Count clients per recommender
  const clientCount: Record<string, number> = {};
  for (const r of rows ?? []) {
    const rid = (r as { recommender_id?: string }).recommender_id;
    if (rid) clientCount[rid] = (clientCount[rid] ?? 0) + 1;
  }

  const list = (recommenders ?? []) as {
    id: string; name: string; city: string | null; recommender_rate: number | null;
  }[];

  const configured = list.filter(r => r.recommender_rate != null).length;

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Recomendadores</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {list.length} recomendador{list.length !== 1 ? "es" : ""} activos ·{" "}
          {configured} con comisión configurada
        </p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFBEB] border-l-4 border-l-[#D97706] px-5 py-3.5 text-sm text-[#92400E]">
        La comisión del recomendador se deduce automáticamente del neto del delegado en cada liquidación.
        Configura aquí el porcentaje fijo que le corresponde a cada recomendador, independientemente del producto vendido.
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-6 py-12 text-center">
          <p className="text-sm text-[#6B7280]">
            No hay recomendadores configurados. Asigna un recomendador a un cliente en su ficha para que aparezca aquí.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["Recomendador", "Ciudad", "Clientes asignados", "Comisión (%)"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {list.map(rec => (
                  <tr key={rec.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#0A0A0A]">{rec.name}</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{rec.city ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {clientCount[rec.id] ?? 0} cliente{(clientCount[rec.id] ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <RateForm contactId={rec.id} currentRate={rec.recommender_rate != null ? Number(rec.recommender_rate) : null} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
