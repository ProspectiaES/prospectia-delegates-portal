"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createDelegate, CreateDelegateState } from "@/app/actions/delegate-create";

const inputCls =
  "h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm";

export function CreateDelegateForm() {
  const [state, action, pending] = useActionState<CreateDelegateState | null, FormData>(
    createDelegate,
    null
  );

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#8E0E1A]">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[#374151] mb-1.5">
          Nombre completo <span className="text-[#8E0E1A]">*</span>
        </label>
        <input
          name="full_name"
          required
          placeholder="Nombre y apellidos"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#374151] mb-1.5">
          Email (login) <span className="text-[#8E0E1A]">*</span>
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="delegado@empresa.com"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-[#9CA3AF]">
          Será el usuario con el que acceda al portal.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#374151] mb-1.5">
          Contraseña inicial <span className="text-[#8E0E1A]">*</span>
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-[#9CA3AF]">
          El delegado podrá cambiarla después desde su cuenta.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
        >
          {pending ? "Creando…" : "Crear delegado"}
        </button>
        <Link
          href="/dashboard/delegados"
          className="h-9 px-4 flex items-center rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
