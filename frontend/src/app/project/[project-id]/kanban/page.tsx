'use client';

import React, { useState } from 'react';
import { Plus, User, Calendar, Flag, MoreHorizontal, Filter, Search, FolderOpen, Kanban } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: {
    id: string;
    name: string;
    avatar?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  storyPoints: number;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  labels: string[];
  dueDate?: string;
  epic?: string;
  sprintId?: string;
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
    id: '1',
    title: 'User Login Page Design',
    description: 'Design user-friendly login interface with form validation and error handling',
    assignee: { id: '1', name: 'John' },
    priority: 'high',
    storyPoints: 5,
    status: 'todo',
    labels: ['UI/UX', 'Frontend'],
    dueDate: '2024-03-20',
    epic: 'User Authentication System',
    sprintId: '1',
  },
  {
    id: '2',
    title: 'Password Reset Feature Development',
    description: 'Implement email verification password reset flow',
    assignee: { id: '2', name: 'Sarah' },
    priority: 'medium',
    storyPoints: 8,
    status: 'in-progress',
    labels: ['Backend', 'API'],
    dueDate: '2024-03-25',
    epic: 'User Authentication System',
    sprintId: '1',
  },
  {
    id: '3',
    title: 'Product List Page Optimization',
    description: 'Optimize product list loading performance and user experience',
    assignee: { id: '3', name: 'Mike' },
    priority: 'medium',
    storyPoints: 3,
    status: 'review',
    labels: ['Frontend', 'Performance'],
    dueDate: '2024-03-18',
    epic: 'Product Management',
    sprintId: '1',
  },
  {
    id: '4',
    title: 'Payment API Integration',
    description: 'Integrate third-party payment platform API',
    assignee: { id: '4', name: 'Emily' },
    priority: 'urgent',
    storyPoints: 13,
    status: 'done',
    labels: ['Backend', 'Payment'],
    epic: 'Order System',
    sprintId: '1',
  },
  {
    id: '5',
    title: 'Shopping Cart Testing',
    description: 'Write unit tests and integration tests',
    assignee: { id: '5', name: 'David' },
    priority: 'low',
    storyPoints: 2,
    status: 'todo',
    labels: ['Testing'],
    dueDate: '2024-03-30',
    epic: 'Shopping System',
    sprintId: '1',
  },
  {
    id: '6',
    title: 'Database Performance Optimization',
    description: 'Optimize product query SQL and add indexes',
    assignee: { id: '6', name: 'Sarah' },
    priority: 'high',
    storyPoints: 5,
    status: 'in-progress',
    labels: ['Backend', 'Database'],
    epic: 'Performance Optimization',
    sprintId: '1',
  },
];

const columns: Column[] = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-700', tasks: [] },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/20', tasks: [] },
  { id: 'review', title: 'Awaiting Review', color: 'bg-yellow-100 dark:bg-yellow-900/20', tasks: [] },
  { id: 'done', title: 'Completed', color: 'bg-green-100 dark:bg-green-900/20', tasks: [] },
];

interface TaskBoardProps {
  params: Promise<{ 'project-id': string }>;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];
  const [tasks, setTasks] = useState(mockTasks);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

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
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssignee = !selectedAssignee || task.assignee.id === selectedAssignee;
    const matchesPriority = !selectedPriority || task.priority === selectedPriority;
    
    return matchesSearch && matchesAssignee && matchesPriority;
  });

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

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

  const uniqueAssignees = Array.from(new Set(tasks.map(task => task.assignee.id)))
    .map(id => tasks.find(task => task.assignee.id === id)?.assignee)
    .filter(Boolean);

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
            Drag and drop task cards to update status, manage Sprint progress
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          New Task
        </button>
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
              {uniqueAssignees.map(assignee => assignee && (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
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

      {/* 看板列 */}
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
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
                        {task.assignee.name}
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
                  <button className="text-blue-600 hover:text-blue-700 text-sm mt-2">
                    Add Task
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sprint Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {tasks.reduce((sum, task) => sum + task.storyPoints, 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Story Points</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'done').reduce((sum, task) => sum + task.storyPoints, 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed Story Points</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.status === 'in-progress').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">In Progress Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBoard; 