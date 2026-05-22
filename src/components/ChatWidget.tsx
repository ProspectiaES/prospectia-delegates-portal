"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import {
  sendMessageAction,
  getConversationAction,
  getConversationsAction,
  getAllProfilesForChatAction,
  type DirectMessage,
  type Conversation,
} from "@/app/actions/messages";

interface Profile { id: string; full_name: string; avatar_url: string | null; }

function Avatar({ name, url, size = 8 }: { name: string; url: string | null; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full shrink-0 object-cover`;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={cls} />;
  }
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-[#8E0E1A] flex items-center justify-center shrink-0`}
    >
      <span className="text-[10px] font-bold text-white">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fmtConvTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d >= today) return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// ─── Conversation view ────────────────────────────────────────────────────────

function ConversationView({
  currentUserId,
  other,
  onBack,
}: {
  currentUserId: string;
  other: Profile;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    const msgs = await getConversationAction(other.id);
    setMessages(msgs);
  }, [other.id]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    setInput("");
    startTransition(async () => {
      await sendMessageAction(other.id, text);
      await loadMessages();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#E5E7EB] shrink-0">
        <button
          onClick={onBack}
          className="p-1 rounded text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
          aria-label="Volver"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <Avatar name={other.full_name} url={other.avatar_url} size={7} />
        <span className="text-sm font-semibold text-[#0A0A0A] truncate">{other.full_name}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-[#9CA3AF] text-center py-4">
            Empieza la conversación…
          </p>
        )}
        {messages.map(m => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={[
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-snug",
                  mine
                    ? "bg-[#8E0E1A] text-white rounded-br-sm"
                    : "bg-[#F3F4F6] text-[#0A0A0A] rounded-bl-sm",
                ].join(" ")}
              >
                <p className="break-words whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-0.5 text-right ${mine ? "text-white/60" : "text-[#9CA3AF]"}`}>
                  {fmtTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-[#E5E7EB] shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Escribe un mensaje… (↵ enviar)"
            className="flex-1 resize-none rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors max-h-24 overflow-auto"
            style={{ minHeight: 36 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="w-9 h-9 shrink-0 rounded-xl bg-[#8E0E1A] text-white flex items-center justify-center hover:bg-[#6B0A14] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 2L2 7l4 1.5L8.5 12 12 2z" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation list ────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  profiles,
  onSelect,
}: {
  conversations: Conversation[];
  profiles: Profile[];
  onSelect: (p: Profile) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = profiles.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b border-[#E5E7EB] shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar persona…"
          className="w-full h-8 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-xs text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A]/10 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Recent conversations */}
        {conversations.length > 0 && !search && (
          <div>
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Recientes
            </p>
            {conversations.map(c => {
              const p = profiles.find(pr => pr.id === c.userId) ?? {
                id: c.userId, full_name: c.full_name, avatar_url: c.avatar_url,
              };
              return (
                <button
                  key={c.userId}
                  onClick={() => onSelect(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar name={c.full_name} url={c.avatar_url} size={8} />
                    {c.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[#8E0E1A] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                        {c.unread > 9 ? "9+" : c.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className={`text-xs font-semibold truncate ${c.unread > 0 ? "text-[#0A0A0A]" : "text-[#374151]"}`}>
                        {c.full_name}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0">{fmtConvTime(c.last_at)}</span>
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${c.unread > 0 ? "text-[#374151] font-medium" : "text-[#9CA3AF]"}`}>
                      {c.last_message}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* All users */}
        <div>
          {(search || conversations.length === 0) && (
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
              {search ? "Resultados" : "Todos"}
            </p>
          )}
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] transition-colors text-left"
            >
              <Avatar name={p.full_name} url={p.avatar_url} size={8} />
              <span className="text-xs font-medium text-[#374151] truncate">{p.full_name}</span>
            </button>
          ))}
          {search && filtered.length === 0 && (
            <p className="px-3 py-4 text-xs text-[#9CA3AF] text-center">Sin resultados</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function ChatWidget({
  currentUserId,
  initialUnread,
}: {
  currentUserId: string;
  initialUnread: number;
}) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activePerson, setActivePerson] = useState<Profile | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(async () => {
    const [convs, profs] = await Promise.all([
      getConversationsAction(),
      getAllProfilesForChatAction(),
    ]);
    setConversations(convs);
    setProfiles(profs);
    setUnread(convs.reduce((s, c) => s + c.unread, 0));
  }, []);

  // Open from sidebar card event
  useEffect(() => {
    function handler() {
      setOpen(true);
      setActivePerson(null);
    }
    document.addEventListener("open-mensajeria", handler);
    return () => document.removeEventListener("open-mensajeria", handler);
  }, []);

  // Broadcast unread count so sidebar card can display badge
  useEffect(() => {
    document.dispatchEvent(new CustomEvent("chat-unread", { detail: unread }));
  }, [unread]);

  useEffect(() => {
    if (open) loadConversations();
  }, [open, loadConversations]);

  // Poll for unread count when closed
  useEffect(() => {
    if (!open) {
      pollRef.current = setInterval(async () => {
        const convs = await getConversationsAction();
        setConversations(convs);
        setUnread(convs.reduce((s, c) => s + c.unread, 0));
      }, 10000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open]);

  function handleSelect(p: Profile) {
    setActivePerson(p);
    setConversations(prev => prev.map(c => c.userId === p.id ? { ...c, unread: 0 } : c));
  }

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0) || unread;

  if (!open) return null;

  return (
    <div className="fixed bottom-5 left-[232px] z-50">
      <div className="w-80 h-[480px] bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#8E0E1A] shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2">
            {activePerson && (
              <button onClick={() => setActivePerson(null)} className="text-white/70 hover:text-white mr-1">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" aria-hidden>
              <path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h2v2.5L7 12h7a1 1 0 001-1V3a1 1 0 00-1-1z" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm font-semibold text-white">
              {activePerson ? activePerson.full_name.split(" ")[0] : "Mensajería"}
            </span>
            {totalUnread > 0 && !activePerson && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[#8E0E1A] text-[9px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded text-white/70 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {activePerson ? (
            <ConversationView currentUserId={currentUserId} other={activePerson} onBack={() => setActivePerson(null)} />
          ) : (
            <ConversationList conversations={conversations} profiles={profiles} onSelect={handleSelect} />
          )}
        </div>
      </div>
    </div>
  );
}
