import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TaskStatus, TaskPriority } from "@/app/actions/tasks";
import { CommentThread } from "./CommentThread";
import { TaskEditForm } from "./TaskEditForm";
import { DeleteTaskButton } from "./DeleteTaskButton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("tasks").select("title").eq("id", id).maybeSingle();
  return { title: `${data?.title ?? "Tasca"} — Prospectia` };
}

interface RawTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  contact_id: string | null;
  salesorder_id: string | null;
  created_at: string;
  updated_at: string;
  creator: { id: string; full_name: string } | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  project: { id: string; name: string; color: string } | null;
}

interface RawComment {
  id: string;
  content: string;
  created_at: string;
  author: { id: string; full_name: string; avatar_url: string | null } | null;
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const [taskRes, commentsRes, projectsRes, profilesRes] = await Promise.all([
    admin
      .from("tasks")
      .select(`
        id, title, description, status, priority, due_date, project_id, assignee_id, contact_id, salesorder_id, created_at, updated_at,
        creator:profiles!tasks_creator_id_fkey(id, full_name),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
        project:task_projects(id, name, color)
      `)
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("task_comments")
      .select(`id, content, created_at, author:profiles!task_comments_author_id_fkey(id, full_name, avatar_url)`)
      .eq("task_id", id)
      .order("created_at", { ascending: true }),
    admin.from("task_projects").select("id, name, color").is("archived_at", null).order("name"),
    admin.from("profiles").select("id, full_name").order("full_name"),
  ]);

  if (!taskRes.data) notFound();

  const raw = taskRes.data as unknown as RawTask;
  const task = {
    ...raw,
    status:   raw.status   as TaskStatus,
    priority: raw.priority as TaskPriority,
    creator:  Array.isArray(raw.creator)  ? (raw.creator[0]  ?? null) : (raw.creator  ?? null),
    assignee: Array.isArray(raw.assignee) ? (raw.assignee[0] ?? null) : (raw.assignee ?? null),
    project:  Array.isArray(raw.project)  ? (raw.project[0]  ?? null) : (raw.project  ?? null),
  };

  const comments = ((commentsRes.data ?? []) as unknown as RawComment[]).map(c => ({
    ...c,
    author: Array.isArray(c.author) ? (c.author[0] ?? null) : (c.author ?? null),
  }));

  const projects = (projectsRes.data ?? []) as { id: string; name: string; color: string }[];
  const profiles = (profilesRes.data ?? []) as { id: string; full_name: string }[];

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-6">
        <Link href="/dashboard/tareas" className="hover:text-[#8E0E1A] transition-colors">
          Tareas
        </Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M4.5 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[#374151] truncate max-w-[300px]">{task.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Edit form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h2 className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-4">
              Detalles de la tarea
            </h2>
            <TaskEditForm
              task={task}
              profiles={profiles}
              projects={projects}
            />
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h2 className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-4">
              Comentarios ({comments.length})
            </h2>
            <CommentThread taskId={id} initialComments={comments} />
          </div>
        </div>

        {/* Right: Metadata */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
            <h3 className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Información</h3>

            {task.creator && (
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">Creado por</p>
                <p className="text-sm font-medium text-[#374151]">{task.creator.full_name}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">Creado</p>
              <p className="text-sm font-medium text-[#374151]">{fmtDate(task.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">Actualizado</p>
              <p className="text-sm font-medium text-[#374151]">{fmtDate(task.updated_at)}</p>
            </div>

            {task.contact_id && (
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">Cliente vinculado</p>
                <Link
                  href={`/dashboard/clientes/${task.contact_id}`}
                  className="text-sm font-medium text-[#8E0E1A] hover:underline"
                >
                  Ver cliente →
                </Link>
              </div>
            )}
            {task.salesorder_id && (
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">Pedido vinculado</p>
                <Link
                  href={`/dashboard/pedidos/${task.salesorder_id}`}
                  className="text-sm font-medium text-[#8E0E1A] hover:underline"
                >
                  Ver pedido →
                </Link>
              </div>
            )}
          </div>

          {/* Delete */}
          <DeleteTaskButton taskId={id} />
        </div>
      </div>
    </div>
  );
}
