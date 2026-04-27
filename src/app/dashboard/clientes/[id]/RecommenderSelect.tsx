"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { saveContactRecommender, UpdateContactState } from "@/app/actions/contacts";

interface Contact {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  city: string | null;
}

interface Props {
  contactId: string;
  currentRecommender: Contact | null;
}

export function RecommenderSelect({ contactId, currentRecommender }: Props) {
  const [selected, setSelected]     = useState<Contact | null>(currentRecommender);
  const [search, setSearch]         = useState("");
  const [results, setResults]       = useState<Contact[]>([]);
  const [searching, setSearching]   = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [status, setStatus]         = useState<UpdateContactState | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef   = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchContacts = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(
        `/api/contacts/search?q=${encodeURIComponent(q)}&exclude=${encodeURIComponent(contactId)}`
      );
      setResults(await res.json());
    } finally {
      setSearching(false);
    }
  }, [contactId]);

  // Load full list on mount
  useEffect(() => { fetchContacts(""); }, [fetchContacts]);

  // Debounced re-fetch
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
      ) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (c: Contact) => {
    setSelected(c);
    setSearch("");
    setShowDropdown(false);
    setStatus(null);
  };

  const clear = () => {
    setSelected(null);
    setStatus(null);
  };

  const save = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("contact_id",     contactId);
      fd.set("recommender_id", selected?.id ?? "");
      const result = await saveContactRecommender(null, fd);
      setStatus(result);
    });
  };

  return (
    <div className="px-5 py-4 space-y-3">
      <input type="hidden" name="contact_id" value={contactId} />

      {status?.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#8E0E1A]">
          {status.error}
        </div>
      )}
      {status?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          Recomendador guardado.
        </div>
      )}

      {/* Current selection */}
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#0A0A0A] truncate">{selected.name}</p>
            <p className="text-xs text-[#9CA3AF]">
              {[selected.code, selected.email, selected.city].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="ml-3 shrink-0 text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors text-lg leading-none"
            aria-label="Quitar recomendador"
          >
            ×
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#9CA3AF]">Sin recomendador asignado.</p>
      )}

      {/* Search */}
      <div className="relative">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); setStatus(null); }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Buscar recomendador por nombre, código o email…"
          className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 pr-8 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors shadow-sm"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF]">…</span>
        )}

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-56 overflow-y-auto"
          >
            {results.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[#9CA3AF]">
                {searching ? "Buscando…" : "Sin resultados"}
              </p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-[#0A0A0A] block truncate">{c.name}</span>
                    <span className="text-xs text-[#9CA3AF]">
                      {[c.code, c.email, c.city].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className="ml-3 text-[#8E0E1A] text-xs font-semibold shrink-0">Seleccionar</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="w-full h-8 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
      >
        {isPending ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
