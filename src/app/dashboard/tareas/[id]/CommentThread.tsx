"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCommentAction, TaskFormState } from "@/app/actions/tasks";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: { id: string; full_name: string; avatar_url: string | null } | null;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function CommentThread({
  taskId,
  initialComments,
}: {
  taskId: string;
  initialComments: Comment[];
}) {
  const [state, action, pending] = useActionState<TaskFormState | null, FormData>(
    createCommentAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <div className="space-y-4">
      {initialComments.length === 0 ? (
        <p className="text-sm text-[#9CA3AF] text-center py-4">
          Aún no hay comentarios.
        </p>
      ) : (
        <ul className="space-y-3">
          {initialComments.map(c => (
            <li key={c.id} className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                {c.author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.author.avatar_url}
                    alt={c.author.full_name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-[#E5E7EB]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#8E0E1A] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">
                      {(c.author?.full_name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-[#374151]">
                    {c.author?.full_name ?? "Desconocido"}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">{fmtDateTime(c.created_at)}</span>
                </div>
                <p className="text-sm text-[#374151] mt-0.5 whitespace-pre-wrap break-words">
                  {c.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={action} className="flex flex-col gap-2 pt-2 border-t border-[#F3F4F6]">
        <input type="hidden" name="task_id" value={taskId} />
        {state?.error && (
          <p className="text-xs text-[#8E0E1A]">{state.error}</p>
        )}
        <textarea
          name="content"
          required
          rows={3}
          placeholder="Escribe un comentario…"
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="h-8 px-4 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] focus:ring-offset-2"
          >
            {pending ? "Enviando…" : "Comentar"}
          </button>
        </div>
      </form>
    </div>
  );
}
