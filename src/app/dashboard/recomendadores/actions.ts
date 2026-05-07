"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { revalidatePath } from "next/cache";

export async function saveRecommenderRate(contactId: string, rate: number | null) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") throw new Error("Forbidden");

  const admin = createAdminClient();
  await admin
    .from("holded_contacts")
    .update({ recommender_rate: rate })
    .eq("id", contactId);

  revalidatePath("/dashboard/recomendadores");
}
