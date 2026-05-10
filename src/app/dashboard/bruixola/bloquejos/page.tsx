"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { getBloquejos, saveBloqueig, resoldreBloquejo } from "@/app/actions/bruixola";
import type { Bloquejo } from "@/app/actions/bruixola";

const CARD    = "#FFFFFF";
const SURFACE = "#F9FAFB";
const BORDER  = "#E5E7EB";
const BORDER2 = "#D1D5DB";
const TEXT    = "#111827";
const DIM     = "#6B7280";
const LABEL   = "#9CA3AF";
const GOLD    = "#B45309";
const GREEN   = "#15803D";
const RED     = "#DC2626";
const AMBER   = "#D97706";

const SEV_COLOR = (s: number) => s >= 4 ? RED : s >= 3 ? AMBER : DIM;
const TIPUS_OPTS = ["tècnic", "humà", "extern", "decisió", "recursos", "prioritat", "altre"];

function BloquejoCard({ b, onResolve }: { b: Bloquejo; onResolve: () => void }) {
  const [isResolving, startResolving] = useTransition();
  const c = SEV_COLOR(b.severitat);

  function handleResolve() {
    if (!confirm(`Marcar "${b.titol}" com a resolt?`)) return;
    startResolving(async () => {
      await resoldreBloquejo(b.id);
      onResolve();
    });
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${b.severitat >= 4 ? `${RED}40` : BORDER}` }}>
      <div className="flex items-start gap-3">
        <div className="w-1 rounded-full mt-1 shrink-0" style={{ height: `${b.severitat * 8}px`, backgroundColor: c }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-[13px] font-semibold flex-1 min-w-0" style={{ color: TEXT }}>{b.titol}</p>
            {b.tipus && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
                style={{ backgroundColor: `${LABEL}15`, color: LABEL }}>
                {b.tipus}
              </span>
            )}
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
              style={{ backgroundColor: `${c}15`, color: c, border: `1px solid ${c}25` }}>
              Sev. {b.severitat}/5
            </span>
          </div>
          {b.descripcio && (
            <p className="text-[10px] mt-1" style={{ color: DIM }}>{b.descripcio}</p>
          )}
          {b.accio_necessaria && (
            <div className="mt-2 flex items-start gap-1.5">
              <span className="text-[9px] shrink-0 mt-0.5" style={{ color: GOLD }}>→</span>
              <p className="text-[10px]" style={{ color: DIM }}>Acció: {b.accio_necessaria}</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button onClick={handleResolve} disabled={isResolving}
          className="text-[10px] font-semibold hover:opacity-70 disabled:opacity-40"
          style={{ color: GREEN }}>
          {isResolving ? "Resolent…" : "✓ Marcar com resolt"}
        </button>
      </div>
    </div>
  );
}

function BloquejoForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [titol, setTitol] = useState("");
  const [descripcio, setDescripcio] = useState("");
  const [tipus, setTipus] = useState("");
  const [severitat, setSeveritat] = useState(3);
  const [accio, setAccio] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("titol", titol);
    fd.set("descripcio", descripcio);
    fd.set("tipus", tipus);
    fd.set("severitat", String(severitat));
    fd.set("accio_necessaria", accio);
    startTransition(async () => {
      await saveBloqueig(fd);
      onSave();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: RED }}>Nou bloqueig</p>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: LABEL }}>Títol *</p>
        <input value={titol} onChange={e => setTitol(e.target.value)} placeholder="Descripció breu del bloqueig…"
          className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}`, color: TEXT }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: LABEL }}>Tipus</p>
          <select value={tipus} onChange={e => setTipus(e.target.value)}
            className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}`, color: TEXT }}>
            <option value="">—</option>
            {TIPUS_OPTS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: LABEL }}>Severitat</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setSeveritat(n)}
                className="w-7 h-7 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  backgroundColor: severitat === n ? SEV_COLOR(n) : SURFACE,
                  border: `1px solid ${severitat === n ? SEV_COLOR(n) : BORDER2}`,
                  color: severitat === n ? "#FFFFFF" : DIM,
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: LABEL }}>Descripció</p>
        <textarea value={descripcio} onChange={e => setDescripcio(e.target.value)} rows={2}
          placeholder="Context del bloqueig…"
          className="w-full outline-none resize-none text-[11px] leading-relaxed rounded-lg px-3 py-2"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}`, color: TEXT }} />
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: LABEL }}>Acció necessària</p>
        <input value={accio} onChange={e => setAccio(e.target.value)} placeholder="Que cal fer per desbloquejar…"
          className="w-full outline-none text-[12px] rounded-lg px-3 py-2"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER2}`, color: TEXT }} />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[10px]" style={{ color: LABEL }}>
          Cancel·lar
        </button>
        <button type="submit" disabled={!titol.trim() || isPending}
          className="px-4 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
          style={{ backgroundColor: RED, color: "#FFFFFF" }}>
          {isPending ? "Guardant…" : "Crear bloqueig"}
        </button>
      </div>
    </form>
  );
}

export default function BloqueijosPage() {
  const [bloquejos, setBloquejos] = useState<Bloquejo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showResolt, setShowResolt] = useState(false);
  const [resolts, setResolts] = useState<Bloquejo[]>([]);

  async function reload() {
    const [actius, tots] = await Promise.all([
      getBloquejos(false),
      getBloquejos(true),
    ]);
    setBloquejos(actius);
    setResolts(tots.filter(b => b.resolt));
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-[12px]" style={{ color: LABEL }}>Carregant…</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-10 space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3">
            <Link href="/dashboard/bruixola"
              className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70"
              style={{ color: LABEL }}>
              ← Brúixola
            </Link>
          </div>
          <h1 className="text-[26px] font-black" style={{ color: TEXT }}>Bloquejos</h1>
          <p className="text-[11px] mt-1" style={{ color: DIM }}>
            {bloquejos.length} oberts · {resolts.length} resolts
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all hover:opacity-80"
          style={{ backgroundColor: RED, color: "#FFFFFF" }}>
          + Nou bloqueig
        </button>
      </div>

      {showForm && (
        <BloquejoForm
          onSave={() => { setShowForm(false); reload(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {bloquejos.length === 0 && !showForm && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap bloqueig actiu</p>
          <p className="text-[11px] mb-6" style={{ color: DIM }}>Bon senyal. Registra els bloquejos que impedeixen avançar.</p>
          <button onClick={() => setShowForm(true)}
            className="inline-block px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: RED, color: "#FFFFFF" }}>
            + Registrar bloqueig
          </button>
        </div>
      )}

      {bloquejos.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: RED }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: RED }}>
              Oberts ({bloquejos.length})
            </p>
          </div>
          <div className="space-y-2">
            {bloquejos.map(b => (
              <BloquejoCard key={b.id} b={b} onResolve={reload} />
            ))}
          </div>
        </div>
      )}

      {resolts.length > 0 && (
        <div>
          <button onClick={() => setShowResolt(v => !v)}
            className="flex items-center gap-3 mb-3 hover:opacity-70"
            style={{ background: "none", border: "none", padding: 0 }}>
            <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: LABEL }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: LABEL }}>
              Resolts ({resolts.length}) {showResolt ? "▲" : "▼"}
            </p>
          </button>
          {showResolt && (
            <div className="space-y-2">
              {resolts.map(b => (
                <div key={b.id} className="rounded-xl p-3 opacity-50"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]" style={{ color: GREEN }}>✓</span>
                    <p className="text-[11px] line-through" style={{ color: DIM }}>{b.titol}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
