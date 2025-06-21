'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Target, Users, Clock, TrendingUp, 
  CheckCircle, AlertCircle, Play, Square, Edit2, Plus,
  FolderOpen, Zap, BarChart3, FileText, User, X, ChevronDown,
  Search, Filter, ExternalLink, Archive, Trash2
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  status: 'todo' | 'in-progress' | 'review' | 'done';
  storyId: string;
}

interface UserStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  storyPoints: number;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  assignee?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  labels: string[];
  tasks?: Task[];
}

interface Sprint {
  id: string;
  name: string;
  goal: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  capacity: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalStories: number;
  completedStories: number;
  teamMembers: string[];
  velocity: number;
  stories: UserStory[];
}

interface BurndownData {
  day: number;
  date: string;
  ideal: number;
  actual: number;
}

interface ProductBacklogItem {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  storyPoints: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  labels: string[];
  status: 'draft' | 'ready' | 'in-progress' | 'blocked';
  assignee?: string;
  acceptanceCriteria: string[];
  dependencies: string[];
}

interface SprintDetailProps {
  params: Promise<{ 'project-id': string; 'sprint-id': string }>;
}

// Mock data
const mockSprint: Sprint = {
  id: '2',
  name: 'Sprint 2 - E-commerce Core',
  goal: 'Build shopping cart, product catalog, and basic checkout functionality',
  status: 'active',
  startDate: '2024-03-01',
  endDate: '2024-03-15',
  capacity: 45,
  totalStoryPoints: 42,
  completedStoryPoints: 28,
  totalStories: 10,
  completedStories: 6,
  teamMembers: ['Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Park'],
  velocity: 38,
  stories: [
    {
      id: '1',
      title: 'Product Catalog Display',
      asA: 'customer',
      iWant: 'to browse products in organized categories',
      soThat: 'I can easily find what I\'m looking for',
      storyPoints: 8,
      status: 'done',
      assignee: 'Sarah Johnson',
      priority: 'high',
      labels: ['frontend', 'catalog']
    },
    {
      id: '2',
      title: 'Shopping Cart Management',
      asA: 'customer',
      iWant: 'to add and remove items from my cart',
      soThat: 'I can review my purchases before checkout',
      storyPoints: 13,
      status: 'in-progress',
      assignee: 'Mike Chen',
      priority: 'critical',
      labels: ['frontend', 'cart']
    },
    {
      id: '3',
      title: 'Product Search Functionality',
      asA: 'customer',
      iWant: 'to search for products by keywords',
      soThat: 'I can quickly find specific items',
      storyPoints: 5,
      status: 'done',
      assignee: 'Emily Rodriguez',
      priority: 'medium',
      labels: ['frontend', 'search']
    },
    {
      id: '4',
      title: 'Checkout Process',
      asA: 'customer',
      iWant: 'to complete my purchase securely',
      soThat: 'I can buy the items in my cart',
      storyPoints: 21,
      status: 'todo',
      assignee: 'David Park',
      priority: 'critical',
      labels: ['frontend', 'backend', 'payment']
    }
  ]
};

const mockBurndownData: BurndownData[] = [
  { day: 0, date: '2024-03-01', ideal: 42, actual: 42 },
  { day: 1, date: '2024-03-02', ideal: 39, actual: 42 },
  { day: 2, date: '2024-03-03', ideal: 36, actual: 38 },
  { day: 3, date: '2024-03-04', ideal: 33, actual: 35 },
  { day: 4, date: '2024-03-05', ideal: 30, actual: 32 },
  { day: 5, date: '2024-03-06', ideal: 27, actual: 28 },
  { day: 6, date: '2024-03-07', ideal: 24, actual: 28 },
  { day: 7, date: '2024-03-08', ideal: 21, actual: 25 },
  { day: 8, date: '2024-03-09', ideal: 18, actual: 20 },
  { day: 9, date: '2024-03-10', ideal: 15, actual: 18 },
  { day: 10, date: '2024-03-11', ideal: 12, actual: 14 },
  { day: 11, date: '2024-03-12', ideal: 9, actual: 14 },
  { day: 12, date: '2024-03-13', ideal: 6, actual: 14 },
  { day: 13, date: '2024-03-14', ideal: 3, actual: 14 },
  { day: 14, date: '2024-03-15', ideal: 0, actual: 14 }
];

