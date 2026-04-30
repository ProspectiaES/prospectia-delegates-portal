import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 1×1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = createAdminClient();
  const { data: rec } = await admin
    .from("email_sends")
    .select("id, opens, first_opened_at")
    .eq("id", id)
    .maybeSingle();

  if (rec) {
    await admin.from("email_sends").update({
      opens:           (rec.opens ?? 0) + 1,
      first_opened_at: rec.first_opened_at ?? new Date().toISOString(),
      last_opened_at:  new Date().toISOString(),
      status:          "opened",
    }).eq("id", id);
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
