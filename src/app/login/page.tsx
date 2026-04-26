"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F5F7] px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#8E0E1A] flex items-center justify-center mb-4 shadow-sm">
            <span className="text-white font-bold text-xl leading-none select-none">P</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Prospectia</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Delegates Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm px-8 py-8">

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#8E0E1A]">
              {error}
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@empresa.com"
                required
                className="w-full rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-[#8E0E1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6B0A14] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {pending ? "Accediendo…" : "Acceder"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
