'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskUI, TaskStatus } from '@/types/api';
import { Plus, User, Calendar, Flag, MoreHorizontal } from 'lucide-react';

interface DragDropKanbanProps {
  tasks: TaskUI[];
  onTaskStatusUpdate: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onCreateTask: (status: TaskStatus) => void;
}

interface Column {
  id: TaskStatus;
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-700' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/20' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100 dark:bg-yellow-900/20' },
  { id: 'done', title: 'Done', color: 'bg-green-100 dark:bg-green-900/20' },
];

// Sortable Task Card Component
const SortableTaskCard: React.FC<{ task: TaskUI }> = ({ task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'border-gray-300 bg-white dark:bg-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 mb-3 rounded-lg border-l-4 cursor-move ${getPriorityColor(task.priority)} hover:shadow-md transition-all`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
          {task.title}
        </h4>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.map((label, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 2).map((assignee, index) => (
                <div
                  key={index}
                  className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 border-2 border-white dark:border-gray-800"
                  title={assignee}
                >
                  {assignee.charAt(0).toUpperCase()}
                </div>
              ))}
              {task.assignees.length > 2 && (
                <div className="w-6 h-6 bg-gray-400 dark:bg-gray-500 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white dark:border-gray-800">
                  +{task.assignees.length - 2}
                </div>
              )}
            </div>
          )}

          {/* Due date */}
          {task.dueDate && (
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Priority */}
          <span title={`Priority: ${task.priority}`} className="text-sm">
            {getPriorityIcon(task.priority)}
          </span>

          {/* Story Points */}
          {task.story_point && (
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full font-medium">
              {task.story_point}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Droppable Column Component
const DroppableColumn: React.FC<{
  column: Column;
  tasks: TaskUI[];
  onCreateTask: (status: TaskStatus) => void;
}> = ({ column, tasks, onCreateTask }) => {
  return (
    <div className={`flex flex-col min-h-[600px] ${column.color} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {column.title}
        </h3>
        <span className="bg-gray-500 dark:bg-gray-400 text-white text-xs px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      {/* Add Task Button */}
      <button 
        onClick={() => onCreateTask(column.id)}
        className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center justify-center"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Task
      </button>
    </div>
  );
};

// Main Kanban Component
const DragDropKanban: React.FC<DragDropKanbanProps> = ({ 
  tasks, 
  onTaskStatusUpdate, 
  onCreateTask 
}) => {
  const [activeTask, setActiveTask] = React.useState<TaskUI | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // Find the task and check if status is actually changing
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await onTaskStatusUpdate(taskId, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Could add a toast notification here
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {columns.map((column) => (
          <SortableContext key={column.id} items={getTasksByStatus(column.id)}>
            <DroppableColumn
              column={column}
              tasks={getTasksByStatus(column.id)}
              onCreateTask={onCreateTask}
            />
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <SortableTaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DragDropKanban;
