"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { sendProsperoAnaliticMessage, type AnaliticMessage } from "@/app/actions/prosperoAnalitic";

const BRAND   = "#8E0E1A";
const BRAND_L = "#FEF2F2";
const BRAND_B = "#FECACA";

const SUGGESTIONS = [
  "Com han anat les vendes aquest mes?",
  "Quins productes han venut més?",
  "Quins delegats lideren el rànquing?",
  "Quina és la tendència dels últims 6 mesos?",
  "Compara aquest mes amb l'anterior",
  "On tenim més marge de millora?",
];

function ChartIcon({ size = 18, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden>
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 16l4-5 4 3 4-6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" aria-hidden>
      <path d="M14 2L2 7l4.5 1.5L8 14l2-4.5L14 2z" strokeLinejoin="round"/>
    </svg>
  );
}

function BubbleUser({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-[12.5px] leading-relaxed text-white whitespace-pre-wrap"
        style={{ backgroundColor: BRAND }}>
        {text}
      </div>
    </div>
  );
}

function BubbleAssistant({ text }: { text: string }) {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5"
        style={{ backgroundColor: BRAND_L, border: `1px solid ${BRAND_B}` }}>
        <ChartIcon size={11} color={BRAND} />
      </div>
      <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-[12.5px] leading-relaxed whitespace-pre-wrap"
        style={{ backgroundColor: "#F3F4F6", color: "#111827" }}>
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5"
        style={{ backgroundColor: BRAND_L, border: `1px solid ${BRAND_B}` }}>
        <ChartIcon size={11} color={BRAND} />
      </div>
      <div className="px-3.5 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1"
        style={{ backgroundColor: "#F3F4F6" }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export function ProsperoAnalitic() {
  const [open, setOpen]   = useState(false);
  const [messages, setMessages] = useState<AnaliticMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;
    setInput("");
    setError("");
    const newHistory: AnaliticMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newHistory);
    startTransition(async () => {
      const res = await sendProsperoAnaliticMessage(messages, msg);
      if ("error" in res) { setError(res.error); return; }
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // FAB button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ backgroundColor: BRAND }}
        title="Próspero Analític"
        aria-label="Obrir Próspero Analític"
      >
        <ChartIcon size={20} color="white" />
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ border: `1px solid ${BRAND_B}`, maxHeight: "580px" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: BRAND }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
            <ChartIcon size={16} color="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-none">Próspero Analític</p>
            <p className="text-[10px] text-white/70 leading-none mt-0.5">Intel·ligència financera en temps real</p>
          </div>
          <button
            onClick={() => { setMessages([]); setError(""); setInput(""); }}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Nova conversa"
          >
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M13 7.5A5.5 5.5 0 1 1 7.5 2c1.8 0 3.4.86 4.4 2.2" strokeLinecap="round"/>
              <path d="M13 2v3.5H9.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Messages or suggestions */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0" style={{ minHeight: 300 }}>
          {messages.length === 0 && !isPending ? (
            <div>
              <p className="text-[15px] font-bold text-[#111827] mb-1 text-center">Analitza les teves dades</p>
              <p className="text-[11.5px] text-[#6B7280] mb-5 text-center">Pregunta sobre vendes, rendiment o tendències</p>
              <div className="space-y-2">
                {SUGGESTIONS.map((q, i) => (
                  <button key={i} onClick={() => handleSend(q)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-[11.5px] text-[#374151] font-medium transition-all hover:bg-[#FEF2F2] hover:text-[#8E0E1A] active:scale-[0.99]"
                    style={{ border: "1px solid #E5E7EB", backgroundColor: "white" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) =>
                m.role === "user"
                  ? <BubbleUser key={i} text={m.content} />
                  : <BubbleAssistant key={i} text={m.content} />
              )}
              {isPending && <TypingDots />}
              {error && (
                <div className="text-[11px] text-red-600 text-center py-2 px-3 bg-red-50 rounded-xl">
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 shrink-0" style={{ borderTop: "1px solid #F3F4F6" }}>
          <div className="flex items-end gap-2 px-3 py-2 rounded-xl"
            style={{ border: `1.5px solid ${BRAND_B}`, backgroundColor: "white" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pregunta sobre vendes, productes o delegats…"
              rows={1}
              className="flex-1 resize-none outline-none text-[12.5px] leading-relaxed text-[#111827] placeholder-[#9CA3AF] bg-transparent"
              style={{ maxHeight: 80, overflowY: "auto" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isPending}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
              style={{ backgroundColor: BRAND }}>
              <SendIcon />
            </button>
          </div>
          <p className="text-[9px] text-center mt-1.5 text-[#9CA3AF]">Dades actualitzades en temps real · Enter per enviar</p>
        </div>
      </div>
    </div>
  );
}
