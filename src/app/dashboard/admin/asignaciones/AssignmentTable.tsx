"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  setContactDelegateAction,
  setContactTypeAction,
  setContactRecommenderAction,
  setContactKolAction,
  setContactCoordinatorAction,
  setContactAffiliateAction,
  setContactGroupsAction,
  createContactGroupAction,
  deleteContactGroupAction,
  bulkAssignDelegateAction,
  bulkSetContactTypeAction,
  bulkSetKolAction,
  bulkSetCoordinatorAction,
  bulkSetAffiliateAction,
  checkMergeAction,
  mergeContactsAction,
  type MergeCheckResult,
} from "@/app/actions/assignments";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactRow {
  id: string;
  name: string;
  code: string | null;
  type: number | null;
  delegate_id: string | null;
  recommender_id: string | null;
  recommender_name: string | null;
  affiliate_id: string | null;
  affiliate_name: string | null;
  assigned_kol_id: string | null;
  assigned_kol_name: string | null;
  assigned_coordinator_id: string | null;
  assigned_coordinator_name: string | null;
  group_ids: string[];
}

export interface DelegateOption {
  id: string;
  full_name: string;
  delegate_name: string | null;
  role: string;
  kol_name: string | null;
  coordinator_name: string | null;
}

export interface ActorOption  { id: string; name: string; }
export interface AffiliateOption { id: string; name: string; }

export interface ContactGroupOption {
  id: string;
  name: string;
  color: string;
  holded_tag: string;
}

interface Props {
  contacts: ContactRow[];
  delegates: DelegateOption[];
  kolOptions: ActorOption[];
  coordinatorOptions: ActorOption[];
  affiliates: AffiliateOption[];
  groups: ContactGroupOption[];
  isOwner?: boolean;
}

// ─── Badge color ──────────────────────────────────────────────────────────────

