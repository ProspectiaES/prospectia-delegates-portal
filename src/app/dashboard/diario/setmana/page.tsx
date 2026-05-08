import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getFraseSetmana } from "@/lib/diario-constants";

export default async function SetmanaRedirectPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { setmana } = getFraseSetmana();
  const year = new Date().getFullYear();

  redirect(`/dashboard/diario/setmana/${year}/${setmana}`);
}
