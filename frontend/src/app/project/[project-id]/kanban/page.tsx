'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, User, Calendar, Flag, MoreHorizontal, Filter, Search, FolderOpen, Kanban, X, ChevronDown, Clock, CalendarDays, LayoutGrid, Loader2, AlertCircle } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useSprintTasks } from '@/hooks/useTasks';
import { useProject } from '@/hooks/useProjects';
import { useActiveSprint } from '@/hooks/useSprints';
import type { TaskUI, TaskStatus } from '@/types/api';
import 'vis-timeline/styles/vis-timeline-graph2d.css';

// Use TaskUI from API types
type Task = TaskUI;

interface Column {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
  limit?: number;
}


const columns: Column[] = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-700', tasks: [] },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/20', tasks: [] },
  { id: 'review', title: 'Awaiting Review', color: 'bg-yellow-100 dark:bg-yellow-900/20', tasks: [] },
  { id: 'done', title: 'Completed', color: 'bg-green-100 dark:bg-green-900/20', tasks: [] },
];

// Mock user stories for task creation
const mockUserStories = [
  { id: '1', title: 'User Authentication System' },
  { id: '2', title: 'Product Management' },
  { id: '3', title: 'Order System' },
  { id: '4', title: 'Shopping System' },
  { id: '5', title: 'Performance Optimization' },
];

// Mock team members
const mockTeamMembers = [
  'John Smith',
  'Sarah Johnson', 
  'Mike Chen',
  'Emily Rodriguez',
  'David Park',
  'Lisa Wang'
];

// View types
type ViewType = 'kanban' | 'timeline' | 'calendar';

