import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const supabase = await createClient();

  let query = supabase
    .from("holded_contacts")
    .select("id, name, code, email, city")
    .order("name")
    .limit(20);

  if (q.length >= 2) {
    query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,email.ilike.%${q}%`);
  } else {
    return Response.json([]);
  }

  const { data } = await query;
  return Response.json(data ?? []);
}
