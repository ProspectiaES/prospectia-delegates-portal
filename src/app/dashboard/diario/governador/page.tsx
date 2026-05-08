import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getLastSessions } from "@/app/actions/governador";
import { GovernadorClient } from "./GovernadorClient";

const R = "#7D1120";
const BK = "#1C1510";
const BORDER = "#E4DDD5";
const LABEL = "#9A8E82";

export default async function GovernadorPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const lastSessions = await getLastSessions();

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 space-y-6">

      {/* Nav */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/diario"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] hover:underline"
          style={{ color: LABEL }}>
          ← Diari
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: BK }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2"
          style={{ color: R }}>
          Sistema d&apos;Intel·ligència Personal
        </p>
        <h1 className="text-[28px] font-black leading-tight mb-2" style={{ color: "#F0EAE0" }}>
          El Governador
        </h1>
        <p className="text-[12px] leading-relaxed" style={{ color: "#6B5D50" }}>
          No un assistent. No un coach. La veu del govern personal: directa,
          serena, estratègica.
        </p>

        <div className="grid grid-cols-4 gap-4 mt-5 pt-5" style={{ borderTop: "1px solid #2A2018" }}>
          {[
            { label: "Focus", val: "Recentratge" },
            { label: "Diari", val: "Seguiment" },
            { label: "Coherència", val: "Valors" },
            { label: "Cos", val: "Entrenament" },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5"
                style={{ color: "#3A2A20" }}>
                {item.label}
              </p>
              <p className="text-[11px] font-semibold" style={{ color: "#7A6A5A" }}>
                {item.val}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modes */}
      <GovernadorClient lastSessions={lastSessions} />

    </div>
  );
}
