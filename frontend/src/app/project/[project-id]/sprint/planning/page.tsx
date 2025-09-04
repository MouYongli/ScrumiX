'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Search, Plus, CheckCircle, Clock, Target, Users,
  Filter, LayoutGrid, List, Calendar, BarChart3, Zap, X,
  ChevronDown, ChevronUp, AlertTriangle, Info
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { api } from '@/utils/api';
import { ApiSprint, ApiBacklog, BacklogStatus, BacklogPriority, BacklogType } from '@/types/api';

interface ProjectSprintPlanningProps {
  params: Promise<{ 'project-id': string }>;
  searchParams: Promise<{ 'sprint-id'?: string }>;
}

interface ProductBacklogItem {
  id: number;
  title: string;
  description?: string;
  story_point: number;
  priority: BacklogPriority;
  label?: string;
  status: BacklogStatus;
  assignee?: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  item_type: BacklogType;
  project_id: number;
  created_at: string;
  updated_at: string;
  parent_id?: number;
  assigned_to_id?: number;
}

interface Sprint {
  id: number;
  sprint_name: string;
  sprint_goal?: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  sprint_capacity?: number;
  project_id: number;
  created_at: string;
  updated_at: string;
  totalStoryPoints?: number;
  completedStoryPoints?: number;
  totalStories?: number;
  completedStories?: number;
  stories?: ProductBacklogItem[];
}

