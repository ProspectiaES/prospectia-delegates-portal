"use client";

import { useState, useTransition, useEffect, useRef } from "react";
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
  const [results, setResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (search.length < 2) { setResults([]); setShowResults(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(search)}`);
        const data: Contact[] = await res.json();
        setResults(data.filter((c) => !assigned.has(c.id)));
        setShowResults(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, assigned]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current  && !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const add = (c: Contact) => {
    setAssigned((prev) => new Map(prev).set(c.id, c));
    setSearch("");
    setResults([]);
    setShowResults(false);
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

      {/* Search */}
      <div className="relative">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Buscar y añadir cliente por nombre, código o email…"
          className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF]">…</span>
        )}
        {showResults && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-56 overflow-y-auto"
          >
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => add(c)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-[#0A0A0A] block truncate">{c.name}</span>
                  <span className="text-xs text-[#9CA3AF]">
                    {[c.code, c.email, c.city].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className="ml-3 text-[#8E0E1A] text-xs font-semibold shrink-0">+ Añadir</span>
              </button>
            ))}
          </div>
        )}
        {showResults && results.length === 0 && !searching && search.length >= 2 && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E5E7EB] rounded-lg shadow-lg px-4 py-3 text-xs text-[#9CA3AF]">
            Sin resultados para «{search}»
          </div>
        )}
      </div>

      {/* Assigned list */}
      {assignedList.length === 0 ? (
        <p className="text-xs text-[#9CA3AF] py-2 text-center">
          Sin clientes asignados. Usa el buscador de arriba para añadir.
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
