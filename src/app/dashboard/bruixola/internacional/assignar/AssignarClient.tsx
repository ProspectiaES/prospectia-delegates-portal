"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { bulkSetInternacional } from "@/app/actions/contacts";

interface Contact {
  id: string;
  name: string;
  country: string | null;
  country_code: string | null;
  is_internacional: boolean;
}

export function AssignarClient({
  contacts,
  initialSelected,
}: {
  contacts: Contact[];
  initialSelected: Set<string>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "intl" | "comercial">("all");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return contacts.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.country ?? "").toLowerCase().includes(q)) return false;
      if (filter === "intl"     && !selected.has(c.id)) return false;
      if (filter === "comercial" && selected.has(c.id)) return false;
      return true;
    });
  }, [contacts, search, filter, selected]);

  const originalSelected = initialSelected;
  const toAdd    = [...selected].filter((id) => !originalSelected.has(id));
  const toRemove = [...originalSelected].filter((id) => !selected.has(id));
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
    setError(null);
  }

  function toggleAll() {
    const allFilteredIds = filtered.map((c) => c.id);
    const allChecked = allFilteredIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) allFilteredIds.forEach((id) => next.delete(id));
      else allFilteredIds.forEach((id) => next.add(id));
      return next;
    });
    setSaved(false);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await bulkSetInternacional(toAdd, toRemove);
      if ("error" in res) setError(res.error ?? "Error desconegut");
      else setSaved(true);
    });
  }

  const allFilteredChecked = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someFilteredChecked = filtered.some((c) => selected.has(c.id)) && !allFilteredChecked;

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
          type="text"
          placeholder="Cercar client o país..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]"
        />
        <div className="flex items-center gap-1.5">
          {(["all", "intl", "comercial"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                filter === f
                  ? "bg-[#111827] text-white"
                  : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
              }`}
            >
              {f === "all" ? "Tots" : f === "intl" ? "Internacional" : "Comercial"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-[#6B7280]">
        <span>
          <strong className="text-[#111827]">{selected.size}</strong> marcats com a Internacional
        </span>
        <span>·</span>
        <span>
          <strong className="text-[#111827]">{contacts.length - selected.size}</strong> Comercial
        </span>
        {hasChanges && (
          <>
            <span>·</span>
            <span className="text-[#D97706] font-medium">
              {toAdd.length > 0 && `+${toAdd.length} a afegir`}
              {toAdd.length > 0 && toRemove.length > 0 && " · "}
              {toRemove.length > 0 && `−${toRemove.length} a treure`}
            </span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#FAFAFA]">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredChecked}
                  ref={(el) => { if (el) el.indeterminate = someFilteredChecked; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#8E0E1A] focus:ring-[#8E0E1A]/20 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider hidden sm:table-cell">País</th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Internacional</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F9FAFB]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                  Cap client coincideix amb la cerca.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const isIntl = selected.has(c.id);
                const wasIntl = originalSelected.has(c.id);
                const changed = isIntl !== wasIntl;
                return (
                  <tr
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`cursor-pointer transition-colors ${
                      isIntl ? "bg-[#FFF7F7]" : "hover:bg-[#FAFAFA]"
                    } ${changed ? "ring-inset ring-1 ring-[#8E0E1A]/20" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isIntl}
                        onChange={() => toggle(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-[#D1D5DB] text-[#8E0E1A] focus:ring-[#8E0E1A]/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#111827]">{c.name}</span>
                        {changed && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isIntl ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#F3F4F6] text-[#6B7280]"
                          }`}>
                            {isIntl ? "+INTL" : "−INTL"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] hidden sm:table-cell">{c.country ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {isIntl ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8E0E1A] inline-block" />
                          Internacional
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#D1D5DB]">Comercial</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Save bar */}
      <div className={`sticky bottom-4 flex items-center justify-between rounded-xl border px-5 py-4 shadow-lg transition-all ${
        hasChanges
          ? "border-[#8E0E1A]/30 bg-white"
          : "border-[#E5E7EB] bg-[#FAFAFA] opacity-60"
      }`}>
        <div className="text-sm text-[#6B7280]">
          {saved && !hasChanges ? (
            <span className="text-[#059669] font-medium">✓ Canvis guardats</span>
          ) : hasChanges ? (
            <span>
              <strong className="text-[#111827]">{toAdd.length + toRemove.length}</strong> canvi{toAdd.length + toRemove.length !== 1 ? "s" : ""} pendent{toAdd.length + toRemove.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span>Sense canvis</span>
          )}
          {error && <span className="ml-3 text-red-600 text-xs">{error}</span>}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/bruixola/internacional"
            className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            Cancel·lar
          </Link>
          <button
            onClick={save}
            disabled={!hasChanges || pending}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0B16] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? "Guardant..." : "Guardar canvis"}
          </button>
        </div>
      </div>

    </div>
  );
}
