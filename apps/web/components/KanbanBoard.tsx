'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bug, BugStatus } from '@mantis/shared';
import { applyBugStatusChange } from '@/lib/status-transition';

export interface KanbanBug extends Bug {
  assignee_name?: string;
  component_name?: string;
}

interface KanbanBoardProps {
  initialBugs: KanbanBug[];
  onStatusChange?: (bugId: number, newStatus: BugStatus) => Promise<void>;
  filterQuery?: string;
}

interface ColumnConfig {
  status: BugStatus;
  label: string;
  dotColor: string;
  hasPing?: boolean;
  accentColor: string;
}

const STATUS_COLUMNS: ColumnConfig[] = [
  {
    status: 'UNCONFIRMED',
    label: 'Unconfirmed',
    dotColor: 'bg-outline-variant',
    accentColor: 'bg-outline-variant/30',
  },
  {
    status: 'CONFIRMED',
    label: 'Confirmed',
    dotColor: 'bg-secondary',
    accentColor: 'bg-secondary/50',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    dotColor: 'bg-primary',
    hasPing: true,
    accentColor: 'bg-primary',
  },
  {
    status: 'RESOLVED',
    label: 'Resolved',
    dotColor: 'bg-tertiary',
    accentColor: 'bg-tertiary/40',
  },
  {
    status: 'VERIFIED',
    label: 'Verified',
    dotColor: 'bg-outline-variant',
    accentColor: 'bg-outline-variant/20',
  },
  {
    status: 'CLOSED',
    label: 'Closed',
    dotColor: 'bg-outline',
    accentColor: 'bg-outline/20',
  },
];

const getPriorityPill = (priority: string) => {
  switch (priority) {
    case 'P1':
      return 'bg-error-container text-on-error-container border border-error/30 font-bold';
    case 'P2':
      return 'bg-error/10 text-error font-semibold';
    case 'P3':
      return 'bg-tertiary-container/30 text-tertiary font-semibold';
    case 'P4':
      return 'bg-surface-container text-on-surface-variant';
    default:
      return 'bg-surface-container text-on-surface-variant';
  }
};

// -- Droppable Column Component
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-3 rounded-xl p-1 -mx-1 min-h-[300px]"
    >
      {children}
    </div>
  );
}

// -- Sortable Bug Card Component
function SortableBugCard({
  bug,
  accentColor,
}: {
  bug: KanbanBug;
  accentColor: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bug.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isClosedOrVerified = bug.status === 'CLOSED' || bug.status === 'VERIFIED';
  const isInProgress = bug.status === 'IN_PROGRESS';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-surface-container-lowest rounded-xl p-4 shadow-sm border transition-all cursor-grab active:cursor-grabbing group/card flex flex-col gap-2.5 relative ${
        isInProgress
          ? 'border-primary/30 shadow-[0_4px_16px_-4px_rgba(72,103,48,0.12)] ring-1 ring-primary/20'
          : 'border-outline-variant/20 hover:border-primary/30 hover:shadow-md'
      } ${
        isClosedOrVerified
          ? 'opacity-65 hover:opacity-100'
          : ''
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor} rounded-l-xl`} />

      <div className="flex justify-between items-center pl-2">
        <Link
          href={`/bugs/${bug.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-label-code text-label-code text-primary font-bold hover:underline"
        >
          #{bug.id}
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold flex items-center justify-center">
            {bug.assignee_name ? bug.assignee_name.charAt(0) : 'U'}
          </div>
        </div>
      </div>

      <Link
        href={`/bugs/${bug.id}`}
        onClick={(e) => e.stopPropagation()}
        className={`font-body-sm text-body-sm text-on-surface leading-snug pl-2 line-clamp-2 hover:text-primary transition-colors ${
          bug.status === 'CLOSED' ? 'line-through text-on-surface-variant' : 'font-medium'
        }`}
      >
        {bug.summary}
      </Link>

      <div className="flex items-center justify-between pl-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-md font-label-caps text-[10px] uppercase ${getPriorityPill(
              bug.priority
            )}`}
          >
            {bug.priority}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-label-caps text-[10px] truncate max-w-[100px]">
            {bug.component_name || `Comp #${bug.component_id || 1}`}
          </span>
        </div>

        {bug.status === 'RESOLVED' && (
          <span className="font-label-caps text-[9px] text-tertiary flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-[13px]">done_all</span>
            Fixed
          </span>
        )}
      </div>
    </div>
  );
}

