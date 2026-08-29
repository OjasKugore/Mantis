'use client';
import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bug, BugStatus } from '@bugzilla/shared';

// -- Interfaces
interface KanbanBoardProps {
  initialBugs: Bug[];
  onStatusChange?: (bugId: number, newStatus: BugStatus) => Promise<void>;
}

const STATUS_COLUMNS: BugStatus[] = ['UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED'];

// -- Sortable Bug Card Component
function SortableBugCard({ bug }: { bug: Bug }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bug.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 mb-2 rounded border bg-white dark:bg-gray-800 shadow-sm cursor-grab active:cursor-grabbing border-gray-200 dark:border-gray-700`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-sm text-blue-600 dark:text-blue-400">#{bug.id}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{bug.priority}</span>
      </div>
      <p className="text-sm line-clamp-2">{bug.summary}</p>
    </div>
  );
}

// -- Kanban Board
export function KanbanBoard({ initialBugs, onStatusChange }: KanbanBoardProps) {
  const [bugs, setBugs] = useState<Bug[]>(initialBugs);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync state if props change
  useEffect(() => {
    setBugs(initialBugs);
  }, [initialBugs]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

    // Check if dragging over a column container or another item
    const overId = over.id as string;
    let newStatus: BugStatus;
    if (STATUS_COLUMNS.includes(overId as BugStatus)) {
      newStatus = overId as BugStatus;
    } else {
      const overBug = bugs.find((b) => b.id.toString() === overId);
      newStatus = overBug ? overBug.status : activeBug.status;
    }

    if (activeBug.status === newStatus) return; // No change

    // Optimistic Update
    const previousBugs = [...bugs];
    setBugs((prev) => prev.map((b) => (b.id === activeBug.id ? { ...b, status: newStatus } : b)));

    try {
      if (onStatusChange) {
        await onStatusChange(activeBug.id, newStatus);
      } else {
        // Default API patch if no prop provided
        const res = await fetch(`/api/v1/bugs/${activeBug.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, resolution: newStatus === 'RESOLVED' ? 'FIXED' : undefined }), // Very basic fallback resolution
        });
        if (!res.ok) throw new Error('Status update failed');
      }
    } catch (err) {
      console.error('Drag and drop failed, rolling back', err);
      // Rollback
      setBugs(previousBugs);
      alert('Failed to update status. Transition may be invalid.');
    }
  };

  const activeBug = activeId ? bugs.find((b) => b.id.toString() === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {STATUS_COLUMNS.map((status) => {
          const columnBugs = bugs.filter((b) => b.status === status);
          return (
            <div key={status} className="flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-900 rounded-lg flex flex-col max-h-full">
              <div className="p-3 font-semibold border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                {status} <span className="text-xs text-gray-400 ml-1">({columnBugs.length})</span>
              </div>
              <div className="p-2 flex-1 overflow-y-auto min-h-[200px]">
                <SortableContext id={status} items={columnBugs.map((b) => b.id.toString())} strategy={verticalListSortingStrategy}>
                  {columnBugs.map((bug) => (
                    <SortableBugCard key={bug.id} bug={bug} />
                  ))}
                </SortableContext>
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeBug ? (
          <div className="p-3 mb-2 rounded border bg-white dark:bg-gray-800 shadow-xl border-blue-500 opacity-90 transform scale-105">
             <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">#{activeBug.id}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{activeBug.priority}</span>
            </div>
            <p className="text-sm line-clamp-2">{activeBug.summary}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