// ViewSelector component
const ViewSelector: React.FC<{
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}> = ({ currentView, onViewChange }) => {
  const views = [
    { id: 'kanban' as ViewType, label: 'Kanban', icon: LayoutGrid },
    { id: 'timeline' as ViewType, label: 'Timeline', icon: Clock },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: CalendarDays },
  ];

  return (
    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      {views.map(view => {
        const Icon = view.icon;
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === view.id
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="font-medium">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// TimelineView component
const TimelineView: React.FC<{
  tasks: Task[];
  onCreateTask: (status?: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityIcon: (priority: string) => string;
}> = ({ tasks, onCreateTask, getPriorityColor, getPriorityIcon }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineInstance, setTimelineInstance] = useState<any>(null);

  // Mock epics data (normally this would come from your API)
  const mockEpics = [
    {
      id: 'epic-1',
      title: 'User Authentication System',
      description: 'Complete user authentication and authorization system',
      priority: 'high',
      progress: 75,
      startDate: '2024-03-01',
      endDate: '2024-03-20',
      color: '#3b82f6'
    },
    {
      id: 'epic-2', 
      title: 'Product Management',
      description: 'Product catalog and management features',
      priority: 'medium',
      progress: 45,
      startDate: '2024-03-05',
      endDate: '2024-03-25',
      color: '#10b981'
    },
    {
      id: 'epic-3',
      title: 'Order System',
      description: 'Complete order processing and payment system',
      priority: 'urgent',
      progress: 30,
      startDate: '2024-03-10',
      endDate: '2024-03-30',
      color: '#f59e0b'
    },
    {
      id: 'epic-4',
      title: 'Performance Optimization',
      description: 'System performance improvements and optimizations',
      priority: 'low',
      progress: 60,
      startDate: '2024-03-15',
      endDate: '2024-04-05',
      color: '#8b5cf6'
    }
  ];

  useEffect(() => {
    const loadTimeline = async () => {
      if (!timelineRef.current) return;

      try {
        // Dynamic import to avoid SSR issues
        const { DataSet, Timeline } = await import('vis-timeline/standalone');

        // Prepare timeline items
        const items = new DataSet<any>();
        const groups = new DataSet<any>();

        // Add epic groups
        mockEpics.forEach((epic) => {
          groups.add({
            id: epic.id,
            content: `
              <div class="epic-group-content">
                <div class="epic-title">${epic.title}</div>
                <div class="epic-progress">${epic.progress}% complete</div>
              </div>
            `,
            className: 'epic-group',
            order: 1
          });

          // Add epic as timeline item
          items.add({
            id: `epic-${epic.id}`,
            group: epic.id,
            content: `
              <div class="epic-timeline-content">
                <div class="epic-timeline-title">${epic.title}</div>
                <div class="epic-timeline-meta">
                  <span class="epic-priority priority-${epic.priority}">${epic.priority.toUpperCase()}</span>
                  <span class="epic-progress-bar">
                    <div class="progress-fill" style="width: ${epic.progress}%"></div>
                  </span>
                </div>
              </div>
            `,
            start: new Date(epic.startDate),
            end: new Date(epic.endDate),
            type: 'range',
            className: `epic-timeline-item priority-${epic.priority}`,
            title: epic.description
          });
        });

        // Add user story groups
        const userStoryGroup = 'user-stories';
        groups.add({
          id: userStoryGroup,
          content: `
            <div class="stories-group-content">
              <div class="stories-title">User Stories</div>
              <div class="stories-count">${tasks.length} stories</div>
            </div>
          `,
          className: 'stories-group',
          order: 2
        });

        // Add user stories (tasks) to the timeline
        tasks
          .filter(task => task.dueDate) // Only show tasks with due dates
          .forEach((task) => {
            const startDate = new Date(task.dueDate!);
            // Create end date based on story points (1 point = 1 day)
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + (task.story_point || 1));

            items.add({
              id: task.id,
              group: userStoryGroup,
              content: `
                <div class="story-timeline-content">
                  <div class="story-timeline-title">${task.title}</div>
                  <div class="story-timeline-meta">
                    <span class="story-priority">${getPriorityIcon(task.priority)} ${task.priority.toUpperCase()}</span>
                    <span class="story-points">${task.story_point}SP</span>
                    <span class="story-assignees">${task.assignees.join(', ') || 'Unassigned'}</span>
                  </div>
                  ${task.labels.length > 0 ? `
                    <div class="story-labels">
                      ${task.labels.map(label => `<span class="story-label">${label}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `,
              start: startDate,
              end: endDate,
              type: 'range',
              className: `story-timeline-item status-${task.status} priority-${task.priority}`,
              title: task.description
            });
          });

        // Timeline options
        const options = {
          stack: true,
          showCurrentTime: true,
          zoomable: true,
          orientation: { axis: 'top', item: 'top' },
          margin: { item: 10, axis: 5 },
          editable: false,
          multiselect: false,
          groupOrder: 'order',
          height: '500px',
          min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          max: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          format: {
            minorLabels: {
              minute: 'h:mm',
              hour: 'h:mm',
              weekday: 'ddd D',
              day: 'D',
              week: 'w',
              month: 'MMM',
              year: 'YYYY'
            },
            majorLabels: {
              minute: 'ddd D MMMM',
              hour: 'ddd D MMMM',
              weekday: 'MMMM YYYY',
              day: 'MMMM YYYY',
              week: 'MMMM YYYY',
              month: 'YYYY',
              year: ''
            }
          }
        };

        // Create timeline
        const timeline = new Timeline(timelineRef.current, items, groups, options);
        setTimelineInstance(timeline);

        // Add click handler for timeline items
        timeline.on('select', (selection: any) => {
          if (selection.items.length > 0) {
            const itemId = selection.items[0];
            if (itemId.startsWith('epic-')) {
              const epicId = itemId.replace('epic-', '');
              const epic = mockEpics.find(e => e.id === epicId);
              if (epic) {
                console.log('Selected epic:', epic);
              }
            } else {
              const task = tasks.find(t => t.id === itemId);
              if (task) {
                console.log('Selected user story:', task);
              }
            }
          }
        });

      } catch (error) {
        console.error('Error loading timeline:', error);
      }
    };

    loadTimeline();

    // Cleanup
    return () => {
      if (timelineInstance) {
        timelineInstance.destroy();
      }
    };
  }, [tasks, getPriorityIcon]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Timeline View</h3>
        <button
          onClick={() => onCreateTask()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Timeline Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div 
          ref={timelineRef}
          className="w-full timeline-container"
          style={{ minHeight: '500px' }}
        />
      </div>

      {/* Custom Timeline Styles */}
      <style jsx global>{`
        .timeline-container .vis-timeline {
          border: none;
          font-family: inherit;
        }
        
        /* Epic Group Styling */
        .epic-group {
          background: linear-gradient(135deg, #f8fafc, #e2e8f0) !important;
          border-right: 3px solid #3b82f6 !important;
          border-bottom: 1px solid #cbd5e1 !important;
        }
        
        .epic-group-content {
          padding: 8px 12px;
        }
        
        .epic-title {
          font-weight: 700;
          font-size: 14px;
          color: #1e293b;
          margin-bottom: 4px;
        }
        
        .epic-progress {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }
        
        /* Stories Group Styling */
        .stories-group {
          background: linear-gradient(135deg, #fefce8, #fef3c7) !important;
          border-right: 3px solid #f59e0b !important;
          border-bottom: 1px solid #cbd5e1 !important;
        }
        
        .stories-group-content {
          padding: 8px 12px;
        }
        
        .stories-title {
          font-weight: 700;
          font-size: 14px;
          color: #92400e;
          margin-bottom: 4px;
        }
        
        .stories-count {
          font-size: 11px;
          color: #a16207;
          font-weight: 500;
        }
        
        /* Epic Timeline Items */
        .epic-timeline-item {
          border-radius: 8px !important;
          border: none !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
          height: 40px !important;
        }
        
        .epic-timeline-content {
          padding: 6px 12px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .epic-timeline-title {
          font-weight: 600;
          font-size: 13px;
          color: white;
          margin-bottom: 2px;
          line-height: 1.2;
        }
        
        .epic-timeline-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .epic-priority {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.2);
        }
        
        .epic-progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: rgba(255, 255, 255, 0.8);
          transition: width 0.3s ease;
        }
        
        /* Epic Priority Colors */
        .epic-timeline-item.priority-urgent {
          background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
        }
        
        .epic-timeline-item.priority-high {
          background: linear-gradient(135deg, #ea580c, #c2410c) !important;
        }
        
        .epic-timeline-item.priority-medium {
          background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
        }
        
        .epic-timeline-item.priority-low {
          background: linear-gradient(135deg, #10b981, #059669) !important;
        }
        
        /* Story Timeline Items */
        .story-timeline-item {
          border-radius: 6px !important;
          border: none !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          height: 32px !important;
        }
        
        .story-timeline-content {
          padding: 4px 8px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .story-timeline-title {
          font-weight: 600;
          font-size: 11px;
          color: #1f2937;
          margin-bottom: 2px;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .story-timeline-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: #6b7280;
        }
        
        .story-labels {
          display: flex;
          gap: 2px;
          margin-top: 2px;
        }
        
        .story-label {
          background: #dbeafe;
          color: #1e40af;
          padding: 1px 3px;
          border-radius: 2px;
          font-size: 8px;
        }
        
        /* Story Status Colors */
        .story-timeline-item.status-todo {
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb) !important;
          border-left: 4px solid #6b7280 !important;
        }
        
        .story-timeline-item.status-in-progress {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
          border-left: 4px solid #3b82f6 !important;
        }
        
        .story-timeline-item.status-review {
          background: linear-gradient(135deg, #fef3c7, #fde68a) !important;
          border-left: 4px solid #f59e0b !important;
        }
        
        .story-timeline-item.status-done {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0) !important;
          border-left: 4px solid #10b981 !important;
        }
        
        /* Story Priority Indicators */
        .story-timeline-item.priority-urgent .story-priority {
          color: #dc2626;
          font-weight: 700;
        }
        
        .story-timeline-item.priority-high .story-priority {
          color: #ea580c;
          font-weight: 600;
        }
        
        .story-timeline-item.priority-medium .story-priority {
          color: #d97706;
          font-weight: 500;
        }
        
        .story-timeline-item.priority-low .story-priority {
          color: #10b981;
          font-weight: 500;
        }
        
        /* General Timeline Styling */
        .vis-item.vis-selected {
          box-shadow: 0 0 0 3px #3b82f6 !important;
        }
        
        .vis-time-axis {
          background: #f8fafc !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }
        
        .vis-time-axis .vis-text {
          color: #374151 !important;
          font-weight: 600 !important;
        }
        
        .vis-panel.vis-background {
          background: white !important;
        }
        
        .vis-grid.vis-vertical {
          border-left: 1px solid #f1f5f9 !important;
        }
        
        .vis-grid.vis-horizontal {
          border-top: 1px solid #f8fafc !important;
        }
        
        /* Dark mode support */
        .dark .epic-group {
          background: linear-gradient(135deg, #374151, #4b5563) !important;
        }
        
        .dark .epic-title {
          color: #f9fafb;
        }
        
        .dark .epic-progress {
          color: #d1d5db;
        }
        
        .dark .stories-group {
          background: linear-gradient(135deg, #451a03, #78350f) !important;
        }
        
        .dark .stories-title {
          color: #fbbf24;
        }
        
        .dark .stories-count {
          color: #f59e0b;
        }
        
        .dark .story-timeline-title {
          color: #f9fafb;
        }
        
        .dark .story-timeline-meta {
          color: #9ca3af;
        }
        
        .dark .story-label {
          background: #1e40af;
          color: #dbeafe;
        }
        
        .dark .vis-time-axis {
          background: #374151 !important;
          border-bottom: 2px solid #4b5563 !important;
        }
        
        .dark .vis-time-axis .vis-text {
          color: #f3f4f6 !important;
        }
        
        .dark .vis-panel.vis-background {
          background: #1f2937 !important;
        }
      `}</style>

      {/* Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Epics Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            Epics Legend
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Urgent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Low</span>
            </div>
          </div>
        </div>

        {/* User Stories Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            User Stories Status
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 border-l-2 border-gray-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">To Do</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 border-l-2 border-blue-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-200 border-l-2 border-yellow-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-200 border-l-2 border-green-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {tasks.filter(task => task.dueDate).length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No user stories with due dates</p>
          <p className="text-sm">Add due dates to your user stories to see them in the timeline</p>
        </div>
      )}
    </div>
  );
};

// CalendarView component
const CalendarView: React.FC<{
  tasks: Task[];
  onCreateTask: (status?: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityIcon: (priority: string) => string;
}> = ({ tasks, onCreateTask, getPriorityColor, getPriorityIcon }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get current month info
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  // Generate calendar days
  const calendarDays: Date[] = [];
  const currentDay = new Date(startDate);
  
  for (let i = 0; i < 42; i++) {
    calendarDays.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }
  
  // Group tasks by date
  const tasksByDate = tasks.reduce((groups, task) => {
    if (task.dueDate) {
      const date = task.dueDate;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(task);
    }
    return groups;
  }, {} as Record<string, Task[]>);
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Calendar View</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <span className="text-lg font-medium text-gray-900 dark:text-white min-w-[200px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
        </div>
        <button
          onClick={() => onCreateTask()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const dateStr = formatDate(date);
            const dayTasks = tasksByDate[dateStr] || [];
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);
            
            return (
              <div
                key={index}
                className={`min-h-[120px] border-b border-r border-gray-200 dark:border-gray-700 p-2 ${
                  !isCurrentMonthDay ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-800'
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isTodayDate 
                    ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center'
                    : isCurrentMonthDay 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      className={`text-xs p-1 rounded truncate ${
                        task.status === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        task.status === 'review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                      title={task.title}
                    >
                      <span className="mr-1">{getPriorityIcon(task.priority)}</span>
                      {task.title}
                    </div>
                  ))}
                  
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 p-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Tasks Summary */}
      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No tasks scheduled</p>
          <p className="text-sm">Create tasks with due dates to see them on the calendar</p>
        </div>
      )}
    </div>
  );
};

// KanbanView component
const KanbanView: React.FC<{
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onCreateTask: (status?: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityIcon: (priority: string) => string;
  columns: Column[];
  getTasksByStatus: (status: string) => Task[];
}> = ({ tasks, setTasks, onCreateTask, getPriorityColor, getPriorityIcon, columns, getTasksByStatus }) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === draggedTask.id
            ? { ...task, status: newStatus as Task['status'] }
            : task
        )
      );
    }
    setDraggedTask(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-screen">
      {columns.map(column => (
        <div
          key={column.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          {/* 列头 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {column.title}
              </h3>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 text-xs rounded-full">
                {getTasksByStatus(column.id).length}
              </span>
            </div>
            <button 
              onClick={() => onCreateTask(column.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title={`Add task to ${column.title}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* 任务卡片 */}
          <div className="space-y-3">
            {getTasksByStatus(column.id).map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
              >
                {/* 任务头部 */}
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                    {task.title}
                  </h4>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* 任务描述 */}
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {task.description}
                </p>

                {/* 标签 */}
                {task.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {task.labels.map(label => (
                      <span
                        key={label}
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 text-xs rounded-full"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {/* 任务信息 */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                      {getPriorityIcon(task.priority)} {task.priority.toUpperCase()}
                    </span>
                    <span className="font-medium">{task.story_point}SP</span>
                  </div>
                </div>

                {/* 任务底部 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {task.assignees.length > 0 ? task.assignees.join(', ') : 'Unassigned'}
                    </span>
                  </div>

                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{task.dueDate}</span>
                    </div>
                  )}
                </div>

                {/* Epic信息 */}
                {task.epic && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-1">
                      <Flag className="w-3 h-3 text-purple-500" />
                      <span className="text-xs text-purple-600 dark:text-purple-400">
                        {task.epic}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 空状态 */}
            {getTasksByStatus(column.id).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6" />
                </div>
                <p className="text-sm">No tasks</p>
                <button 
                  onClick={() => onCreateTask(column.id)}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                >
                  Add Task
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// CreateTaskModal component
const CreateTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  initialStatus?: string;
}> = ({ isOpen, onClose, onSubmit, initialStatus = 'todo' }) => {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assignees: string[];
    priority: Task['priority'];
    status: Task['status'];
    labels: string[];
  }>({
    title: '',
    description: '',
    assignees: [],
    priority: 'medium',
    status: initialStatus as Task['status'],
    labels: []
  });

  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Task title is required');
      return;
    }

    if (formData.assignees.length === 0) {
      alert('Please select at least one assignee');
      return;
    }

    onSubmit({
      title: formData.title,
      description: formData.description,
      assignees: formData.assignees,
      priority: formData.priority,
      status: formData.status,
      story_point: 1, // Default story points
      labels: formData.labels,
      sprintId: '1', // Default sprint ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      assignees: [],
      priority: 'medium',
      status: initialStatus as Task['status'],
      labels: []
    });
    
    onClose();
  };

  const handleCancel = () => {
    // Reset form on cancel
    setFormData({
      title: '',
      description: '',
      assignees: [],
      priority: 'medium',
      status: initialStatus as Task['status'],
      labels: []
    });
    onClose();
  };

  const toggleAssignee = (member: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(member)
        ? prev.assignees.filter(a => a !== member)
        : [...prev.assignees, member]
    }));
  };

  const removeAssignee = (member: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.filter(a => a !== member)
    }));
  };

  const addLabel = () => {
    if (labelInput.trim() && !formData.labels.includes(labelInput.trim())) {
      setFormData(prev => ({
        ...prev,
        labels: [...prev.labels, labelInput.trim()]
      }));
      setLabelInput('');
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(label => label !== labelToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLabel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Task</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add a new task to the kanban board
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignees <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center"
              >
                <span className="text-gray-500 dark:text-gray-400">
                  {formData.assignees.length === 0 
                    ? 'Select assignees...' 
                    : `${formData.assignees.length} assignee${formData.assignees.length !== 1 ? 's' : ''} selected`
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transform transition-transform ${isAssigneeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isAssigneeDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {mockTeamMembers.map(member => (
                    <label key={member} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignees.includes(member)}
                        onChange={() => toggleAssignee(member)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{member}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {formData.assignees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.assignees.map(member => (
                  <span
                    key={member}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => removeAssignee(member)}
                      className="hover:text-blue-600 dark:hover:text-blue-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Priority and Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Task['status'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Awaiting Review</option>
                <option value="done">Completed</option>
              </select>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Labels
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a label..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addLabel}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Add
              </button>
            </div>
            
            {formData.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.labels.map(label => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => removeLabel(label)}
                      className="hover:text-blue-600 dark:hover:text-blue-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TaskBoardProps {
  params: Promise<{ 'project-id': string }>;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];
  const [tasks, setTasks] = useState(mockTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  
  // Task creation modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [initialTaskStatus, setInitialTaskStatus] = useState<string>('todo');

  // 面包屑导航
  const breadcrumbItems = [
    { label: 'Project', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Mobile App Development', href: `/project/${projectId}/dashboard` },
    { label: 'Task Board', icon: <Kanban className="w-4 h-4" /> }
  ];

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[priority as keyof typeof colors];
  };

  const getPriorityIcon = (priority: string) => {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴',
    };
    return icons[priority as keyof typeof icons];
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssignee = !selectedAssignee || task.assignees.includes(selectedAssignee);
    const matchesPriority = !selectedPriority || task.priority === selectedPriority;
    
    return matchesSearch && matchesAssignee && matchesPriority;
  });

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const uniqueAssignees = Array.from(new Set(tasks.flatMap(task => task.assignees)))
    .filter(Boolean);

  // Task creation handlers
  const handleCreateTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setTasks(prev => [...prev, newTask]);
    setIsCreateTaskModalOpen(false);
  };

  const openCreateTaskModal = (status: string = 'todo') => {
    setInitialTaskStatus(status);
    setIsCreateTaskModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* 页面头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Task Board
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {currentView === 'kanban' ? 'Drag and drop task cards to update status, manage Sprint progress' :
             currentView === 'timeline' ? 'View tasks organized by timeline and due dates' :
             'View tasks in a calendar format to track deadlines'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector currentView={currentView} onViewChange={setCurrentView} />
          <button 
            onClick={() => openCreateTaskModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Members</option>
              {uniqueAssignees.map(assignee => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* View Content */}
      <div>
        {currentView === 'kanban' && (
          <KanbanView
            tasks={filteredTasks}
            setTasks={setTasks}
            onCreateTask={openCreateTaskModal}
            getPriorityColor={getPriorityColor}
            getPriorityIcon={getPriorityIcon}
            columns={columns}
            getTasksByStatus={getTasksByStatus}
          />
        )}
        
        {currentView === 'timeline' && (
          <TimelineView
            tasks={filteredTasks}
            onCreateTask={openCreateTaskModal}
            getPriorityColor={getPriorityColor}
            getPriorityIcon={getPriorityIcon}
          />
        )}
        
        {currentView === 'calendar' && (
          <CalendarView
            tasks={filteredTasks}
            onCreateTask={openCreateTaskModal}
            getPriorityColor={getPriorityColor}
            getPriorityIcon={getPriorityIcon}
          />
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        initialStatus={initialTaskStatus}
      />
    </div>
  );
};

export default TaskBoard; 