'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Target, Users, Clock, TrendingUp, 
  CheckCircle, Play, Square, Edit2, Plus,
  FolderOpen, Zap, FileText, User, X, ChevronDown,
  Search, ExternalLink, Archive, Trash2, Loader2, Info
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useDateFormat } from '@/hooks/useDateFormat';
import { api } from '@/utils/api';
import { ApiSprint, ApiBacklog, BacklogStatus, BacklogPriority, BacklogType } from '@/types/api';

// Component for rendering user-aware formatted dates
const FormattedDate: React.FC<{ 
  date: Date; 
  includeTime?: boolean; 
  short?: boolean;
}> = ({ date, includeTime = false, short = false }) => {
  const [formattedDate, setFormattedDate] = useState<string>(date.toLocaleDateString());
  const { formatDate, formatDateShort } = useDateFormat();

  useEffect(() => {
    let isMounted = true;
    
    const format = async () => {
      try {
        const result = short 
          ? await formatDateShort(date)
          : await formatDate(date, includeTime);
        
        if (isMounted) {
          setFormattedDate(result);
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        // Fallback to simple formatting
        if (isMounted) {
          setFormattedDate(date.toLocaleDateString());
        }
      }
    };

    // Add a small delay to batch API calls
    const timeoutId = setTimeout(format, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [date, includeTime, short, formatDate, formatDateShort]);

  return <span>{formattedDate}</span>;
};

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  sprint_id: number;
  created_at: string;
  updated_at: string;
  assignees: number[]; // This should match what the backend returns
}

interface BacklogItem {
  id: number;
  title: string;
  description?: string;
  status: BacklogStatus;
  story_point?: number;
  priority: BacklogPriority;
  label?: string;
  item_type: BacklogType;
  parent_id?: number;
  assigned_to_id?: number;
  project_id: number;
  sprint_id?: number;
  created_at: string;
  updated_at: string;
  acceptance_criteria?: AcceptanceCriteria[];
  tasks?: Task[];
}

interface AcceptanceCriteria {
  id: number;
  backlog_id: number;
  title: string;
  is_met: boolean;
  created_at: string;
  updated_at: string;
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
  // Frontend-only fields for display
  totalStoryPoints?: number;
  completedStoryPoints?: number;
  totalStories?: number;
  completedStories?: number;
  teamMembers?: string[];
  velocity?: number;
  stories?: BacklogItem[];
}

interface BurndownData {
  day: number;
  date: string;
  ideal: number;
  actual: number;
  workingDay: boolean;
  dayOfWeek: string;
  completedPoints: number; // Story points completed on this specific day
  cumulativeCompleted: number; // Total story points completed up to this day
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

interface SprintDetailProps {
  params: Promise<{ 'project-id': string; 'sprint-id': string }>;
}

// Add Story Selection Modal component
const AddStoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddStories: (stories: ProductBacklogItem[]) => void;
  availableStories: ProductBacklogItem[];
  currentCapacity: number;
  usedCapacity: number;
  projectId: string;
  sprintId: string;
  getTasksForStory: (storyId: string) => Task[];
  openCreateTaskModal: (story: BacklogItem) => void;
  getTaskStatusColor: (status: string) => string;
  confirmDeleteTask: (task: Task) => void;
  confirmDeleteStory: (story: BacklogItem) => void;
  getUserDisplayName: (userId: number) => string;
}> = ({ isOpen, onClose, onAddStories, availableStories, currentCapacity, usedCapacity, projectId, sprintId, getTasksForStory, openCreateTaskModal, getTaskStatusColor, confirmDeleteTask, confirmDeleteStory, getUserDisplayName }) => {
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const selectedStories = availableStories.filter(story => selectedStoryIds.has(story.id.toString()));
  const selectedPoints = selectedStories.reduce((sum, story) => sum + story.story_point, 0);
  const totalPointsAfterAdd = usedCapacity + selectedPoints;
  const isOverCapacity = totalPointsAfterAdd > currentCapacity;

  // Filter stories based on search and filters
  const filteredStories = availableStories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.acceptanceCriteria.some(criteria => criteria.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPriority = priorityFilter === 'all' || story.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });
  
  // Ensure no duplicates in filtered stories (extra safety)
  const uniqueFilteredStories = filteredStories.filter((story, index, self) => 
    index === self.findIndex(s => s.id === story.id)
  );
  
  // Debug logging for filtered stories
  if (filteredStories.length !== uniqueFilteredStories.length) {
    console.warn('Duplicate stories in filtered results:', {
      filtered: filteredStories.length,
      unique: uniqueFilteredStories.length,
      duplicates: filteredStories.length - uniqueFilteredStories.length
    });
  }

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
    if (selectedStoryIds.size === uniqueFilteredStories.length) {
      setSelectedStoryIds(new Set());
    } else {
      setSelectedStoryIds(new Set(uniqueFilteredStories.map(s => s.id.toString())));
    }
  };

  const handleAddStories = () => {
    if (selectedStories.length === 0) return;
    onAddStories(selectedStories);
    setSelectedStoryIds(new Set());
    onClose();
  };

  const handlePlanInFullView = () => {
    // Navigate to dedicated sprint planning page with sprint ID
    window.open(`/project/${projectId}/sprint/planning?sprint-id=${sprintId}`, '_blank');
  };

  const resetFilters = () => {
    setSearchTerm('');
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Items to Sprint</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Select from {availableStories.length} available stories and bugs
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
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 transition-colors ${
          selectedPoints > 0 
            ? (isOverCapacity 
                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800')
            : 'bg-gray-50 dark:bg-gray-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Current Capacity:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {usedCapacity} / {currentCapacity} pts
                </span>
              </div>
              {selectedPoints > 0 && (
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
            <div className="flex items-center gap-2">
              <div className="relative w-40 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                {/* Current capacity bar */}
                <div 
                  className="absolute top-0 left-0 h-3 bg-gray-400 dark:bg-gray-600 rounded-full transition-all"
                  style={{ width: `${Math.min((usedCapacity / currentCapacity) * 100, 100)}%` }}
                ></div>
                {/* Preview capacity bar */}
                {selectedPoints > 0 && (
                  <div 
                    className={`absolute top-0 left-0 h-3 rounded-full transition-all ${
                      isOverCapacity ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min((totalPointsAfterAdd / currentCapacity) * 100, 100)}%` }}
                  ></div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedPoints > 0 ? (
                    <span className={isOverCapacity ? 'text-red-600' : 'text-blue-600'}>
                      {Math.round((totalPointsAfterAdd / currentCapacity) * 100)}%
                    </span>
                  ) : (
                    <span>{Math.round((usedCapacity / currentCapacity) * 100)}%</span>
                  )}
                </div>
                {selectedPoints > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Preview
                  </div>
                )}
              </div>
            </div>
          </div>
          {isOverCapacity && (
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠️ Warning: Selected items exceed sprint capacity by {totalPointsAfterAdd - currentCapacity} points
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                Consider removing some items or increasing sprint capacity before adding.
              </p>
            </div>
          )}
          {selectedPoints > 0 && !isOverCapacity && (
            <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                ✓ Ready to add {selectedStoryIds.size} item{selectedStoryIds.size !== 1 ? 's' : ''} ({selectedPoints} points) to sprint
              </p>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search stories and bugs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
              {uniqueFilteredStories.map((story) => (
                <div 
                  key={`addmodal-${story.id}`} 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedStoryIds.has(story.id.toString())
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleStoryToggle(story.id.toString())}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedStoryIds.has(story.id.toString())}
                      onChange={() => handleStoryToggle(story.id.toString())}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{story.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          story.status === BacklogStatus.TODO ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          story.status === BacklogStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
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
                        {story.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {typeof story.story_point === 'number' ? story.story_point : 0} pts
                        </span>
                        {story.label && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {story.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {story.label && story.label.split(',').map((label, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {label.trim()}
                      </span>
                    ))}
                  </div>
                  
                  {/* Tasks Section */}
                  {(() => {
                    const storyTasks = getTasksForStory(story.id.toString());
                    console.log(`Rendering tasks for story "${story.title}" (ID: ${story.id}):`, storyTasks);
                    return storyTasks.length > 0 ? (
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks ({storyTasks.length})</h5>
                          <button
                            onClick={() => {
                              // Convert ProductBacklogItem to BacklogItem for the modal
                              const backlogItem: BacklogItem = {
                                id: story.id,
                                title: story.title,
                                description: story.description,
                                status: BacklogStatus.TODO,
                                story_point: story.story_point,
                                priority: story.priority,
                                label: story.label,
                                item_type: story.item_type,
                                project_id: story.project_id,
                                sprint_id: undefined,
                                created_at: story.created_at,
                                updated_at: story.updated_at,
                                acceptance_criteria: []
                              };
                              openCreateTaskModal(backlogItem);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Add Task
                          </button>
                        </div>
                        <div className="space-y-2">
                          {storyTasks.map((task: Task) => (
                            <div key={`addmodal-task-${task.id}`} className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                              <div className="flex items-start justify-between mb-1">
                                <h6 className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</h6>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                                    {task.status.replace('_', ' ').toUpperCase()}
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
                                        {task.assignees.map((assigneeId: number, idx: number) => (
                                          <span key={assigneeId} className="inline-flex items-center">
                                            {getUserDisplayName(assigneeId)}
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
                          onClick={() => {
                            // Convert ProductBacklogItem to BacklogItem for the modal
                            const backlogItem: BacklogItem = {
                              id: story.id,
                              title: story.title,
                              description: story.description,
                              status: BacklogStatus.TODO,
                              story_point: story.story_point,
                              priority: story.priority,
                              label: story.label,
                              item_type: story.item_type,
                              project_id: story.project_id,
                              sprint_id: undefined,
                              created_at: story.created_at,
                              updated_at: story.updated_at,
                              acceptance_criteria: []
                            };
                            openCreateTaskModal(backlogItem);
                          }}
                          className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Create Task
                        </button>
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        // Convert ProductBacklogItem to BacklogItem for the modal
                        const backlogItem: BacklogItem = {
                          id: story.id,
                          title: story.title,
                          description: story.description,
                          status: BacklogStatus.TODO,
                          story_point: story.story_point,
                          priority: story.priority,
                          label: story.label,
                          item_type: story.item_type,
                          project_id: story.project_id,
                          sprint_id: undefined,
                          created_at: story.created_at,
                          updated_at: story.updated_at,
                          acceptance_criteria: []
                        };
                        openCreateTaskModal(backlogItem);
                      }}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Create task"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        // Convert ProductBacklogItem to BacklogItem for the modal
                        const backlogItem: BacklogItem = {
                          id: story.id,
                          title: story.title,
                          description: story.description,
                          status: BacklogStatus.TODO,
                          story_point: story.story_point,
                          priority: story.priority,
                          label: story.label,
                          item_type: story.item_type,
                          project_id: story.project_id,
                          sprint_id: undefined,
                          created_at: story.created_at,
                          updated_at: story.updated_at,
                          acceptance_criteria: []
                        };
                        confirmDeleteStory(backlogItem);
                      }}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove from sprint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
              disabled={selectedStoryIds.size === 0}
              className={`px-4 py-2 text-white rounded-lg transition-all flex items-center gap-2 font-medium ${
                selectedStoryIds.size === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : isOverCapacity 
                    ? 'bg-red-600 hover:bg-red-700 hover:shadow-lg' 
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
              }`}
            >
              <Plus className="w-4 h-4" />
              {selectedStoryIds.size === 0 
                ? 'Select Items to Add'
                : `Add ${selectedStoryIds.size} Item${selectedStoryIds.size !== 1 ? 's' : ''}`
              }
              {selectedPoints > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                  {selectedPoints} pts
                </span>
              )}
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
  onSubmit: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  storyId: string;
  storyTitle: string;
  projectUsers: Array<{
    id: number;
    email: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  }>;
}> = ({ isOpen, onClose, onSubmit, storyId, storyTitle, projectUsers }) => {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assignees: number[];
    status: Task['status'];
    priority: Task['priority'];
    sprint_id: number;
  }>({
    title: '',
    description: '',
    assignees: [],
    status: 'todo',
    priority: 'medium',
    sprint_id: parseInt(storyId, 10)
  });

  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Task title is required');
      return;
    }

    try {
      await onSubmit(formData);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        assignees: [],
        status: 'todo' as Task['status'],
        priority: 'medium' as Task['priority'],
        sprint_id: parseInt(storyId, 10)
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
      // Don't close modal on error
    }
  };

  const handleCancel = () => {
    // Reset form on cancel
    setFormData({
      title: '',
      description: '',
      assignees: [],
      status: 'todo' as Task['status'],
      priority: 'medium' as Task['priority'],
      sprint_id: parseInt(storyId, 10)
    });
    onClose();
  };

  const toggleAssignee = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter(id => id !== userId)
        : [...prev.assignees, userId]
    }));
  };

  const removeAssignee = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.filter(id => id !== userId)
    }));
  };

  const getUserDisplayName = (userId: number) => {
    const user = projectUsers.find(u => u.id === userId);
    return user ? (user.full_name || user.username || user.email) : 'Unknown User';
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
                  {projectUsers.map(user => (
                    <label key={user.id} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignees.includes(user.id)}
                        onChange={() => toggleAssignee(user.id)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{getUserDisplayName(user.id)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {formData.assignees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.assignees.map(userId => (
                  <span
                    key={userId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full"
                  >
                    {getUserDisplayName(userId)}
                    <button
                      type="button"
                      onClick={() => removeAssignee(userId)}
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
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
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

// Add EditTaskModal component
const EditTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  task: Task;
  projectUsers: Array<{
    id: number;
    email: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  }>;
}> = ({ isOpen, onClose, onSubmit, task, projectUsers }) => {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assignees: number[];
    status: Task['status'];
    priority: Task['priority'];
    sprint_id: number;
  }>({
    title: task.title,
    description: task.description || '',
    assignees: [...task.assignees],
    status: task.status,
    priority: task.priority,
    sprint_id: task.sprint_id
  });

  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  // Update form data when task changes
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description || '',
      assignees: [...task.assignees],
      status: task.status,
      priority: task.priority,
      sprint_id: task.sprint_id
    });
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Task title is required');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      // Don't close modal on error
    }
  };

  const handleCancel = () => {
    // Reset form to original task data
    setFormData({
      title: task.title,
      description: task.description || '',
      assignees: [...task.assignees],
      status: task.status,
      priority: task.priority,
      sprint_id: task.sprint_id
    });
    onClose();
  };

  const toggleAssignee = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter(id => id !== userId)
        : [...prev.assignees, userId]
    }));
  };

  const removeAssignee = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.filter(id => id !== userId)
    }));
  };

  const getUserDisplayName = (userId: number) => {
    const user = projectUsers.find(u => u.id === userId);
    return user ? (user.full_name || user.username || user.email) : 'Unknown User';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Task</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Update task details
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
                  {projectUsers.map(user => (
                    <label key={user.id} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignees.includes(user.id)}
                        onChange={() => toggleAssignee(user.id)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{getUserDisplayName(user.id)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {formData.assignees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.assignees.map(userId => (
                  <span
                    key={userId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full"
                  >
                    {getUserDisplayName(userId)}
                    <button
                      type="button"
                      onClick={() => removeAssignee(userId)}
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
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
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
              <Edit2 className="w-4 h-4" />
              Update Task
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
  projectDevelopers: Array<{
    id: number;
    email: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    role: string;
    joined_at: string;
    is_admin: boolean;
  }>;
}> = ({ isOpen, onClose, onSubmit, sprint, projectDevelopers }) => {
  const [formData, setFormData] = useState<Sprint>(sprint);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);

  // Initialize form data when sprint changes
  useEffect(() => {
    // Format dates for HTML date inputs (YYYY-MM-DD format)
    const formatDateForInput = (dateString: string) => {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    setFormData({
      ...sprint,
      start_date: formatDateForInput(sprint.start_date),
      end_date: formatDateForInput(sprint.end_date)
    });
  }, [sprint]);

  // Team members are now fetched from the API via projectDevelopers
  const availableTeamMembers = projectDevelopers.map((dev: any) => dev.full_name || dev.username || dev.email);

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.sprint_name.trim()) {
      alert('Sprint name is required');
      return;
    }
    
    if (!formData.start_date || !formData.end_date) {
      alert('Start and end dates are required');
      return;
    }
    
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      alert('End date must be after start date');
      return;
    }

    onSubmit(formData);
    onClose();
  };

  const toggleTeamMember = (member: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers ? prev.teamMembers.includes(member)
        ? prev.teamMembers.filter((m: string) => m !== member)
        : [...prev.teamMembers, member]
      : []
    }));
  };

  const removeTeamMember = (member: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers ? prev.teamMembers.filter((m: string) => m !== member)
      : []
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
              value={formData.sprint_name}
              onChange={(e) => setFormData(prev => ({ ...prev, sprint_name: e.target.value }))}
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
              value={formData.sprint_goal}
              onChange={(e) => setFormData(prev => ({ ...prev, sprint_goal: e.target.value }))}
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
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
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
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                min={formData.start_date}
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
              value={formData.sprint_capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, sprint_capacity: parseInt(e.target.value) || 0 }))}
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
                  {formData.teamMembers ? `${formData.teamMembers.length} member${formData.teamMembers.length !== 1 ? 's' : ''} selected` : 'Select team members...'}
                </span>
                <ChevronDown className={`w-4 h-4 transform transition-transform ${isTeamDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTeamDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {availableTeamMembers.map(member => (
                    <label key={member} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.teamMembers ? formData.teamMembers.includes(member) : false}
                        onChange={() => toggleTeamMember(member)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{member}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {formData.teamMembers && (
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
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'planning' | 'active' | 'completed' | 'cancelled' }))}
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

// Helper functions for burndown chart
const isWorkingDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
};

const getWorkingDaysBetween = (startDate: Date, endDate: Date): Date[] => {
  const workingDays: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (isWorkingDay(currentDate)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

// Generate all days (including weekends) for the sprint period
const getAllDaysBetween = (startDate: Date, endDate: Date): Date[] => {
  const allDays: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    allDays.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return allDays;
};

// Generate ideal burndown data with weekends consideration
const generateIdealBurndownData = (
  startDate: string, 
  endDate: string, 
  totalStoryPoints: number
): BurndownData[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const allDays = getAllDaysBetween(start, end);
  const workingDays = getWorkingDaysBetween(start, end);
  
  if (allDays.length === 0) {
    return [];
  }
  
  const sprintDuration = workingDays.length;
  let workingDayIndex = 0;
  let lastIdealValue = totalStoryPoints;
  
  return allDays.map((date, index) => {
    const dateKey = date.toISOString().split('T')[0];
    const currentDay = index + 1;
    const isCurrentWorkingDay = isWorkingDay(date);
    
    let ideal: number;
    
    if (isCurrentWorkingDay) {
      // On working days, decrease the ideal burndown linearly
      workingDayIndex++;
      ideal = Math.max(0, totalStoryPoints - (totalStoryPoints / sprintDuration) * workingDayIndex);
      lastIdealValue = ideal;
        } else {
      // On weekends, keep the same ideal value as the previous day
      ideal = lastIdealValue;
    }
    
    return {
      day: currentDay,
      date: dateKey,
      ideal: Math.round(ideal * 100) / 100,
      actual: 0, // Will be filled by backend data
      workingDay: isCurrentWorkingDay,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      completedPoints: 0, // Will be filled by backend data
      cumulativeCompleted: 0 // Will be filled by backend data
    };
  });
};

// Generate burndown data using backend API
const generateBurndownDataFromBackend = async (
  sprintId: number,
  startDate: string,
  endDate: string,
  totalStoryPoints: number
): Promise<BurndownData[]> => {
  try {
    // Get the ideal burndown structure
    const idealData = generateIdealBurndownData(startDate, endDate, totalStoryPoints);
    
    // Get backend burndown snapshots
    const backendResponse = await api.velocity.getSprintBurndownSnapshots(sprintId);
    
    if (backendResponse.error || !backendResponse.data) {
      console.warn('No backend burndown data available, using ideal-only data');
      return idealData;
    }
    
    const snapshots = backendResponse.data;
    
    // Create a map of date -> snapshot for quick lookup
    const snapshotMap = new Map<string, typeof snapshots[0]>();
    snapshots.forEach(snapshot => {
      snapshotMap.set(snapshot.date, snapshot);
    });
    
    // Merge ideal data with backend snapshots
  let cumulativeCompleted = 0;
  
    return idealData.map((idealPoint, index) => {
      const snapshot = snapshotMap.get(idealPoint.date);
      
      if (snapshot) {
        // Use backend data for actual values
        const completedToday = index === 0 
          ? snapshot.completed_story_point 
          : snapshot.completed_story_point - (cumulativeCompleted || 0);
        
        cumulativeCompleted = snapshot.completed_story_point;
    
    return {
          ...idealPoint,
          actual: snapshot.remaining_story_point,
          completedPoints: Math.max(0, completedToday),
          cumulativeCompleted: snapshot.completed_story_point
        };
      } else {
        // No backend data for this date, keep ideal structure with zero actual progress
        return {
          ...idealPoint,
          actual: totalStoryPoints - cumulativeCompleted,
          completedPoints: 0,
      cumulativeCompleted: cumulativeCompleted
    };
      }
    });
    
  } catch (error) {
    console.error('Error fetching backend burndown data:', error);
    // Fallback to ideal-only data
    return generateIdealBurndownData(startDate, endDate, totalStoryPoints);
  }
};

// Legacy function for backward compatibility (not used anymore)
const generateBurndownData = (
  startDate: string, 
  endDate: string, 
  totalStoryPoints: number,
  stories: BacklogItem[] = []
): BurndownData[] => {
  // This function is kept for backward compatibility but not used
  // The new implementation uses generateBurndownDataFromBackend
  return generateIdealBurndownData(startDate, endDate, totalStoryPoints);
};

const SprintDetail: React.FC<SprintDetailProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];
  const sprintId = resolvedParams['sprint-id'];

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [burndownData, setBurndownData] = useState<BurndownData[]>([]);
  const [activeTab, setActiveTab] = useState<'backlog' | 'burndown' | 'team'>('backlog');
  const [availableStories, setAvailableStories] = useState<ProductBacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectUsers, setProjectUsers] = useState<Array<{
    id: number;
    email: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  }>>([]);

  // Add project developers state
  const [projectDevelopers, setProjectDevelopers] = useState<Array<{
    id: number;
    email: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    role: string;
    joined_at: string;
    is_admin: boolean;
  }>>([]);

  // Add project name state
  const [projectName, setProjectName] = useState<string>('Loading...');

  // Add new state for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [recentlyAddedStories, setRecentlyAddedStories] = useState<Set<string>>(new Set());
  const [storyToDelete, setStoryToDelete] = useState<BacklogItem | null>(null);
  
  // Add state for frontend messages
  const [frontendMessage, setFrontendMessage] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    show: boolean;
  } | null>(null);
  
  // Add state for velocity calculation
  const [teamVelocity, setTeamVelocity] = useState<number>(0);
  const [isCalculatingVelocity, setIsCalculatingVelocity] = useState<boolean>(false);
  
  // Task modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedStoryForTask, setSelectedStoryForTask] = useState<BacklogItem | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Sprints', href: `/project/${projectId}/sprint`, icon: <Zap className="w-4 h-4" /> },
    { label: sprint?.sprint_name || 'Loading...' }
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
      case 'in_progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_review': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'done': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
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

  const calculateProgress = (completed: number | undefined, total: number | undefined) => {
    if (!total || total === 0) return 0;
    if (!completed) return 0;
    return Math.round((completed / total) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Fetch sprint and backlog data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check authentication first
        try {
          const authResponse = await api.auth.getCurrentUser();
          if (authResponse.error) {
            throw new Error(`Authentication error: ${authResponse.error}`);
          }
          if (!authResponse.data) {
            throw new Error('No user data received - not authenticated');
          }
        } catch (authError) {
          console.error('Authentication check failed:', authError);
          throw new Error(`Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
        }
        
        // Validate parameters
        if (!projectId || !sprintId) {
          throw new Error('Missing project ID or sprint ID');
        }
        
        const projectIdNum = parseInt(projectId, 10);
        const sprintIdNum = parseInt(sprintId, 10);
        
        if (isNaN(projectIdNum) || isNaN(sprintIdNum)) {
          throw new Error('Invalid project ID or sprint ID');
        }

        // Test API connectivity first using the authenticated fetch
        try {
          const testResponse = await api.sprints.getAll();
          
          if (testResponse.error) {
            if (testResponse.error.includes('401') || testResponse.error.includes('Unauthorized')) {
              throw new Error('Authentication required. Please log in again.');
            } else if (testResponse.error.includes('403') || testResponse.error.includes('Forbidden')) {
              throw new Error('Access forbidden. You may not have permission to view this sprint.');
            } else {
              throw new Error(`API server error: ${testResponse.error}`);
            }
          }
        } catch (apiTestError) {
          console.error('API connectivity test failed:', apiTestError);
          throw new Error(`Cannot connect to API server: ${apiTestError instanceof Error ? apiTestError.message : 'Unknown error'}`);
        }

        // Fetch sprint data
        const sprintResponse = await api.sprints.getById(sprintIdNum);
        
        if (sprintResponse.error) {
          throw new Error(typeof sprintResponse.error === 'string' ? sprintResponse.error : 'Failed to fetch sprint data');
        }

        if (!sprintResponse.data) {
          throw new Error('No sprint data received from API');
        }

        const sprintData = sprintResponse.data;
        
        // Validate required fields
        if (!sprintData.id || !sprintData.sprintName || !sprintData.startDate || !sprintData.endDate || !sprintData.status || !sprintData.projectId) {
          throw new Error('Sprint data is missing required fields');
        }
        
        // Validate and normalize status
        let normalizedStatus: 'planning' | 'active' | 'completed' | 'cancelled';
        switch (sprintData.status) {
          case 'planning':
          case 'active':
          case 'completed':
          case 'cancelled':
            normalizedStatus = sprintData.status;
            break;
          default:
            console.warn('Unknown sprint status:', sprintData.status, 'defaulting to planning');
            normalizedStatus = 'planning';
        }
        
        const convertedSprint: Sprint = {
          id: sprintData.id,
          sprint_name: sprintData.sprintName,
          sprint_goal: sprintData.sprintGoal || '',
          status: normalizedStatus,
          start_date: sprintData.startDate,
          end_date: sprintData.endDate,
          sprint_capacity: sprintData.sprintCapacity || 0,
          project_id: sprintData.projectId,
          created_at: sprintData.createdAt,
          updated_at: sprintData.updatedAt,
          totalStoryPoints: 0,
          completedStoryPoints: 0,
          totalStories: 0,
          completedStories: 0,
          teamMembers: [], // No longer used - replaced with projectDevelopers from API
          velocity: 0,
          stories: []
        };
        
        setSprint(convertedSprint);

        // Fetch project data to get the real project name
        try {
          const projectResponse = await api.projects.getById(projectIdNum);
          if (projectResponse.data) {
            setProjectName(projectResponse.data.name);
          }
        } catch (projectError) {
          console.warn('Failed to fetch project data:', projectError);
          setProjectName('Project');
        }

        // Fetch backlog items for this project (stories and bugs)
        // Fetch stories and bugs separately since the API expects single item_type values
        const storiesResponse = await api.sprints.getAvailableBacklogItems(sprintIdNum, projectIdNum, {
          item_type: 'story',
          include_acceptance_criteria: true,
          limit: 1000
        });
        
        const bugsResponse = await api.sprints.getAvailableBacklogItems(sprintIdNum, projectIdNum, {
          item_type: 'bug',
          include_acceptance_criteria: true,
          limit: 1000
        });
        
        // Check for errors in both responses
        if (storiesResponse.error) {
          throw new Error(`Failed to fetch stories: ${storiesResponse.error}`);
        }
        
        if (bugsResponse.error) {
          throw new Error(`Failed to fetch bugs: ${bugsResponse.error}`);
        }
        
        // Combine stories and bugs
        const allBacklogItems = [
          ...(storiesResponse.data || []),
          ...(bugsResponse.data || [])
        ];
        
        if (allBacklogItems.length > 0) {
          const convertedStories: ProductBacklogItem[] = allBacklogItems
            .filter(item => !item.sprint_id) // Only items not already in a sprint
            .map(item => ({
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
              updated_at: item.updated_at
            }));
          
          // Ensure no duplicates by ID
          const uniqueStories = convertedStories.filter((story, index, self) => 
            index === self.findIndex(s => s.id === story.id)
          );
          
          // Debug logging to check for duplicates
          if (convertedStories.length !== uniqueStories.length) {
            console.warn('Duplicate stories detected and removed:', {
              original: convertedStories.length,
              unique: uniqueStories.length,
              duplicates: convertedStories.length - uniqueStories.length
            });
          }
          
          setAvailableStories(uniqueStories);
        } else {
          setAvailableStories([]);
        }

        // Fetch stories already in this sprint
        const sprintBacklogResponse = await api.sprints.getSprintBacklog(sprintIdNum, {
          include_acceptance_criteria: true,
          limit: 1000
        });

        if (sprintBacklogResponse.error) {
          throw new Error(`Failed to fetch sprint backlog data: ${sprintBacklogResponse.error}`);
        }

        if (sprintBacklogResponse.data) {
          console.log('Raw sprint backlog response data:', sprintBacklogResponse.data);
          const sprintStories: BacklogItem[] = sprintBacklogResponse.data.map(item => {
            console.log('Processing backlog item:', item.title, 'with tasks:', item.tasks);
            return {
              id: item.id,
              title: item.title,
              description: item.description,
              status: item.status,
              story_point: item.story_point || 0, // Ensure story_point is always a number
              priority: item.priority,
              label: item.label,
              item_type: item.item_type,
              parent_id: item.parent_id,
              assigned_to_id: item.assigned_to_id,
              project_id: item.project_id,
              sprint_id: item.sprint_id,
              created_at: item.created_at,
              updated_at: item.updated_at,
              acceptance_criteria: item.acceptance_criteria?.map((ac: any) => ({
                id: ac.id,
                backlog_id: ac.backlog_id,
                title: ac.title,
                description: '',
                is_met: false,
                created_at: ac.created_at,
                updated_at: ac.updated_at
              })) || [],
              tasks: item.tasks?.map((task: any) => {
                console.log('Processing task:', task.title, 'with assignees:', task.assignees);
                console.log('Full task object:', task);
                
                // Backend now returns assignees as user objects with {id, username, full_name, email}
                const mappedAssignees = task.assignees?.map((assignee: any) => {
                  // Extract user ID from assignee object
                  const userId = assignee.id;
                  console.log('Mapping assignee object:', assignee, 'to user ID:', userId);
                  return userId;
                }) || [];
                console.log('Mapped assignees for task:', task.title, ':', mappedAssignees);
                
                return {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  priority: task.priority,
                  sprint_id: parseInt(sprintId, 10),
                  created_at: task.created_at,
                  updated_at: task.updated_at,
                  assignees: mappedAssignees
                };
              }) || []
            };
          });

          setSprint(prevSprint => {
            if (!prevSprint) return prevSprint;
            
            return {
              ...prevSprint,
              stories: sprintStories,
              totalStories: sprintStories.length,
              totalStoryPoints: sprintStories.reduce((sum, s) => sum + (s.story_point || 0), 0),
              completedStories: sprintStories.filter(s => s.status === BacklogStatus.DONE).length,
              completedStoryPoints: sprintStories.filter(s => s.status === BacklogStatus.DONE).reduce((sum, s) => sum + (s.story_point || 0), 0)
            };
          });
        }

        // Fetch project users for task assignment
        const projectUsersResponse = await api.sprints.getProjectUsers(sprintIdNum);
        if (projectUsersResponse.error) {
          console.warn('Failed to fetch project users:', projectUsersResponse.error);
          // Don't fail the entire request, just use empty array
          setProjectUsers([]);
        } else {
          setProjectUsers(projectUsersResponse.data || []);
        }

        // Fetch project developers for team display
        try {
          const projectMembersResponse = await api.projects.getMembers(projectIdNum);
          if (projectMembersResponse.error) {
            console.warn('Failed to fetch project members:', projectMembersResponse.error);
            setProjectDevelopers([]);
          } else {
            // Filter only developers from the project members
            const developers = (projectMembersResponse.data || []).filter(
              (member: any) => member.role === 'developer'
            );
            setProjectDevelopers(developers);
          }
        } catch (memberError) {
          console.warn('Failed to fetch project members:', memberError);
          setProjectDevelopers([]);
        }

      } catch (err) {
        console.error('Error fetching sprint data:', err);
        console.error('Error type:', typeof err);
        console.error('Error object:', err);
        
        let errorMessage = 'Failed to fetch data';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null) {
          errorMessage = JSON.stringify(err);
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (projectId && sprintId) {
      fetchData();
    }
  }, [projectId, sprintId]);

  // Add useEffect to monitor sprint state changes
  useEffect(() => {
    if (sprint) {
      console.log('Sprint state updated:', sprint);
      console.log('Stories in sprint:', sprint.stories);
      if (sprint.stories) {
        sprint.stories.forEach(story => {
          console.log(`Story "${story.title}" has ${story.tasks?.length || 0} tasks:`, story.tasks);
        });
      }
    }
  }, [sprint]);

  // Generate burndown data when sprint data changes - now using backend API
  useEffect(() => {
    const fetchBurndownData = async () => {
      if (sprint && sprint.start_date && sprint.end_date && sprint.totalStoryPoints && sprintId) {
        try {
          const newBurndownData = await generateBurndownDataFromBackend(
            parseInt(sprintId, 10),
        sprint.start_date,
        sprint.end_date,
            sprint.totalStoryPoints
      );
      setBurndownData(newBurndownData);
        } catch (error) {
          console.error('Error generating burndown data:', error);
          // Fallback to ideal-only data
          const fallbackData = generateIdealBurndownData(
            sprint.start_date,
            sprint.end_date,
            sprint.totalStoryPoints
          );
          setBurndownData(fallbackData);
        }
      }
    };

    fetchBurndownData();
  }, [sprint?.start_date, sprint?.end_date, sprint?.totalStoryPoints, sprintId]);

  // Calculate team velocity when sprint data is loaded
  useEffect(() => {
    if (sprint && projectId) {
      setIsCalculatingVelocity(true);
      getSprintVelocity()
        .then(setTeamVelocity)
        .finally(() => setIsCalculatingVelocity(false));
    }
  }, [sprint, projectId]);

  // Calculate current sprint progress
  const getCurrentSprintProgress = () => {
    if (!sprint || !sprint.start_date || !sprint.end_date) return 0;
    
    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const today = new Date();
    
    if (today < start) return 0;
    if (today > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    return Math.round((elapsed / totalDuration) * 100);
  };

  // Get current sprint's velocity points (not project average)
  const getSprintVelocity = async () => {
    try {
      if (!sprint || !sprintId) return 0;
      
      // Use the backend velocity API to get current sprint's velocity
      const velocityResponse = await api.velocity.getSprintVelocity(parseInt(sprintId, 10));
      if (velocityResponse.error) {
        console.error('Error fetching sprint velocity from API:', velocityResponse.error);
        return 0;
      }
      
      return Math.round(velocityResponse.data?.velocity_points || 0);
    } catch (error) {
      console.error('Error calculating sprint velocity:', error);
      return 0;
    }
  };

  // Calculate burndown trend (ahead/behind/on track)
  const getBurndownTrend = () => {
    if (!sprint || !sprint.totalStoryPoints || !burndownData.length) {
      return { status: 'neutral', text: 'No data', color: 'text-gray-500' };
    }
    
    const totalPoints = sprint.totalStoryPoints;
    const currentDayIndex = getCurrentDayIndex();
    
    if (currentDayIndex === 0) {
      return { status: 'neutral', text: 'Sprint not started', color: 'text-gray-500' };
    }
    
    // Get the current day's data (using day index which includes all days)
    const currentDayData = burndownData[currentDayIndex - 1];
    if (!currentDayData) {
      return { status: 'neutral', text: 'No data', color: 'text-gray-500' };
    }
    
    const idealPoints = currentDayData.ideal;
    const actualPoints = currentDayData.actual;
    const difference = idealPoints - actualPoints;

    // Dynamic tolerance: 10% of ideal points or at least 2 points
    const tolerance = Math.max(2, idealPoints * 0.1);

    if (difference > tolerance) {
      return { status: 'ahead', text: 'Ahead of Schedule', color: 'text-green-600' };
    } else if (difference < -tolerance) {
      return { status: 'behind', text: 'Behind Schedule', color: 'text-red-600' };
    } else {
      return { status: 'on-track', text: 'On Track', color: 'text-blue-600' };
    }
  };

  // Get current day index in the sprint (includes all days, not just working days)
  const getCurrentDayIndex = () => {
    if (!sprint || !sprint.start_date || !sprint.end_date || !burndownData.length) return 0;
    
    const start = new Date(sprint.start_date);
    const today = new Date();
    
    if (today < start) return 0;
    
    // Calculate total days elapsed (including weekends)
    const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Return the day index (1-based), but don't exceed burndown data length
    return Math.min(daysDiff + 1, burndownData.length);
  };

  // Get current working day in the sprint (only working days)
  const getCurrentWorkingDay = () => {
    if (!sprint || !sprint.start_date || !sprint.end_date || !burndownData.length) return 0;
    
    const start = new Date(sprint.start_date);
    const today = new Date();
    
    if (today < start) return 0;
    
    let workingDays = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= today && currentDate <= new Date(sprint.end_date)) {
      if (isWorkingDay(currentDate)) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };
  
  // Get current day's remaining story points
  const getCurrentDayRemainingPoints = () => {
    if (!burndownData.length) return 0;
    
    const currentDayIndex = getCurrentDayIndex();
    if (currentDayIndex === 0) return sprint?.totalStoryPoints || 0;
    
    const currentDayData = burndownData[currentDayIndex - 1];
    return currentDayData ? currentDayData.actual : 0;
  };

  // Calculate X-axis label step based on sprint length for scalability
  const getXAxisLabelStep = () => {
    const sprintLength = burndownData.length;
    if (sprintLength <= 14) return 1; // Show every day for short sprints
    if (sprintLength <= 21) return 2; // Show every 2 days
    if (sprintLength <= 35) return 3; // Show every 3 days
    return Math.ceil(sprintLength / 10); // Show ~10 labels for very long sprints
  };

  // Helper function to get user display name
  const getUserDisplayName = (userId: number) => {
    console.log('getUserDisplayName called with userId:', userId, 'type:', typeof userId);
    console.log('Available project users:', projectUsers);
    const user = projectUsers.find(u => u.id === userId);
    console.log('Found user for ID', userId, ':', user);
    const result = user ? (user.full_name || user.username || user.email) : 'Unknown User';
    console.log('Returning display name:', result);
    return result;
  };

  // Add handler for sprint updates
  const handleUpdateSprint = async (updatedSprint: Sprint) => {
    try {
      // Call the API to update the sprint
      const response = await api.sprints.update(updatedSprint.id, {
        sprint_name: updatedSprint.sprint_name,
        sprint_goal: updatedSprint.sprint_goal,
        start_date: updatedSprint.start_date,
        end_date: updatedSprint.end_date,
        sprint_capacity: updatedSprint.sprint_capacity,
        status: updatedSprint.status,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        // Transform backend response to frontend format
        const updatedSprintData: Sprint = {
          id: response.data.id,
          sprint_name: response.data.sprintName,
          sprint_goal: response.data.sprintGoal || '',
          status: response.data.status as 'planning' | 'active' | 'completed' | 'cancelled',
          start_date: response.data.startDate,
          end_date: response.data.endDate,
          sprint_capacity: response.data.sprintCapacity || 0,
          project_id: response.data.projectId,
          created_at: response.data.createdAt,
          updated_at: response.data.updatedAt,
          // Keep existing calculated fields
          totalStoryPoints: sprint?.totalStoryPoints || 0,
          completedStoryPoints: sprint?.completedStoryPoints || 0,
          totalStories: sprint?.totalStories || 0,
          completedStories: sprint?.completedStories || 0,
          teamMembers: sprint?.teamMembers || [],
          velocity: sprint?.velocity || 0,
          stories: sprint?.stories || []
        };

        setSprint(updatedSprintData);
        setIsEditModalOpen(false);
        
        // Show success message
        showMessage(
          'success',
          'Sprint Updated',
          `Successfully updated "${updatedSprintData.sprint_name}"`
        );
      }
    } catch (err) {
      console.error('Error updating sprint:', err);
      showMessage(
        'error',
        'Failed to Update Sprint',
        `Failed to update sprint: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  // Add handler for adding stories to sprint
  const handleAddStories = async (newStories: ProductBacklogItem[]) => {
    try {
      // Add each story to the sprint using the new SprintBacklog API
      const addPromises = newStories.map(story => 
        api.sprints.addBacklogItemToSprint(parseInt(sprintId, 10), story.id)
      );
      
      const addResults = await Promise.all(addPromises);
      const errors = addResults.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to add ${errors.length} stories to sprint`);
      }

      // Convert stories to BacklogItem format
      const convertedStories: BacklogItem[] = newStories.map(story => ({
        id: story.id,
        title: story.title,
        description: story.description || '',
        story_point: story.story_point,
        status: BacklogStatus.TODO,
        priority: story.priority,
        label: story.label,
        item_type: story.item_type,
        parent_id: story.parent_id,
        assigned_to_id: story.assigned_to_id,
        project_id: story.project_id,
        sprint_id: parseInt(sprintId, 10),
        created_at: story.created_at,
        updated_at: story.updated_at,
        acceptance_criteria: story.acceptanceCriteria.map((criteria, index) => ({
          id: index + 1,
          backlog_id: story.id,
          title: criteria,
          description: '',
          is_met: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      }));

      if (sprint) {
        const updatedSprint = {
          ...sprint,
          stories: [...(sprint.stories || []), ...convertedStories],
          totalStories: (sprint.totalStories || 0) + convertedStories.length,
          totalStoryPoints: (sprint.totalStoryPoints || 0) + convertedStories.reduce((sum, s) => sum + (s.story_point || 0), 0)
        };

        // Track recently added stories for visual feedback
        const newStoryIds = new Set(convertedStories.map(s => s.id.toString()));
        setRecentlyAddedStories(newStoryIds);
        
        // Clear the highlight after 3 seconds
        setTimeout(() => {
          setRecentlyAddedStories(new Set());
        }, 3000);

        setSprint(updatedSprint);
        
        // Remove added stories from available stories
        setAvailableStories(prev => prev.filter(story => 
          !newStories.some(newStory => newStory.id === story.id)
        ));
      }
      
      setIsAddStoryModalOpen(false);
      
      // Show success message
      showMessage(
        'success',
        'Stories Added',
        `Successfully added ${newStories.length} ${newStories.length === 1 ? 'story' : 'stories'} to the sprint`
      );
    } catch (err) {
      console.error('Error adding stories to sprint:', err);
      showMessage(
        'error',
        'Failed to Add Stories',
        `Failed to add stories to sprint: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  // Add handler for removing stories from sprint
  const handleDeleteStory = async (storyToRemove: BacklogItem) => {
    if (!sprint) return;
    
    try {
      // Remove the backlog item from the sprint using the new SprintBacklog API
      const response = await api.sprints.removeBacklogItemFromSprint(parseInt(sprintId, 10), storyToRemove.id);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update local state
      const updatedStories = (sprint.stories || []).filter(story => story.id !== storyToRemove.id);
      const updatedSprint = {
        ...sprint,
        stories: updatedStories,
        totalStories: updatedStories.length,
        totalStoryPoints: updatedStories.reduce((sum, s) => sum + (s.story_point || 0), 0),
        completedStories: updatedStories.filter(s => s.status === BacklogStatus.DONE).length,
        completedStoryPoints: updatedStories.filter(s => s.status === BacklogStatus.DONE).reduce((sum, s) => sum + (s.story_point || 0), 0)
      };

      setSprint(updatedSprint);
      
      // Add the story back to available stories
      const storyToAddBack: ProductBacklogItem = {
        id: storyToRemove.id,
        title: storyToRemove.title,
        description: storyToRemove.description || '',
        story_point: storyToRemove.story_point || 0,
        priority: storyToRemove.priority,
        label: storyToRemove.label,
        status: storyToRemove.status,
        assignee: undefined,
        acceptanceCriteria: storyToRemove.acceptance_criteria?.map(ac => ac.title) || [],
        dependencies: [],
        item_type: storyToRemove.item_type,
        project_id: storyToRemove.project_id,
        created_at: storyToRemove.created_at,
        updated_at: storyToRemove.updated_at,
        parent_id: storyToRemove.parent_id,
        assigned_to_id: storyToRemove.assigned_to_id
      };
      
      setAvailableStories(prev => {
        // Check if the story already exists to prevent duplication
        const alreadyExists = prev.some(story => story.id === storyToAddBack.id);
        if (alreadyExists) {
          return prev; // Don't add if it already exists
        }
        
        // Add the story and ensure no duplicates in the entire array
        const newStories = [...prev, storyToAddBack];
        return newStories.filter((story, index, self) => 
          index === self.findIndex(s => s.id === story.id)
        );
      });
      setStoryToDelete(null);
      
      // Show success message
      showMessage(
        'success',
        'Story Removed',
        `Successfully removed "${storyToRemove.title}" from the sprint`
      );
    } catch (err) {
      console.error('Error removing story from sprint:', err);
      showMessage(
        'error',
        'Failed to Remove Story',
        `Failed to remove story from sprint: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  const confirmDeleteStory = (story: BacklogItem) => {
    setStoryToDelete(story);
  };

  // Task management handlers
  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedStoryForTask) return;
    
    try {
      console.log('Creating task with data:', taskData);
      console.log('Selected story:', selectedStoryForTask);
      
      const taskPayload = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignees: taskData.assignees || []
      };
      
      console.log('Task creation payload:', taskPayload);
      console.log('taskData.assignees (raw):', taskData.assignees);
      console.log('Sending assignees to backend:', taskData.assignees);
      
      const response = await api.sprints.createTaskForBacklogItem(
        parseInt(sprintId, 10),
        selectedStoryForTask.id,
        taskPayload
      );
      
      console.log('Task creation response:', response);
      console.log('Response data structure:', response.data);
      console.log('Response status:', response.data?.status);
      console.log('Response headers:', response.data?.headers);
      console.log('Response error:', response.error);
      
      if (response.error) {
        console.error('Task creation failed with error:', response.error);
        throw new Error(response.error);
      }
      
      console.log('Task created successfully, response data:', response.data);
      
      // Create the new task object with the response data
      const newTask: Task = {
        id: response.data?.task_id || response.data?.id || Date.now(), // Handle different response structures
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status,
        priority: taskData.priority,
        sprint_id: parseInt(sprintId, 10),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: taskData.assignees || []
      };
      
      console.log('New task object:', newTask);
      
      // Update the sprint state to include the new task
      if (sprint) {
        console.log('Current sprint state before update:', sprint);
        console.log('Current stories:', sprint.stories);
        
        const updatedStories = sprint.stories?.map(story => {
          console.log(`Checking story ID: ${story.id} (${typeof story.id}) vs selectedStoryForTask ID: ${selectedStoryForTask.id} (${typeof selectedStoryForTask.id})`);
          if (story.id === selectedStoryForTask.id) {
            const currentTasks = story.tasks || [];
            console.log(`Story "${story.title}" current tasks:`, currentTasks);
            
            const updatedStory = {
              ...story,
              tasks: [...currentTasks, newTask]
            };
            console.log('Updated story with new task:', updatedStory);
            return updatedStory;
          }
          return story;
        }) || [];
        
        console.log('Updated stories:', updatedStories);
        
        setSprint(prevSprint => {
          if (!prevSprint) return prevSprint;
          const newSprint = {
            ...prevSprint,
            stories: updatedStories
          };
          console.log('New sprint state:', newSprint);
          return newSprint;
        });
        
        // Force a re-render by updating the state again
        setTimeout(() => {
          console.log('Sprint state after timeout:', sprint);
        }, 100);
      }
      
      setIsCreateTaskModalOpen(false);
      setSelectedStoryForTask(null);
      
      // Show success message
      showMessage(
        'success',
        'Task Created',
        `Successfully created task "${taskData.title}" for "${selectedStoryForTask?.title}"`
      );
    } catch (err) {
      console.error('Error creating task:', err);
      showMessage(
        'error',
        'Failed to Create Task',
        `Failed to create task: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  const handleUpdateTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedTaskForEdit) return;
    
    try {
      const taskUpdatePayload = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignees: taskData.assignees || []
      };
      
      console.log('Task update payload:', taskUpdatePayload);
      
      const response = await api.sprints.updateTask(
        parseInt(sprintId, 10),
        selectedTaskForEdit.id,
        taskUpdatePayload
      );
      
      if (response.error) {
        console.error('Task update failed with error:', response.error);
        throw new Error(response.error);
      }
      
      console.log('Task updated successfully, response data:', response.data);
      
      // Update the task in the sprint state
      if (sprint) {
        const updatedStories = sprint.stories?.map(story => {
          if (story.tasks) {
            const updatedTasks = story.tasks.map(task => {
              if (task.id === selectedTaskForEdit.id) {
                return {
                  ...task,
                  title: taskData.title,
                  description: taskData.description || '',
                  status: taskData.status,
                  priority: taskData.priority,
                  assignees: taskData.assignees || [],
                  updated_at: new Date().toISOString()
                };
              }
              return task;
            });
            return { ...story, tasks: updatedTasks };
          }
          return story;
        }) || [];
        
        setSprint(prevSprint => {
          if (!prevSprint) return prevSprint;
          return {
            ...prevSprint,
            stories: updatedStories
          };
        });
      }
      
      setIsEditTaskModalOpen(false);
      setSelectedTaskForEdit(null);
      
      // Show success message
      showMessage(
        'success',
        'Task Updated',
        `Successfully updated task "${taskData.title}"`
      );
    } catch (err) {
      console.error('Error updating task:', err);
      showMessage(
        'error',
        'Failed to Update Task',
        `Failed to update task: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  const handleDeleteTask = async (taskToRemove: Task) => {
    try {
      const response = await api.sprints.deleteTask(parseInt(sprintId, 10), taskToRemove.id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Remove the task from the sprint state
      if (sprint) {
        const updatedStories = sprint.stories?.map(story => {
          if (story.tasks) {
            return {
              ...story,
              tasks: story.tasks.filter(task => task.id !== taskToRemove.id)
            };
          }
          return story;
        }) || [];
        
        setSprint(prevSprint => {
          if (!prevSprint) return prevSprint;
          return {
            ...prevSprint,
            stories: updatedStories
          };
        });
      }
      
      setTaskToDelete(null);
      
      // Show success message
      showMessage(
        'success',
        'Task Deleted',
        `Successfully deleted task "${taskToRemove.title}"`
      );
    } catch (err) {
      console.error('Error deleting task:', err);
      showMessage(
        'error',
        'Failed to Delete Task',
        `Failed to delete task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const confirmDeleteTask = (task: Task) => {
    setTaskToDelete(task);
  };

  const openEditTaskModal = (task: Task) => {
    setSelectedTaskForEdit(task);
    setIsEditTaskModalOpen(true);
  };

  const openCreateTaskModal = (story: BacklogItem) => {
    setSelectedStoryForTask(story);
    setIsCreateTaskModalOpen(true);
  };

  const getTasksForStory = (storyId: string) => {
    if (!sprint || !sprint.stories) {
      console.log('getTasksForStory: No sprint or stories available');
      return [];
    }
    
    const story = sprint.stories.find(s => s.id.toString() === storyId);
    if (!story) {
      console.log(`getTasksForStory: Story with ID ${storyId} not found`);
      console.log('Available stories:', sprint.stories.map(s => ({ id: s.id, title: s.title })));
      return [];
    }
    
    console.log(`getTasksForStory: Found story "${story.title}" with ID ${story.id}`);
    console.log('Story tasks:', story.tasks);
    
    // Return tasks from the story data (which comes from the API)
    return story.tasks || [];
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
      case 'in_progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'done': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
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

  // Handler for updating backlog item status
  const handleUpdateBacklogStatus = async (story: BacklogItem, newStatus: string) => {
    try {
      // Check if the story has tasks for validation
      const storyTasks = getTasksForStory(story.id.toString());
      
      // Frontend validation for IN_REVIEW and DONE statuses
      if ((newStatus === 'in_review' || newStatus === 'done')) {
        if (storyTasks.length === 0) {
          showMessage(
            'warning',
            'Status Change Blocked',
            `Cannot set status to "${newStatus.replace('_', ' ').toUpperCase()}" because this backlog item has no tasks. Please add at least one task first.`
          );
          return;
        }
        
        const incompleteTasks = storyTasks.filter(task => task.status !== 'done');
        if (incompleteTasks.length > 0) {
          const taskList = incompleteTasks.slice(0, 3).map(task => task.title).join(', ');
          const extraCount = incompleteTasks.length > 3 ? ` and ${incompleteTasks.length - 3} more` : '';
          showMessage(
            'warning',
            'Status Change Blocked',
            `Cannot set status to "${newStatus.replace('_', ' ').toUpperCase()}" because not all tasks are completed. Incomplete tasks: ${taskList}${extraCount}`
          );
          return;
        }
      }
      
      // Call the API to update the status
      const response = await api.sprints.updateBacklogItemStatus(
        parseInt(sprintId, 10),
        story.id,
        newStatus
      );
      
      if (response.error) {
        // Show backend validation error message
        showMessage('error', 'Status Update Failed', response.error);
        return;
      }
      
      // Update the local state if successful
      if (sprint) {
        const updatedStories = sprint.stories?.map(s => 
          s.id === story.id ? { ...s, status: newStatus as BacklogStatus } : s
        ) || [];
        
        setSprint(prevSprint => {
          if (!prevSprint) return prevSprint;
          return {
            ...prevSprint,
            stories: updatedStories,
            completedStories: updatedStories.filter(s => s.status === BacklogStatus.DONE).length,
            completedStoryPoints: updatedStories.filter(s => s.status === BacklogStatus.DONE).reduce((sum, s) => sum + (s.story_point || 0), 0)
          };
        });
        
        // Show success message
        showMessage(
          'success',
          'Status Updated',
          `Successfully updated "${story.title}" status to ${newStatus.replace('_', ' ').toUpperCase()}`
        );
      }
      
    } catch (error) {
      console.error('Error updating backlog item status:', error);
      showMessage('error', 'Status Update Failed', `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading sprint details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !sprint) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Sprint</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Failed to load sprint details'}
          </p>
          <Link
            href={`/project/${projectId}/sprint`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sprints
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Frontend Message Display */}
      {frontendMessage && (
        <div className={`fixed top-4 right-4 z-[200] max-w-md animate-in slide-in-from-right-2 duration-300`}>
          <div className={`rounded-lg border p-4 shadow-lg ${
            frontendMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
              : frontendMessage.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
              : frontendMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
              : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {frontendMessage.type === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                {frontendMessage.type === 'warning' && (
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                )}
                {frontendMessage.type === 'error' && (
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                {frontendMessage.type === 'info' && (
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{frontendMessage.title}</h4>
                <p className="text-sm mt-1 opacity-90">{frontendMessage.message}</p>
              </div>
              <button
                onClick={() => setFrontendMessage(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sprint Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprint.sprint_name}
              </h1>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sprint.status)}`}>
                {getStatusIcon(sprint.status)}
                {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{sprint.sprint_goal}</p>
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <FormattedDate date={new Date(sprint.start_date)} short={true} /> - <FormattedDate date={new Date(sprint.end_date)} short={true} />
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {projectDevelopers.length} developers
              </span>
              {sprint.status === 'active' && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {getDaysRemaining(sprint.end_date)} days remaining
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
                {sprint.totalStoryPoints} / {sprint.sprint_capacity}
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${calculateProgress(sprint.totalStoryPoints, sprint.sprint_capacity)}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {calculateProgress(sprint.totalStoryPoints, sprint.sprint_capacity)}%
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Team Velocity</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {isCalculatingVelocity ? (
                  <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></span>
                ) : (
                  teamVelocity
                )}
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
            { id: 'backlog', label: 'Sprint Backlog', icon: <FileText className="w-4 h-4" /> },
            { id: 'burndown', label: 'Burndown Chart', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'backlog' | 'burndown' | 'team')}
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
        {activeTab === 'backlog' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sprint Backlog</h3>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/project/${projectId}/kanban`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Kanban
                  </Link>
                                    <button
                    onClick={() => setIsAddStoryModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Items
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {sprint.stories?.map((story) => (
                  <div 
                    key={`backlog-${story.id}`} 
                    className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                      recentlyAddedStories.has(story.id.toString())
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md animate-pulse'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{story.title}</h4>
                          {/* Status Dropdown */}
                          <select
                            value={story.status}
                            onChange={(e) => handleUpdateBacklogStatus(story, e.target.value)}
                            className={`px-2 py-1 rounded text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer ${getStoryStatusColor(story.status)}`}
                          >
                            <option value="todo">TO DO</option>
                            <option value="in_progress">IN PROGRESS</option>
                            <option value="in_review">IN REVIEW</option>
                            <option value="done">DONE</option>
                            <option value="cancelled">CANCELLED</option>
                          </select>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(story.priority)}`}>
                            {story.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {story.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {typeof story.story_point === 'number' ? story.story_point : 0} pts
                          </span>
                          {story.label && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {story.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {story.label && story.label.split(',').map((label, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                            {label.trim()}
                          </span>
                        ))}
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
                    
                    {/* Tasks Section */}
                    {(() => {
                      const storyTasks = getTasksForStory(story.id.toString());
                      console.log(`Rendering tasks for story "${story.title}" (ID: ${story.id}):`, storyTasks);
                      return storyTasks.length > 0 ? (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks ({storyTasks.length})</h5>
                            <button
                              onClick={() => {
                                // Convert ProductBacklogItem to BacklogItem for the modal
                                const backlogItem: BacklogItem = {
                                  id: story.id,
                                  title: story.title,
                                  description: story.description,
                                  status: BacklogStatus.TODO,
                                  story_point: story.story_point,
                                  priority: story.priority,
                                  label: story.label,
                                  item_type: story.item_type,
                                  project_id: story.project_id,
                                  sprint_id: undefined,
                                  created_at: story.created_at,
                                  updated_at: story.updated_at,
                                  acceptance_criteria: []
                                };
                                openCreateTaskModal(backlogItem);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              Add Task
                            </button>
                          </div>
                          <div className="space-y-2">
                            {storyTasks.map((task: Task) => (
                              <div key={`backlog-task-${task.id}`} className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                                <div className="flex items-start justify-between mb-1">
                                  <h6 className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</h6>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                                      {task.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <button
                                      onClick={() => openEditTaskModal(task)}
                                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                      title="Edit task"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
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
                                          {task.assignees.map((assigneeId: number, idx: number) => (
                                            <span key={assigneeId} className="inline-flex items-center">
                                              {getUserDisplayName(assigneeId)}
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
                            onClick={() => {
                              // Convert ProductBacklogItem to BacklogItem for the modal
                              const backlogItem: BacklogItem = {
                                id: story.id,
                                title: story.title,
                                description: story.description,
                                status: BacklogStatus.TODO,
                                story_point: story.story_point,
                                priority: story.priority,
                                label: story.label,
                                item_type: story.item_type,
                                project_id: story.project_id,
                                sprint_id: undefined,
                                created_at: story.created_at,
                                updated_at: story.updated_at,
                                acceptance_criteria: []
                              };
                              openCreateTaskModal(backlogItem);
                            }}
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Burndown Chart</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBurndownTrend().color} bg-opacity-10`}>
                  {getBurndownTrend().text}
                </span>
              </div>
            </div>
            {sprint && sprint.stories && sprint.stories.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{sprint.totalStoryPoints || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Story Points</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {burndownData.length > 0 ? (sprint.totalStoryPoints || 0) - getCurrentDayRemainingPoints() : 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed Points</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {getCurrentDayRemainingPoints()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Remaining Points</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{getCurrentSprintProgress()}%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sprint Progress</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">
                      {isCalculatingVelocity ? (
                        <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></span>
                      ) : (
                        teamVelocity
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Pts/Sprint</div>
                  </div>
                </div>
                
                {/* Burndown Chart */}
                <div className="relative h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                  {burndownData.length > 0 ? (
                    <svg
                      className="w-full h-full"
                      viewBox={`0 0 ${Math.max(500, burndownData.length * 50 + 120)} 500`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* Y-axis and horizontal grid lines */}
                      {Array.from({ length: Math.ceil((sprint.totalStoryPoints || 0) / 5) + 1 }, (_, i) => (
                        <g key={`grid-${i}`}>
                          <line
                            x1="80"
                            y1={400 - (i * 5 * 350 / (sprint.totalStoryPoints || 1))}
                            x2={Math.max(500, burndownData.length * 50 + 120) - 40}
                            y2={400 - (i * 5 * 350 / (sprint.totalStoryPoints || 1))}
                            stroke="rgba(156, 163, 175, 0.3)"
                            strokeWidth="1"
                          />
                          <text
                            x="65"
                            y={405 - (i * 5 * 350 / (sprint.totalStoryPoints || 1))}
                            fontSize="12"
                            fill="rgba(156, 163, 175, 0.8)"
                            textAnchor="end"
                          >
                            {i * 5}
                          </text>
                        </g>
                      ))}
                      
                      {/* Y-axis label */}
                      <text
                        x="25"
                        y="250"
                        fontSize="14"
                        fill="rgba(156, 163, 175, 0.8)"
                        textAnchor="middle"
                        transform="rotate(-90, 25, 250)"
                        fontWeight="600"
                      >
                        Story Points
                      </text>
                      
                      {/* Y-axis line */}
                      <line
                        x1="80"
                        y1="50"
                        x2="80"
                        y2="400"
                        stroke="rgba(156, 163, 175, 0.5)"
                        strokeWidth="2"
                      />
                      
                      {/* X-axis line */}
                      <line
                        x1="80"
                        y1="400"
                        x2={Math.max(500, burndownData.length * 50 + 120) - 40}
                        y2="400"
                        stroke="rgba(156, 163, 175, 0.5)"
                        strokeWidth="2"
                      />
                      
                      {/* X-axis labels */}
                      {burndownData.map((data, index) => {
                        const labelStep = getXAxisLabelStep();
                        const shouldShowLabel = index % labelStep === 0 || index === burndownData.length - 1;
                        
                        return shouldShowLabel ? (
                          <g key={`x-label-${index}`}>
                                                                                    {/* X-axis tick mark */}
                            <line
                              x1={index * 50 + 105}
                              y1="400"
                              x2={index * 50 + 105}
                              y2="405"
                              stroke="rgba(156, 163, 175, 0.5)"
                              strokeWidth="1"
                            />
                            {/* Day number */}
                            <text
                              x={index * 50 + 105}
                              y="420"
                              fontSize="11"
                              fill="rgba(156, 163, 175, 0.8)"
                              textAnchor="middle"
                              fontWeight="500"
                            >
                              Day {data.day}
                            </text>
                            {/* Date */}
                            <text
                              x={index * 50 + 105}
                              y="435"
                              fontSize="10"
                              fill="rgba(156, 163, 175, 0.6)"
                              textAnchor="middle"
                            >
                              {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </text>
                          </g>
                        ) : null;
                      }).filter(Boolean)}
                      
                      {/* X-axis title */}
                      <text
                        x={Math.max(500, burndownData.length * 50 + 120) / 2}
                        y="460"
                        fontSize="14"
                        fill="rgba(156, 163, 175, 0.8)"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        Sprint Days
                      </text>
                      
                      {/* Ideal burndown line */}
                      <polyline
                        points={burndownData.map((data, index) => 
                          `${index * 50 + 105},${400 - (data.ideal * 350 / (sprint.totalStoryPoints || 1))}`
                        ).join(' ')}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                      
                      {/* Actual burndown line - only show points up to current day with completions */}
                      <polyline
                        points={burndownData
                          .filter((data, index) => {
                            const currentDayIndex = getCurrentDayIndex();
                            const today = new Date().toISOString().split('T')[0];
                            // Show points for days up to today or days with actual completions
                            return index < currentDayIndex || data.date <= today || data.completedPoints > 0;
                          })
                          .map((data, originalIndex) => {
                            const actualIndex = burndownData.findIndex(d => d.date === data.date);
                            return `${actualIndex * 50 + 105},${400 - (data.actual * 350 / (sprint.totalStoryPoints || 1))}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="3"
                      />
                      
                      {/* Data points */}
                      {burndownData.map((data, index) => {
                        const currentDayIndex = getCurrentDayIndex();
                        const today = new Date().toISOString().split('T')[0];
                        const shouldShowActualPoint = index < currentDayIndex || data.date <= today || data.completedPoints > 0;
                        
                        return (
                        <g key={`point-${index}`}>
                                                      {/* Ideal point */}
                            <circle
                              cx={index * 50 + 105}
                              cy={400 - (data.ideal * 350 / (sprint.totalStoryPoints || 1))}
                              r="4"
                              fill="#3B82F6"
                              className="cursor-pointer hover:r-5 transition-all"
                            >
                              <title>{`Day ${data.day}: Ideal: ${data.ideal} points`}</title>
                            </circle>
                            {/* Actual point - only show for past days or days with completions */}
                            {shouldShowActualPoint && (
                              <circle
                                cx={index * 50 + 105}
                                cy={400 - (data.actual * 350 / (sprint.totalStoryPoints || 1))}
                                r="5"
                                fill="#EF4444"
                                className="cursor-pointer hover:r-5 transition-all"
                              >
                                <title>{`Day ${data.day}: ${data.actual} points remaining${data.completedPoints > 0 ? `, ${data.completedPoints} points completed today` : ''}`}</title>
                              </circle>
                            )}
                        </g>
                        );
                      })}
                      
                      {/* Current day indicator */}
                      {getCurrentDayIndex() > 0 && getCurrentDayIndex() <= burndownData.length && (
                        <g>
                          <line
                            x1={(getCurrentDayIndex() - 1) * 50 + 105}
                            y1="50"
                            x2={(getCurrentDayIndex() - 1) * 50 + 105}
                            y2="400"
                            stroke="#10B981"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                          />
                          <text
                            x={(getCurrentDayIndex() - 1) * 50 + 105}
                            y="35"
                            fontSize="12"
                            fill="#10B981"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            TODAY
                          </text>
                        </g>
                      )}
                    </svg>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">Generating burndown chart...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-center mt-4 gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ideal Burndown</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Actual Progress</span>
                  </div>
                </div>
                
                {/* Daily Completion Details */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Daily Progress Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {burndownData.filter(data => data.completedPoints > 0).map((data, index) => (
                      <div key={index} className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white">
                          <FormattedDate date={new Date(data.date)} short={true} />
                        </div>
                        <div className="text-green-600 dark:text-green-400 font-bold">
                          +{data.completedPoints} pts
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {data.dayOfWeek}
                        </div>
                      </div>
                    ))}
                    {burndownData.filter(data => data.completedPoints > 0).length === 0 && (
                      <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-4">
                        No story points completed yet
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Additional Sprint Information */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {burndownData.length} Working Days
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Sprint Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {sprint.start_date ? <FormattedDate date={new Date(sprint.start_date)} short={true} /> : 'N/A'}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Start Date</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {sprint.end_date ? <FormattedDate date={new Date(sprint.end_date)} short={true} /> : 'N/A'}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">End Date</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        Day {getCurrentDayIndex()} of {burndownData.length}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Current Progress</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No stories in sprint to display burndown chart</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team Members</h3>
            {projectDevelopers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectDevelopers.map((developer, index) => {
                  // Get developer's display name
                  const developerName = developer.full_name || developer.username || developer.email;
                  const initials = developerName.split(' ').map(n => n[0]).join('').toUpperCase();
                  
                  
                  return (
                    <div key={developer.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {initials}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{developerName}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {developer.role.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Joined: <FormattedDate date={new Date(developer.joined_at)} short={true} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No developers found for this project</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Developers need to be added to the project to appear here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Story Modal */}
      <AddStoryModal
        isOpen={isAddStoryModalOpen}
        onClose={() => setIsAddStoryModalOpen(false)}
        onAddStories={handleAddStories}
        availableStories={availableStories.filter(story => 
          !(sprint.stories || []).some(sprintStory => sprintStory.id === story.id)
        )}
        currentCapacity={sprint.sprint_capacity || 0}
        usedCapacity={sprint.totalStoryPoints || 0}
        projectId={projectId}
        sprintId={sprintId}
        getTasksForStory={getTasksForStory}
        openCreateTaskModal={openCreateTaskModal}
        getTaskStatusColor={getTaskStatusColor}
        confirmDeleteTask={confirmDeleteTask}
        confirmDeleteStory={confirmDeleteStory}
        getUserDisplayName={getUserDisplayName}
      />

      {/* Edit Sprint Modal */}
      <EditSprintModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateSprint}
        sprint={sprint}
        projectDevelopers={projectDevelopers}
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
          storyId={selectedStoryForTask.id.toString()}
          storyTitle={selectedStoryForTask.title}
          projectUsers={projectUsers}
        />
      )}

      {/* Edit Task Modal */}
      {selectedTaskForEdit && (
        <EditTaskModal
          isOpen={isEditTaskModalOpen}
          onClose={() => {
            setIsEditTaskModalOpen(false);
            setSelectedTaskForEdit(null);
          }}
          onSubmit={handleUpdateTask}
          task={selectedTaskForEdit}
          projectUsers={projectUsers}
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
                    <span className="font-medium text-gray-900 dark:text-white">{storyToDelete.story_point} pts</span>
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
                      {taskToDelete.status.replace('_', ' ').toUpperCase()}
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
                        {taskToDelete.assignees.map((assigneeId: number, idx: number) => (
                          <span key={assigneeId} className="text-gray-900 dark:text-white">
                            {getUserDisplayName(assigneeId)}
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
