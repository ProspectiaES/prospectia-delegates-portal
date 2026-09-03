import { redirect } from "next/navigation";
import Link from "next/link";
import { getClientContact } from "@/lib/clientSession";
import { clientLogout } from "@/app/actions/clientAuth";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth — src/proxy.ts already gates /cliente/*, but pages
  // themselves must never assume a valid session without re-checking.
  const contact = await getClientContact();
  if (!contact) redirect("/login");

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-screen-lg mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/cliente" className="flex items-center gap-2.5">
            <img src="/Logo-OWL_1.ico" alt="Prospectia" className="w-7 h-7 rounded-md object-contain" />
            <span className="text-sm font-bold text-[#0A0A0A]">Prospectia</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#6B7280] hidden sm:inline">{contact.name}</span>
            <form action={clientLogout}>
              <button
                type="submit"
                className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-screen-lg mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
