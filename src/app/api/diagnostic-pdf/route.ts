import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { DiagnosticPDF } from "@/app/dashboard/bruixola/diagnostic/DiagnosticPDF";
import type { RichDiagnosticResult } from "@/lib/bruixola-prompts";

export async function GET() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = profile.role === "OWNER" ? profile.id : profile.owner_id;
  if (!ownerId) return NextResponse.json({ error: "No owner" }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_diagnostic")
    .select("full_data")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const richData = data?.full_data as RichDiagnosticResult | null;
  if (!richData) {
    return NextResponse.json({ error: "No diagnostic found" }, { status: 404 });
  }

  const element = React.createElement(DiagnosticPDF, { d: richData });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="diagnostic-prospectia.pdf"',
    },
  });
}
