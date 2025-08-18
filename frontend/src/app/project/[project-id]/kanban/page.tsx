'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, User, Calendar, Flag, MoreHorizontal, Filter, Search, FolderOpen, Kanban, X, ChevronDown, Clock, CalendarDays, LayoutGrid, RotateCcw } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { api } from '@/utils/api';
import { mapApiUserToDomain } from '@/utils/mappers';
import { ApiBacklog, ApiUser } from '@/types/api';
import { TaskStatus } from '@/types/enums';
import 'vis-timeline/styles/vis-timeline-graph2d.css';

interface Task {
  id: number;
  title: string;
  description: string;
  assignees: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  storyPoints: number;
  status: 'todo' | 'in_progress' | 'done';
  labels: string[];
  dueDate?: string;
  epic?: string;
  sprintId?: number;
  backlogId: number;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  limit?: number;
}

const mockTasks: Task[] = [
  {
    id: 1,
    title: 'User Login Page Design',
    description: 'Design user-friendly login interface with form validation and error handling',
    assignees: ['John Smith'],
    priority: 'high',
    storyPoints: 5,
    status: 'todo',
    labels: ['UI/UX', 'Frontend'],
    dueDate: '2024-03-20',
    epic: 'User Authentication System',
    sprintId: 1,
    backlogId: 1,
  },
  {
    id: 2,
    title: 'Password Reset Feature Development',
    description: 'Implement email verification password reset flow',
    assignees: ['Sarah Johnson'],
    priority: 'medium',
    storyPoints: 8,
    status: 'in_progress',
    labels: ['Backend', 'API'],
    dueDate: '2024-03-25',
    epic: 'User Authentication System',
    sprintId: 1,
    backlogId: 2,
  },
  {
    id: 3,
    title: 'Product List Page Optimization',
    description: 'Optimize product list loading performance and user experience',
    assignees: ['Mike Chen'],
    priority: 'medium',
    storyPoints: 3,
    status: 'in_progress',
    labels: ['Frontend', 'Performance'],
    dueDate: '2024-03-18',
    epic: 'Product Management',
    sprintId: 1,
    backlogId: 3,
  },
  {
    id: 4,
    title: 'Payment API Integration',
    description: 'Integrate third-party payment platform API',
    assignees: ['Emily Rodriguez'],
    priority: 'critical',
    storyPoints: 13,
    status: 'done',
    labels: ['Backend', 'Payment'],
    epic: 'Order System',
    sprintId: 1,
    backlogId: 4,
  },
  {
    id: 5,
    title: 'Shopping Cart Testing',
    description: 'Write unit tests and integration tests',
    assignees: ['David Park'],
    priority: 'low',
    storyPoints: 2,
    status: 'todo',
    labels: ['Testing'],
    dueDate: '2024-03-30',
    epic: 'Shopping System',
    sprintId: 1,
    backlogId: 5,
  },
  {
    id: 6,
    title: 'Database Performance Optimization',
    description: 'Optimize product query SQL and add indexes',
    assignees: ['Sarah Johnson', 'Mike Chen'],
    priority: 'high',
    storyPoints: 5,
    status: 'in_progress',
    labels: ['Backend', 'Database'],
    epic: 'Performance Optimization',
    sprintId: 1,
    backlogId: 6,
  },
];

const columns: Column[] = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-700', tasks: [] },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/20', tasks: [] },
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