// Mock product backlog items (not yet in sprint)
const mockProductBacklog: ProductBacklogItem[] = [
  {
    id: '5',
    title: 'User Registration System',
    asA: 'new user',
    iWant: 'to create an account with email verification',
    soThat: 'I can access the platform securely',
    storyPoints: 8,
    priority: 'high',
    labels: ['backend', 'auth', 'email'],
    status: 'ready',
    acceptanceCriteria: [
      'Email validation is required',
      'Password strength requirements are enforced',
      'Email verification is sent and required'
    ],
    dependencies: []
  },
  {
    id: '6',
    title: 'Payment Gateway Integration',
    asA: 'customer',
    iWant: 'to pay using multiple payment methods',
    soThat: 'I can complete purchases conveniently',
    storyPoints: 13,
    priority: 'critical',
    labels: ['backend', 'payment', 'integration'],
    status: 'ready',
    assignee: 'David Park',
    acceptanceCriteria: [
      'Support for credit cards, PayPal, and Apple Pay',
      'PCI compliance requirements met',
      'Error handling for failed transactions'
    ],
    dependencies: ['4']
  },
  {
    id: '7',
    title: 'Product Reviews and Ratings',
    asA: 'customer',
    iWant: 'to read and write product reviews',
    soThat: 'I can make informed purchasing decisions',
    storyPoints: 5,
    priority: 'medium',
    labels: ['frontend', 'reviews', 'user-content'],
    status: 'ready',
    acceptanceCriteria: [
      'Display average rating and review count',
      'Allow authenticated users to submit reviews',
      'Include helpful/unhelpful voting system'
    ],
    dependencies: ['1']
  },
  {
    id: '8',
    title: 'Inventory Management Dashboard',
    asA: 'admin',
    iWant: 'to track product inventory levels',
    soThat: 'I can manage stock and prevent overselling',
    storyPoints: 21,
    priority: 'high',
    labels: ['admin', 'inventory', 'dashboard'],
    status: 'draft',
    acceptanceCriteria: [
      'Real-time inventory tracking',
      'Low stock alerts',
      'Bulk inventory updates'
    ],
    dependencies: []
  },
  {
    id: '9',
    title: 'Order History and Tracking',
    asA: 'customer',
    iWant: 'to view my order history and track shipments',
    soThat: 'I can monitor my purchases and deliveries',
    storyPoints: 8,
    priority: 'medium',
    labels: ['frontend', 'orders', 'tracking'],
    status: 'ready',
    acceptanceCriteria: [
      'Display order status and tracking information',
      'Allow order cancellation within time limit',
      'Show detailed order history'
    ],
    dependencies: ['4']
  },
  {
    id: '10',
    title: 'Customer Support Chat',
    asA: 'customer',
    iWant: 'to get real-time help with my questions',
    soThat: 'I can resolve issues quickly',
    storyPoints: 13,
    priority: 'low',
    labels: ['frontend', 'support', 'chat'],
    status: 'draft',
    acceptanceCriteria: [
      'Live chat widget integration',
      'Chat history persistence',
      'Agent availability status'
    ],
    dependencies: []
  }
];