const ACTOR_PALETTE = [
  "#1e3a5f","#0f4c75","#1b4332","#4a1942","#7b2d00",
  "#2d3561","#0f3460","#533483","#065f46","#7f1d1d",
];
function actorBg(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return ACTOR_PALETTE[h % ACTOR_PALETTE.length];
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_INFO: Record<number, { label: string; bg: string; text: string }> = {
  0: { label: "Lead",      bg: "#F3F4F6", text: "#374151" },
  1: { label: "Cliente",   bg: "#DCFCE7", text: "#166534" },
  2: { label: "Proveedor", bg: "#DBEAFE", text: "#1E40AF" },
  3: { label: "Acreedor",  bg: "#FEF9C3", text: "#854D0E" },
  4: { label: "Deudor",    bg: "#FEE2E2", text: "#991B1B" },
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="w-3 h-3 border border-[#8E0E1A] border-t-transparent rounded-full animate-spin shrink-0" />
);

// ─── BadgeSelectCell ──────────────────────────────────────────────────────────

function BadgeSelectCell({
  currentId,
  currentName,
  options,
  emptyLabel = "— Asignar",
  useColor = false,
  onSave,
}: {
  currentId: string | null;
  currentName: string | null;
  options: { id: string; name: string }[];
  emptyLabel?: string;
  useColor?: boolean;
  onSave: (id: string | null) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState({ id: currentId, name: currentName });
  const [isPending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPending) setLocal({ id: currentId, name: currentName });
  }, [currentId, currentName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function pick(id: string | null, name: string | null) {
    setLocal({ id, name });
    setOpen(false);
    start(async () => { await onSave(id); });
  }

  const bg = (useColor && local.name) ? actorBg(local.name) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        className="group disabled:opacity-50 text-left"
      >
        {isPending ? <Spinner /> : local.name ? (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
            style={bg ? { backgroundColor: bg, color: "#fff" } : { backgroundColor: "#F3F4F6", color: "#374151" }}
          >
            {local.name}
          </span>
        ) : (
          <span className="text-xs text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors">{emptyLabel}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-40 left-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1 max-h-64 overflow-y-auto">
          <button
            onClick={() => pick(null, null)}
            className="w-full text-left px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#F9FAFB] italic"
          >
            — Sin asignar —
          </button>
          {options.map(o => {
            const oBg = useColor ? actorBg(o.name) : null;
            const isActive = o.id === local.id;
            return (
              <button
                key={o.id}
                onClick={() => pick(o.id, o.name)}
                className={["w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors", isActive ? "bg-[#F9FAFB]" : "hover:bg-[#F9FAFB]"].join(" ")}
              >
                {oBg && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: oBg }} />}
                <span className={isActive ? "font-semibold text-[#0A0A0A]" : "text-[#374151]"}>{o.name}</span>
                {isActive && (
                  <svg className="ml-auto text-[#8E0E1A] shrink-0" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 5l2.5 2.5 3.5-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TypeBadgeCell ────────────────────────────────────────────────────────────

function TypeBadgeCell({ currentType, onSave }: { currentType: number | null; onSave: (t: number | null) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(currentType);
  const [isPending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!isPending) setLocal(currentType); }, [currentType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function pick(t: number | null) { setLocal(t); setOpen(false); start(async () => { await onSave(t); }); }

  const cfg = local !== null ? TYPE_INFO[local] : null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} disabled={isPending} className="group disabled:opacity-50">
        {isPending ? <Spinner /> : cfg ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: cfg.bg, color: cfg.text }}>{cfg.label}</span>
        ) : (
          <span className="text-xs text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors">— Tipo</span>
        )}
      </button>
      {open && (
        <div className="absolute z-40 left-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1">
          <button onClick={() => pick(null)} className="w-full text-left px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#F9FAFB] italic">— Sin tipo —</button>
          {Object.entries(TYPE_INFO).map(([v, c]) => (
            <button key={v} onClick={() => pick(Number(v))} className={["w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors", Number(v) === local ? "bg-[#F9FAFB]" : "hover:bg-[#F9FAFB]"].join(" ")}>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: c.bg, color: c.text }}>{c.label}</span>
              {Number(v) === local && <svg className="ml-auto text-[#8E0E1A]" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 5l2.5 2.5 3.5-4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RecommenderCell ──────────────────────────────────────────────────────────

function RecommenderCell({ contactId, currentRecommenderId, currentRecommenderName, contacts }: {
  contactId: string; currentRecommenderId: string | null; currentRecommenderName: string | null;
  contacts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, start] = useTransition();
  const [current, setCurrent] = useState({ id: currentRecommenderId, name: currentRecommenderName });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = useMemo(() => {
    const pool = contacts.filter(c => c.id !== contactId);
    if (!search) return pool.slice(0, 30);
    const q = search.toLowerCase();
    return pool.filter(c => c.name.toLowerCase().includes(q)).slice(0, 30);
  }, [contacts, search, contactId]);

  function select(id: string | null, name: string | null) {
    setCurrent({ id, name }); setOpen(false); setSearch("");
    start(async () => { await setContactRecommenderAction(contactId, id); });
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} disabled={saving} className="group disabled:opacity-50">
        {saving ? <Spinner /> : current.name ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#374151]">{current.name}</span>
        ) : (
          <span className="text-xs text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors">— Asignar</span>
        )}
      </button>
      {open && (
        <div className="absolute z-40 left-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-[#E5E7EB]">
          <div className="p-2 border-b border-[#F3F4F6]">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contacto…" className="w-full h-7 px-2 text-xs rounded-lg border border-[#E5E7EB] focus:outline-none focus:border-[#8E0E1A]" />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            <button onClick={() => select(null, null)} className="w-full text-left px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#F9FAFB] italic">— Sin recomendador —</button>
            {filtered.map(c => (
              <button key={c.id} onClick={() => select(c.id, c.name)} className={["w-full text-left px-3 py-2 text-xs transition-colors", c.id === current.id ? "bg-[#FEF2F2] text-[#8E0E1A] font-semibold" : "text-[#374151] hover:bg-[#F9FAFB]"].join(" ")}>{c.name}</button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-xs text-[#9CA3AF] text-center">Sin resultados</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GroupsCell ───────────────────────────────────────────────────────────────

function GroupsCell({ contactId, currentGroupIds, allGroups }: {
  contactId: string; currentGroupIds: string[]; allGroups: ContactGroupOption[];
}) {
  const [open, setOpen] = useState(false);
  const [activeIds, setActiveIds] = useState(() => new Set(currentGroupIds));
  const [saving, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function toggle(gid: string) {
    const next = new Set(activeIds);
    next.has(gid) ? next.delete(gid) : next.add(gid);
    setActiveIds(next);
    start(async () => { await setContactGroupsAction(contactId, Array.from(next)); });
  }

  const active = allGroups.filter(g => activeIds.has(g.id));

  return (
    <div className="relative flex items-center gap-1 flex-wrap min-h-[20px]" ref={ref}>
      {active.map(g => (
        <span key={g.id} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap" style={{ backgroundColor: `${g.color}20`, color: g.color }}>
          {g.name}
        </span>
      ))}
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className="h-4 w-4 rounded-full border border-dashed border-[#D1D5DB] flex items-center justify-center text-[#D1D5DB] hover:border-[#8E0E1A] hover:text-[#8E0E1A] transition-colors disabled:opacity-40 shrink-0"
      >
        {saving
          ? <div className="w-2 h-2 border border-[#8E0E1A] border-t-transparent rounded-full animate-spin" />
          : <svg width="6" height="6" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 0.5v5M0.5 3h5"/></svg>}
      </button>
      {open && (
        <div className="absolute z-40 left-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1">
          {allGroups.length === 0
            ? <p className="px-3 py-3 text-xs text-[#9CA3AF] text-center">Sin categorías</p>
            : allGroups.map(g => (
              <label key={g.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#F9FAFB]">
                <input type="checkbox" checked={activeIds.has(g.id)} onChange={() => toggle(g.id)} className="h-3.5 w-3.5 rounded accent-[#8E0E1A]" />
                <span className="text-xs text-[#374151] flex-1">{g.name}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
              </label>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Group management modal ───────────────────────────────────────────────────

const GROUP_COLORS = ["#6B7280","#8E0E1A","#059669","#2563EB","#D97706","#7C3AED","#DB2777","#0891B2"];

function GroupManagementModal({ initialGroups, onClose }: { initialGroups: ContactGroupOption[]; onClose: () => void }) {
  const [groups, setGroups] = useState(initialGroups);
  const [name, setName] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [creating, startCreate] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const holdedTag = trimmed.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    startCreate(async () => {
      const res = await createContactGroupAction(trimmed, color, holdedTag);
      if (res.error) { setError(res.error); return; }
      setGroups(prev => [...prev, { id: res.group!.id, name: trimmed, color, holded_tag: holdedTag }]);
      setName(""); setError("");
    });
  }

  function handleDelete(gid: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    startDelete(async () => {
      const res = await deleteContactGroupAction(gid);
      if (res.error) { setError(res.error); return; }
      setGroups(prev => prev.filter(g => g.id !== gid));
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Gestionar categorías</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Nueva categoría</p>
            <div className="flex gap-2">
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} placeholder="Nombre…" className="flex-1 h-9 px-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#8E0E1A]" />
              <button onClick={handleCreate} disabled={!name.trim() || creating} className="h-9 px-4 rounded-xl bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60">{creating ? "…" : "Crear"}</button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {GROUP_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={["w-6 h-6 rounded-full transition-all", color === c ? "ring-2 ring-offset-1 scale-110" : "hover:scale-105"].join(" ")} style={{ backgroundColor: c }} />)}
            </div>
            {error && <p className="text-xs text-[#8E0E1A]">{error}</p>}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Existentes ({groups.length})</p>
            {groups.length === 0 ? <p className="text-xs text-[#9CA3AF]">Sin categorías todavía.</p> : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {groups.map(g => (
                  <div key={g.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F9FAFB]">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="text-sm text-[#0A0A0A] flex-1 font-medium">{g.name}</span>
                    <span className="text-[10px] font-mono text-[#9CA3AF]">{g.holded_tag}</span>
                    <button onClick={() => handleDelete(g.id)} disabled={deleting} className="p-1 text-[#D1D5DB] hover:text-[#8E0E1A]">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M5 3V2h2v1M4 3v6.5a.5.5 0 00.5.5h3a.5.5 0 00.5-.5V3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Merge modal ──────────────────────────────────────────────────────────────

function MergeModal({ contacts, onClose }: { contacts: ContactRow[]; onClose: () => void }) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [check, setCheck] = useState<MergeCheckResult | null>(null);
  const [checking, startCheck] = useTransition();
  const [merging, startMerge] = useTransition();
  const [done, setDone] = useState(false);

  const inputCls = "w-full h-9 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Fusionar contactos</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-sm font-semibold">Fusión completada</p>
              <button onClick={onClose} className="h-9 px-5 rounded-xl bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14]">Cerrar</button>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
                <strong>Importante:</strong> Si el origen tiene facturas o pedidos en Holded, la fusión quedará bloqueada.
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Origen <span className="text-[#8E0E1A]">*</span></label>
                  <select value={sourceId} onChange={e => { setSourceId(e.target.value); setCheck(null); }} className={inputCls + " cursor-pointer"}>
                    <option value="">— Selecciona el origen —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ""}</option>)}
                  </select>
                </div>
                <div className="flex justify-center"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path d="M8 3v10M5 10l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Destino (master) <span className="text-emerald-600">*</span></label>
                  <select value={targetId} onChange={e => { setTargetId(e.target.value); setCheck(null); }} className={inputCls + " cursor-pointer"}>
                    <option value="">— Selecciona el destino —</option>
                    {contacts.filter(c => c.id !== sourceId).map(c => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ""}</option>)}
                  </select>
                </div>
              </div>
              {check && (
                <div className={["rounded-xl px-3 py-3", check.canMerge ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"].join(" ")}>
                  {check.canMerge
                    ? <p className="text-xs font-semibold text-emerald-700">✓ {check.sourceName} → {check.targetName}</p>
                    : check.blockers.map((b, i) => <p key={i} className="text-xs text-[#8E0E1A]">• {b}</p>)}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="h-9 px-4 rounded-xl text-sm text-[#6B7280] hover:bg-[#F3F4F6]">Cancelar</button>
                {!check
                  ? <button onClick={() => { if (sourceId && targetId) startCheck(async () => setCheck(await checkMergeAction(sourceId, targetId))); }} disabled={!sourceId || !targetId || checking} className="h-9 px-5 rounded-xl bg-[#374151] text-sm font-semibold text-white hover:bg-[#0A0A0A] disabled:opacity-60">{checking ? "Verificando…" : "Verificar"}</button>
                  : <button onClick={() => { if (check.canMerge) startMerge(async () => { const r = await mergeContactsAction(sourceId, targetId); if (!r.error) setDone(true); else setCheck(p => p ? { ...p, canMerge: false, blockers: [r.error!] } : null); }); }} disabled={!check.canMerge || merging} className="h-9 px-5 rounded-xl bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60">{merging ? "Fusionando…" : "Confirmar fusión"}</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sort header ──────────────────────────────────────────────────────────────

type SortCol = "name" | "type" | "delegate" | "kol" | "coordinator" | "recommender" | "affiliate";

function SortTh({ label, col, current, dir, onSort, className }: {
  label: string; col: SortCol; current: SortCol | ""; dir: "asc" | "desc";
  onSort: (col: SortCol) => void; className?: string;
}) {
  const active = current === col;
  return (
    <th onClick={() => onSort(col)} className={["px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors", active ? "text-[#8E0E1A]" : "text-[#9CA3AF] hover:text-[#6B7280]", className ?? ""].join(" ")}>
      <span className="flex items-center gap-1">
        {label}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" className={active ? "opacity-100" : "opacity-30"}>
          {active && dir === "asc" ? <path d="M1.5 5.5l2.5-3 2.5 3" strokeLinecap="round" strokeLinejoin="round"/>
          : active && dir === "desc" ? <path d="M1.5 2.5l2.5 3 2.5-3" strokeLinecap="round" strokeLinejoin="round"/>
          : <><path d="M1.5 3l2.5-2 2.5 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.5 5l2.5 2 2.5-2" strokeLinecap="round" strokeLinejoin="round"/></>}
        </svg>
      </span>
    </th>
  );
}

// ─── Bulk defaults ────────────────────────────────────────────────────────────

type BulkValues = { delegate: string; type: string; kol: string; coordinator: string; affiliate: string };
const BULK_DEFAULT: BulkValues = { delegate: "", type: "", kol: "", coordinator: "", affiliate: "" };

const selectCls = "h-8 w-full rounded-lg border border-[#E5E7EB] bg-white px-2 text-xs text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]/10 transition-colors";

// ─── Main table ───────────────────────────────────────────────────────────────

export function AssignmentTable({ contacts, delegates, kolOptions, coordinatorOptions, affiliates, groups, isOwner = false }: Props) {
  const [rows, setRows] = useState<ContactRow[]>(contacts);
  useEffect(() => setRows(contacts), [contacts]);

  const [search, setSearch]             = useState("");
  const [filterType, setFilterType]     = useState("");
  const [filterDelegate, setFilterDelegate] = useState("");
  const [filterGroup, setFilterGroup]   = useState("");
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [bulkValues, setBulkValues]     = useState<BulkValues>(BULK_DEFAULT);
  const [bulkPending, startBulk]        = useTransition();
  const [bulkMsg, setBulkMsg]           = useState("");
  const [showMerge, setShowMerge]       = useState(false);
  const [showGroups, setShowGroups]     = useState(false);
  const [sortCol, setSortCol]           = useState<SortCol | "">("");
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("asc");
  const [page, setPage]                 = useState(0);
  const PAGE_SIZE = 50;

  function handleSort(col: SortCol) {
    if (sortCol === col) { if (sortDir === "asc") setSortDir("desc"); else { setSortCol(""); setSortDir("asc"); } }
    else { setSortCol(col); setSortDir("asc"); }
    setPage(0);
  }

  const delegateMap = useMemo(() => {
    const m: Record<string, DelegateOption> = {};
    for (const d of delegates) m[d.id] = d;
    return m;
  }, [delegates]);

  // Pill counts
  const counts = useMemo(() => ({
    total:       rows.length,
    cliente:     rows.filter(r => r.type === 1).length,
    sinTipo:     rows.filter(r => r.type === null).length,
    sinDelegado: rows.filter(r => !r.delegate_id).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.code ?? "").toLowerCase().includes(q)) return false;
      if (filterType !== "") {
        if (filterType === "__none__" && c.type !== null) return false;
        if (filterType !== "__none__" && c.type !== Number(filterType)) return false;
      }
      if (filterDelegate === "__none__" && c.delegate_id) return false;
      if (filterDelegate && filterDelegate !== "__none__" && c.delegate_id !== filterDelegate) return false;
      if (filterGroup && !c.group_ids.includes(filterGroup)) return false;
      return true;
    });
  }, [rows, search, filterType, filterDelegate, filterGroup]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let av = "", bv = "";
      if (sortCol === "name")        { av = a.name; bv = b.name; }
      else if (sortCol === "type")   { av = a.type !== null ? String(a.type) : "9"; bv = b.type !== null ? String(b.type) : "9"; }
      else if (sortCol === "delegate") {
        av = a.delegate_id ? (delegateMap[a.delegate_id]?.delegate_name ?? delegateMap[a.delegate_id]?.full_name ?? "") : "";
        bv = b.delegate_id ? (delegateMap[b.delegate_id]?.delegate_name ?? delegateMap[b.delegate_id]?.full_name ?? "") : "";
      }
      else if (sortCol === "kol")         { av = a.assigned_kol_name ?? "";         bv = b.assigned_kol_name ?? ""; }
      else if (sortCol === "coordinator") { av = a.assigned_coordinator_name ?? ""; bv = b.assigned_coordinator_name ?? ""; }
      else if (sortCol === "recommender") { av = a.recommender_name ?? "";           bv = b.recommender_name ?? ""; }
      else if (sortCol === "affiliate")   { av = a.affiliate_name ?? "";             bv = b.affiliate_name ?? ""; }
      const cmp = av.localeCompare(bv, "es", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, delegateMap]);

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleRow(id: string) { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() { setSelected(selected.size === paginated.length && paginated.length > 0 ? new Set() : new Set(paginated.map(c => c.id))); }

  const hasBulkChange = Object.values(bulkValues).some(v => v !== "");

  async function handleBulkApply() {
    const ids = Array.from(selected);
    if (!ids.length || !hasBulkChange) return;
    const idSet = new Set(ids);
    const applied = { ...bulkValues };

    startBulk(async () => {
      const errors: string[] = [];
      if (applied.delegate !== "") { const r = await bulkAssignDelegateAction(ids, applied.delegate === "__null__" ? null : applied.delegate); if (r.error) errors.push(r.error); }
      if (applied.type !== "")     { const r = await bulkSetContactTypeAction(ids, applied.type === "__null__" ? null : Number(applied.type)); if (r.error) errors.push(r.error); }
      if (applied.kol !== "")      { const r = await bulkSetKolAction(ids, applied.kol === "__null__" ? null : applied.kol); if (r.error) errors.push(r.error); }
      if (applied.coordinator !== "") { const r = await bulkSetCoordinatorAction(ids, applied.coordinator === "__null__" ? null : applied.coordinator); if (r.error) errors.push(r.error); }
      if (applied.affiliate !== "") { const r = await bulkSetAffiliateAction(ids, applied.affiliate === "__null__" ? null : applied.affiliate); if (r.error) errors.push(r.error); }

      if (errors.length > 0) { setBulkMsg(`Error: ${errors[0]}`); return; }

      setRows(prev => prev.map(r => {
        if (!idSet.has(r.id)) return r;
        const next = { ...r };
        if (applied.delegate !== "") next.delegate_id = applied.delegate === "__null__" ? null : applied.delegate;
        if (applied.type !== "") next.type = applied.type === "__null__" ? null : Number(applied.type);
        if (applied.kol !== "") { const v = applied.kol === "__null__" ? null : applied.kol; next.assigned_kol_id = v; next.assigned_kol_name = v ? (kolOptions.find(o => o.id === v)?.name ?? null) : null; }
        if (applied.coordinator !== "") { const v = applied.coordinator === "__null__" ? null : applied.coordinator; next.assigned_coordinator_id = v; next.assigned_coordinator_name = v ? (coordinatorOptions.find(o => o.id === v)?.name ?? null) : null; }
        if (applied.affiliate !== "") { const v = applied.affiliate === "__null__" ? null : applied.affiliate; next.affiliate_id = v; next.affiliate_name = v ? (affiliates.find(o => o.id === v)?.name ?? null) : null; }
        return next;
      }));

      setBulkMsg(`${ids.length} cliente${ids.length !== 1 ? "s" : ""} actualizados`);
      setSelected(new Set());
      setBulkValues(BULK_DEFAULT);
      setTimeout(() => setBulkMsg(""), 3000);
    });
  }

  const contactList = useMemo(() => rows.map(c => ({ id: c.id, name: c.name })), [rows]);

  // ── Pill helpers ─────────────────────────────────────────────────────────────
  const typeActive = (val: string) => filterType === val && filterDelegate !== "__none__";
  const sinDelegadoActive = filterDelegate === "__none__";

  function setTypePill(val: string) { setFilterType(val); if (val !== "") setFilterDelegate(""); setPage(0); }
  function toggleSinDelegado() { setFilterDelegate(v => v === "__none__" ? "" : "__none__"); setPage(0); }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5.5" cy="5.5" r="3.5"/><path d="M9 9l2.5 2.5" strokeLinecap="round"/></svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Nombre, NIF o ciudad…"
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#E5E7EB] text-sm placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors bg-white"
          />
        </div>
        <span className="text-xs text-[#9CA3AF] font-medium shrink-0 tabular-nums">{sorted.length} / {rows.length}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowGroups(true)} className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="4.5" cy="4.5" r="2.5"/><path d="M8.5 1.5h3M8.5 4.5h3M8.5 7.5l2.5 2.5" strokeLinecap="round"/></svg>
            Categorías
          </button>
          {isOwner && (
            <button onClick={() => setShowMerge(true)} className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 2v3.5l3.5 1-3.5 1V11M10.5 2v3.5l-3.5 1 3.5 1V11" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Merge
            </button>
          )}
        </div>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Tipología</span>
          {[
            { label: "Todos",                           val: "" },
            { label: `Cliente (${counts.cliente})`,     val: "1" },
            { label: `Sin tipo (${counts.sinTipo})`,    val: "__none__" },
          ].map(p => (
            <button
              key={p.val}
              onClick={() => setTypePill(p.val)}
              className={["px-3 h-7 rounded-full text-xs font-medium transition-colors", filterType === p.val && !sinDelegadoActive ? "bg-[#0A0A0A] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"].join(" ")}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={toggleSinDelegado}
            className={["px-3 h-7 rounded-full text-xs font-medium transition-colors", sinDelegadoActive ? "bg-[#8E0E1A] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"].join(" ")}
          >
            Sin delegado ({counts.sinDelegado})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Actor</span>
          <select
            value={filterDelegate === "__none__" ? "" : filterDelegate}
            onChange={e => { setFilterDelegate(e.target.value); setPage(0); }}
            className="h-7 rounded-full border border-[#E5E7EB] bg-white px-3 text-xs focus:border-[#8E0E1A] focus:outline-none transition-colors"
          >
            <option value="">Filtrar por actor</option>
            {delegates.map(d => <option key={d.id} value={d.id}>{d.delegate_name ?? d.full_name}</option>)}
          </select>
        </div>

        {groups.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Categoría</span>
            <select value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setPage(0); }} className="h-7 rounded-full border border-[#E5E7EB] bg-white px-3 text-xs focus:border-[#8E0E1A] focus:outline-none transition-colors">
              <option value="">Todas</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Bulk bar ─────────────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="bg-[#FEF2F2] border border-[#8E0E1A]/20 rounded-2xl px-4 py-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold text-[#8E0E1A]">{selected.size} seleccionado{selected.size !== 1 ? "s" : ""} · configura los campos y aplica</span>
            {bulkMsg && <span className="text-xs font-semibold text-emerald-600">{bulkMsg}</span>}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {[
              { key: "delegate" as const, label: "Delegado", opts: delegates.map(d => ({ value: d.id, label: d.delegate_name ?? d.full_name })) },
              { key: "type" as const,     label: "Tipo",      opts: Object.entries(TYPE_INFO).map(([v, c]) => ({ value: v, label: c.label })) },
              { key: "kol" as const,      label: "KOL",       opts: kolOptions.map(o => ({ value: o.id, label: o.name })) },
              { key: "coordinator" as const, label: "Coordinador", opts: coordinatorOptions.map(o => ({ value: o.id, label: o.name })) },
              { key: "affiliate" as const,   label: "Afiliado",    opts: affiliates.map(a => ({ value: a.id, label: a.name })) },
            ].map(({ key, label, opts }) => (
              <div key={key} className="space-y-1">
                <label className="block text-[10px] font-semibold text-[#374151] uppercase tracking-wider">{label}</label>
                <select
                  value={bulkValues[key]}
                  onChange={e => setBulkValues(v => ({ ...v, [key]: e.target.value }))}
                  className={[selectCls, bulkValues[key] ? "border-[#8E0E1A]" : ""].join(" ")}
                >
                  <option value="">— No cambiar —</option>
                  <option value="__null__">— Sin asignar —</option>
                  {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setSelected(new Set()); setBulkValues(BULK_DEFAULT); }} className="h-8 px-3 rounded-lg text-xs font-medium text-[#6B7280] hover:bg-white/60">Cancelar</button>
            <button onClick={handleBulkApply} disabled={bulkPending || !hasBulkChange} className="h-8 px-4 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors">
              {bulkPending ? "Guardando…" : `Aplicar a ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#F3F4F6] bg-white">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-[#D1D5DB] accent-[#8E0E1A]" />
                </th>
                <SortTh label="Cliente"      col="name"        current={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="Tipología"    col="type"        current={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="Delegado(s)"  col="delegate"    current={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="KOL"          col="kol"         current={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="Coordinador"  col="coordinator" current={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="Recomendador" col="recommender" current={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="Afiliado"     col="affiliate"   current={sortCol} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Categorías</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {paginated.map(c => {
                const isSelected = selected.has(c.id);
                const delegateName = c.delegate_id ? (delegateMap[c.delegate_id]?.delegate_name ?? delegateMap[c.delegate_id]?.full_name ?? null) : null;
                return (
                  <tr key={c.id} className={["transition-colors", isSelected ? "bg-[#FFF5F5]" : "hover:bg-[#FAFAFA]"].join(" ")}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(c.id)} className="h-3.5 w-3.5 rounded border-[#D1D5DB] accent-[#8E0E1A]" />
                    </td>

                    {/* Cliente + NIF */}
                    <td className="px-4 py-3 min-w-[160px]">
                      <Link href={`/dashboard/clientes/${c.id}`} className="font-semibold text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors text-sm leading-tight block">
                        {c.name}
                      </Link>
                      {c.code && <span className="text-[10px] text-[#9CA3AF] font-mono leading-tight">{c.code}</span>}
                    </td>

                    {/* Tipología */}
                    <td className="px-4 py-3 w-28">
                      <TypeBadgeCell currentType={c.type} onSave={v => setContactTypeAction(c.id, v)} />
                    </td>

                    {/* Delegado */}
                    <td className="px-4 py-3 w-36">
                      <BadgeSelectCell
                        currentId={c.delegate_id}
                        currentName={delegateName}
                        options={delegates.map(d => ({ id: d.id, name: d.delegate_name ?? d.full_name }))}
                        useColor
                        onSave={v => setContactDelegateAction(c.id, v)}
                      />
                    </td>

                    {/* KOL */}
                    <td className="px-4 py-3 w-32">
                      <BadgeSelectCell
                        currentId={c.assigned_kol_id}
                        currentName={c.assigned_kol_name}
                        options={kolOptions}
                        useColor
                        onSave={v => setContactKolAction(c.id, v)}
                      />
                    </td>

                    {/* Coordinador */}
                    <td className="px-4 py-3 w-32">
                      <BadgeSelectCell
                        currentId={c.assigned_coordinator_id}
                        currentName={c.assigned_coordinator_name}
                        options={coordinatorOptions}
                        useColor
                        onSave={v => setContactCoordinatorAction(c.id, v)}
                      />
                    </td>

                    {/* Recomendador */}
                    <td className="px-4 py-3 w-36">
                      <RecommenderCell
                        contactId={c.id}
                        currentRecommenderId={c.recommender_id}
                        currentRecommenderName={c.recommender_name}
                        contacts={contactList}
                      />
                    </td>

                    {/* Afiliado */}
                    <td className="px-4 py-3 w-32">
                      <BadgeSelectCell
                        currentId={c.affiliate_id}
                        currentName={c.affiliate_name}
                        options={affiliates}
                        onSave={v => setContactAffiliateAction(c.id, v)}
                      />
                    </td>

                    {/* Categorías */}
                    <td className="px-4 py-3">
                      <GroupsCell contactId={c.id} currentGroupIds={c.group_ids} allGroups={groups} />
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-16 text-center text-sm text-[#9CA3AF]">Sin resultados para el filtro actual.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination – outside the scroll area, pinned to bottom */}
        {pageCount > 1 && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-[#F9FAFB]">
            <span className="text-xs text-[#9CA3AF]">Pág. {page + 1} / {pageCount} · {sorted.length} clientes</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7.5 3L4.5 6l3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
                const p = pageCount <= 7 ? i : Math.max(0, Math.min(page - 3, pageCount - 7)) + i;
                return <button key={p} onClick={() => setPage(p)} className={["h-7 min-w-[28px] px-1 rounded-lg text-xs font-medium transition-colors", p === page ? "bg-[#8E0E1A] text-white" : "text-[#374151] hover:bg-[#F3F4F6]"].join(" ")}>{p + 1}</button>;
              })}
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page === pageCount - 1} className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-30">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 3L7.5 6l-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {isOwner && showMerge  && <MergeModal contacts={rows} onClose={() => setShowMerge(false)} />}
      {showGroups && <GroupManagementModal initialGroups={groups} onClose={() => setShowGroups(false)} />}
    </div>
  );
}
