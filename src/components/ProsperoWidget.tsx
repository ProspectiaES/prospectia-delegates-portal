"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { sendProsperoMessage, type ProsperoMessage } from "@/app/actions/prospero";

const BRAND = "#8E0E1A";

function OwlIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" aria-hidden>
      <ellipse cx="12" cy="13" rx="7" ry="8" />
      <circle cx="9" cy="11" r="1.8" fill="white" stroke="none" />
      <circle cx="15" cy="11" r="1.8" fill="white" stroke="none" />
      <circle cx="9" cy="11" r="0.8" fill={BRAND} stroke="none" />
      <circle cx="15" cy="11" r="0.8" fill={BRAND} stroke="none" />
      <path d="M10.5 14.5c.4.4 2.6.4 3 0" strokeLinecap="round" />
      <path d="M8 7c-1-1.5-2-2-3-1.5" strokeLinecap="round" />
      <path d="M16 7c1-1.5 2-2 3-1.5" strokeLinecap="round" />
      <path d="M9.5 5.5L8 3M14.5 5.5L16 3" strokeLinecap="round" />
    </svg>
  );
}

function BubbleUser({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm text-[12px] leading-relaxed text-white"
        style={{ backgroundColor: BRAND }}>
        {text}
      </div>
    </div>
  );
}

function BubbleProspero({ text }: { text: string }) {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5"
        style={{ backgroundColor: BRAND }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" aria-hidden>
          <ellipse cx="12" cy="13" rx="7" ry="8" />
          <circle cx="9" cy="11" r="1.5" fill={BRAND} />
          <circle cx="15" cy="11" r="1.5" fill={BRAND} />
        </svg>
      </div>
      <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm text-[12px] leading-relaxed bg-[#F3F4F6] text-[#0A0A0A]">
        {text}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5"
        style={{ backgroundColor: BRAND }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" aria-hidden>
          <ellipse cx="12" cy="13" rx="7" ry="8" />
        </svg>
      </div>
      <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-[#F3F4F6] flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export function ProsperoWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ProsperoMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Listen for open event from sidebar card
  useEffect(() => {
    function handler() {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    document.addEventListener("open-prospero", handler);
    return () => document.removeEventListener("open-prospero", handler);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hola! Sóc el Próspero, el teu assistent del Portal Prospectia. En què et puc ajudar avui?",
      }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    setInput("");
    setError("");
    const next: ProsperoMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    startTransition(async () => {
      const res = await sendProsperoMessage(messages, text);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-5 left-[232px] z-50">
      <div className="w-80 h-[500px] bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 rounded-t-2xl" style={{ backgroundColor: BRAND }}>
          <div className="flex items-center gap-2">
            <OwlIcon />
            <div>
              <p className="text-[13px] font-bold text-white leading-none">Próspero</p>
              <p className="text-[9px] text-white/70 leading-none mt-0.5">Assistent IA del Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMessages([])}
              className="text-white/50 hover:text-white/90 transition-colors text-[10px] font-medium">
              Esborrar
            </button>
            <button onClick={() => setOpen(false)} className="p-1 rounded text-white/70 hover:text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((m, i) =>
            m.role === "user"
              ? <BubbleUser key={i} text={m.content} />
              : <BubbleProspero key={i} text={m.content} />
          )}
          {isPending && <Typing />}
          {error && (
            <div className="text-[10px] text-red-600 text-center py-1 px-2 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 shrink-0 border-t border-[#E5E7EB]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escriu un missatge…"
              rows={1}
              className="flex-1 resize-none outline-none text-[12px] leading-relaxed rounded-xl px-3 py-2 border border-[#E5E7EB] focus:border-[#8E0E1A] transition-colors"
              style={{ maxHeight: "80px", overflowY: "auto" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isPending}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 hover:opacity-80"
              style={{ backgroundColor: BRAND }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M1 7h12M8 3l5 4-5 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
