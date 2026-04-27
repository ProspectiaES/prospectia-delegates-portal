import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q          = (searchParams.get("q")       ?? "").trim();
  const typeParam  = searchParams.get("type");
  const excludeId  = searchParams.get("exclude")  ?? "";

  const supabase = await createClient();

  let query = supabase
    .from("holded_contacts")
    .select("id, name, code, email, city")
    .order("name")
    .limit(50);

  if (typeParam !== null) query = query.eq("type", parseInt(typeParam, 10));
  if (q.length >= 2)      query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,email.ilike.%${q}%`);
  if (excludeId)          query = query.neq("id", excludeId);

  const { data } = await query;
  return Response.json(data ?? []);
}
