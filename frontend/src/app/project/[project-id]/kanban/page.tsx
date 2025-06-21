'use client';

import React, { useState } from 'react';
import { Plus, User, Calendar, Flag, MoreHorizontal, Filter, Search, FolderOpen, Kanban, X, ChevronDown } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];
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
    assignees: ['John Smith'],
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
    assignees: ['Sarah Johnson'],
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
    assignees: ['Mike Chen'],
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
    assignees: ['Emily Rodriguez'],
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
    assignees: ['David Park'],
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
    assignees: ['Sarah Johnson', 'Mike Chen'],
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
      sprintId: '1' // Default sprint ID
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
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  
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
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssignee = !selectedAssignee || task.assignees.includes(selectedAssignee);
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
            Drag and drop task cards to update status, manage Sprint progress
          </p>
        </div>
        <button 
          onClick={() => openCreateTaskModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
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
              <button 
                onClick={() => openCreateTaskModal(column.id)}
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
                    onClick={() => openCreateTaskModal(column.id)}
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