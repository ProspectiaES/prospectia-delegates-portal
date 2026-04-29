import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q         = (searchParams.get("q")      ?? "").trim();
  const typeParam = searchParams.get("type");
  const excludeId = searchParams.get("exclude") ?? "";

  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);

  // Delegates only search within their contact universe
  let delegateContactIds: string[] | null = null;
  if (profile?.role === "DELEGATE") {
    const admin = createAdminClient();
    const { data: links } = await admin
      .from("contact_delegates")
      .select("contact_id")
      .eq("delegate_id", profile.id);
    delegateContactIds = (links ?? []).map(r => r.contact_id as string);
  }

  // No contacts in universe → empty result
  if (delegateContactIds !== null && delegateContactIds.length === 0) {
    return Response.json([]);
  }

  let query = supabase
    .from("holded_contacts")
    .select("id, name, code, email, city")
    .order("name")
    .limit(50);

  if (delegateContactIds !== null) query = query.in("id", delegateContactIds);
  if (typeParam !== null)          query = query.eq("type", parseInt(typeParam, 10));
  if (q.length >= 2)               query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,email.ilike.%${q}%`);
  if (excludeId)                   query = query.neq("id", excludeId);

  const { data } = await query;
  return Response.json(data ?? []);
}
