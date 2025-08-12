---
globs: frontend/**/*
alwaysApply: false
---

# ScrumiX Frontend Development Guidelines

## TypeScript Standards & Best Practices

- Use TypeScript strictly - no `any` types unless absolutely necessary with proper justification
- Define proper interfaces and types for all components, props, and functions
- Use type imports for type-only imports: `import type { ComponentProps } from 'react'`
- Leverage TypeScript 5+ features like `satisfies` operator and const assertions
- Use proper generic constraints and conditional types where appropriate

```typescript
// Good: Proper interface definition
interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  className?: string;
}

// Good: Type-only imports
import type { FC, ReactNode } from 'react';
import type { Project, Sprint, BacklogItem } from '@/types/scrum';
```

## Next.js 15 App Router Architecture

### File Structure & Naming Conventions
- Use App Router with `app/` directory structure exclusively
- Follow file naming: kebab-case for files, PascalCase for components
- Organize pages by feature/route in `app/` directory
- Keep reusable components in `src/components/` with feature-based organization
- Use proper Next.js 15 file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`

```typescript
// File structure example:
// app/project/[project-id]/kanban/page.tsx
// src/components/kanban/TaskCard.tsx
// src/components/common/Modal.tsx
// src/components/layout/ProjectSidebar.tsx
```

### Next.js Specific Patterns
- Use `'use client'` directive only when necessary (for interactivity, hooks, browser APIs)
- Leverage Server Components by default for better performance
- Use proper dynamic imports with `lazy()` and `Suspense` for code splitting
- Implement proper error boundaries and loading states

```typescript
// Good: Client component only when needed
'use client';

import { useState, useEffect } from 'react';
import { DragDropContext } from '@dnd-kit/core';

const KanbanBoard: FC<KanbanBoardProps> = ({ initialTasks }) => {
  // Interactive logic here
};
```

## Scrum-Specific UI Components & Patterns

### Component Architecture for Scrum Features
- Create reusable components for common Scrum entities: `TaskCard`, `SprintCard`, `BacklogItem`, `BurndownChart`
- Use consistent props interface patterns across similar components
- Implement proper loading states for async data (sprints, tasks, projects)
- Use optimistic updates for better UX in task management

```typescript
// Scrum component example
interface TaskCardProps {
  task: Task;
  isEditable?: boolean;
  showAssignee?: boolean;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  className?: string;
}

const TaskCard: FC<TaskCardProps> = ({ 
  task, 
  isEditable = true, 
  showAssignee = true,
  onStatusChange,
  onEdit,
  className 
}) => {
  // Component implementation
};
```

## UI Framework & Styling

### Tailwind CSS + Custom Design System
- Use Tailwind CSS 4.0+ with the existing design system
- Follow dark/light theme patterns using the ThemeContext
- Use consistent spacing, colors, and typography scales
- Implement responsive design with mobile-first approach

```typescript
// Good: Consistent styling patterns
const cardStyles = cn(
  "bg-white dark:bg-gray-900",
  "border border-gray-200 dark:border-gray-700", 
  "rounded-lg shadow-sm hover:shadow-md transition-shadow",
  "p-4 space-y-3",
  className
);
```

### Component Styling Guidelines
- Use `clsx` or `cn` utility for conditional classes
- Create reusable style variants using `class-variance-authority`
- Maintain consistent hover states and transitions
- Ensure proper focus states for accessibility

```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        outline: "border border-gray-300 bg-transparent hover:bg-gray-50",
        ghost: "hover:bg-gray-100 dark:hover:bg-gray-800",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
```

## State Management Patterns

### Local State Management
- Use React hooks (`useState`, `useReducer`, `useContext`) for component-level state
- Implement custom hooks for reusable stateful logic
- Use Zustand for global client-side state when needed

```typescript
// Custom hook for Scrum functionality
function useTaskManagement(sprintId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status } : task
    ));
  }, []);

  return { tasks, isLoading, updateTaskStatus };
}
```

### Form Handling
- Use React Hook Form for form management
- Implement proper validation with Zod schemas
- Create reusable form components for common Scrum forms

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  assigneeId: z.string().min(1, 'Assignee is required'),
  storyPoints: z.number().min(1).max(21),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

const CreateTaskModal: FC = () => {
  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: 'medium',
      storyPoints: 1,
    },
  });

  // Form implementation
};
```

## Data Fetching & API Integration

### API Integration Patterns
- Create dedicated API service functions in `src/lib/api/`
- Use proper TypeScript interfaces for API responses
- Implement error handling and loading states consistently
- Use the existing mock data pattern for development, prepare for real API integration

```typescript
// API service example
export const projectService = {
  async getProjects(): Promise<Project[]> {
    // Implementation for real API
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  async createProject(data: CreateProjectInput): Promise<Project> {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },
};
```

