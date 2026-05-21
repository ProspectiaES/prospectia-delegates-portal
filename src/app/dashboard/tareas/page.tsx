import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "./KanbanBoard";
import type { TaskCardData } from "./TaskCard";
import type { TaskStatus, TaskPriority } from "@/app/actions/tasks";

export const metadata = { title: "Tasques — Prospectia" };

interface RawTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  contact_id: string | null;
  salesorder_id: string | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  project: { id: string; name: string; color: string } | null;
  task_comments: { count: number }[];
}

export default async function TareasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const [tasksRes, projectsRes, profilesRes] = await Promise.all([
    admin
      .from("tasks")
      .select(`
        id, title, status, priority, due_date, project_id, assignee_id, contact_id, salesorder_id,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
        project:task_projects(id, name, color),
        task_comments(count)
      `)
      .order("position", { ascending: true }),
    admin
      .from("task_projects")
      .select("id, name, color")
      .is("archived_at", null)
      .order("name"),
    admin
      .from("profiles")
      .select("id, full_name")
      .order("full_name"),
  ]);

  const rawTasks = (tasksRes.data ?? []) as unknown as RawTask[];

  const tasks: TaskCardData[] = rawTasks.map(t => ({
    id:            t.id,
    title:         t.title,
    status:        t.status as TaskStatus,
    priority:      t.priority as TaskPriority,
    due_date:      t.due_date,
    assignee:      Array.isArray(t.assignee) ? (t.assignee[0] ?? null) : (t.assignee ?? null),
    project:       Array.isArray(t.project)  ? (t.project[0]  ?? null) : (t.project  ?? null),
    comment_count: t.task_comments?.[0]?.count ?? 0,
    contact_id:    t.contact_id,
    salesorder_id: t.salesorder_id,
  }));

  const projects = (projectsRes.data ?? []) as { id: string; name: string; color: string }[];
  const profiles = (profilesRes.data ?? []) as { id: string; full_name: string }[];

  return (
    <div className="p-6">
      <KanbanBoard
        initialTasks={tasks}
        profiles={profiles}
        projects={projects}
      />
    </div>
  );
}
