"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus   = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskFormState {
  error?: string;
  success?: boolean;
  taskId?: string;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getSessionProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  return profile ?? null;
}

// ─── Notifications helper ─────────────────────────────────────────────────────

async function notify(
  admin: ReturnType<typeof createAdminClient>,
  opts: {
    recipientId: string;
    actorId: string;
    taskId: string;
    type: "assigned" | "commented" | "status_changed" | "mentioned";
  }
) {
  if (opts.recipientId === opts.actorId) return; // no self-notify
  await admin.from("task_notifications").insert({
    recipient_id: opts.recipientId,
    actor_id:     opts.actorId,
    task_id:      opts.taskId,
    type:         opts.type,
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProjectAction(
  _prev: TaskFormState | null,
  formData: FormData
): Promise<TaskFormState> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autenticado" };

  const name  = (formData.get("name") as string)?.trim();
  const color = (formData.get("color") as string) || "#8E0E1A";
  const icon  = (formData.get("icon")  as string) || "folder";
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name) return { error: "El nom és obligatori" };

  const admin = createAdminClient();
  const { error } = await admin.from("task_projects").insert({
    name, description, color, icon, created_by: profile.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/tareas");
  return { success: true };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTaskAction(
  _prev: TaskFormState | null,
  formData: FormData
): Promise<TaskFormState> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autenticado" };

  const title      = (formData.get("title")      as string)?.trim();
  if (!title) return { error: "El títol és obligatori" };

  const assigneeId   = (formData.get("assignee_id")   as string) || null;
  const projectId    = (formData.get("project_id")    as string) || null;
  const contactId    = (formData.get("contact_id")    as string) || null;
  const salesorderId = (formData.get("salesorder_id") as string) || null;
  const dueDate      = (formData.get("due_date")      as string) || null;
  const priority     = ((formData.get("priority")     as string) || "medium") as TaskPriority;
  const description  = (formData.get("description")   as string)?.trim() || null;
  const status       = ((formData.get("status")       as string) || "todo") as TaskStatus;

  const admin = createAdminClient();

  // Position at end of column
  const { data: last } = await admin
    .from("tasks")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1000;

  const { data: task, error } = await admin.from("tasks").insert({
    title, description, status, priority, position,
    project_id:    projectId,
    assignee_id:   assigneeId,
    creator_id:    profile.id,
    due_date:      dueDate || null,
    contact_id:    contactId,
    salesorder_id: salesorderId,
  }).select("id").single();

  if (error) return { error: error.message };

  // Notify assignee
  if (assigneeId && task) {
    await notify(admin, {
      recipientId: assigneeId, actorId: profile.id,
      taskId: task.id, type: "assigned",
    });
  }

  revalidatePath("/dashboard/tareas");
  return { success: true, taskId: task?.id };
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus): Promise<void> {
  const profile = await getSessionProfile();
  if (!profile) return;

  const admin = createAdminClient();
  const { data: task } = await admin.from("tasks").select("assignee_id, creator_id").eq("id", taskId).maybeSingle();
  await admin.from("tasks").update({ status }).eq("id", taskId);

  // Notify creator/assignee of status change
  const toNotify = new Set<string>();
  if (task?.assignee_id) toNotify.add(task.assignee_id);
  if (task?.creator_id)  toNotify.add(task.creator_id);
  for (const recipientId of toNotify) {
    await notify(admin, { recipientId, actorId: profile.id, taskId, type: "status_changed" });
  }

  revalidatePath("/dashboard/tareas");
}

export async function updateTaskAction(
  _prev: TaskFormState | null,
  formData: FormData
): Promise<TaskFormState> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autenticado" };

  const taskId = formData.get("task_id") as string;
  if (!taskId) return { error: "ID de tasca no trobat" };

  const title       = (formData.get("title")       as string)?.trim();
  if (!title) return { error: "El títol és obligatori" };

  const assigneeId   = (formData.get("assignee_id")   as string) || null;
  const projectId    = (formData.get("project_id")    as string) || null;
  const contactId    = (formData.get("contact_id")    as string) || null;
  const salesorderId = (formData.get("salesorder_id") as string) || null;
  const dueDate      = (formData.get("due_date")      as string) || null;
  const priority     = (formData.get("priority")      as string) as TaskPriority;
  const description  = (formData.get("description")   as string)?.trim() || null;
  const status       = (formData.get("status")        as string) as TaskStatus;

  const admin = createAdminClient();

  // Detect assignee change for notification
  const { data: prev } = await admin.from("tasks").select("assignee_id").eq("id", taskId).maybeSingle();
  const oldAssignee = prev?.assignee_id ?? null;

  await admin.from("tasks").update({
    title, description, status, priority,
    project_id: projectId, assignee_id: assigneeId,
    due_date: dueDate || null,
    contact_id: contactId, salesorder_id: salesorderId,
  }).eq("id", taskId);

  if (assigneeId && assigneeId !== oldAssignee) {
    await notify(admin, { recipientId: assigneeId, actorId: profile.id, taskId, type: "assigned" });
  }

  revalidatePath("/dashboard/tareas");
  revalidatePath(`/dashboard/tareas/${taskId}`);
  return { success: true };
}

export async function deleteTaskAction(taskId: string): Promise<void> {
  const profile = await getSessionProfile();
  if (!profile) return;
  const admin = createAdminClient();
  await admin.from("tasks").delete().eq("id", taskId);
  revalidatePath("/dashboard/tareas");
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function createCommentAction(
  _prev: TaskFormState | null,
  formData: FormData
): Promise<TaskFormState> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "No autenticado" };

  const taskId  = formData.get("task_id")  as string;
  const content = (formData.get("content") as string)?.trim();
  if (!taskId || !content) return { error: "Contingut buit" };

  const admin = createAdminClient();
  await admin.from("task_comments").insert({
    task_id: taskId, author_id: profile.id, content,
  });

  // Notify task creator + assignee
  const { data: task } = await admin.from("tasks").select("assignee_id, creator_id").eq("id", taskId).maybeSingle();
  const toNotify = new Set<string>();
  if (task?.assignee_id) toNotify.add(task.assignee_id);
  if (task?.creator_id)  toNotify.add(task.creator_id);
  for (const recipientId of toNotify) {
    await notify(admin, { recipientId, actorId: profile.id, taskId, type: "commented" });
  }

  revalidatePath(`/dashboard/tareas/${taskId}`);
  return { success: true };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function markNotificationsReadAction(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const profile = await getSessionProfile();
  if (!profile) return;
  const admin = createAdminClient();
  await admin.from("task_notifications").update({ is_read: true }).in("id", ids).eq("recipient_id", profile.id);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const profile = await getSessionProfile();
  if (!profile) return;
  const admin = createAdminClient();
  await admin.from("task_notifications").update({ is_read: true }).eq("recipient_id", profile.id).eq("is_read", false);
  revalidatePath("/dashboard");
}
