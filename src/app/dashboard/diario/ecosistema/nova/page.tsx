import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { PersonaForm } from "../PersonaForm";

export default async function NovaPersonaPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const sp = await searchParams;

  return <PersonaForm initial={null} defaultCat={(sp.cat as "nucli" | "estrategic" | "expansio" | "drenant") ?? "nucli"} />;
}