## Performance Optimization

### React Performance
- Use `React.memo()` for expensive component renders
- Use `useMemo()` and `useCallback()` for expensive computations and stable references
- Implement proper key props for lists (especially for Kanban boards and task lists)
- Use `lazy()` and `Suspense` for code splitting large components

```typescript
// Performance optimized component
const TaskList = React.memo<TaskListProps>(({ tasks, onTaskUpdate }) => {
  const sortedTasks = useMemo(() => 
    tasks.sort((a, b) => a.priority.localeCompare(b.priority)),
    [tasks]
  );

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    onTaskUpdate(taskId, updates);
  }, [onTaskUpdate]);

  return (
    <div className="space-y-2">
      {sortedTasks.map(task => (
        <TaskCard 
          key={task.id} 
          task={task} 
          onUpdate={handleTaskUpdate}
        />
      ))}
    </div>
  );
});
```

## Scrum-Specific UI Libraries Integration

### FullCalendar for Sprint Planning
```typescript
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const SprintCalendar: FC<SprintCalendarProps> = ({ events, onDateSelect }) => {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      selectable={true}
      selectMirror={true}
      select={onDateSelect}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      }}
    />
  );
};
```

### DnD Kit for Kanban Boards
```typescript
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const KanbanBoard: FC<KanbanBoardProps> = ({ columns, tasks }) => {
  const handleDragEnd = (event: DragEndEvent) => {
    // Handle task status change
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto">
        {columns.map(column => (
          <SortableContext 
            key={column.id} 
            items={tasks.filter(t => t.status === column.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn column={column} tasks={tasks} />
          </SortableContext>
        ))}
      </div>
    </DndContext>
  );
};
```

### Recharts for Analytics
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BurndownChart: FC<BurndownChartProps> = ({ sprintData }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={sprintData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="remaining" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Remaining Work"
        />
        <Line 
          type="monotone" 
          dataKey="ideal" 
          stroke="#ef4444" 
          strokeDasharray="5 5"
          name="Ideal Burndown"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

## Accessibility & User Experience

### Scrum-Specific Accessibility
- Ensure keyboard navigation works for Kanban drag-and-drop
- Provide proper ARIA labels for task status changes
- Use semantic HTML for Sprint/Project hierarchy
- Implement proper focus management in modals and dropdowns

```typescript
// Accessible task card
const TaskCard: FC<TaskCardProps> = ({ task, onStatusChange }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}, Status: ${task.status}, Priority: ${task.priority}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onEdit(task);
        }
      }}
      className="task-card focus:ring-2 focus:ring-blue-500 focus:outline-none"
    >
      {/* Task content */}
    </div>
  );
};
```

## Development Workflow

### Code Organization
- Group components by Scrum feature: `/kanban`, `/sprint`, `/backlog`, `/reporting`
- Use barrel exports (`index.ts`) for clean imports
- Implement proper TypeScript path mapping with `@/` alias
- Keep utility functions in `/lib` directory

### Testing Considerations
- Write unit tests for utility functions and custom hooks
- Test component interactions for Scrum workflows
- Mock API calls consistently
- Test accessibility features

## Key Dependencies & Versions

### Core Stack
- Next.js 15.3.3 with App Router and Turbopack
- React 19.0.0 with TypeScript 5+
- Tailwind CSS 4.0+

### Scrum-Specific Libraries
- @dnd-kit/core + @dnd-kit/sortable for Kanban boards
- @fullcalendar/react for sprint planning and timeline views
- recharts for burndown charts and analytics
- vis-timeline for Gantt charts and project timelines

### UI & State
- Lucide React for consistent iconography
- @radix-ui components for accessible primitives
- clsx + class-variance-authority for styling
- zustand for global state when needed
- Framer Motion for animations

### Forms & Validation
- React Hook Form for form management
- Zod for schema validation (prepare for API integration)

## Migration Path from Mock Data

When transitioning from mock data to real API:

1. **Keep mock data structure** - ensure API responses match current interfaces
2. **Create API service layer** - replace mock imports with API calls
3. **Add loading states** - implement proper loading UI for all async operations
4. **Error handling** - add proper error boundaries and user feedback
5. **Optimistic updates** - for better UX in task management flows

```typescript
// Migration example: From mock to API
// Before (mock):
import { mockTasks } from '@/data/mockTasks';

// After (API):
import { taskService } from '@/lib/api/tasks';

const { data: tasks, isLoading, error } = useQuery({
  queryKey: ['tasks', sprintId],
  queryFn: () => taskService.getTasksBySprintId(sprintId),
});
```

Follow these guidelines to maintain consistency, performance, and maintainability in the ScrumiX frontend codebase.
