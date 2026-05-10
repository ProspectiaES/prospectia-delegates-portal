import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getAnamnesiRespostes } from "@/app/actions/bruixola";
import { AnamnesiClient } from "./AnamnesiClient";

export default async function AnamnesiPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const respostes = await getAnamnesiRespostes();

  return <AnamnesiClient respostesInicials={respostes} />;
}
