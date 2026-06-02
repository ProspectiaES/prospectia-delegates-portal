import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getRemesaDetall } from "@/lib/remeses/service";
import RemesaDetallClient from "./RemesaDetallClient";

export const metadata = { title: "Detall Remesa — Prospectia" };

export default async function RemesaDetallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { id } = await params;

  let detall;
  try {
    detall = await getRemesaDetall(id);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("no trobada")) notFound();
    throw e;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
        <Link href="/dashboard/remeses" className="hover:text-[#8E0E1A] transition-colors">
          Remeses
        </Link>
        <span>/</span>
        <span className="text-[#374151] font-medium">
          Setmana {new Date(detall.setmana_inici + "T00:00:00").toLocaleDateString("ca-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </span>
      </div>

      <RemesaDetallClient detall={detall} />
    </div>
  );
}