// Mock sprint backlog items for demonstration
const mockSprintBacklogItems = [
  {
    id: 1,
    title: 'User Authentication System',
    description: 'Complete user authentication and authorization system',
    status: 'in_progress',
    priority: 'high',
    created_at: '2024-03-15T10:00:00Z',
    assigned_to_id: 1,
    tasks: [],
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-03-31T23:59:59Z'
  },
  {
    id: 2,
    title: 'Product Management Features',
    description: 'Product catalog and management features',
    status: 'todo',
    priority: 'medium',
    created_at: '2024-03-16T14:30:00Z',
    assigned_to_id: 2,
    tasks: [],
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-03-31T23:59:59Z'
  },
  {
    id: 3,
    title: 'Order Processing System',
    description: 'Complete order processing and payment system',
    status: 'in_progress',
    priority: 'critical',
    created_at: '2024-03-17T09:15:00Z',
    assigned_to_id: 3,
    tasks: [],
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-03-31T23:59:59Z'
  },
  {
    id: 4,
    title: 'Performance Optimization',
    description: 'System performance improvements and optimizations',
    status: 'todo',
    priority: 'low',
    created_at: '2024-03-18T16:45:00Z',
    assigned_to_id: 4,
    tasks: [],
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-03-31T23:59:59Z'
  }
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
  currentSprint: any;
  sprintBacklogItems: any[];
  searchTerm: string;
  selectedAssignee: string;
  selectedPriority: string;
}> = ({ tasks, onCreateTask, getPriorityColor, getPriorityIcon, currentSprint, sprintBacklogItems, searchTerm, selectedAssignee, selectedPriority }) => {
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

  // Filter epics based on search only (priority filter does NOT apply to epics)
  const filteredEpics = mockEpics.filter(epic => {
    const matchesSearch = !searchTerm || 
      epic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      epic.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Priority filter does NOT apply to epics - they are always visible
    // const matchesPriority = !selectedPriority || 
    //   epic.priority.toLowerCase() === selectedPriority.toLowerCase();
    
    return matchesSearch; // Removed priority filtering for epics
  });

  // Filter tasks based on search, assignee, and priority
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssignee = !selectedAssignee || 
      task.assignees.includes(selectedAssignee);
    
    const matchesPriority = !selectedPriority || 
      task.priority === selectedPriority;
    
    return matchesSearch && matchesAssignee && matchesPriority;
  });

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
        filteredEpics.forEach((epic) => {
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
              <div class="stories-count">${filteredTasks.length} stories</div>
            </div>
          `,
          className: 'stories-group',
          order: 2
        });

        // Add user stories (tasks) to the timeline
        filteredTasks
          .filter(task => task.dueDate) // Only show tasks with due dates
          .forEach((task) => {
            const startDate = new Date(task.dueDate!);
            // Create end date based on story points (1 point = 1 day)
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + (task.storyPoints || 1));

            items.add({
              id: task.id,
              group: userStoryGroup,
              content: `
                <div class="story-timeline-content">
                  <div class="story-timeline-title">${task.title}</div>
                  <div class="story-timeline-meta">
                    <span class="story-priority">${getPriorityIcon(task.priority)} ${task.priority.toUpperCase()}</span>
                    <span class="story-points">${task.storyPoints}SP</span>
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
  }, [filteredTasks, filteredEpics, getPriorityIcon]);

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

      {/* Filter Summary */}
      {(searchTerm || selectedAssignee || selectedPriority) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Active Filters:</span>
            {searchTerm && (
              <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                Search: "{searchTerm}"
              </span>
            )}
            {selectedAssignee && (
              <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                Assignee: {selectedAssignee}
              </span>
            )}
            {selectedPriority && (
              <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                Priority: {selectedPriority} (Tasks only, not user stories)
              </span>
            )}
            <span className="ml-auto text-xs">
              Showing {filteredEpics.length} epics and {filteredTasks.filter(t => t.dueDate).length} user stories with due dates
            </span>
          </div>
        </div>
      )}

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
            <span>📋</span>
            User Stories (Sprint Backlog Items)
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Critical</span>
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Shown for every day within the sprint/month time span
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            ⚡ Filters apply: Search, Assignee (Priority only affects tasks)
          </p>
        </div>

        {/* Tasks Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>⚡</span>
            In-Progress Tasks
          </h4>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">In Progress</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Only shows tasks currently being worked on
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            ⚡ Filters apply: Search, Assignee, Priority
          </p>
        </div>
      </div>

      {/* Empty state */}
      {filteredTasks.filter(task => task.dueDate).length === 0 && filteredEpics.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No items found</p>
          <p className="text-sm">Try adjusting your filters or add new items</p>
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
  currentSprint: any;
  sprintBacklogItems: any[];
  searchTerm: string;
  selectedAssignee: string;
  selectedPriority: string;
}> = ({ tasks, onCreateTask, getPriorityColor, getPriorityIcon, currentSprint, sprintBacklogItems, searchTerm, selectedAssignee, selectedPriority }) => {
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
  
  // Filter items based on search, assignee, and priority
  const filteredSprintBacklogItems = sprintBacklogItems.filter((backlogItem: any) => {
    const matchesSearch = !searchTerm || 
      backlogItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (backlogItem.description && backlogItem.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAssignee = !selectedAssignee || 
      (backlogItem.assigned_to_id && `User ${backlogItem.assigned_to_id}` === selectedAssignee);
    
    // Priority filter does NOT apply to user stories - they are always visible
    // const matchesPriority = !selectedPriority || 
    //   (backlogItem.priority && backlogItem.priority.toLowerCase() === selectedPriority.toLowerCase());
    
    return matchesSearch && matchesAssignee; // Removed priority filtering for user stories
  });
  
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssignee = !selectedAssignee || 
      task.assignees.includes(selectedAssignee);
    
    const matchesPriority = !selectedPriority || 
      task.priority === selectedPriority;
    
    const matchesStatus = task.status === 'in_progress';
    
    return matchesSearch && matchesAssignee && matchesPriority && matchesStatus;
  });
  
  // Group items by date - include both filtered backlog items and filtered tasks
  const itemsByDate = new Map<string, Array<{
    type: 'backlog' | 'task';
    item: any;
    displayTitle: string;
    priority: string;
    status: string;
    assignees: string[];
    parentStory?: string;
  }>>();
  
  // Add filtered sprint backlog items (user stories) - show for every day within sprint time span
  if (filteredSprintBacklogItems && filteredSprintBacklogItems.length > 0) {
    if (currentSprint) {
      // Real sprint data - show for every day within sprint time span
      const sprintStartDate = new Date(currentSprint.startDate);
      const sprintEndDate = new Date(currentSprint.endDate);
      
      // Generate all dates within the sprint
      const sprintDates: string[] = [];
      const currentDate = new Date(sprintStartDate);
      
      while (currentDate <= sprintEndDate) {
        sprintDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Add each filtered backlog item to every day within the sprint
      filteredSprintBacklogItems.forEach((backlogItem: any) => {
        sprintDates.forEach(dateStr => {
          if (!itemsByDate.has(dateStr)) {
            itemsByDate.set(dateStr, []);
          }
          
          itemsByDate.get(dateStr)!.push({
            type: 'backlog',
            item: backlogItem,
            displayTitle: backlogItem.title,
            priority: backlogItem.priority || 'medium',
            status: backlogItem.status || 'todo',
            assignees: backlogItem.assigned_to_id ? [`User ${backlogItem.assigned_to_id}`] : [],
            parentStory: undefined // Backlog items are the parent stories
          });
        });
      });
    } else {
      // Mock data - show for every day within the month being viewed
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      // Generate all dates within the viewed month
      const monthDates: string[] = [];
      const currentDate = new Date(monthStart);
      
      while (currentDate <= monthEnd) {
        monthDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Add each filtered backlog item to every day within the month
      filteredSprintBacklogItems.forEach((backlogItem: any) => {
        monthDates.forEach(dateStr => {
          if (!itemsByDate.has(dateStr)) {
            itemsByDate.set(dateStr, []);
          }
          
          itemsByDate.get(dateStr)!.push({
            type: 'backlog',
            item: backlogItem,
            displayTitle: backlogItem.title,
            priority: backlogItem.priority || 'medium',
            status: backlogItem.status || 'todo',
            assignees: backlogItem.assigned_to_id ? [`User ${backlogItem.assigned_to_id}`] : [],
            parentStory: undefined // Backlog items are the parent stories
          });
        });
      });
    }
  }
  
  // Add filtered in-progress tasks only
  filteredTasks.forEach((task) => {
    // Only show tasks that are "in_progress"
    if (task.status === 'in_progress') {
      // Use dueDate if available, otherwise use current date
      const taskDate = task.dueDate || new Date().toISOString().split('T')[0];
      
      if (!itemsByDate.has(taskDate)) {
        itemsByDate.set(taskDate, []);
      }
      
      // Find the parent backlog item for this task
      let parentStory = 'Unknown Story';
      if (filteredSprintBacklogItems && filteredSprintBacklogItems.length > 0) {
        const parentBacklog = filteredSprintBacklogItems.find((backlog: any) => 
          backlog.tasks && backlog.tasks.some((t: any) => t.id === task.id)
        );
        if (parentBacklog) {
          parentStory = parentBacklog.title;
        }
      }
      
      itemsByDate.get(taskDate)!.push({
        type: 'task',
        item: task,
        displayTitle: task.title,
        priority: task.priority,
        status: task.status,
        assignees: task.assignees,
        parentStory: parentStory
      });
    }
  });
  
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

  // Helper function to get display color based on type and priority
  const getDisplayColor = (type: 'backlog' | 'task', priority: string, status: string) => {
    if (type === 'backlog') {
      // Backlog items (user stories) get distinct colors
      switch (priority.toLowerCase()) {
        case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-l-red-500';
        case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-l-orange-500';
        case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-l-blue-500';
        case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-l-green-500';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-l-gray-500';
      }
    } else {
      // Tasks get status-based colors
      switch (status) {
        case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-l-blue-500';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-l-gray-500';
      }
    }
  };

  // Helper function to get icon based on type
  const getDisplayIcon = (type: 'backlog' | 'task', priority: string) => {
    if (type === 'backlog') {
      return getPriorityIcon(priority);
    } else {
      return '⚡'; // Lightning bolt for in-progress tasks
    }
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

      {/* Filter Summary */}
      {(searchTerm || selectedAssignee || selectedPriority) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Active Filters:</span>
            {searchTerm && (
              <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                Search: "{searchTerm}"
              </span>
            )}
            {selectedAssignee && (
              <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                Assignee: {selectedAssignee}
              </span>
            )}
            {selectedPriority && (
              <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                Priority: {selectedPriority} (Tasks only, not user stories)
              </span>
            )}
            <span className="ml-auto text-xs">
              Showing {filteredSprintBacklogItems.length} user stories and {filteredTasks.filter(t => t.status === 'in_progress').length} in-progress tasks
            </span>
          </div>
        </div>
      )}

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
            const dayItems = itemsByDate.get(dateStr) || [];
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);
            
            return (
              <div
                key={index}
                className={`min-h-[140px] border-b border-r border-gray-200 dark:border-gray-700 p-2 ${
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
                  {dayItems.slice(0, 4).map((item, itemIndex) => (
                    <div
                      key={`${item.type}-${item.item.id}-${itemIndex}`}
                      className={`text-xs p-2 rounded border-l-4 ${getDisplayColor(item.type, item.priority, item.status)}`}
                      title={`${item.type === 'backlog' ? 'User Story' : 'Task'}: ${item.displayTitle}${item.parentStory ? ` (from: ${item.parentStory})` : ''}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-medium">{getDisplayIcon(item.type, item.priority)}</span>
                        <span className="text-xs opacity-75">
                          {item.type === 'backlog' ? '📋' : '⚡'}
                        </span>
                        {item.type === 'backlog' && (
                          <span 
                            className="text-xs opacity-75 text-blue-600 dark:text-blue-400 cursor-help"
                            title="User story visible throughout sprint/month"
                          >
                            📅
                          </span>
                        )}
                      </div>
                      <div className="font-medium truncate" title={item.displayTitle}>
                        {item.displayTitle}
                      </div>
                      {item.parentStory && (
                        <div className="text-xs opacity-75 truncate" title={`From: ${item.parentStory}`}>
                          📖 {item.parentStory}
                        </div>
                      )}
                      {item.assignees.length > 0 && (
                        <div className="text-xs opacity-75 truncate" title={`Assigned to: ${item.assignees.join(', ')}`}>
                          👤 {item.assignees.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {dayItems.length > 4 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 p-1">
                      +{dayItems.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Stories Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>📋</span>
            User Stories (Sprint Backlog Items)
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Critical</span>
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Shown for every day within the sprint/month time span
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            ⚡ Filters apply: Search, Assignee (Priority only affects tasks)
          </p>
        </div>

        {/* Tasks Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>⚡</span>
            In-Progress Tasks
          </h4>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">In Progress</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Only shows tasks currently being worked on
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            ⚡ Filters apply: Search, Assignee, Priority
          </p>
        </div>
      </div>
      
      {/* Empty state */}
      {Array.from(itemsByDate.values()).every(items => items.length === 0) && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No items scheduled</p>
          <p className="text-sm">Create user stories and tasks to see them on the calendar</p>
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
  onTaskStatusUpdate?: (taskId: number, newStatus: string) => Promise<void>;
}> = ({ tasks, setTasks, onCreateTask, getPriorityColor, getPriorityIcon, columns, getTasksByStatus, onTaskStatusUpdate }) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      const taskId = draggedTask.id;
      setIsUpdating(taskId);
      
      try {
        // Update local state immediately for responsive UI
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === draggedTask.id
              ? { ...task, status: newStatus as Task['status'] }
              : task
          )
        );

        // Call API to update task status if callback provided
        if (onTaskStatusUpdate) {
          await onTaskStatusUpdate(taskId, newStatus);
        }
      } catch (error) {
        console.error('Error updating task status:', error);
        // Revert local state on error
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === draggedTask.id
              ? { ...task, status: draggedTask.status }
              : task
          )
        );
      } finally {
        setIsUpdating(null);
      }
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
                draggable={!isUpdating || isUpdating !== task.id}
                onDragStart={(e) => handleDragStart(e, task)}
                className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow border-l-4 border-l-blue-500 ${
                  isUpdating === task.id ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {/* Loading indicator for status update */}
                {isUpdating === task.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

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
                    <span className="font-medium">{task.storyPoints}SP</span>
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
      storyPoints: 1, // Default story points
      labels: formData.labels,
      sprintId: 1, // Default sprint ID
      backlogId: 1 // Default backlog ID
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
                <option value="critical">Critical</option>
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
                <option value="in_progress">In Progress</option>
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  
  // API integration state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSprint, setCurrentSprint] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sprintBacklogItems, setSprintBacklogItems] = useState<any[]>([]);
  
  // Task creation modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [initialTaskStatus, setInitialTaskStatus] = useState<string>('todo');

  // 面包屑导航
  const breadcrumbItems = [
    { label: 'Project', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Mobile App Development', href: `/project/${projectId}/dashboard` },
    { label: 'Task Board', icon: <Kanban className="w-4 h-4" /> }
  ];

  // Fetch sprint tasks data from backend
  const fetchSprintTasks = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // First, get project sprints to find the current/active sprint
      const sprintsResponse = await api.sprints.getAll();
      if (sprintsResponse.error) throw new Error(sprintsResponse.error);
      
      const projectSprints = sprintsResponse.data?.filter(sprint => 
        sprint.projectId === parseInt(projectId)
      ) || [];
      
      // Find current sprint (active or most recent)
      let activeSprint = projectSprints.find(sprint => sprint.status === 'active');
      if (!activeSprint) {
        // If no active sprint, get the most recent one
        activeSprint = projectSprints
          .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
      }
      
      if (!activeSprint) {
        // No sprints found, use mock data
        setTasks(mockTasks);
        setSprintBacklogItems(mockSprintBacklogItems);
        setIsLoading(false);
        return;
      }
      
      setCurrentSprint(activeSprint);
      
      // Fetch tasks for the current sprint instead of backlog items
      // Since the backend doesn't support filtering tasks by sprint_id yet,
      // we'll use the sprint backlog endpoint and extract the tasks
      const backlogResponse = await api.sprints.getSprintBacklog(activeSprint.id);
      if (backlogResponse.error) throw new Error(backlogResponse.error);
      
      // Store the backlog items for calendar view
      setSprintBacklogItems(backlogResponse.data || []);
      
      // Extract all tasks from backlog items
      const allTasks: any[] = [];
      (backlogResponse.data || []).forEach((backlogItem: any) => {
        if (backlogItem.tasks && Array.isArray(backlogItem.tasks)) {
          allTasks.push(...backlogItem.tasks);
        }
      });
      
      console.log(`Found ${allTasks.length} tasks in sprint ${activeSprint.id}`);
      
      if (allTasks.length === 0) {
        // No tasks found, use mock data
        setTasks(mockTasks);
        setSprintBacklogItems(mockSprintBacklogItems);
        setIsLoading(false);
        return;
      }
      
      // Get project users for assignee details
      let projectUsers: any[] = [];
      try {
        const usersResponse = await api.sprints.getProjectUsers(activeSprint.id);
        if (!usersResponse.error && usersResponse.data) {
          projectUsers = usersResponse.data;
        }
      } catch (error) {
        console.warn('Could not fetch project users for assignee details:', error);
      }
      
      // Helper function to get user display name
      const getUserDisplayName = (userId: number): string => {
        const user = projectUsers.find(u => u.id === userId);
        if (user) {
          if (user.full_name && user.full_name.trim()) {
            return user.full_name;
          } else if (user.username && user.username.trim()) {
            return user.username;
          } else if (user.email) {
            return user.email.split('@')[0];
          }
        }
        return `User ${userId}`;
      };
      
      // Transform backend task data to frontend Task format
      const transformedTasks: Task[] = (allTasks || []).map((apiTask: any) => {
        console.log('Processing task:', {
          id: apiTask.id,
          title: apiTask.title,
          status: apiTask.status,
          assignees: apiTask.assignees
        });
        
        // Map backend status to frontend status
        let mappedStatus: Task['status'] = 'todo';
        if (apiTask.status) {
          switch (apiTask.status.toLowerCase()) {
            case 'todo':
              mappedStatus = 'todo';
              break;
            case 'in_progress':
              mappedStatus = 'in_progress';
              break;
            case 'done':
              mappedStatus = 'done';
              break;
            default:
              mappedStatus = 'todo';
          }
        }
        
        // Extract assignee names from the backend assignee objects
        const assigneeNames: string[] = [];
        
        if (apiTask.assignees && Array.isArray(apiTask.assignees)) {
          apiTask.assignees.forEach((assignee: any) => {
            if (assignee.full_name && assignee.full_name.trim()) {
              assigneeNames.push(assignee.full_name);
            } else if (assignee.username && assignee.username.trim()) {
              assigneeNames.push(assignee.username);
            } else if (assignee.email) {
              assigneeNames.push(assignee.email.split('@')[0]);
            }
          });
        }
        
        // Remove duplicates
        const uniqueAssigneeNames = [...new Set(assigneeNames)];
        console.log(`Final assignees for ${apiTask.title}:`, uniqueAssigneeNames);
        
        return {
          id: apiTask.id,
          title: apiTask.title,
          description: apiTask.description || '',
          assignees: uniqueAssigneeNames,
          priority: apiTask.priority?.toLowerCase() || 'medium',
          storyPoints: apiTask.story_point || 1,
          status: mappedStatus,
          labels: [], // Tasks don't have labels in the current model
          dueDate: undefined, // Tasks don't have due dates in the current model
          epic: undefined, // Tasks don't have epics in the current model
          sprintId: activeSprint.id,
          backlogId: apiTask.backlog_id || 0,
        };
      });
      
      setTasks(transformedTasks.length > 0 ? transformedTasks : mockTasks);
      
    } catch (err) {
      console.error('Error fetching sprint tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sprint tasks');
      // Fallback to mock data
      setTasks(mockTasks);
      setSprintBacklogItems(mockSprintBacklogItems);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchSprintTasks();
    setIsRefreshing(false);
  };

  // Initial data fetch
  useEffect(() => {
    fetchSprintTasks();
  }, [projectId]);

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[priority as keyof typeof colors];
  };

  const getPriorityIcon = (priority: string) => {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };
    return icons[priority as keyof typeof icons];
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
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
  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'backlogId'>) => {
    if (!currentSprint) {
      alert('No active sprint found. Please create a sprint first.');
      return;
    }
    
    try {
      // Create task in backend
      const newTaskData = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        sprint_id: currentSprint.id,
        backlog_id: 1, // TODO: Get actual backlog ID or create new backlog item
      };
      
      // For now, add to local state (in real implementation, this would be an API call)
      const newTask: Task = {
        ...taskData,
        id: tasks.length + 1, // Simple ID generation
        backlogId: 1, // TODO: Get actual backlog ID
      };
      
      setTasks(prev => [...prev, newTask]);
      setIsCreateTaskModalOpen(false);
      
      // TODO: Implement actual API call to create task
      // const response = await api.tasks.create(newTaskData);
      // if (response.error) throw new Error(response.error);
      // 
      // // Refresh data to get the new task with proper ID
      // await fetchSprintBacklog();
      
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    }
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
          {currentSprint && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Current Sprint: <span className="font-medium">{currentSprint.sprintName}</span>
              {currentSprint.sprintGoal && ` - ${currentSprint.sprintGoal}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector currentView={currentView} onViewChange={setCurrentView} />
          <button 
            onClick={refreshData}
            disabled={isRefreshing}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => openCreateTaskModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading data</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Update Message Display */}
      {updateMessage && (
        <div className={`${
          updateMessage.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        } border rounded-lg p-4`}>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              updateMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              <span className="text-white text-xs">
                {updateMessage.type === 'success' ? '✓' : '!'}
              </span>
            </div>
            <div>
              <h3 className={`text-sm font-medium ${
                updateMessage.type === 'success' 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {updateMessage.type === 'success' ? 'Success' : 'Error'}
              </h3>
              <p className={`text-sm ${
                updateMessage.type === 'success' 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {updateMessage.message}
              </p>
            </div>
            <button
              onClick={() => setUpdateMessage(null)}
              className={`ml-auto hover:opacity-70 ${
                updateMessage.type === 'success' 
                  ? 'text-green-400 hover:text-green-600 dark:hover:text-green-300' 
                  : 'text-red-400 hover:text-red-600 dark:hover:text-red-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading sprint tasks...</p>
          </div>
        </div>
      )}

      {/* Content - only show when not loading */}
      {!isLoading && (
        <>
          {/* Sprint Info */}
          {currentSprint && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    Current Sprint: {currentSprint.sprintName}
                  </h3>
                  {currentSprint.sprintGoal && (
                    <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                      {currentSprint.sprintGoal}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-blue-600 dark:text-blue-300">
                    <span>Start: {new Date(currentSprint.startDate).toLocaleDateString()}</span>
                    <span>End: {new Date(currentSprint.endDate).toLocaleDateString()}</span>
                    <span>Status: {currentSprint.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Sprint Warning */}
          {!currentSprint && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <div>
                  <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
                    No Active Sprint
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                    This project doesn't have an active sprint. Tasks are displayed from mock data.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                <option value="critical">Critical</option>
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
                onTaskStatusUpdate={async (taskId, newStatus) => {
                  try {
                    console.log('Starting status update for task:', { taskId, newStatus });
                    
                    // Check if the status is actually changing
                    const currentTask = tasks.find(t => t.id === taskId);
                    if (!currentTask) {
                      throw new Error('Task not found');
                    }
                    
                    if (currentTask.status === newStatus) {
                      console.log('Status already matches, no update needed');
                      return;
                    }
                    
                    // Validate task ID is a positive number
                    if (!taskId || taskId <= 0) {
                      throw new Error(`Invalid task ID: ${taskId}`);
                    }
                    
                    // Since we're now working with actual tasks, we need to update the task status
                    // Map the frontend status to backend TaskStatus enum
                    const statusMap: Record<string, TaskStatus> = {
                      'todo': TaskStatus.TODO,
                      'in_progress': TaskStatus.IN_PROGRESS,
                      'done': TaskStatus.DONE
                    };
                    
                    const mappedStatus = statusMap[newStatus];
                    if (!mappedStatus) {
                      throw new Error(`Invalid status: ${newStatus}`);
                    }
                    
                    console.log('Mapped status:', { newStatus, mappedStatus });
                    console.log('Calling API:', `/api/v1/tasks/${taskId}/status?status=${mappedStatus}`);
                    
                    // Update the task status in the backend
                    const response = await api.tasks.updateStatus(taskId, mappedStatus);
                    console.log('API response:', response);
                    
                    if (response.error) {
                      throw new Error(response.error);
                    }
                    
                    // Status update successful, local state already updated
                    console.log(`Task ${taskId} status updated to ${mappedStatus}`);
                    
                    // Show success message
                    const task = tasks.find(t => t.id === taskId);
                    const statusDisplay = {
                      'todo': 'To Do',
                      'in_progress': 'In Progress',
                      'done': 'Done'
                    };
                    
                    setUpdateMessage({
                      type: 'success',
                      message: `"${task?.title || 'Task'}" moved to ${statusDisplay[newStatus as keyof typeof statusDisplay]}`
                    });
                    
                    // Clear success message after 3 seconds
                    setTimeout(() => {
                      setUpdateMessage(null);
                    }, 3000);
                    
                  } catch (error) {
                    console.error('Error updating task status:', error);
                    
                    // Log more details about the error
                    if (error instanceof Error) {
                      console.error('Error details:', {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                      });
                    }
                    
                    // Show error message
                    setUpdateMessage({
                      type: 'error',
                      message: `Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`
                    });
                    
                    // Clear error message after 5 seconds
                    setTimeout(() => {
                      setUpdateMessage(null);
                    }, 5000);
                    
                    // Revert local state on API error
                    setTasks(prevTasks =>
                      prevTasks.map(task =>
                        task.id === taskId ? { ...task, status: task.status } : task
                      )
                    );
                  }
                }}
              />
            )}
            
            {currentView === 'timeline' && (
              <TimelineView
                tasks={filteredTasks}
                onCreateTask={openCreateTaskModal}
                getPriorityColor={getPriorityColor}
                getPriorityIcon={getPriorityIcon}
                currentSprint={currentSprint}
                sprintBacklogItems={sprintBacklogItems}
                searchTerm={searchTerm}
                selectedAssignee={selectedAssignee}
                selectedPriority={selectedPriority}
              />
            )}
            
            {currentView === 'calendar' && (
              <CalendarView
                tasks={filteredTasks}
                onCreateTask={openCreateTaskModal}
                getPriorityColor={getPriorityColor}
                getPriorityIcon={getPriorityIcon}
                currentSprint={currentSprint}
                sprintBacklogItems={sprintBacklogItems}
                searchTerm={searchTerm}
                selectedAssignee={selectedAssignee}
                selectedPriority={selectedPriority}
              />
            )}
          </div>
        </>
      )}

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