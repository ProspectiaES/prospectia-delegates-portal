"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";

// ─── CRM field definitions ────────────────────────────────────────────────────

const CRM_FIELDS = [
  { key: "name",     label: "Nombre",    required: true,  hints: ["nom", "nombre", "name", "contact"] },
  { key: "email",    label: "Email",     required: false, hints: ["mail", "email", "correo", "e-mail"] },
  { key: "phone",    label: "Teléfono",  required: false, hints: ["tel", "teléfono", "telefono", "phone", "móvil", "movil"] },
  { key: "company",  label: "Empresa",   required: false, hints: ["centre", "centro", "empresa", "company", "organización", "organizacion", "cuenta"] },
  { key: "city",     label: "Ciudad",    required: false, hints: ["ciutat", "ciudad", "city", "localidad", "poblacion", "población"] },
  { key: "whatsapp", label: "WhatsApp",  required: false, hints: ["whats", "whatsapp", "wa"] },
  { key: "website",  label: "Web",       required: false, hints: ["web", "website", "url", "página", "pagina", "sitio"] },
  { key: "notes",    label: "Notas",     required: false, hints: ["notas", "notes", "observaciones", "obs", "comentarios"] },
] as const;

type CrmKey = typeof CRM_FIELDS[number]["key"];

export type ImportRow = {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  whatsapp?: string;
  website?: string;
  notes?: string;
};

// ─── Auto-detect mapping ───────────────────────────────────────────────────────

function autoMap(headers: string[]): Record<CrmKey, string> {
  const mapping = {} as Record<CrmKey, string>;
  const normalized = headers.map(h => h.toLowerCase().trim().replace(/[^a-záéíóúàèìòùüñ0-9]/g, ""));

  CRM_FIELDS.forEach(field => {
    for (const hint of field.hints) {
      const idx = normalized.findIndex(h => h === hint || h.startsWith(hint) || hint.startsWith(h));
      if (idx !== -1) {
        mapping[field.key] = headers[idx];
        break;
      }
    }
  });

  return mapping;
}

// ─── Parse file → { headers, rows } ──────────────────────────────────────────

function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        if (jsonRows.length === 0) { reject(new Error("Archivo vacío")); return; }

        const headers = Object.keys(jsonRows[0]);
        const rows = jsonRows.map(r => {
          const row: Record<string, string> = {};
          headers.forEach(h => { row[h] = String(r[h] ?? "").trim(); });
          return row;
        });

        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Step 1: Upload ────────────────────────────────────────────────────────────

