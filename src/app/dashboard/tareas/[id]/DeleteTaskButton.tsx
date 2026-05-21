"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTaskAction } from "@/app/actions/tasks";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Segur que vols eliminar aquesta tasca?")) return;
    startTransition(async () => {
      await deleteTaskAction(taskId);
      router.push("/dashboard/tareas");
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="w-full h-9 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Eliminant…" : "Eliminar tasca"}
    </button>
  );
}
