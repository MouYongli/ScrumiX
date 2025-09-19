'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Activity, ArrowLeft, Filter, Calendar, Users, Zap, CheckCircle2, 
  FolderOpen, Plus, Search, RefreshCw, Clock, AlertCircle
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { api } from '@/utils/api';
import { ApiProject, ApiTask, ApiSprint, ScrumRole } from '@/types/api';
import { TaskStatus } from '@/types/enums';

interface ProjectActivitiesProps {
  params: Promise<{ 'project-id': string }>;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: string;
  timestamp: string;
  description?: string;
}

interface ActivityFilters {
  type: string;
  timeRange: string;
  user: string;
  searchTerm: string;
}

const ProjectActivities: React.FC<ProjectActivitiesProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];
  
  // State management
  const [project, setProject] = useState<ApiProject | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<ActivityFilters>({
    type: 'all',
    timeRange: '24h',
    user: 'all',
    searchTerm: ''
  });
  
  // Show filters panel
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to calculate time difference in hours
  const getHoursDifference = (timestamp: string): number => {
    const now = new Date();
    const then = new Date(timestamp);
    return Math.abs(now.getTime() - then.getTime()) / (1000 * 60 * 60);
  };

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string): string => {
    const hours = getHoursDifference(timestamp);
    
    if (hours < 1) {
      const minutes = Math.floor(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      const wholeHours = Math.floor(hours);
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  // Helper function to get assignee display
  const getAssigneeDisplay = (assignees: any[]): string => {
    if (!assignees || assignees.length === 0) {
      return 'Unassigned';
    }
    
    const users = assignees.map(assignee => {
      if (typeof assignee === 'object') {
        if (assignee.full_name && assignee.full_name.trim()) {
          return assignee.full_name;
        } else if (assignee.username && assignee.username.trim()) {
          return assignee.username;
        } else if (assignee.email) {
          return assignee.email.split('@')[0];
        }
      }
      return 'Unknown User';
    });
    
    const validUsers = users.filter(name => name && name.trim() !== '');
    
    if (validUsers.length === 0) {
      return 'Unassigned';
    } else if (validUsers.length === 1) {
      return validUsers[0];
    } else if (validUsers.length === 2) {
      return `${validUsers[0]} & ${validUsers[1]}`;
    } else {
      return `${validUsers[0]} +${validUsers.length - 1} more`;
    }
  };

  // Comprehensive activity fetching function
  const fetchAllActivities = async (timeRangeHours: number = 168): Promise<ActivityItem[]> => {
    const activities: ActivityItem[] = [];
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);

    try {
      // 1. Fetch sprint activities
      const sprintsResponse = await api.sprints.getAll();
      if (!sprintsResponse.error && sprintsResponse.data) {
        const projectSprints = sprintsResponse.data.filter(sprint => 
          sprint.projectId === parseInt(projectId)
        );
        
        projectSprints.forEach(sprint => {
          const updatedAt = new Date(sprint.updatedAt);
          if (updatedAt > cutoffTime) {
            const createdAt = new Date(sprint.createdAt);
            const isNewSprint = Math.abs(updatedAt.getTime() - createdAt.getTime()) < 60000;
            
            let action = '';
            let description = '';
            if (isNewSprint) {
              action = 'created sprint';
              description = `Created new sprint "${sprint.sprintName}" for the project`;
            } else {
              switch (sprint.status) {
                case 'active':
                  action = 'started sprint';
                  description = `Sprint "${sprint.sprintName}" is now active`;
                  break;
                case 'completed':
                  action = 'completed sprint';
                  description = `Sprint "${sprint.sprintName}" has been completed`;
                  break;
                case 'cancelled':
                  action = 'cancelled sprint';
                  description = `Sprint "${sprint.sprintName}" was cancelled`;
                  break;
                case 'planning':
                  action = 'updated sprint details';
                  description = `Updated details for sprint "${sprint.sprintName}"`;
                  break;
                default:
                  action = 'updated sprint';
                  description = `Made changes to sprint "${sprint.sprintName}"`;
              }
            }
            
            activities.push({
              id: `sprint-${sprint.id}`,
              user: 'Team Member',
              action,
              target: sprint.sprintName,
              time: formatTimeAgo(sprint.updatedAt),
              type: 'sprint',
              timestamp: sprint.updatedAt,
              description
            });
          }
        });
      }

      // 2. Fetch backlog item activities with sprint backlog detection
      const backlogResponse = await api.backlogs.getAll({
        project_id: parseInt(projectId),
        limit: 200
      });
      
      if (!backlogResponse.error && backlogResponse.data) {
        backlogResponse.data.forEach(item => {
          const updatedAt = new Date(item.updated_at);
          if (updatedAt > cutoffTime) {
            const createdAt = new Date(item.created_at);
            const isNewItem = Math.abs(updatedAt.getTime() - createdAt.getTime()) < 60000;
            
            let action = '';
            let activityType = 'backlog';
            let description = '';
            
            if (isNewItem) {
              if (item.sprint_id) {
                action = `created ${item.item_type} and added to sprint`;
                activityType = 'sprint_backlog';
                description = `Created new ${item.item_type} "${item.title}" and added it directly to sprint backlog`;
              } else {
                action = `created ${item.item_type}`;
                description = `Created new ${item.item_type} "${item.title}" in the product backlog`;
              }
            } else {
              if (item.sprint_id) {
                action = `added ${item.item_type} to sprint backlog`;
                activityType = 'sprint_backlog';
                description = `Moved ${item.item_type} "${item.title}" from product backlog to sprint backlog`;
              } else {
                action = `updated ${item.item_type}`;
                description = `Updated ${item.item_type} "${item.title}" status to ${item.status}`;
              }
            }
            
            activities.push({
              id: `backlog-${item.id}`,
              user: 'Team Member',
              action,
              target: item.title,
              time: formatTimeAgo(item.updated_at),
              type: activityType,
              timestamp: item.updated_at,
              description
            });
          }
        });
      }

      // 3. Fetch task activities from current sprint
      const currentSprintResponse = await api.sprints.getAll();
      if (!currentSprintResponse.error && currentSprintResponse.data) {
        const activeSprints = currentSprintResponse.data.filter(sprint => 
          sprint.projectId === parseInt(projectId) && sprint.status === 'active'
        );
        
        for (const sprint of activeSprints) {
          try {
            const sprintBacklogResponse = await api.sprints.getSprintBacklog(sprint.id, {
              include_acceptance_criteria: false,
              limit: 1000
            });
            
            if (!sprintBacklogResponse.error && sprintBacklogResponse.data) {
              sprintBacklogResponse.data.forEach(backlogItem => {
                if (backlogItem.tasks && Array.isArray(backlogItem.tasks)) {
                  backlogItem.tasks.forEach((task: any) => {
                    const updatedAt = new Date(task.updated_at);
                    if (updatedAt > cutoffTime) {
                      const createdAt = new Date(task.created_at);
                      const isNewTask = Math.abs(updatedAt.getTime() - createdAt.getTime()) < 60000;
                      
                      let action = '';
                      let description = '';
                      if (isNewTask) {
                        action = 'created task';
                        description = `Created new task "${task.title}" in sprint "${sprint.sprintName}"`;
                      } else {
                        const statusText = task.status === 'todo' ? 'To Do' : 
                                         task.status === 'in_progress' ? 'In Progress' : 'Done';
                        action = `moved task to ${statusText}`;
                        description = `Changed task "${task.title}" status to ${statusText}`;
                      }
                      
                      const assigneeName = getAssigneeDisplay(task.assignees || []);
                      
                      activities.push({
                        id: `task-${task.id}`,
                        user: assigneeName !== 'Unassigned' ? assigneeName : 'Team Member',
                        action,
                        target: task.title,
                        time: formatTimeAgo(task.updated_at),
                        type: 'task',
                        timestamp: task.updated_at,
                        description
                      });
                    }
                  });
                }
              });
            }
          } catch (error) {
            console.warn(`Failed to fetch tasks for sprint ${sprint.id}:`, error);
          }
        }
      }

      // 4. Enhanced sprint backlog detection with sprint names
      try {
        const allSprintsResponse = await api.sprints.getAll();
        if (!allSprintsResponse.error && allSprintsResponse.data) {
          const projectSprints = allSprintsResponse.data.filter(sprint => 
            sprint.projectId === parseInt(projectId)
          );
          
          const sprintMap = new Map<number, string>();
          projectSprints.forEach(sprint => {
            sprintMap.set(sprint.id, sprint.sprintName);
          });
          
          // Update existing sprint_backlog activities to include sprint names
          activities.forEach(activity => {
            if (activity.type === 'sprint_backlog' && activity.action.includes('to sprint backlog')) {
              const backlogItem = backlogResponse.data?.find(item => 
                item.title === activity.target && item.sprint_id
              );
              if (backlogItem && backlogItem.sprint_id && sprintMap.has(backlogItem.sprint_id)) {
                const sprintName = sprintMap.get(backlogItem.sprint_id);
                if (sprintName) {
                  activity.action = activity.action.replace('to sprint backlog', `to "${sprintName}" backlog`);
                  activity.description = activity.description?.replace('to sprint backlog', `to "${sprintName}" backlog`) || '';
                }
              }
            }
          });
        }
      } catch (error) {
        console.warn('Failed to enhance sprint names:', error);
      }

    } catch (error) {
      console.error('Error fetching comprehensive activities:', error);
    }

    // Sort by timestamp (most recent first)
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Apply filters to activities
  const applyFilters = (activities: ActivityItem[], filters: ActivityFilters): ActivityItem[] => {
    let filtered = [...activities];

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(activity => activity.type === filters.type);
    }

    // Filter by time range
    const now = new Date();
    let cutoffTime: Date;
    switch (filters.timeRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    filtered = filtered.filter(activity => new Date(activity.timestamp) > cutoffTime);

    // Filter by search term
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.target.toLowerCase().includes(searchTerm) ||
        activity.action.toLowerCase().includes(searchTerm) ||
        activity.user.toLowerCase().includes(searchTerm) ||
        activity.description?.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  };

  // Fetch data on component mount and filter changes
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch project data
        const projectResponse = await api.projects.getById(parseInt(projectId));
        if (projectResponse.error) throw new Error(projectResponse.error);
        setProject(projectResponse.data);
        
        // Determine time range in hours
        let timeRangeHours = 168; // 7 days default
        switch (filters.timeRange) {
          case '1h': timeRangeHours = 1; break;
          case '24h': timeRangeHours = 24; break;
          case '7d': timeRangeHours = 168; break;
          case '30d': timeRangeHours = 720; break;
        }
        
        // Fetch all activities
        const allActivities = await fetchAllActivities(timeRangeHours);
        setActivities(allActivities);
        
        // Apply filters
        const filtered = applyFilters(allActivities, filters);
        setFilteredActivities(filtered);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [projectId, filters]);

  // Refresh activities
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const timeRangeHours = filters.timeRange === '1h' ? 1 : 
                            filters.timeRange === '24h' ? 24 : 
                            filters.timeRange === '7d' ? 168 : 720;
      
      const allActivities = await fetchAllActivities(timeRangeHours);
      setActivities(allActivities);
      
      const filtered = applyFilters(allActivities, filters);
      setFilteredActivities(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh activities');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get activity icon and styling
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sprint':
        return { icon: <Zap className="w-5 h-5" />, bgColor: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' };
      case 'sprint_backlog':
        return { icon: <Plus className="w-5 h-5" />, bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', iconColor: 'text-indigo-600 dark:text-indigo-400' };
      case 'task':
        return { icon: <CheckCircle2 className="w-5 h-5" />, bgColor: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' };
      case 'backlog':
        return { icon: <FolderOpen className="w-5 h-5" />, bgColor: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' };
      default:
        return { icon: <Activity className="w-5 h-5" />, bgColor: 'bg-gray-50 dark:bg-gray-700', iconColor: 'text-gray-600 dark:text-gray-400' };
    }
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: project?.name || 'Project', href: `/project/${projectId}/dashboard` },
    { label: 'Recent Activities', icon: <Activity className="w-4 h-4" /> }
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading activities...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-900">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Error Loading Activities
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Recent Activities
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track all project activities including sprints, tasks, and backlog changes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href={`/project/${projectId}/dashboard`}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Activity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Activities</option>
                <option value="sprint">Sprint Activities</option>
                <option value="sprint_backlog">Sprint Backlog</option>
                <option value="task">Task Activities</option>
                <option value="backlog">Backlog Activities</option>
              </select>
            </div>

            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Range
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Activities
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  placeholder="Search by activity, user, or target..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activities List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Timeline ({filteredActivities.length} activities)
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filters.timeRange === '1h' && 'Last Hour'} 
              {filters.timeRange === '24h' && 'Last 24 Hours'}
              {filters.timeRange === '7d' && 'Last 7 Days'}
              {filters.timeRange === '30d' && 'Last 30 Days'}
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredActivities.length > 0 ? (
            <div className="space-y-6">
              {filteredActivities.map((activity, index) => {
                const { icon, bgColor, iconColor } = getActivityIcon(activity.type);
                
                return (
                  <div key={activity.id} className="flex items-start gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className={`p-3 rounded-full ${bgColor}`}>
                        <div className={iconColor}>{icon}</div>
                      </div>
                      {index < filteredActivities.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700 mt-2"></div>
                      )}
                    </div>

                    {/* Activity content */}
                    <div className="flex-1 min-w-0 pb-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-medium">{activity.user}</span>
                            {' '}{activity.action}{' '}
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {activity.target}
                            </span>
                          </p>
                          {activity.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {activity.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {activity.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {activity.type.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Activities Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {filters.searchTerm || filters.type !== 'all' || filters.timeRange !== '7d'
                  ? 'Try adjusting your filters to see more activities.'
                  : 'No recent activities in this time range.'}
              </p>
              {(filters.searchTerm || filters.type !== 'all' || filters.timeRange !== '7d') && (
                <button
                  onClick={() => setFilters({ type: 'all', timeRange: '7d', user: 'all', searchTerm: '' })}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectActivities;
