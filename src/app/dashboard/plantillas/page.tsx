import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { PlantillasClient, type Template } from "./PlantillasClient";

export default async function PlantillasPage() {
  const profile = await getProfile();
  if (profile?.role !== "OWNER" && profile?.role !== "ADMIN") notFound();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("email_templates")
    .select("id, name, subject, body_html, body_text, created_at")
    .order("name");

  const templates = (rows ?? []) as Template[];

  async function saveTemplate(fd: FormData) {
    "use server";
    const id = fd.get("id") as string | null;
    const prof = await getProfile();
    const adm = createAdminClient();

    const payload = {
      name:      (fd.get("name") as string).trim(),
      subject:   (fd.get("subject") as string).trim(),
      body_text: (fd.get("body_text") as string).trim(),
      body_html: (fd.get("body_text") as string).trim().replace(/\n/g, "<br>"),
      updated_at: new Date().toISOString(),
    };

    if (id) {
      await adm.from("email_templates").update(payload).eq("id", id);
    } else {
      await adm.from("email_templates").insert({ ...payload, created_by: prof?.id });
    }

    revalidatePath("/dashboard/plantillas");
  }

  async function deleteTemplate(id: string) {
    "use server";
    const adm = createAdminClient();
    await adm.from("email_templates").delete().eq("id", id);
    revalidatePath("/dashboard/plantillas");
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Plantillas de email</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Crea plantillas reutilizables para que los delegados las usen al contactar prospectos.
        </p>
      </div>

      <PlantillasClient
        templates={templates}
        onSave={saveTemplate}
        onDelete={deleteTemplate}
      />
    </div>
  );
}
