"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Minimal markdown renderer ────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      out.push(
        <pre key={i} className="bg-[#1E1E1E] text-[#D4D4D4] rounded-lg px-4 py-3 text-xs overflow-x-auto my-3 font-mono leading-relaxed">
          {lang && <span className="block text-[#9CA3AF] text-[10px] mb-2 font-sans">{lang}</span>}
          {codeLines.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-─━]{3,}$/.test(line.trim())) {
      out.push(<hr key={i} className="border-[#E5E7EB] my-3" />);
      i++; continue;
    }

    // Heading
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) { out.push(<h2 key={i} className="text-base font-bold text-[#0A0A0A] mt-4 mb-2">{inlineRender(h1[1])}</h2>); i++; continue; }
    if (h2) { out.push(<h3 key={i} className="text-sm font-bold text-[#0A0A0A] mt-3 mb-1.5">{inlineRender(h2[1])}</h3>); i++; continue; }
    if (h3) { out.push(<h4 key={i} className="text-sm font-semibold text-[#374151] mt-3 mb-1">{inlineRender(h3[1])}</h4>); i++; continue; }

    // Bullet list
    if (/^[\-\*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-2 text-sm text-[#374151]">
          {items.map((item, j) => <li key={j}>{inlineRender(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      out.push(
        <ol key={i} className="list-decimal list-inside space-y-1 my-2 text-sm text-[#374151]">
          {items.map((item, j) => <li key={j}>{inlineRender(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.match(/^[\|\s\-:]+$/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(<MdTable key={i} lines={tableLines} />);
      continue;
    }

    // Empty line
    if (!line.trim()) { out.push(<div key={i} className="h-2" />); i++; continue; }

    // Paragraph
    out.push(<p key={i} className="text-sm text-[#374151] leading-relaxed">{inlineRender(line)}</p>);
    i++;
  }

  return out;
}

function inlineRender(text: string): React.ReactNode {
  // Split by **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-[#0A0A0A]">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-[#F3F4F6] px-1.5 py-0.5 rounded text-xs font-mono text-[#8E0E1A]">{part.slice(1, -1)}</code>;
    return part;
  });
}

function MdTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter(l => !l.match(/^[\|\s\-:]+$/))
    .map(l => l.split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1));
  const [head, ...body] = rows;
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#F9FAFB]">
            {head?.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-[#374151] border border-[#E5E7EB]">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "" : "bg-[#F9FAFB]"}>
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-[#374151] border border-[#E5E7EB]">{inlineRender(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#8E0E1A] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
    Analizando datos…
  </div>
);

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "¿Cuántas unidades vendidas hay este mes?",
  "Muéstrame el ranking de delegados del mes actual",
  "¿Qué delegados están en riesgo de no llegar al Tramo 2?",
  "Resumen ejecutivo del mes: facturación, comisiones y margen",
  "¿Cuáles son los clientes más activos en los últimos 3 meses?",
  "Compara este mes con el mismo mes del año pasado",
];

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  async function send(text = input) {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/analytics-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });

      if (!res.ok) throw new Error(await res.text());

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      setLoading(false);

      const reader = res.body!.getReader();
      const dec = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
        });
      }
    } catch (e) {
      setLoading(false);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Error desconocido"}` },
      ]);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">

        {isEmpty && (
          <div className="max-w-2xl mx-auto pt-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8E0E1A" strokeWidth="1.5">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-5 0v-15A2.5 2.5 0 0 1 9.5 2Z"/>
                  <path d="M14.5 8A2.5 2.5 0 0 1 17 10.5v9a2.5 2.5 0 0 1-5 0v-9A2.5 2.5 0 0 1 14.5 8Z"/>
                  <path d="M4.5 14A2.5 2.5 0 0 1 7 16.5v3a2.5 2.5 0 0 1-5 0v-3A2.5 2.5 0 0 1 4.5 14Z"/>
                </svg>
              </div>
              <h2 className="text-base font-bold text-[#0A0A0A]">Analítica Prospectia</h2>
              <p className="text-sm text-[#6B7280]">Pregúntame sobre ventas, delegados, comisiones o rentabilidad.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#374151] hover:border-[#8E0E1A] hover:bg-[#FEF2F2] hover:text-[#8E0E1A] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={["flex gap-3 max-w-4xl mx-auto", m.role === "user" ? "flex-row-reverse" : ""].join(" ")}>
            {/* Avatar */}
            <div className={[
              "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
              m.role === "user" ? "bg-[#8E0E1A] text-white" : "bg-[#F3F4F6] text-[#6B7280]",
            ].join(" ")}>
              {m.role === "user" ? "Tú" : "IA"}
            </div>

            {/* Bubble */}
            <div className={[
              "rounded-2xl px-4 py-3 max-w-[85%]",
              m.role === "user"
                ? "bg-[#8E0E1A] text-white text-sm leading-relaxed rounded-tr-sm"
                : "bg-white border border-[#E5E7EB] rounded-tl-sm space-y-1",
            ].join(" ")}>
              {m.role === "user"
                ? m.content
                : renderMarkdown(m.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-4xl mx-auto">
            <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] font-bold text-[#6B7280] shrink-0">IA</div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-sm px-4 py-3">
              <Spinner />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title="Nueva conversación"
              className="shrink-0 mb-1 h-8 w-8 rounded-lg text-[#9CA3AF] hover:text-[#8E0E1A] hover:bg-[#FEF2F2] transition-colors flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 7a5 5 0 1 0 1.5-3.5" strokeLinecap="round"/>
                <path d="M2 3.5V7h3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div className="flex-1 flex items-end gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 focus-within:border-[#8E0E1A] transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pregunta sobre ventas, comisiones, delegados…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none leading-relaxed max-h-40"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="shrink-0 w-8 h-8 rounded-xl bg-[#8E0E1A] text-white flex items-center justify-center hover:bg-[#6B0A14] disabled:opacity-40 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12L12 7 2 2v4l7 1-7 1v4z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-[#D1D5DB] mt-2">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  );
}
