import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getProfile } from "@/lib/profile";
import { CreateDelegateForm } from "./CreateDelegateForm";

export default async function NuevoDelegadoPage() {
  const profile = await getProfile();
  if (profile?.role !== "OWNER") redirect("/dashboard/delegados");

  return (
    <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
      <div>
        <Link
          href="/dashboard/delegados"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4"
        >
          ← Volver a delegados
        </Link>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Nuevo delegado</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Crea una cuenta de acceso para un delegado. Podrás completar sus datos de contacto y facturación después.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de acceso</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateDelegateForm />
        </CardContent>
      </Card>
    </div>
  );
}