const ProjectSprintPlanning: React.FC<ProjectSprintPlanningProps> = ({ params, searchParams }) => {
  const resolvedParams = React.use(params);
  const resolvedSearchParams = React.use(searchParams);
  const projectId = resolvedParams['project-id'];
  const targetSprintId = resolvedSearchParams['sprint-id'];

  // State management
  const [availableItems, setAvailableItems] = useState<ProductBacklogItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Project');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  
  // Add state for frontend messages
  const [frontendMessage, setFrontendMessage] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    show: boolean;
  } | null>(null);

  // Capacity calculations
  const selectedItemsArray = availableItems.filter(item => selectedItems.has(item.id.toString()));
  const selectedPoints = selectedItemsArray.reduce((sum, item) => sum + item.story_point, 0);
  const currentCapacity = selectedSprint?.sprint_capacity || 0;
  const usedCapacity = selectedSprint?.totalStoryPoints || 0;
  const totalPointsAfterAdd = usedCapacity + selectedPoints;
  const isOverCapacity = totalPointsAfterAdd > currentCapacity;

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Sprints', href: `/project/${projectId}/sprint` },
    ...(selectedSprint && targetSprintId 
      ? [{ label: selectedSprint.sprint_name, href: `/project/${projectId}/sprint/${targetSprintId}` }]
      : []
    ),
    { label: 'Sprint Planning', icon: <Zap className="w-4 h-4" /> }
  ];

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch project details
        const projectResponse = await api.projects.getById(parseInt(projectId, 10));
        if (projectResponse.data) {
          setProjectName(projectResponse.data.name);
        }

        // Fetch project sprints
        const sprintsResponse = await api.sprints.getByProject(parseInt(projectId, 10));
        if (sprintsResponse.error) {
          throw new Error(sprintsResponse.error);
        }

        const projectSprints: Sprint[] = sprintsResponse.data?.map(sprint => ({
          id: sprint.id,
          sprint_name: sprint.sprintName,
          sprint_goal: sprint.sprintGoal,
          status: sprint.status as 'planning' | 'active' | 'completed' | 'cancelled',
          start_date: sprint.startDate,
          end_date: sprint.endDate,
          sprint_capacity: sprint.sprintCapacity,
          project_id: sprint.projectId,
          created_at: sprint.createdAt,
          updated_at: sprint.updatedAt,
          totalStoryPoints: 0,
          completedStoryPoints: 0,
          totalStories: 0,
          completedStories: 0,
          stories: []
        })) || [];

        setSprints(projectSprints);

        // Auto-select target sprint if provided, otherwise fallback to active/planning sprint
        let selectedSprint: Sprint | undefined;
        
        if (targetSprintId) {
          // Find the specific sprint that triggered this navigation
          selectedSprint = projectSprints.find(s => s.id === parseInt(targetSprintId, 10));
        }
        
        if (!selectedSprint) {
          // Fallback to active sprint or first planning sprint
          const activeSprint = projectSprints.find(s => s.status === 'active');
          const planningSprint = projectSprints.find(s => s.status === 'planning');
          selectedSprint = activeSprint || planningSprint || projectSprints[0];
        }
        
        if (selectedSprint) {
          setSelectedSprint(selectedSprint);
          await fetchAvailableItems(selectedSprint.id);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId, targetSprintId]);

  // Fetch available backlog items for sprint planning
  const fetchAvailableItems = async (sprintId?: number) => {
    try {
      // Fetch stories and bugs separately using backend filtering for better performance
      const [storiesResponse, bugsResponse] = await Promise.all([
        // Fetch non-completed stories not assigned to any sprint
        api.backlogs.getAll({
          project_id: parseInt(projectId, 10),
          item_type: 'story',
          include_acceptance_criteria: true,
          limit: 1000,
          skip: 0
        }),
        // Fetch non-completed bugs not assigned to any sprint  
        api.backlogs.getAll({
          project_id: parseInt(projectId, 10),
          item_type: 'bug',
          include_acceptance_criteria: true,
          limit: 1000,
          skip: 0
        })
      ]);

      if (storiesResponse.error) {
        throw new Error(`Failed to fetch stories: ${storiesResponse.error}`);
      }
      if (bugsResponse.error) {
        throw new Error(`Failed to fetch bugs: ${bugsResponse.error}`);
      }

      // Combine all backlog items
      const allBacklogItems = [
        ...(storiesResponse.data || []),
        ...(bugsResponse.data || [])
      ];

      // Filter for items that are not completed and not assigned to any sprint
      const availableBacklogItems = allBacklogItems.filter(item => {
        // Exclude completed items (done status)
        const isNotCompleted = item.status !== 'done';
        
        // Exclude items already assigned to a sprint
        const isNotInSprint = !item.sprint_id;
        
        return isNotCompleted && isNotInSprint;
      });

      const convertedItems: ProductBacklogItem[] = availableBacklogItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        story_point: item.story_point || 0,
        priority: item.priority,
        label: item.label,
        status: item.status,
        assignee: undefined,
        acceptanceCriteria: item.acceptance_criteria?.map((ac: any) => ac.title) || [],
        dependencies: [],
        item_type: item.item_type,
        project_id: item.project_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        parent_id: item.parent_id,
        assigned_to_id: item.assigned_to_id
      }));

      console.log(`Fetched ${convertedItems.length} available items for sprint planning:`, {
        availableStories: convertedItems.filter(item => item.item_type === 'story').length,
        availableBugs: convertedItems.filter(item => item.item_type === 'bug').length,
        totalStoriesFromBackend: storiesResponse.data?.length || 0,
        totalBugsFromBackend: bugsResponse.data?.length || 0,
        filteredOutCompleted: allBacklogItems.filter(item => item.status === 'done').length,
        filteredOutInSprint: allBacklogItems.filter(item => item.sprint_id).length
      });

      setAvailableItems(convertedItems);
    } catch (err) {
      console.error('Error fetching available items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch available items');
    }
  };



  // Handle item selection
  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id.toString())));
    }
  };

  // Add selected items to sprint
  const handleAddToSprint = async () => {
    if (!selectedSprint || selectedItems.size === 0) return;

    try {
      const itemsToAdd = selectedItemsArray;
      const addPromises = itemsToAdd.map(item => 
        api.sprints.addBacklogItemToSprint(selectedSprint.id, item.id)
      );
      
      const addResults = await Promise.all(addPromises);
      const errors = addResults.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to add ${errors.length} items to sprint`);
      }

      // Remove added items from available items
      setAvailableItems(prev => prev.filter(item => 
        !itemsToAdd.some(addedItem => addedItem.id === item.id)
      ));
      
      // Clear selections
      setSelectedItems(new Set());
      
      // Show success message with detailed information
      const storiesCount = itemsToAdd.filter(item => item.item_type === 'story').length;
      const bugsCount = itemsToAdd.filter(item => item.item_type === 'bug').length;
      
      let title = 'Items Added';
      let message = '';
      
      if (itemsToAdd.length === 1) {
        title = itemsToAdd[0].item_type === 'story' ? 'Story Added' : 'Bug Added';
        message = `Successfully added 1 ${itemsToAdd[0].item_type} to the sprint`;
      } else {
        if (storiesCount > 0 && bugsCount > 0) {
          message = `Successfully added ${storiesCount} ${storiesCount === 1 ? 'story' : 'stories'} and ${bugsCount} ${bugsCount === 1 ? 'bug' : 'bugs'} to the sprint`;
        } else if (storiesCount > 0) {
          title = 'Stories Added';
          message = `Successfully added ${storiesCount} ${storiesCount === 1 ? 'story' : 'stories'} to the sprint`;
        } else {
          title = 'Bugs Added';
          message = `Successfully added ${bugsCount} ${bugsCount === 1 ? 'bug' : 'bugs'} to the sprint`;
        }
      }
      
      showMessage('success', title, message);
      
      // Refresh available items to ensure the list is up-to-date
      if (selectedSprint) {
        await fetchAvailableItems(selectedSprint.id);
      }
      
    } catch (err) {
      console.error('Error adding items to sprint:', err);
      showMessage(
        'error',
        'Failed to Add Items',
        `Failed to add items to sprint: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  // Helper function to show frontend messages
  const showMessage = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    setFrontendMessage({ type, title, message, show: true });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setFrontendMessage(null);
    }, 5000);
  };

  // Filter items based on search and filters
  const filteredItems = availableItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.acceptanceCriteria.some(criteria => criteria.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
    
    return matchesSearch && matchesPriority && matchesType;
  });

  // Get priority color
  const getPriorityColor = (priority: BacklogPriority) => {
    switch (priority) {
      case BacklogPriority.HIGH:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case BacklogPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case BacklogPriority.LOW:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Get type color
  const getTypeColor = (type: BacklogType) => {
    switch (type) {
      case BacklogType.STORY:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case BacklogType.BUG:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case BacklogType.EPIC:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sprint planning...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Error Loading Sprint Planning
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Frontend Message Display */}
      {frontendMessage && (
        <div className={`fixed top-4 right-4 z-[200] max-w-md animate-in slide-in-from-right-2 duration-300`}>
          <div className={`rounded-lg border p-4 shadow-lg backdrop-blur-sm ${
            frontendMessage.type === 'success' 
              ? 'bg-green-50/95 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200'
              : frontendMessage.type === 'warning'
              ? 'bg-yellow-50/95 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200'
              : frontendMessage.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200'
              : 'bg-blue-50/95 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {frontendMessage.type === 'success' && (
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                )}
                {frontendMessage.type === 'warning' && (
                  <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-800/50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                )}
                {frontendMessage.type === 'error' && (
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-800/50 flex items-center justify-center">
                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                )}
                {frontendMessage.type === 'info' && (
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{frontendMessage.title}</h4>
                <p className="text-sm mt-0.5 opacity-90 leading-relaxed">{frontendMessage.message}</p>
              </div>
              <button
                onClick={() => setFrontendMessage(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {selectedSprint ? `Planning: ${selectedSprint.sprint_name}` : 'Sprint Planning'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {selectedSprint 
              ? `Add stories and bugs to ${selectedSprint.sprint_name}`
              : 'Plan your sprint by adding stories and bugs to the backlog'
            }
          </p>
        </div>
        <Link
          href={`/project/${projectId}/sprint`}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sprints
        </Link>
      </div>

      {/* Selected Sprint Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Planning for Sprint
          </h2>
          {targetSprintId && (
            <Link
              href={`/project/${projectId}/sprint/${targetSprintId}`}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm flex items-center gap-1"
            >
              View Sprint Details
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
          )}
        </div>
        
        {selectedSprint && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedSprint.sprint_name}
                </h3>
                <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                  selectedSprint.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                  selectedSprint.status === 'planning' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                  selectedSprint.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {selectedSprint.status.charAt(0).toUpperCase() + selectedSprint.status.slice(1)}
                </span>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              {selectedSprint.sprint_goal || 'No goal set for this sprint'}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(selectedSprint.start_date).toLocaleDateString()} - {new Date(selectedSprint.end_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  Capacity: {selectedSprint.sprint_capacity || 0} points
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  Used: {usedCapacity} / {currentCapacity} points
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSprint && (
        <>
          {/* Capacity Overview */}
          <div className={`p-6 rounded-lg border transition-colors ${
            selectedItems.size > 0 
              ? (isOverCapacity 
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                  : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800')
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Capacity:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-white">
                    {usedCapacity} / {currentCapacity} pts
                  </span>
                </div>
                {selectedItems.size > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Preview:</span>
                      <span className={`font-medium ${isOverCapacity ? 'text-red-600' : 'text-blue-600'}`}>
                        {usedCapacity} + {selectedPoints} = {totalPointsAfterAdd} pts
                      </span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isOverCapacity 
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' 
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                    }`}>
                      {isOverCapacity ? '⚠️ Over Capacity' : '✓ Within Capacity'}
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative w-40 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="absolute top-0 left-0 h-3 bg-gray-400 dark:bg-gray-600 rounded-full transition-all"
                    style={{ width: `${Math.min((usedCapacity / currentCapacity) * 100, 100)}%` }}
                  ></div>
                  {selectedItems.size > 0 && (
                    <div 
                      className={`absolute top-0 left-0 h-3 rounded-full transition-all ${
                        isOverCapacity ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min((totalPointsAfterAdd / currentCapacity) * 100, 100)}%` }}
                    ></div>
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  selectedItems.size > 0 
                    ? (isOverCapacity ? 'text-red-600' : 'text-blue-600')
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {selectedItems.size > 0 
                    ? Math.round((totalPointsAfterAdd / currentCapacity) * 100)
                    : Math.round((usedCapacity / currentCapacity) * 100)
                  }%
                </span>
              </div>
            </div>

            {isOverCapacity && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                  ⚠️ Warning: Selected items exceed sprint capacity by {totalPointsAfterAdd - currentCapacity} points
                </p>
              </div>
            )}
          </div>

          {/* Filters and Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search stories and bugs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="story">Stories</option>
                    <option value="bug">Bugs</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
                </button>
                
                <button
                  onClick={handleAddToSprint}
                  disabled={selectedItems.size === 0}
                  className={`px-4 py-2 text-white rounded-lg transition-all flex items-center gap-2 font-medium ${
                    selectedItems.size === 0 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : isOverCapacity 
                        ? 'bg-red-600 hover:bg-red-700 hover:shadow-lg' 
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {selectedItems.size === 0 
                    ? 'Select Items to Add'
                    : `Add ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`
                  }
                  {selectedPoints > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                      {selectedPoints} pts
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Selection Summary */}
            {selectedItems.size > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{selectedItems.size}</span> of <span className="font-medium">{filteredItems.length}</span> items selected
                  {selectedPoints > 0 && (
                    <span className="ml-2">
                      • <span className="font-medium">{selectedPoints}</span> story points
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Available Items ({filteredItems.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No items available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {availableItems.length === 0 
                      ? 'All stories and bugs are either completed or already assigned to sprints.'
                      : 'No items match your current filters.'
                    }
                  </p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {filteredItems.map(item => (
                    <div 
                      key={item.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedItems.has(item.id.toString())
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => handleItemToggle(item.id.toString())}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id.toString())}
                          onChange={() => handleItemToggle(item.id.toString())}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {item.title}
                            </h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(item.item_type)}`}>
                              {item.item_type.toUpperCase()}
                            </span>
                          </div>
                          
                          {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(item.priority)}`}>
                                {item.priority.toUpperCase()}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.story_point} pts
                              </span>
                            </div>
                            
                            {item.acceptanceCriteria.length > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {item.acceptanceCriteria.length} criteria
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectSprintPlanning;
