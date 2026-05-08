import { redirect, notFound } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getPersona, getInteraccions } from "@/app/actions/ecosistema";
import { PersonaForm } from "../PersonaForm";

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { id } = await params;
  const [persona, interaccions] = await Promise.all([
    getPersona(id),
    getInteraccions(id),
  ]);

  if (!persona) notFound();

  return <PersonaForm initial={persona} defaultCat={persona.categoria} interaccions={interaccions} />;
}
