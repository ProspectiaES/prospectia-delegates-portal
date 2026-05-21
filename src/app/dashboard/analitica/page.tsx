import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { AnalyticsChat } from "./AnalyticsChat";

export const metadata = { title: "Analítica IA — Prospectia" };

const ALLOWED = ["OWNER", "ADMIN", "KOL", "COORDINATOR"];

export default async function AnaliticaPage() {
  const profile = await getProfile();
  if (!profile || !ALLOWED.includes(profile.role)) notFound();

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 shrink-0 border-b border-[#F3F4F6]">
        <h1 className="text-lg font-semibold text-[#0A0A0A]">Analítica IA</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Análisis de ventas, delegados y rentabilidad con datos en tiempo real
        </p>
      </div>
      <AnalyticsChat />
    </div>
  );
}
