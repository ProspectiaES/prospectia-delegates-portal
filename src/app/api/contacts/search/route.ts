import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const supabase = await createClient();

  let query = supabase
    .from("holded_contacts")
    .select("id, name, code, email, city")
    .eq("type", 1)
    .order("name")
    .limit(50);

  if (q.length >= 2) {
    query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data } = await query;
  return Response.json(data ?? []);
}
