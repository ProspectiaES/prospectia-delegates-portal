import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getAnamnesi } from "@/app/actions/bruixola";
import { AnamnesiClient } from "./AnamnesiClient";

export default async function AnamnesiPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const historial = await getAnamnesi();

  return <AnamnesiClient historialInicial={historial} />;
}
