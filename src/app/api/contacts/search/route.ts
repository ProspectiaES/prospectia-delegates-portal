import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const supabase = await createClient();

  if (q.length < 2) return Response.json([]);

  const { data } = await supabase
    .from("holded_contacts")
    .select("id, name, code, email, city")
    .eq("type", 1)
    .or(`name.ilike.%${q}%,code.ilike.%${q}%,email.ilike.%${q}%`)
    .order("name")
    .limit(20);

  return Response.json(data ?? []);

  const { data } = await query;
  return Response.json(data ?? []);
}
