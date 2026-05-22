import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AssignarClient } from "./AssignarClient";

export default async function AssignarInternacionalPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const admin = createAdminClient();
  const { data: contacts } = await admin
    .from("holded_contacts")
    .select("id, name, country, country_code, is_internacional")
    .order("name", { ascending: true });

  const all = contacts ?? [];
  const initialSelected = new Set(all.filter((c) => c.is_internacional).map((c) => c.id));

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        <div>
          <Link href="/dashboard/bruixola/internacional" className="text-xs text-[#6B7280] hover:text-[#111827] mb-1 inline-block">
            ← Internacional
          </Link>
          <h1 className="text-2xl font-bold text-[#111827]">Assignar Divisió Internacional</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Selecciona els clients que pertanyen a la divisió Internacional. Els canvis s'apliquen en bloc en prémer "Guardar canvis".
          </p>
        </div>

        <AssignarClient
          contacts={all.map((c) => ({
            id: c.id,
            name: c.name,
            country: c.country,
            country_code: c.country_code,
            is_internacional: c.is_internacional,
          }))}
          initialSelected={initialSelected}
        />

      </div>
    </div>
  );
}
