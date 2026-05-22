"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { sendProsperoMessage, type ProsperoMessage } from "@/app/actions/prospero";

const BRAND   = "#8E0E1A";
const BRAND_L = "#FEF2F2";
const BRAND_B = "#FECACA";

// ─── Icons ────────────────────────────────────────────────────────────────────

// Clean sparkle / AI star — professional, minimal
function SparkleIcon({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z" />
      <circle cx="19" cy="4" r="1.2" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" aria-hidden>
      <path d="M14 2L2 7l4.5 1.5L8 14l2-4.5L14 2z" strokeLinejoin="round"/>
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="white" strokeWidth="1.6" aria-hidden>
      <path d="M13 7.5A5.5 5.5 0 1 1 7.5 2c1.8 0 3.4.86 4.4 2.2" strokeLinecap="round"/>
      <path d="M13 2v3.5H9.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Suggested questions by role + lang ───────────────────────────────────────

const SUGGESTIONS: Record<string, Record<"es" | "ca", string[]>> = {
  OWNER: {
    es: [
      "¿Cómo analizo el rendimiento de mis delegados?",
      "¿Qué es el módulo Brúixola?",
      "¿Cómo genero el diagnóstico IA de la empresa?",
      "¿Cómo sincronizo datos de Holded?",
    ],
    ca: [
      "Com analitzo el rendiment dels meus delegats?",
      "Què és el mòdul Brúixola?",
      "Com genero el diagnòstic IA de l'empresa?",
      "Com sincronitzo dades de Holded?",
    ],
  },
  CONSIGLIERE: {
    es: [
      "¿Qué módulos tengo disponibles?",
      "¿Cómo funciona Brúixola?",
      "¿Cómo veo los objetivos estratégicos?",
      "¿Cómo uso el diagnóstico IA?",
    ],
    ca: [
      "Quins mòduls tinc disponibles?",
      "Com funciona Brúixola?",
      "Com veig els objectius estratègics?",
      "Com uso el diagnòstic IA?",
    ],
  },
  KOL: {
    es: [
      "¿Cómo veo el rendimiento de mi equipo?",
      "¿Dónde gestiono mis delegados?",
      "¿Dónde veo la analítica de mi territorio?",
      "¿Cómo funciona la asignación de clientes?",
    ],
    ca: [
      "Com veig el rendiment del meu equip?",
      "On gestiono els meus delegats?",
      "On veig l'analítica del meu territori?",
      "Com funciona l'assignació de clients?",
    ],
  },
  COORDINATOR: {
    es: [
      "¿Cómo veo el rendimiento de mi equipo?",
      "¿Cómo creo un nuevo pedido?",
      "¿Dónde veo mis comisiones?",
      "¿Cómo funciona el informe de riesgo?",
    ],
    ca: [
      "Com veig el rendiment del meu equip?",
      "Com creo una nova comanda?",
      "On veig les meves comissions?",
      "Com funciona l'informe de risc?",
    ],
  },
  DELEGATE: {
    es: [
      "¿Cómo creo un nuevo pedido?",
      "¿Dónde consulto mis clientes asignados?",
      "¿Cómo veo mis comisiones?",
      "¿Cómo funciona el informe de riesgo?",
    ],
    ca: [
      "Com puc crear una nova comanda?",
      "On consulto els meus clients assignats?",
      "On veig les meves comissions?",
      "Com funciona l'informe de risc?",
    ],
  },
};

function getSuggestions(role: string, lang: "es" | "ca"): string[] {
  const key = (Object.keys(SUGGESTIONS).includes(role) ? role : "DELEGATE") as keyof typeof SUGGESTIONS;
  return SUGGESTIONS[key][lang];
}

// ─── Message bubbles ──────────────────────────────────────────────────────────

function BubbleUser({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed text-white"
        style={{ backgroundColor: BRAND }}>
        {text}
      </div>
    </div>
  );
}

function BubbleProspero({ text }: { text: string }) {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5"
        style={{ backgroundColor: BRAND_L, border: `1px solid ${BRAND_B}` }}>
        <SparkleIcon size={13} color={BRAND} />
      </div>
      <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-[13px] leading-relaxed"
        style={{ backgroundColor: "#F3F4F6", color: "#111827" }}>
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5"
        style={{ backgroundColor: BRAND_L, border: `1px solid ${BRAND_B}` }}>
        <SparkleIcon size={13} color={BRAND} />
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

// ─── Widget ───────────────────────────────────────────────────────────────────

type Screen = "welcome" | "chat";

export function ProsperoWidget({ userRole = "DELEGATE" }: { userRole?: string }) {
  const [open, setOpen]     = useState(false);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [lang, setLang]     = useState<"es" | "ca">("es");
  const [messages, setMessages]   = useState<ProsperoMessage[]>([]);
  const [input, setInput]         = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError]  = useState("");
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Open from sidebar card event
  useEffect(() => {
    function handler() { setOpen(true); }
    document.addEventListener("open-prospero", handler);
    return () => document.removeEventListener("open-prospero", handler);
  }, []);

  useEffect(() => {
    if (open && screen === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, screen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSelectLang(l: "es" | "ca") {
    setLang(l);
    setMessages([]);
    setScreen("chat");
    setTimeout(() => inputRef.current?.focus(), 150);
  }

  function handleReset() {
    setMessages([]);
    setScreen("welcome");
    setError("");
    setInput("");
  }

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;
    setInput("");
    setError("");
    const newHistory: ProsperoMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newHistory);
    startTransition(async () => {
      const res = await sendProsperoMessage(messages, msg, lang);
      if ("error" in res) { setError(res.error); return; }
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    });
  }

  function handleSuggestion(q: string) {
    handleSend(q);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const suggestions = getSuggestions(userRole, lang);
  const txt = lang === "ca"
    ? { greeting: "Com puc ajudar-te?", subtitle: "Pregunta'm qualsevol cosa sobre el portal",
        placeholder: "Escriu el teu missatge…", hint: "Enter per enviar · Shift+Enter salt de línia",
        newConv: "Nova conversa" }
    : { greeting: "¿Cómo puedo ayudarte?", subtitle: "Pregúntame cualquier cosa sobre el portal",
        placeholder: "Escribe tu mensaje…", hint: "Enter para enviar · Shift+Enter nueva línea",
        newConv: "Nueva conversación" };

  if (!open) return null;

  return (
    <div className="fixed bottom-5 z-50" style={{ left: "calc(224px + 16px)" }}>
      <div className="w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ border: `1px solid ${BRAND_B}`, maxHeight: "560px" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: BRAND }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
            <SparkleIcon size={18} color="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-none">Próspero</p>
            <p className="text-[10px] text-white/70 leading-none mt-0.5">
              {lang === "ca" ? "Assistent del portal" : "Asistente del portal"}
            </p>
          </div>
          <button onClick={handleReset} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" title={txt.newConv}>
            <ResetIcon />
          </button>
          <span className="text-white/30 text-[11px] select-none">{txt.newConv}</span>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Welcome screen */}
        {screen === "welcome" && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ backgroundColor: BRAND_L }}>
              <SparkleIcon size={28} color={BRAND} />
            </div>
            <p className="text-[18px] font-bold text-[#111827] mb-1.5">¿Cómo puedo ayudarte?</p>
            <p className="text-[12px] text-[#6B7280] mb-8">¿En qué idioma prefieres continuar?</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => handleSelectLang("es")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
                style={{ border: `1.5px solid ${BRAND}`, color: BRAND, backgroundColor: "white" }}>
                <span className="text-[15px]">🇪🇸</span> Español
              </button>
              <button onClick={() => handleSelectLang("ca")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
                style={{ border: `1.5px solid ${BRAND}`, color: BRAND, backgroundColor: "white" }}>
                <span className="text-[15px]">🏴󠁥󠁳󠁣󠁴󠁿</span> Català
              </button>
            </div>
          </div>
        )}

        {/* Chat screen */}
        {screen === "chat" && (
          <>
            {/* Messages or suggestions */}
            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0" style={{ minHeight: 280 }}>
              {messages.length === 0 && !isPending ? (
                <div>
                  <p className="text-[16px] font-bold text-[#111827] mb-1 text-center">{txt.greeting}</p>
                  <p className="text-[12px] text-[#6B7280] mb-5 text-center">{txt.subtitle}</p>
                  <div className="space-y-2">
                    {suggestions.map((q, i) => (
                      <button key={i} onClick={() => handleSuggestion(q)}
                        className="w-full text-left px-4 py-3 rounded-xl text-[12px] text-[#374151] font-medium transition-all hover:bg-[#FEF2F2] hover:text-[#8E0E1A] active:scale-[0.99]"
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
                      : <BubbleProspero key={i} text={m.content} />
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
                  placeholder={txt.placeholder}
                  rows={1}
                  className="flex-1 resize-none outline-none text-[13px] leading-relaxed text-[#111827] placeholder-[#9CA3AF] bg-transparent"
                  style={{ maxHeight: 80, overflowY: "auto" }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                  style={{ backgroundColor: BRAND }}>
                  <SendIcon />
                </button>
              </div>
              <p className="text-[9px] text-center mt-1.5" style={{ color: "#9CA3AF" }}>{txt.hint}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
