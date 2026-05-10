"use client";

import { useActionState, useState } from "react";
import { login, resetPassword } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, loginAction, pending] = useActionState(login, null);
  const [resetError, resetAction, resetPending] = useActionState(resetPassword, null);
  const [mode, setMode] = useState<"login" | "reset" | "reset-sent">("login");

  // After successful reset (resetError === null and not initial state), show confirmation
  // We track with a separate flag
  const [resetSubmitted, setResetSubmitted] = useState(false);

  function handleResetSubmit(formData: FormData) {
    setResetSubmitted(true);
    return resetAction(formData);
  }

  const showSuccess = mode === "reset" && resetSubmitted && resetError === null;

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

          {mode === "login" ? (
            <>
              {error && (
                <div className="mb-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#8E0E1A]">
                  {error}
                </div>
              )}

              <form action={loginAction} className="space-y-5">
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-[#374151]">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode("reset"); setResetSubmitted(false); }}
                      className="text-xs text-[#8E0E1A] hover:underline"
                    >
                      He oblidat la contrasenya
                    </button>
                  </div>
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
            </>
          ) : showSuccess ? (
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-lg">✓</span>
              </div>
              <p className="text-sm font-semibold text-[#0A0A0A] mb-1">Correu enviat</p>
              <p className="text-sm text-[#6B7280] mb-6">
                Comprova la safata d&apos;entrada i clica l&apos;enllaç per establir una nova contrasenya.
              </p>
              <button
                onClick={() => { setMode("login"); setResetSubmitted(false); }}
                className="text-sm text-[#8E0E1A] hover:underline"
              >
                Tornar a l&apos;accés
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#0A0A0A] mb-1">Recuperar contrasenya</p>
              <p className="text-sm text-[#6B7280] mb-5">
                Introdueix el teu email i t&apos;enviarem un enllaç per crear una nova contrasenya.
              </p>

              {resetError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#8E0E1A]">
                  {resetError}
                </div>
              )}

              <form action={handleResetSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-[#374151] mb-1.5">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@empresa.com"
                    required
                    className="w-full rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetPending}
                  className="w-full rounded-lg bg-[#8E0E1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resetPending ? "Enviant…" : "Enviar correu de recuperació"}
                </button>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="w-full text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors pt-1"
                >
                  ← Tornar a l&apos;accés
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
