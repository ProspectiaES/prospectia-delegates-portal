"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { saveClientAssignmentsForDelegate } from "@/app/actions/delegates";

interface Contact {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  city: string | null;
}

interface Props {
  delegateId: string;
  initialAssigned: Contact[];
}

export function ClientAssignmentPanel({ delegateId, initialAssigned }: Props) {
  const [assigned, setAssigned] = useState<Map<string, Contact>>(
    () => new Map(initialAssigned.map((c) => [c.id, c]))
  );
  const [search, setSearch] = useState("");
  const [allResults, setAllResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchContacts = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(q)}`);
      const data: Contact[] = await res.json();
      setAllResults(data);
    } finally {
      setSearching(false);
    }
  }, []);

  // Load full list on mount
  useEffect(() => { fetchContacts(""); }, [fetchContacts]);

  // Debounced re-fetch on search change
  useEffect(() => {
    const timer = setTimeout(() => fetchContacts(search), 250);
    return () => clearTimeout(timer);
  }, [search, fetchContacts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current   && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const visibleResults = allResults.filter((c) => !assigned.has(c.id));

  const add = (c: Contact) => {
    setAssigned((prev) => new Map(prev).set(c.id, c));
    setSearch("");
    setShowDropdown(false);
    setStatus(null);
  };

  const remove = (id: string) => {
    setAssigned((prev) => { const n = new Map(prev); n.delete(id); return n; });
    setStatus(null);
  };

  const save = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("delegate_id", delegateId);
      for (const id of assigned.keys()) fd.append("contact_ids", id);
      const result = await saveClientAssignmentsForDelegate(null, fd);
      setStatus(result);
    });
  };

  const assignedList = Array.from(assigned.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <div className="px-5 py-4 space-y-3">

      {status?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#8E0E1A]">
          {status.error}
        </div>
      )}
      {status?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          Asignaciones guardadas.
        </div>
      )}

      {/* Search + dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); setStatus(null); }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Buscar cliente por nombre, código o email…"
          className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 pr-8 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF]">…</span>
        )}

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {visibleResults.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[#9CA3AF]">
                {searching ? "Buscando…" : search.length >= 2 ? `Sin resultados para «${search}»` : "Sin más clientes disponibles"}
              </p>
            ) : (
              visibleResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(c)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-[#0A0A0A] block truncate">{c.name}</span>
                    <span className="text-xs text-[#9CA3AF]">
                      {[c.code, c.email, c.city].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className="ml-3 text-[#8E0E1A] text-xs font-semibold shrink-0">+ Añadir</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Assigned list */}
      {assignedList.length === 0 ? (
        <p className="text-xs text-[#9CA3AF] py-2 text-center">
          Sin clientes asignados. Usa el buscador para añadir.
        </p>
      ) : (
        <ul className="divide-y divide-[#F3F4F6] border border-[#E5E7EB] rounded-lg overflow-hidden">
          {assignedList.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-[#F9FAFB]">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0A0A0A] truncate">{c.name}</p>
                <p className="text-xs text-[#9CA3AF]">
                  {[c.code, c.email, c.city].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="ml-3 shrink-0 text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors text-lg leading-none"
                aria-label={`Quitar ${c.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Save */}
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="w-full h-9 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
      >
        {isPending ? "Guardando…" : `Guardar asignaciones (${assignedList.length})`}
      </button>
    </div>
  );
}
