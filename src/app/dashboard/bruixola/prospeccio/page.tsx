import Link from "next/link";
import { getOrganitzacions, getOportunitats } from "@/app/actions/bruixola-negoci";
import { getEmpreses } from "@/app/actions/bruixola";
import { ProspeccioClient } from "./ProspeccioClient";

export default async function ProspeccioPage() {
  const [organitzacions, oportunitats, empreses] = await Promise.all([
    getOrganitzacions(),
    getOportunitats(),
    getEmpreses(),
  ]);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard/bruixola/empreses" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Les meves empreses
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">Pipeline de prospecció</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Organitzacions externes i oportunitats en curs — visible només per a tu.</p>
      </div>

      <ProspeccioClient
        organitzacions={organitzacions}
        oportunitats={oportunitats}
        empreses={empreses.map(e => ({ id: e.id, nom: e.nom }))}
      />
    </div>
  );
}
