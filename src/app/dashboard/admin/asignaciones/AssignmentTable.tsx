"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import {
  setContactDelegateAction,
  bulkAssignDelegateAction,
  bulkSetPaymentMethodAction,
  checkMergeAction,
  mergeContactsAction,
  type MergeCheckResult,
} from "@/app/actions/assignments";

export interface ContactRow {
  id: string;
  name: string;
  code: string | null;
  delegate_id: string | null;
  payment_method: string | null;
}

export interface DelegateOption {
  id: string;
  full_name: string;
  delegate_name: string | null;
  kol_id: string | null;
  kol_name: string | null;
  coordinator_id: string | null;
  coordinator_name: string | null;
}

interface Props {
  contacts: ContactRow[];
  delegates: DelegateOption[];
}

const selectCls =
  "h-8 w-full rounded-lg border border-[#E5E7EB] bg-white px-2 text-xs text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]/10 transition-colors disabled:opacity-50";

const PAYMENT_LABELS: Record<string, string> = {
  transfer:     "Transferencia",
  direct_debit: "Domiciliación",
  check:        "Cheque",
  cash:         "Efectivo",
  other:        "Otro",
};

// ─── Merge modal ──────────────────────────────────────────────────────────────

function MergeModal({
  contacts,
  onClose,
}: {
  contacts: ContactRow[];
  onClose: () => void;
}) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [check, setCheck] = useState<MergeCheckResult | null>(null);
  const [checking, startCheck] = useTransition();
  const [merging, startMerge] = useTransition();
  const [done, setDone] = useState(false);

  function handleCheck() {
    if (!sourceId || !targetId) return;
    startCheck(async () => {
      const result = await checkMergeAction(sourceId, targetId);
      setCheck(result);
    });
  }

  function handleMerge() {
    if (!check?.canMerge) return;
    startMerge(async () => {
      const res = await mergeContactsAction(sourceId, targetId);
      if (!res.error) {
        setDone(true);
      } else {
        setCheck(prev => prev ? { ...prev, canMerge: false, blockers: [res.error!] } : null);
      }
    });
  }

  const inputCls = "w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Fusionar contactos</h2>
          <button onClick={onClose} className="p-1 rounded text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#0A0A0A]">Fusión completada</p>
              <p className="text-xs text-[#6B7280]">
                Los datos del origen se han trasladado a {check?.targetName} y el origen ha sido marcado como fusionado.
              </p>
              <button onClick={onClose} className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors">
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800 leading-relaxed">
                <strong>Importante:</strong> Si el origen tiene facturas o pedidos en Holded, la fusión quedará bloqueada (conflicto de ID con Holded). Solo se fusionan datos locales: asignación de delegado, tareas vinculadas y datos de cobro.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">
                    Contacto <span className="text-[#8E0E1A]">origen</span> (se fusionará y quedará marcado)
                  </label>
                  <select value={sourceId} onChange={e => { setSourceId(e.target.value); setCheck(null); }} className={inputCls + " cursor-pointer"}>
                    <option value="">— Selecciona el origen —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ""}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" aria-hidden>
                    <path d="M10 4v12M6 12l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">
                    Contacto <span className="text-emerald-600">destino</span> (el que se conserva como master)
                  </label>
                  <select value={targetId} onChange={e => { setTargetId(e.target.value); setCheck(null); }} className={inputCls + " cursor-pointer"}>
                    <option value="">— Selecciona el destino —</option>
                    {contacts.filter(c => c.id !== sourceId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              {check && (
                <div className={[
                  "rounded-lg px-3 py-3 space-y-1.5",
                  check.canMerge
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200",
                ].join(" ")}>
                  {check.canMerge ? (
                    <p className="text-xs font-semibold text-emerald-700">
                      ✓ La fusión es posible. {check.sourceName} → {check.targetName}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-[#8E0E1A]">No se puede fusionar:</p>
                      {check.blockers.map((b, i) => (
                        <p key={i} className="text-xs text-[#8E0E1A]">• {b}</p>
                      ))}
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
                  Cancelar
                </button>
                {!check ? (
                  <button
                    onClick={handleCheck}
                    disabled={!sourceId || !targetId || checking}
                    className="h-9 px-5 rounded-lg bg-[#374151] text-sm font-semibold text-white hover:bg-[#0A0A0A] disabled:opacity-60 transition-colors"
                  >
                    {checking ? "Verificando…" : "Verificar fusión"}
                  </button>
                ) : (
                  <button
                    onClick={handleMerge}
                    disabled={!check.canMerge || merging}
                    className="h-9 px-5 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {merging ? "Fusionando…" : "Confirmar fusión"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delegate cell ────────────────────────────────────────────────────────────

function DelegateCell({
  contactId,
  currentDelegateId,
  delegates,
}: {
  contactId: string;
  currentDelegateId: string | null;
  delegates: DelegateOption[];
}) {
  const [value, setValue] = useState(currentDelegateId ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(newVal: string) {
    setValue(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        await setContactDelegateAction(contactId, newVal || null);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      });
    }, 600);
  }

  return (
    <div className="flex items-center gap-1.5">
      <select value={value} onChange={e => handleChange(e.target.value)} disabled={isPending} className={selectCls}>
        <option value="">— Sin asignar —</option>
        {delegates.map(d => (
          <option key={d.id} value={d.id}>{d.delegate_name ?? d.full_name}</option>
        ))}
      </select>
      {isPending && (
        <div className="w-3 h-3 border border-[#8E0E1A] border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {saved && !isPending && (
        <svg className="shrink-0 text-emerald-500" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function AssignmentTable({ contacts, delegates }: Props) {
  const [search, setSearch]               = useState("");
  const [filterDelegate, setFilterDelegate] = useState("");
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode]           = useState<"delegate" | "payment">("delegate");
  const [bulkDelegate, setBulkDelegate]   = useState("");
  const [bulkPayment, setBulkPayment]     = useState("");
  const [bulkPending, startBulkTransition] = useTransition();
  const [bulkMsg, setBulkMsg]             = useState("");
  const [showMerge, setShowMerge]         = useState(false);
  const [page, setPage]                   = useState(0);
  const PAGE_SIZE = 50;

  const delegateMap = useMemo(() => {
    const m: Record<string, DelegateOption> = {};
    for (const d of delegates) m[d.id] = d;
    return m;
  }, [delegates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.code ?? "").toLowerCase().includes(q)) return false;
      if (filterDelegate === "__none__" && c.delegate_id) return false;
      if (filterDelegate && filterDelegate !== "__none__" && c.delegate_id !== filterDelegate) return false;
      return true;
    });
  }, [contacts, search, filterDelegate]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleRow(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(c => c.id)));
  }

  function handleBulkApply() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    startBulkTransition(async () => {
      let res: { error?: string; updated: number };
      if (bulkMode === "delegate") {
        res = await bulkAssignDelegateAction(ids, bulkDelegate || null);
      } else {
        res = await bulkSetPaymentMethodAction(ids, bulkPayment);
      }
      if (res.error) {
        setBulkMsg(`Error: ${res.error}`);
      } else {
        setBulkMsg(`${res.updated} clientes actualizados`);
        setSelected(new Set());
        setTimeout(() => setBulkMsg(""), 3000);
      }
    });
  }

  const stats = useMemo(() => ({
    total: contacts.length,
    assigned: contacts.filter(c => c.delegate_id).length,
    unassigned: contacts.filter(c => !c.delegate_id).length,
  }), [contacts]);

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total clientes",  value: stats.total,      cls: "text-[#0A0A0A]" },
          { label: "Asignados",       value: stats.assigned,   cls: "text-emerald-600" },
          { label: "Sin asignar",     value: stats.unassigned, cls: "text-[#8E0E1A]" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + actions toolbar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="6" r="4"/><path d="M10 10l2.5 2.5" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar cliente o NIF…"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E5E7EB] text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
          />
        </div>
        <select
          value={filterDelegate}
          onChange={e => { setFilterDelegate(e.target.value); setPage(0); }}
          className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
        >
          <option value="">Todos los delegados</option>
          <option value="__none__">— Sin asignar</option>
          {delegates.map(d => (
            <option key={d.id} value={d.id}>{d.delegate_name ?? d.full_name}</option>
          ))}
        </select>
        <span className="text-xs text-[#9CA3AF] shrink-0">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => setShowMerge(true)}
          className="ml-auto h-9 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] hover:border-[#D1D5DB] transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M3 2v4l4 2-4 2v4M11 2v4l-4 2 4 2v4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Fusionar contactos
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-[#FEF2F2] border border-[#8E0E1A]/20 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-[#8E0E1A] shrink-0">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>

          {/* Mode tabs */}
          <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden bg-white shrink-0">
            {[
              { id: "delegate", label: "Delegado" },
              { id: "payment",  label: "Forma de pago" },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setBulkMode(m.id as "delegate" | "payment")}
                className={[
                  "px-3 h-8 text-xs font-medium transition-colors",
                  bulkMode === m.id ? "bg-[#8E0E1A] text-white" : "text-[#374151] hover:bg-[#F3F4F6]",
                ].join(" ")}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            {bulkMode === "delegate" ? (
              <select value={bulkDelegate} onChange={e => setBulkDelegate(e.target.value)} className="h-8 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-2 text-xs focus:border-[#8E0E1A] focus:outline-none transition-colors">
                <option value="">— Sin asignar —</option>
                {delegates.map(d => <option key={d.id} value={d.id}>{d.delegate_name ?? d.full_name}</option>)}
              </select>
            ) : (
              <select value={bulkPayment} onChange={e => setBulkPayment(e.target.value)} className="h-8 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-2 text-xs focus:border-[#8E0E1A] focus:outline-none transition-colors">
                <option value="">— Sin especificar —</option>
                <option value="transfer">Transferencia bancaria</option>
                <option value="direct_debit">Domiciliación bancaria</option>
                <option value="check">Cheque</option>
                <option value="cash">Efectivo</option>
                <option value="other">Otro</option>
              </select>
            )}
            <button
              onClick={handleBulkApply}
              disabled={bulkPending}
              className="h-8 px-3 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {bulkPending ? "Guardando…" : "Aplicar a todos"}
            </button>
          </div>
          {bulkMsg && <span className="text-xs font-medium text-emerald-600">{bulkMsg}</span>}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F3F4F6] bg-[#FAFAFA]">
                <th className="w-10 px-4 py-3 text-left">
                  <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} className="h-4 w-4 rounded border-[#D1D5DB] accent-[#8E0E1A]" />
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-28">NIF/CIF</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-44">Delegado</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-32">KOL</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-32">Coordinador</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-28">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {paginated.map(c => {
                const del = c.delegate_id ? delegateMap[c.delegate_id] : null;
                const isSelected = selected.has(c.id);
                return (
                  <tr key={c.id} className={["transition-colors", isSelected ? "bg-[#FEF9F9]" : "hover:bg-[#FAFAFA]"].join(" ")}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(c.id)} className="h-4 w-4 rounded border-[#D1D5DB] accent-[#8E0E1A]" />
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/dashboard/clientes/${c.id}`} className="font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#6B7280] font-mono">{c.code ?? "—"}</td>
                    <td className="px-4 py-2">
                      <DelegateCell contactId={c.id} currentDelegateId={c.delegate_id} delegates={delegates} />
                    </td>
                    <td className="px-4 py-2.5">
                      {del?.kol_name
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700">{del.kol_name}</span>
                        : <span className="text-xs text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {del?.coordinator_name
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">{del.coordinator_name}</span>
                        : <span className="text-xs text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.payment_method
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F3F4F6] text-[#6B7280]">{PAYMENT_LABELS[c.payment_method] ?? c.payment_method}</span>
                        : <span className="text-xs text-[#D1D5DB]">—</span>}
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#9CA3AF]">
                    No hay clientes que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F3F4F6]">
            <span className="text-xs text-[#9CA3AF]">Página {page + 1} de {pageCount} · {filtered.length} clientes</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="h-7 w-7 rounded flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-40 transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7.5 3L4.5 6l3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
                const p = pageCount <= 7 ? i : Math.max(0, Math.min(page - 3, pageCount - 7)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} className={["h-7 min-w-[28px] px-1 rounded text-xs font-medium transition-colors", p === page ? "bg-[#8E0E1A] text-white" : "text-[#374151] hover:bg-[#F3F4F6]"].join(" ")}>
                    {p + 1}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page === pageCount - 1} className="h-7 w-7 rounded flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-40 transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4.5 3L7.5 6l-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showMerge && <MergeModal contacts={contacts} onClose={() => setShowMerge(false)} />}
    </div>
  );
}