function StepUpload({ onParsed }: { onParsed: (h: string[], r: Record<string, string>[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handle(file: File) {
    setError(null);
    setLoading(true);
    try {
      const { headers, rows } = await parseFile(file);
      onParsed(headers, rows);
    } catch (e) {
      setError((e as Error).message ?? "Error al leer el archivo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? "border-[#8E0E1A] bg-[#FEF2F2]" : "border-[#E5E7EB] hover:border-[#8E0E1A]/50 bg-[#FAFAFA]"}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8E0E1A" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="18" x2="12" y2="12" strokeLinecap="round"/>
              <polyline points="9 15 12 12 15 15" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0A0A0A]">Arrastra tu archivo aquí</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Excel (.xlsx, .xls) o CSV</p>
          </div>
          <label className="cursor-pointer">
            <span className="inline-block px-4 py-1.5 rounded-lg bg-[#8E0E1A] text-white text-xs font-semibold hover:bg-[#7a0b16] transition-colors">
              {loading ? "Leyendo…" : "Seleccionar archivo"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={loading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }}
            />
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}
      <div className="bg-[#F9FAFB] rounded-lg p-3 space-y-1">
        <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Columnas reconocidas automáticamente</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {CRM_FIELDS.map(f => (
            <span key={f.key} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${f.required ? "bg-[#FEF2F2] text-[#8E0E1A]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
              {f.label}{f.required ? " *" : ""}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-1.5">* Obligatorio. Después podrás ajustar el mapeo de columnas.</p>
      </div>
    </div>
  );
}

// ─── Step 2: Column mapping ────────────────────────────────────────────────────

function StepMapping({
  headers, rows, mapping, onMapping, onConfirm, onBack,
}: {
  headers: string[];
  rows: Record<string, string>[];
  mapping: Record<CrmKey, string>;
  onMapping: (m: Record<CrmKey, string>) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const setField = (key: CrmKey, col: string) => onMapping({ ...mapping, [key]: col });
  const nameField = mapping["name"];
  const canConfirm = !!nameField;
  const previewRows = rows.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Field mapping */}
      <div>
        <p className="text-xs font-semibold text-[#374151] mb-3">Asigna las columnas de tu archivo a los campos del CRM</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CRM_FIELDS.map(field => (
            <div key={field.key} className="flex items-center gap-2">
              <div className="w-24 shrink-0">
                <p className={`text-[11px] font-semibold ${field.required ? "text-[#8E0E1A]" : "text-[#6B7280]"}`}>
                  {field.label}{field.required ? " *" : ""}
                </p>
              </div>
              <select
                value={mapping[field.key] ?? ""}
                onChange={e => setField(field.key, e.target.value)}
                className={`flex-1 h-8 rounded-lg border text-xs px-2 focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 transition-colors ${mapping[field.key] ? "border-[#8E0E1A]/40 bg-[#FEF2F2]/30 text-[#0A0A0A]" : "border-[#E5E7EB] bg-white text-[#9CA3AF]"}`}
              >
                <option value="">— No importar —</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Preview table */}
      <div>
        <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Vista previa ({Math.min(4, rows.length)} de {rows.length} filas)</p>
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {CRM_FIELDS.filter(f => mapping[f.key]).map(f => (
                  <th key={f.key} className="px-3 py-2 text-left font-semibold text-[#9CA3AF] whitespace-nowrap">
                    {f.label}
                    <span className="text-[9px] font-normal ml-1 text-[#C0C4CC]">← {mapping[f.key]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {previewRows.map((row, i) => (
                <tr key={i} className="hover:bg-[#FAFAFA]">
                  {CRM_FIELDS.filter(f => mapping[f.key]).map(f => (
                    <td key={f.key} className="px-3 py-1.5 text-[#374151] max-w-[160px] truncate">
                      {row[mapping[f.key]] || <span className="text-[#D1D5DB]">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="text-xs text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
          ← Cambiar archivo
        </button>
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className="px-4 py-2 rounded-lg bg-[#8E0E1A] text-white text-xs font-semibold hover:bg-[#7a0b16] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Importar {rows.length} prospectos →
        </button>
      </div>
    </div>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

interface Props {
  onImport: (rows: ImportRow[]) => Promise<void>;
  onClose: () => void;
}

export function ExcelImportModal({ onImport, onClose }: Props) {
  const [step, setStep]       = useState<"upload" | "map" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows]       = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<CrmKey, string>>({} as Record<CrmKey, string>);
  const [result, setResult]   = useState<{ count: number; skipped: number } | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [pending, startT]     = useTransition();

  function handleParsed(h: string[], r: Record<string, string>[]) {
    setHeaders(h);
    setRows(r);
    setMapping(autoMap(h));
    setStep("map");
  }

  function handleConfirm() {
    const importRows: ImportRow[] = [];
    let skipped = 0;

    rows.forEach(row => {
      const name = mapping["name"] ? row[mapping["name"]]?.trim() : "";
      if (!name) { skipped++; return; }

      const r: ImportRow = { name };
      (["email", "phone", "company", "city", "whatsapp", "website", "notes"] as CrmKey[]).forEach(key => {
        const col = mapping[key];
        if (col && row[col]?.trim()) (r as Record<string, string>)[key] = row[col].trim();
      });
      importRows.push(r);
    });

    if (importRows.length === 0) { setError("No se encontraron filas con nombre válido."); return; }

    startT(async () => {
      try {
        await onImport(importRows);
        setResult({ count: importRows.length, skipped });
        setStep("done");
      } catch (e) {
        setError((e as Error).message ?? "Error al importar");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#0A0A0A]">Importar prospectos</h2>
            <div className="flex items-center gap-2 mt-1">
              {(["upload", "map", "done"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-[#E5E7EB]">›</span>}
                  <span className={`text-[10px] font-semibold ${step === s ? "text-[#8E0E1A]" : "text-[#9CA3AF]"}`}>
                    {s === "upload" ? "1. Archivo" : s === "map" ? "2. Columnas" : "3. Listo"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === "upload" && (
            <StepUpload onParsed={handleParsed} />
          )}

          {step === "map" && (
            <StepMapping
              headers={headers}
              rows={rows}
              mapping={mapping}
              onMapping={setMapping}
              onConfirm={handleConfirm}
              onBack={() => setStep("upload")}
            />
          )}

          {step === "done" && result && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#059669" strokeWidth="2">
                  <polyline points="5 14 11 20 23 8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-[#0A0A0A]">{result.count} prospectos importados</p>
                {result.skipped > 0 && (
                  <p className="text-xs text-[#9CA3AF] mt-1">{result.skipped} fila{result.skipped !== 1 ? "s" : ""} omitida{result.skipped !== 1 ? "s" : ""} (sin nombre)</p>
                )}
              </div>
              <button onClick={onClose} className="px-6 py-2 rounded-lg bg-[#8E0E1A] text-white text-sm font-semibold hover:bg-[#7a0b16] transition-colors">
                Ver prospectos
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-600 font-medium text-center">{error}</p>
          )}

          {pending && (
            <div className="mt-3 text-center">
              <p className="text-xs text-[#9CA3AF]">Importando…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
