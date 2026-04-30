import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }  = await params;
  const url     = req.nextUrl.searchParams.get("url");

  if (url) {
    const admin = createAdminClient();
    const { data: rec } = await admin
      .from("email_sends")
      .select("id, clicks, first_clicked_at")
      .eq("id", id)
      .maybeSingle();

    if (rec) {
      await admin.from("email_sends").update({
        clicks:           (rec.clicks ?? 0) + 1,
        first_clicked_at: rec.first_clicked_at ?? new Date().toISOString(),
        last_clicked_at:  new Date().toISOString(),
        status:           "clicked",
      }).eq("id", id);
    }

    return NextResponse.redirect(url);
  }

  return NextResponse.json({ error: "No URL" }, { status: 400 });
}
