"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Les contrasenyes no coincideixen."); return; }
    if (password.length < 8) { setError("La contrasenya ha de tenir mínim 8 caràcters."); return; }
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); return; }
      router.replace("/dashboard");
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F5F7] px-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#8E0E1A] flex items-center justify-center mb-4 shadow-sm">
            <span className="text-white font-bold text-xl leading-none select-none">P</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Nova contrasenya</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Prospectia Delegates Portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm px-8 py-8">
          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#8E0E1A]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1.5">
                Nova contrasenya
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Mínim 8 caràcters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-[#374151] mb-1.5">
                Confirmar contrasenya
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Repeteix la contrasenya"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !password || !confirm}
              className="w-full rounded-lg bg-[#8E0E1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6B0A14] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {isPending ? "Desant…" : "Desar contrasenya"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
