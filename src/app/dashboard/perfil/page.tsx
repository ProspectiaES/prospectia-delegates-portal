import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { IdentityCard } from "./IdentityCard";

export default async function PerfilPage() {
  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, role, email, phone, nif, address, city, postal_code, iban, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) redirect("/login");

  // last_sign_in_at gives the session start (UTC ISO string)
  const sessionStart = user.last_sign_in_at ? new Date(user.last_sign_in_at) : new Date();

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-6">Mi perfil</h1>
      <IdentityCard profile={data} sessionStart={sessionStart} />
    </div>
  );
}
