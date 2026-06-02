import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getRemeses } from "@/lib/remeses/service";
import RemesesPageClient from "./RemesesPageClient";

export const metadata = { title: "Remeses — Prospectia" };

export default async function RemesesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const remeses = await getRemeses();

  return <RemesesPageClient remesesInicials={remeses} />;
}
