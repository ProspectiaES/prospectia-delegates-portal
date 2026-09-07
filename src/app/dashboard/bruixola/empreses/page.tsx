import Link from "next/link";
import { getEmpreses } from "@/app/actions/bruixola";
import { EmpresesClient } from "./EmpresesClient";

export default async function BruixolaEmpresesPage() {
  const empreses = await getEmpreses();

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard/bruixola" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Bruixola
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <Link href="/dashboard/bruixola/prospeccio" className="text-sm font-medium text-[#8E0E1A] hover:underline">
            Pipeline de prospecció →
          </Link>
        </div>
      </div>

      <EmpresesClient empreses={empreses} />
    </div>
  );
}