// Add Story Selection Modal component
const AddStoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddStories: (stories: ProductBacklogItem[]) => void;
  availableStories: ProductBacklogItem[];
  currentCapacity: number;
  usedCapacity: number;
  projectId: string;
}> = ({ isOpen, onClose, onAddStories, availableStories, currentCapacity, usedCapacity, projectId }) => {
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const selectedStories = availableStories.filter(story => selectedStoryIds.has(story.id));
  const selectedPoints = selectedStories.reduce((sum, story) => sum + story.storyPoints, 0);
  const totalPointsAfterAdd = usedCapacity + selectedPoints;
  const isOverCapacity = totalPointsAfterAdd > currentCapacity;

  // Filter stories based on search and filters
  const filteredStories = availableStories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.asA.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.iWant.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || story.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || story.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleStoryToggle = (storyId: string) => {
    const newSelected = new Set(selectedStoryIds);
    if (newSelected.has(storyId)) {
      newSelected.delete(storyId);
    } else {
      newSelected.add(storyId);
    }
    setSelectedStoryIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStoryIds.size === filteredStories.length) {
      setSelectedStoryIds(new Set());
    } else {
      setSelectedStoryIds(new Set(filteredStories.map(s => s.id)));
    }
  };

  const handleAddStories = () => {
    if (selectedStories.length === 0) return;
    onAddStories(selectedStories);
    setSelectedStoryIds(new Set());
    onClose();
  };

  const handlePlanInFullView = () => {
    // Navigate to dedicated sprint planning page
    window.location.href = `/project/${projectId}/sprint/planning`;
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSelectedStoryIds(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Stories to Sprint</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Select from {availableStories.length} available stories
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity Overview */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Current Capacity:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {usedCapacity} / {currentCapacity} pts
                </span>
              </div>
              {selectedPoints > 0 && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Adding:</span>
                  <span className={`ml-1 font-medium ${isOverCapacity ? 'text-red-600' : 'text-green-600'}`}>
                    +{selectedPoints} pts
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    isOverCapacity ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min((totalPointsAfterAdd / currentCapacity) * 100, 100)}%` }}
                ></div>
              </div>
              <span className={`text-sm font-medium ${isOverCapacity ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {Math.round((totalPointsAfterAdd / currentCapacity) * 100)}%
              </span>
            </div>
          </div>
          {isOverCapacity && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Selected stories exceed sprint capacity by {totalPointsAfterAdd - currentCapacity} points
            </p>
          )}
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search stories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="ready">Ready</option>
              <option value="draft">Draft</option>
              <option value="blocked">Blocked</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Stories List - Scrollable Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="p-4 pb-2 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {selectedStoryIds.size === filteredStories.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedStoryIds.size} of {filteredStories.length} selected
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-3">
              {filteredStories.map((story) => (
                <div 
                  key={story.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedStoryIds.has(story.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleStoryToggle(story.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedStoryIds.has(story.id)}
                      onChange={() => handleStoryToggle(story.id)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{story.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          story.status === 'ready' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          story.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {story.status.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          story.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                          story.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                          story.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {story.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="font-medium">As a</span> {story.asA}, <span className="font-medium">I want</span> {story.iWant}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {story.storyPoints} pts
                          </span>
                          {story.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {story.assignee}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {story.labels.slice(0, 3).map((label, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                              {label}
                            </span>
                          ))}
                          {story.labels.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                              +{story.labels.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredStories.length === 0 && (
              <div className="text-center py-8">
                <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No stories match your filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handlePlanInFullView}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <ExternalLink className="w-4 h-4" />
            Plan in Full View
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddStories}
              disabled={selectedStories.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add {selectedStories.length} {selectedStories.length === 1 ? 'Story' : 'Stories'}
              {selectedPoints > 0 && <span>({selectedPoints} pts)</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add CreateTaskModal component
const CreateTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  storyId: string;
  storyTitle: string;
  teamMembers: string[];
}> = ({ isOpen, onClose, onSubmit, storyId, storyTitle, teamMembers }) => {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assignees: string[];
    status: Task['status'];
    storyId: string;
  }>({
    title: '',
    description: '',
    assignees: [],
    status: 'todo',
    storyId
  });

  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Task title is required');
      return;
    }

    onSubmit(formData);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      assignees: [],
      status: 'todo' as Task['status'],
      storyId
    });
    
    onClose();
  };

  const handleCancel = () => {
    // Reset form on cancel
    setFormData({
      title: '',
      description: '',
      assignees: [],
      status: 'todo' as Task['status'],
      storyId
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Task</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add a task to "{storyTitle}"
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
              Assignees
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
                  {teamMembers.map(member => (
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
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
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

// Add EditSprintModal component before SprintDetail component
const EditSprintModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sprintData: Sprint) => void;
  sprint: Sprint;
}> = ({ isOpen, onClose, onSubmit, sprint }) => {
  const [formData, setFormData] = useState<Sprint>(sprint);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);

  // Initialize form data when sprint changes
  useEffect(() => {
    setFormData(sprint);
  }, [sprint]);

  // Mock team members - in real app, this would come from API
  const availableTeamMembers = [
    'Sarah Johnson',
    'Mike Chen', 
    'Emily Rodriguez',
    'David Park',
    'Lisa Wang',
    'James Smith',
    'Maria Gonzalez',
    'Alex Kim'
  ];

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      alert('Sprint name is required');
      return;
    }
    
    if (!formData.startDate || !formData.endDate) {
      alert('Start and end dates are required');
      return;
    }
    
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      alert('End date must be after start date');
      return;
    }

    onSubmit(formData);
    onClose();
  };

  const toggleTeamMember = (member: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.includes(member)
        ? prev.teamMembers.filter(m => m !== member)
        : [...prev.teamMembers, member]
    }));
  };

  const removeTeamMember = (member: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m !== member)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Sprint</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Sprint Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Sprint 1 - User Authentication"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Sprint Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Goal <span className="text-gray-400 text-sm">(Optional)</span>
            </label>
            <textarea
              value={formData.goal}
              onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
              placeholder="Describe the main objective of this sprint..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Time Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Capacity (Story Points)
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
              min="1"
              max="200"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team Members
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center"
              >
                <span className="text-gray-500 dark:text-gray-400">
                  {formData.teamMembers.length === 0 
                    ? 'Select team members...' 
                    : `${formData.teamMembers.length} member${formData.teamMembers.length !== 1 ? 's' : ''} selected`
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transform transition-transform ${isTeamDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTeamDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {availableTeamMembers.map(member => (
                    <label key={member} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.teamMembers.includes(member)}
                        onChange={() => toggleTeamMember(member)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{member}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {formData.teamMembers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.teamMembers.map(member => (
                  <span
                    key={member}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member)}
                      className="hover:text-blue-600 dark:hover:text-blue-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SprintDetail: React.FC<SprintDetailProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];
  const sprintId = resolvedParams['sprint-id'];

  const [sprint, setSprint] = useState<Sprint>(mockSprint);
  const [burndownData] = useState<BurndownData[]>(mockBurndownData);
  const [activeTab, setActiveTab] = useState<'overview' | 'backlog' | 'burndown' | 'team'>('overview');
  const [availableStories] = useState<ProductBacklogItem[]>(mockProductBacklog);

  // Add new state for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [recentlyAddedStories, setRecentlyAddedStories] = useState<Set<string>>(new Set());
  const [storyToDelete, setStoryToDelete] = useState<UserStory | null>(null);
  
  // Task modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [selectedStoryForTask, setSelectedStoryForTask] = useState<UserStory | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Project Name', href: `/project/${projectId}/dashboard` },
    { label: 'Sprints', href: `/project/${projectId}/sprint`, icon: <Zap className="w-4 h-4" /> },
    { label: sprint.name }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'active': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'completed': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <Calendar className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <Square className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getStoryStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
      case 'in-progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'review': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'done': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCurrentDayData = () => {
    const today = new Date();
    const startDate = new Date(sprint.startDate);
    const diffTime = today.getTime() - startDate.getTime();
    const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return burndownData.find(d => d.day === currentDay) || burndownData[burndownData.length - 1];
  };

  // Add handler for sprint updates
  const handleUpdateSprint = (updatedSprint: Sprint) => {
    setSprint(updatedSprint);
    setIsEditModalOpen(false);
  };

  // Add handler for adding stories to sprint
  const handleAddStories = (newStories: ProductBacklogItem[]) => {
    const convertedStories: UserStory[] = newStories.map(story => ({
      id: story.id,
      title: story.title,
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      storyPoints: story.storyPoints,
      status: 'todo' as const,
      assignees: story.assignee ? [story.assignee] : [],
      priority: story.priority,
      labels: story.labels
    }));

    const updatedSprint = {
      ...sprint,
      stories: [...sprint.stories, ...convertedStories],
      totalStories: sprint.totalStories + convertedStories.length,
      totalStoryPoints: sprint.totalStoryPoints + convertedStories.reduce((sum, s) => sum + s.storyPoints, 0)
    };

    // Track recently added stories for visual feedback
    const newStoryIds = new Set(convertedStories.map(s => s.id));
    setRecentlyAddedStories(newStoryIds);
    
    // Clear the highlight after 3 seconds
    setTimeout(() => {
      setRecentlyAddedStories(new Set());
    }, 3000);

    setSprint(updatedSprint);
    setIsAddStoryModalOpen(false);
  };

  // Add handler for removing stories from sprint
  const handleDeleteStory = (storyToRemove: UserStory) => {
    const updatedStories = sprint.stories.filter(story => story.id !== storyToRemove.id);
    const updatedSprint = {
      ...sprint,
      stories: updatedStories,
      totalStories: updatedStories.length,
      totalStoryPoints: updatedStories.reduce((sum, s) => sum + s.storyPoints, 0),
      completedStories: updatedStories.filter(s => s.status === 'done').length,
      completedStoryPoints: updatedStories.filter(s => s.status === 'done').reduce((sum, s) => sum + s.storyPoints, 0)
    };

    setSprint(updatedSprint);
    setStoryToDelete(null);
  };

  const confirmDeleteStory = (story: UserStory) => {
    setStoryToDelete(story);
  };

  // Task management handlers
  const handleCreateTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setTasks(prev => [...prev, newTask]);
    setIsCreateTaskModalOpen(false);
    setSelectedStoryForTask(null);
  };

  const openCreateTaskModal = (story: UserStory) => {
    setSelectedStoryForTask(story);
    setIsCreateTaskModalOpen(true);
  };

  const getTasksForStory = (storyId: string) => {
    return tasks.filter(task => task.storyId === storyId);
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
      case 'in-progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'review': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'done': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const handleDeleteTask = (taskToRemove: Task) => {
    setTasks(prev => prev.filter(task => task.id !== taskToRemove.id));
    setTaskToDelete(null);
  };

  const confirmDeleteTask = (task: Task) => {
    setTaskToDelete(task);
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Sprint Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprint.name}
              </h1>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sprint.status)}`}>
                {getStatusIcon(sprint.status)}
                {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{sprint.goal}</p>
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {sprint.teamMembers.length} members
              </span>
              {sprint.status === 'active' && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {getDaysRemaining(sprint.endDate)} days remaining
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href={`/project/${projectId}/sprint`}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sprints
            </Link>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Sprint
            </button>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Story Points</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprint.completedStoryPoints} / {sprint.totalStoryPoints}
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${calculateProgress(sprint.completedStoryPoints, sprint.totalStoryPoints)}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {calculateProgress(sprint.completedStoryPoints, sprint.totalStoryPoints)}%
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Stories</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprint.completedStories} / {sprint.totalStories}
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${calculateProgress(sprint.completedStories, sprint.totalStories)}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {calculateProgress(sprint.completedStories, sprint.totalStories)}%
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Capacity Used</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprint.totalStoryPoints} / {sprint.capacity}
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${calculateProgress(sprint.totalStoryPoints, sprint.capacity)}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {calculateProgress(sprint.totalStoryPoints, sprint.capacity)}%
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Team Velocity</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprint.velocity}
              </span>
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                pts/sprint
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'backlog', label: 'Sprint Backlog', icon: <FileText className="w-4 h-4" /> },
            { id: 'burndown', label: 'Burndown Chart', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sprint Goal */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sprint Goal</h3>
              <p className="text-gray-600 dark:text-gray-400">{sprint.goal}</p>
            </div>

            {/* Key Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Stories Completed</span>
                  <span className="font-medium text-gray-900 dark:text-white">{sprint.completedStories} / {sprint.totalStories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Story Points Completed</span>
                  <span className="font-medium text-gray-900 dark:text-white">{sprint.completedStoryPoints} / {sprint.totalStoryPoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Team Velocity</span>
                  <span className="font-medium text-gray-900 dark:text-white">{sprint.velocity} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Sprint Duration</span>
                  <span className="font-medium text-gray-900 dark:text-white">14 days</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backlog' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sprint Backlog</h3>
                <button 
                  onClick={() => setIsAddStoryModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Story
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {sprint.stories.map((story) => (
                  <div 
                    key={story.id} 
                    className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                      recentlyAddedStories.has(story.id)
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md animate-pulse'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{story.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStoryStatusColor(story.status)}`}>
                            {story.status.replace('-', ' ').toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(story.priority)}`}>
                            {story.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span className="font-medium">As a</span> {story.asA}, <span className="font-medium">I want</span> {story.iWant}, <span className="font-medium">so that</span> {story.soThat}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {story.storyPoints} pts
                          </span>
                          {story.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {story.assignee}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openCreateTaskModal(story)}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Create task"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteStory(story)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove from sprint"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {story.labels.map((label, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                          {label}
                        </span>
                      ))}
                    </div>
                    
                    {/* Tasks Section */}
                    {(() => {
                      const storyTasks = getTasksForStory(story.id);
                      return storyTasks.length > 0 ? (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks ({storyTasks.length})</h5>
                            <button
                              onClick={() => openCreateTaskModal(story)}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add Task
                            </button>
                          </div>
                          <div className="space-y-2">
                            {storyTasks.map((task) => (
                              <div key={task.id} className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                                <div className="flex items-start justify-between mb-1">
                                  <h6 className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</h6>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                                      {task.status.replace('-', ' ').toUpperCase()}
                                    </span>
                                    <button
                                      onClick={() => confirmDeleteTask(task)}
                                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      title="Delete task"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                                )}
                                <div className="flex items-center justify-between text-xs">
                                  <div className="text-gray-500 dark:text-gray-400">
                                    {task.assignees.length > 0 ? (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <User className="w-3 h-3" />
                                        <div className="flex flex-wrap gap-1">
                                          {task.assignees.map((assignee, idx) => (
                                            <span key={assignee} className="inline-flex items-center">
                                              {assignee}
                                              {idx < task.assignees.length - 1 && <span className="ml-1 mr-1">,</span>}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      'Unassigned'
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <button
                            onClick={() => openCreateTaskModal(story)}
                            className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Create Task
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'burndown' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Burndown Chart</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {burndownData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full h-48 relative flex items-end justify-center">
                    <div 
                      className="w-2 bg-blue-500 mr-1" 
                      style={{ height: `${(data.ideal / 42) * 100}%` }}
                      title={`Ideal: ${data.ideal}`}
                    ></div>
                    <div 
                      className="w-2 bg-red-500" 
                      style={{ height: `${(data.actual / 42) * 100}%` }}
                      title={`Actual: ${data.actual}`}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {data.day}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4 gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Ideal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Actual</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sprint.teamMembers.map((member, index) => {
                const memberStories = sprint.stories.filter(s => s.assignee === member);
                const memberPoints = memberStories.reduce((sum, s) => sum + s.storyPoints, 0);
                const completedPoints = memberStories.filter(s => s.status === 'done').reduce((sum, s) => sum + s.storyPoints, 0);
                
                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {member.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{member}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Team Member</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Stories Assigned</span>
                        <span className="font-medium text-gray-900 dark:text-white">{memberStories.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Story Points</span>
                        <span className="font-medium text-gray-900 dark:text-white">{completedPoints} / {memberPoints}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${memberPoints > 0 ? (completedPoints / memberPoints) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Story Modal */}
      <AddStoryModal
        isOpen={isAddStoryModalOpen}
        onClose={() => setIsAddStoryModalOpen(false)}
        onAddStories={handleAddStories}
        availableStories={availableStories.filter(story => 
          !sprint.stories.some(sprintStory => sprintStory.id === story.id)
        )}
        currentCapacity={sprint.capacity}
        usedCapacity={sprint.totalStoryPoints}
        projectId={projectId}
      />

      {/* Edit Sprint Modal */}
      <EditSprintModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateSprint}
        sprint={sprint}
      />

      {/* Create Task Modal */}
      {selectedStoryForTask && (
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => {
            setIsCreateTaskModalOpen(false);
            setSelectedStoryForTask(null);
          }}
          onSubmit={handleCreateTask}
          storyId={selectedStoryForTask.id}
          storyTitle={selectedStoryForTask.title}
          teamMembers={sprint.teamMembers}
        />
      )}

      {/* Delete Story Confirmation Modal */}
      {storyToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remove Story</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to remove <strong>"{storyToDelete.title}"</strong> from this sprint?
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Story Points:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{storyToDelete.storyPoints} pts</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStoryStatusColor(storyToDelete.status)}`}>
                      {storyToDelete.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  The story will be moved back to the product backlog and can be added to another sprint later.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStoryToDelete(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteStory(storyToDelete)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Story
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Task</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete the task <strong>"{taskToDelete.title}"</strong>?
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTaskStatusColor(taskToDelete.status)}`}>
                      {taskToDelete.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  {taskToDelete.description && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Description:</span>
                      <p className="text-gray-900 dark:text-white mt-1">{taskToDelete.description}</p>
                    </div>
                  )}
                  {taskToDelete.assignees.length > 0 && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600 dark:text-gray-400">Assignees:</span>
                      <div className="flex flex-wrap gap-1">
                        {taskToDelete.assignees.map((assignee, idx) => (
                          <span key={assignee} className="text-gray-900 dark:text-white">
                            {assignee}
                            {idx < taskToDelete.assignees.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setTaskToDelete(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteTask(taskToDelete)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintDetail;
