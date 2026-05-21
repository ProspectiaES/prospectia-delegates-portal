"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
} from "@dnd-kit/core";
import { updateTaskStatusAction, TaskStatus } from "@/app/actions/tasks";
import { TaskCard, TaskCardData } from "./TaskCard";
import { CreateTaskModal } from "./CreateTaskModal";

interface Profile { id: string; full_name: string; }
interface Project { id: string; name: string; color: string; }

interface Props {
  initialTasks: TaskCardData[];
  profiles: Profile[];
  projects: Project[];
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo",        label: "Pendent",    color: "#6B7280" },
  { id: "in_progress", label: "En curs",    color: "#2563EB" },
  { id: "done",        label: "Completat",  color: "#059669" },
  { id: "cancelled",   label: "Cancel·lat", color: "#DC2626" },
];

// ─── Draggable card wrapper ───────────────────────────────────────────────────

function DraggableCard({ task }: { task: TaskCardData }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="touch-none"
    >
      <TaskCard task={task} />
    </div>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  tasks,
  profiles,
  projects,
}: {
  column: typeof COLUMNS[number];
  tasks: TaskCardData[];
  profiles: Profile[];
  projects: Project[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
            {column.label}
          </span>
          <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#F3F4F6] text-[#6B7280]">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          title="Nova tasca"
          className="w-6 h-6 rounded flex items-center justify-center text-[#9CA3AF] hover:text-[#8E0E1A] hover:bg-[#FEF2F2] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M7 2v10M2 7h10" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Droppable zone */}
      <div
        ref={setNodeRef}
        className={[
          "flex-1 min-h-[200px] rounded-xl p-2 space-y-2 transition-colors",
          isOver ? "bg-[#FEF2F2]/60 ring-2 ring-[#8E0E1A]/20" : "bg-[#F3F4F6]/60",
        ].join(" ")}
      >
        {tasks.map(task => (
          <DraggableCard key={task.id} task={task} />
        ))}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-[#9CA3AF]">Cap tasca</p>
          </div>
        )}
      </div>

      {showModal && (
        <CreateTaskModal
          defaultStatus={column.id}
          profiles={profiles}
          projects={projects}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function KanbanBoard({ initialTasks, profiles, projects }: Props) {
  const [tasks, setTasks] = useState<TaskCardData[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskCardData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // Persist
    await updateTaskStatusAction(taskId, newStatus);
  }, [tasks]);

  const grouped = COLUMNS.reduce<Record<TaskStatus, TaskCardData[]>>(
    (acc, col) => {
      acc[col.id] = tasks.filter(t => t.status === col.id);
      return acc;
    },
    { todo: [], in_progress: [], done: [], cancelled: [] }
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#0A0A0A]">Tasques</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] focus:ring-offset-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M7 2v10M2 7h10" strokeLinecap="round"/>
          </svg>
          Nova tasca
        </button>
      </div>

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={grouped[col.id]}
              profiles={profiles}
              projects={projects}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 shadow-2xl opacity-95">
              <TaskCard task={activeTask} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showCreateModal && (
        <CreateTaskModal
          profiles={profiles}
          projects={projects}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
