import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getSetmana } from "@/app/actions/diario-planificacio";
import { FRASES_52 } from "@/lib/diario-constants";
import { SetmanaForm } from "./SetmanaForm";

export default async function SetmanaPage({
  params,
}: {
  params: Promise<{ any: string; setmana: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { any: anyStr, setmana: setmanaStr } = await params;
  const any = parseInt(anyStr, 10);
  const setmana = parseInt(setmanaStr, 10);

  if (isNaN(any) || isNaN(setmana) || setmana < 1 || setmana > 53) notFound();

  const data = await getSetmana(any, setmana);
  const fraseIdx = Math.min(setmana - 1, FRASES_52.length - 1);
  const fraseSetmana = FRASES_52[fraseIdx];

  const prevWeek = setmana > 1 ? setmana - 1 : null;
  const nextWeek = setmana < 52 ? setmana + 1 : null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/diario/planificacio"
          className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          title="Planificació"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        {prevWeek ? (
          <Link
            href={`/dashboard/diario/setmana/${any}/${prevWeek}`}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            title="Setmana anterior"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        ) : <div className="w-8" />}

        <h1 className="flex-1 text-sm font-bold text-[#0A0A0A] text-center">
          Setmana {setmana} · {any}
        </h1>

        {nextWeek ? (
          <Link
            href={`/dashboard/diario/setmana/${any}/${nextWeek}`}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            title="Setmana següent"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        ) : <div className="w-8" />}
      </div>

      <SetmanaForm any={any} setmana={setmana} fraseSetmana={fraseSetmana} initial={data} />
    </div>
  );
}
