'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Edit2, Trash2, FolderOpen, 
  Zap, Play, Square, Calendar, Target, TrendingUp,
  Clock, Users, CheckCircle, AlertCircle, MoreHorizontal
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

interface Sprint {
  id: string;
  name: string;
  goal: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  capacity: number; // story points
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalStories: number;
  completedStories: number;
  teamMembers: string[];
  createdAt: string;
}

interface ProjectSprintsProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock sprint data
const mockSprints: Sprint[] = [
  {
    id: '1',
    name: 'Sprint 1 - Authentication Foundation',
    goal: 'Implement core user authentication system and basic user management features',
    status: 'completed',
    startDate: '2024-02-15',
    endDate: '2024-02-29',
    capacity: 40,
    totalStoryPoints: 38,
    completedStoryPoints: 38,
    totalStories: 8,
    completedStories: 8,
    teamMembers: ['Sarah Johnson', 'Mike Chen', 'Emily Rodriguez'],
    createdAt: '2024-02-10',
  },
  {
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
    createdAt: '2024-02-25',
  },
  {
    id: '3',
    name: 'Sprint 3 - Payment Integration',
    goal: 'Integrate payment gateway and complete order processing workflow',
    status: 'planning',
    startDate: '2024-03-16',
    endDate: '2024-03-30',
    capacity: 50,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
    totalStories: 0,
    completedStories: 0,
    teamMembers: ['Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Park'],
    createdAt: '2024-03-01',
  },
];

const ProjectSprints: React.FC<ProjectSprintsProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [sprints, setSprints] = useState<Sprint[]>(mockSprints);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Project Name', href: `/project/${projectId}/dashboard` },
    { label: 'Sprints', icon: <Zap className="w-4 h-4" /> }
  ];

  const filteredSprints = sprints.filter(sprint => {
    const matchesSearch = sprint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sprint.goal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sprint.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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

  const handleStartSprint = (sprintId: string) => {
    setSprints(sprints.map(sprint => 
      sprint.id === sprintId ? { ...sprint, status: 'active' as const } : sprint
    ));
  };

  const handleCompleteSprint = (sprintId: string) => {
    setSprints(sprints.map(sprint => 
      sprint.id === sprintId ? { ...sprint, status: 'completed' as const } : sprint
    ));
  };

  const activeSprint = sprints.find(s => s.status === 'active');
  const totalActiveStoryPoints = activeSprint?.totalStoryPoints || 0;
  const completedActiveStoryPoints = activeSprint?.completedStoryPoints || 0;

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sprint Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Plan, track, and manage your project sprints
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Sprint
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sprints</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{sprints.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sprint</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprints.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalActiveStoryPoints > 0 ? calculateProgress(completedActiveStoryPoints, totalActiveStoryPoints) : 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprints.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sprint Highlight */}
      {activeSprint && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-sm font-medium rounded-full">
                  <Play className="w-3 h-3" />
                  Active Sprint
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{activeSprint.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{activeSprint.goal}</p>
            </div>
            <Link 
              href={`/project/${projectId}/sprint/${activeSprint.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              View Details
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {getDaysRemaining(activeSprint.endDate)} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Story Points</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeSprint.completedStoryPoints} / {activeSprint.totalStoryPoints}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Stories</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeSprint.completedStories} / {activeSprint.totalStories}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${calculateProgress(activeSprint.completedStoryPoints, activeSprint.totalStoryPoints)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {calculateProgress(activeSprint.completedStoryPoints, activeSprint.totalStoryPoints)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search sprints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sprint List */}
      <div className="space-y-6">
        {filteredSprints.map((sprint) => (
          <div key={sprint.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Sprint Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {sprint.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sprint.status)}`}>
                      {getStatusIcon(sprint.status)}
                      {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{sprint.goal}</p>
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
                        {getDaysRemaining(sprint.endDate)} days left
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {sprint.status === 'planning' && (
                    <button
                      onClick={() => handleStartSprint(sprint.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Start Sprint
                    </button>
                  )}
                  {sprint.status === 'active' && (
                    <button
                      onClick={() => handleCompleteSprint(sprint.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Complete Sprint
                    </button>
                  )}
                  <Link 
                    href={`/project/${projectId}/sprint/${sprint.id}`}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                  >
                    View Details
                  </Link>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sprint Progress */}
              {sprint.totalStoryPoints > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Story Points</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {sprint.completedStoryPoints} / {sprint.totalStoryPoints}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${calculateProgress(sprint.completedStoryPoints, sprint.totalStoryPoints)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stories</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {sprint.completedStories} / {sprint.totalStories}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${calculateProgress(sprint.completedStories, sprint.totalStories)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {sprint.totalStoryPoints} / {sprint.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${calculateProgress(sprint.totalStoryPoints, sprint.capacity)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSprints.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No sprints found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by creating your first sprint.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Create Sprint
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectSprints;
