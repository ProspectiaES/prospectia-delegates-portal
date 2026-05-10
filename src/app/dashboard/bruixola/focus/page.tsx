"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBruixolaDashboard, saveFocus } from "@/app/actions/bruixola";
import type { Focus } from "@/app/actions/bruixola";

const CARD    = "#FFFFFF";
const SURFACE = "#F9FAFB";
const BORDER  = "#E5E7EB";
const BORDER2 = "#D1D5DB";
const TEXT    = "#111827";
const DIM     = "#6B7280";
const LABEL   = "#9CA3AF";
const GOLD    = "#B45309";
const BLUE    = "#1D4ED8";

const PERIODES = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026", "H1 2026", "H2 2026", "2026", "2027"];

export default function FocusPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [saved, setSaved] = useState(false);

  const [declaracio, setDeclaracio] = useState("");
  const [periode, setPeriode] = useState("");
  const [prioritatsRaw, setPrioritatsRaw] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getBruixolaDashboard().then(({ focus: f }) => {
      setFocus(f);
      if (f) {
        setDeclaracio(f.declaracio ?? "");
        setPeriode(f.periode ?? "");
        setPrioritatsRaw((f.prioritats ?? []).join("\n"));
        setNotes(f.notes ?? "");
      }
      setLoading(false);
    });
  }, []);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("declaracio", declaracio);
    fd.set("periode", periode);
    fd.set("prioritats", prioritatsRaw);
    fd.set("notes", notes);
    startTransition(async () => {
      await saveFocus(fd);
      setSaved(true);
      setTimeout(() => { setSaved(false); router.push("/dashboard/bruixola"); }, 1500);
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-[12px]" style={{ color: LABEL }}>Carregant…</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-10 space-y-6">

      <div className="flex items-center gap-4">
        <Link href="/dashboard/bruixola"
          className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70"
          style={{ color: LABEL }}>
          ← Brúixola
        </Link>
      </div>

      <div>
        <h1 className="text-[24px] font-black" style={{ color: TEXT }}>Focus Estratègic</h1>
        <p className="text-[11px] mt-1" style={{ color: DIM }}>
          Defineix la declaració de focus i les prioritats del període actual.
        </p>
      </div>

      {focus && (
        <div className="rounded-xl p-4" style={{ backgroundColor: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: GOLD }}>Focus actual</p>
          <p className="text-[12px] font-semibold" style={{ color: TEXT }}>{focus.declaracio}</p>
          {focus.periode && <p className="text-[10px] mt-0.5" style={{ color: DIM }}>{focus.periode}</p>}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Declaració de Focus</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>Frase de focus</p>
              <textarea
                value={declaracio} onChange={e => setDeclaracio(e.target.value)} rows={3}
                placeholder="Ex: Consolidar la xarxa de delegats i arribar als 20M€ de vendes…"
                className="w-full outline-none resize-none text-[13px] leading-relaxed rounded-lg px-3 py-2"
                style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
                onFocus={e => (e.target.style.borderColor = GOLD)}
                onBlur={e => (e.target.style.borderColor = BORDER2)}
              />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>Període</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {PERIODES.map(p => (
                  <button key={p} type="button" onClick={() => setPeriode(p)}
                    className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      border: `1px solid ${periode === p ? GOLD : BORDER}`,
                      backgroundColor: periode === p ? `${GOLD}18` : SURFACE,
                      color: periode === p ? GOLD : LABEL,
                    }}>
                    {p}
                  </button>
                ))}
              </div>
              <input
                value={periode} onChange={e => setPeriode(e.target.value)}
                placeholder="O escriu un període personalitzat…"
                className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
                style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
                onFocus={e => (e.target.style.borderColor = GOLD)}
                onBlur={e => (e.target.style.borderColor = BORDER2)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BLUE }}>Prioritats del Període</p>
          </div>
          <div className="p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>
              Una prioritat per línia (màx. 5)
            </p>
            <textarea
              value={prioritatsRaw} onChange={e => setPrioritatsRaw(e.target.value)} rows={5}
              placeholder={"1. Tancar 10 nous delegats\n2. Llançar la plataforma digital\n3. Reduir el temps de resposta a clients"}
              className="w-full outline-none resize-none text-[12px] leading-relaxed rounded-lg px-3 py-2 font-mono"
              style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
              onFocus={e => (e.target.style.borderColor = BLUE)}
              onBlur={e => (e.target.style.borderColor = BORDER2)}
            />
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-4 py-3" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: LABEL }}>Notes</p>
          </div>
          <div className="p-5">
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Context addicional, restriccions, decisions preses…"
              className="w-full outline-none resize-none text-[12px] leading-relaxed rounded-lg px-3 py-2"
              style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
              onFocus={e => (e.target.style.borderColor = LABEL)}
              onBlur={e => (e.target.style.borderColor = BORDER2)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] font-semibold transition-opacity" style={{ color: "#15803D", opacity: saved ? 1 : 0 }}>
            ✓ Focus guardat
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard/bruixola"
              className="px-5 py-2.5 rounded-xl text-[11px] font-semibold"
              style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER2}` }}>
              Cancel·lar
            </Link>
            <button type="submit" disabled={!declaracio.trim() || isPending}
              className="px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40 hover:opacity-80"
              style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
              {isPending ? "Guardant…" : focus ? "Actualitzar focus" : "Definir focus"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