// -- Main Kanban Board Component
export function KanbanBoard({
  initialBugs,
  onStatusChange,
  filterQuery = '',
}: KanbanBoardProps) {
  const [bugs, setBugs] = useState<KanbanBug[]>(initialBugs);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setBugs(initialBugs);
  }, [initialBugs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdNum = parseInt(active.id as string, 10);
    const activeBug = bugs.find((b) => b.id === activeIdNum);
    if (!activeBug) return;

    const overId = over.id as string;
    let newStatus: BugStatus;

    const matchedCol = STATUS_COLUMNS.find((c) => c.status === overId);
    if (matchedCol) {
      newStatus = matchedCol.status;
    } else {
      const overBug = bugs.find((b) => b.id.toString() === overId);
      newStatus = overBug ? overBug.status : activeBug.status;
    }

    if (activeBug.status === newStatus) return;

    // Optimistic Update
    const previousBugs = [...bugs];
    setBugs((prev) =>
      prev.map((b) => (b.id === activeBug.id ? { ...b, status: newStatus } : b))
    );

    try {
      if (onStatusChange) {
        await onStatusChange(activeBug.id, newStatus);
      } else {
        await applyBugStatusChange(activeBug.id, activeBug.status, newStatus);
      }
    } catch (err: any) {
      console.error('Drag and drop failed, rolling back', err);
      alert(err.message || 'Failed to update status. Transition may be invalid or you lack permissions.');
      setBugs(previousBugs);
    }
  };

  const filteredBugs = bugs.filter((b) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      b.summary.toLowerCase().includes(q) ||
      b.id.toString().includes(q) ||
      (b.component_name && b.component_name.toLowerCase().includes(q))
    );
  });

  const activeBug = activeId ? bugs.find((b) => b.id.toString() === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full max-w-full overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex items-start gap-6 min-w-max pb-2">
          {STATUS_COLUMNS.map((col) => {
            const colBugs = filteredBugs.filter((b) => b.status === col.status);
            return (
              <div
                key={col.status}
                className="w-[320px] flex flex-col h-full bg-transparent flex-shrink-0 group"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor} relative`}>
                      {col.hasPing && (
                        <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-60" />
                      )}
                    </div>
                    <h3
                      className={`font-label-caps text-label-caps tracking-widest uppercase font-bold ${
                        col.status === 'IN_PROGRESS'
                          ? 'text-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {col.label}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full font-label-code text-label-code font-bold ${
                        col.status === 'IN_PROGRESS'
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container-high text-on-surface-variant opacity-80'
                      }`}
                    >
                      {colBugs.length}
                    </span>
                  </div>

                  <Link
                    href="/bugs/new"
                    className="text-outline-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Add bug"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </Link>
                </div>

                <DroppableColumn id={col.status}>
                  <SortableContext
                    id={col.status}
                    items={colBugs.map((b) => b.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {colBugs.map((bug) => (
                      <SortableBugCard
                        key={bug.id}
                        bug={bug}
                        accentColor={col.accentColor}
                      />
                    ))}
                  </SortableContext>

                  {colBugs.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-outline-variant/30 rounded-xl bg-surface-container-low/40 flex items-center justify-center text-xs text-outline-variant font-body-sm">
                      No defects in {col.label}
                    </div>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeBug ? (
          <div className="w-[310px] bg-surface-container-lowest rounded-xl p-4 shadow-2xl border-2 border-primary ring-2 ring-primary/30 flex flex-col gap-2.5 opacity-95 transform scale-105 pointer-events-none">
            <div className="flex justify-between items-center">
              <span className="font-label-code text-label-code text-primary font-bold">
                #{activeBug.id}
              </span>
              <span className="px-2 py-0.5 rounded-md font-label-caps text-[10px] uppercase bg-primary-container text-on-primary-container font-bold">
                {activeBug.priority}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface font-semibold line-clamp-2">
              {activeBug.summary}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

