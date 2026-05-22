import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { ObjectiusClient } from "./ObjectiusClient";

export const metadata = { title: "Objectius — Brúixola" };

export type Objectiu = {
  id: string;
  titol: string;
  tipus: string;
  any: number;
  trimestre: number | null;
  mes: number | null;
  estat: string;
  prioritat: number | null;
  progress: number;
  data_objectiu: string | null;
  metrica: string | null;
  valor_objectiu: number | null;
  valor_actual: number | null;
  seguent_accio: string | null;
  descripcio: string | null;
  decisio_pendent: string | null;
  created_at: string;
  updated_at: string;
};

export default async function ObjectiusPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_objectius")
    .select("id,titol,tipus,any,trimestre,mes,estat,prioritat,progress,data_objectiu,metrica,valor_objectiu,valor_actual,seguent_accio,descripcio,decisio_pendent,created_at,updated_at")
    .eq("user_id", profile.id)
    .order("any", { ascending: false })
    .order("prioritat", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const objectius = (data ?? []) as Objectiu[];
  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-5xl mx-auto px-5 pt-6 pb-12">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/dashboard/bruixola" className="text-xs text-[#6B7280] hover:text-[#111827] mb-1 inline-block">← Brúixola</Link>
          <h1 className="text-xl font-bold text-[#0A0A0A]">Objectius estratègics</h1>
          <p className="text-xs text-[#9CA3AF] mt-0.5">{objectius.length} objectiu{objectius.length !== 1 ? "s" : ""} registrats</p>
        </div>
      </div>

      <ObjectiusClient objectius={objectius} currentYear={currentYear} />
    </div>
  );
}
