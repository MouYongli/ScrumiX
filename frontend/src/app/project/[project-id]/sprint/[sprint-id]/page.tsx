'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Target, Users, Clock, TrendingUp, 
  CheckCircle, AlertCircle, Play, Square, Edit2, Plus,
  FolderOpen, Zap, BarChart3, FileText, User, X, ChevronDown
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

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

  // Add new state for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Story
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {sprint.stories.map((story) => (
                  <div key={story.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
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
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {story.labels.map((label, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                          {label}
                        </span>
                      ))}
                    </div>
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

      {/* Edit Sprint Modal */}
      <EditSprintModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateSprint}
        sprint={sprint}
      />
    </div>
  );
};

export default SprintDetail;
