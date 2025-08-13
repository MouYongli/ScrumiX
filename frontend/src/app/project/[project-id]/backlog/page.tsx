'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, ArrowUpDown, Edit2, Trash2, 
  FolderOpen, ListTodo, ChevronDown, ChevronRight, AlertCircle, Calendar, Clock
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import BacklogItemModal from '@/components/common/BacklogItemModal';
import { api } from '@/utils/api';
import { 
  BacklogStatus, 
  BacklogPriority, 
  BacklogType, 
  ApiBacklog as BacklogItem, 
  ApiAcceptanceCriteria as AcceptanceCriteria 
} from '@/types/api';

interface ProjectBacklogProps {
  params: Promise<{ 'project-id': string }>;
}

const ProjectBacklog: React.FC<ProjectBacklogProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [project, setProject] = useState<{ id: number; name: string; description?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch project data first
        const projectResponse = await api.projects.getById(parseInt(projectId));
        if (projectResponse.error) throw new Error(projectResponse.error);
        
        setProject({
          id: projectResponse.data.id,
          name: projectResponse.data.name,
          description: projectResponse.data.description
        });
        
        // Fetch backlog items for the project
        const response = await api.backlogs.getAll({
          project_id: parseInt(projectId),
          include_children: true,
          include_acceptance_criteria: true
        });
        
        if (response.error) throw new Error(response.error);
        
        console.log('API Response:', response);
        
        // Transform the data to match our interface
        const items = (response.data || []).map(item => ({
          ...item,
          acceptance_criteria: Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria : []
        }));
        
        console.log('Backlog items with acceptance criteria:', items);
        setBacklogItems(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLabel, setFilterLabel] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [collapsedHierarchy, setCollapsedHierarchy] = useState<Set<string>>(new Set());

  // Validate editingItem state to ensure acceptance_criteria is always an array
  useEffect(() => {
    if (editingItem && (!editingItem.acceptance_criteria || !Array.isArray(editingItem.acceptance_criteria))) {
      console.log('Fixing editingItem with invalid acceptance_criteria:', editingItem);
      setEditingItem({
        ...editingItem,
        acceptance_criteria: []
      });
    }
  }, [editingItem]);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: project?.name || 'Loading...', href: `/project/${projectId}/dashboard` },
    { label: 'Product Backlog', icon: <ListTodo className="w-4 h-4" /> }
  ];

  // Build hierarchical structure
  interface BacklogItemWithChildren extends BacklogItem {
    children: BacklogItemWithChildren[];
  }

  // Interface for editing backlog items with acceptance criteria titles
  interface BacklogItemForEdit extends Omit<BacklogItem, 'acceptance_criteria'> {
    acceptance_criteria_titles: string[];
  }

  const buildHierarchy = (items: BacklogItem[]) => {
    const itemMap = new Map<number, BacklogItemWithChildren>();
    const rootItems: BacklogItemWithChildren[] = [];

    // Initialize all items in the map
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Build parent-child relationships
    items.forEach(item => {
      const itemWithChildren = itemMap.get(item.id)!;
      if (item.parent_id && itemMap.has(item.parent_id)) {
        itemMap.get(item.parent_id)!.children.push(itemWithChildren);
      } else {
        rootItems.push(itemWithChildren);
      }
    });

    return rootItems;
  };

  // Flatten hierarchy for display with visibility control
  const flattenHierarchy = (hierarchyItems: BacklogItemWithChildren[]) => {
    const result: BacklogItem[] = [];
    
    const traverse = (items: BacklogItemWithChildren[]) => {
      items.forEach(item => {
        const { children, ...itemWithoutChildren } = item;
        result.push(itemWithoutChildren);
        
        // Only show children if parent is not collapsed
        if (!collapsedHierarchy.has(item.id.toString()) && children.length > 0) {
          traverse(children);
        }
      });
    };
    
    traverse(hierarchyItems);
    return result;
  };

  const filteredItems = backlogItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.acceptance_criteria && Array.isArray(item.acceptance_criteria) && item.acceptance_criteria.some(criteria => 
                           criteria && criteria.title && criteria.title.toLowerCase().includes(searchTerm.toLowerCase())
                         ));
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesLabel = filterLabel === 'all' || item.item_type === filterLabel;
    return matchesSearch && matchesPriority && matchesStatus && matchesLabel;
  });

  const hierarchyItems = buildHierarchy(filteredItems);
  const displayItems = flattenHierarchy(hierarchyItems);

    interface NewBacklogItem {
    title: string;
    description: string;
    priority: BacklogPriority;
    status: BacklogStatus;
    story_point: number;
    item_type: BacklogType;
    parent_id?: number;
  }

  const handleAddItem = async (newItem: NewBacklogItem) => {
    try {
      const response = await api.backlogs.create({
        ...newItem,
        project_id: parseInt(projectId)
      });

      if (response.error) throw new Error(response.error);

      // Refresh the backlog items
      const updatedResponse = await api.backlogs.getAll({
        project_id: parseInt(projectId),
        include_children: true,
        include_acceptance_criteria: true
      });
      
      if (updatedResponse.error) throw new Error(updatedResponse.error);
      setBacklogItems(updatedResponse.data || []);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add backlog item:', err);
      alert('Failed to add backlog item. Please try again.');
    }
  };

    const handleEditItem = async (editedItem: BacklogItemForEdit) => {
    try {
      // Prepare update data matching the backend BacklogUpdate schema
      const updateData = {
        title: editedItem.title,
        description: editedItem.description,
        priority: editedItem.priority,
        status: editedItem.status,
        story_point: editedItem.story_point,
        item_type: editedItem.item_type,
        parent_id: editedItem.parent_id
        // Note: project_id is not included in BacklogUpdate schema
      };

      console.log('Updating backlog item:', editedItem.id, 'with data:', updateData);

      const response = await api.backlogs.update(editedItem.id, updateData);

      if (response.error) throw new Error(response.error);

      console.log('Update successful:', response.data);

      // Handle acceptance criteria updates if they exist
      if (editedItem.acceptance_criteria_titles && Array.isArray(editedItem.acceptance_criteria_titles) && editedItem.acceptance_criteria_titles.length > 0) {
        console.log('Updating acceptance criteria for item:', editedItem.id);
        
        try {
          // Delete existing acceptance criteria
          await api.acceptanceCriteria.deleteAllByBacklogId(editedItem.id);
          console.log('Deleted existing acceptance criteria');
          
          // Create new acceptance criteria
          const criteriaTitles = editedItem.acceptance_criteria_titles
            .filter(title => title && title.trim() !== '');
          
          if (criteriaTitles.length > 0) {
            const newCriteria = await api.acceptanceCriteria.bulkCreate(editedItem.id, criteriaTitles);
            if (newCriteria.error) {
              console.error('Failed to create new acceptance criteria:', newCriteria.error);
            } else {
              console.log('Created new acceptance criteria:', newCriteria.data);
            }
          }
        } catch (err) {
          console.error('Failed to update acceptance criteria:', err);
          // Don't fail the entire update if acceptance criteria update fails
        }
      }

      // Refresh the backlog items
      const updatedResponse = await api.backlogs.getAll({
        project_id: parseInt(projectId),
        include_children: true,
        include_acceptance_criteria: true
      });
      
      if (updatedResponse.error) throw new Error(updatedResponse.error);
      setBacklogItems(updatedResponse.data || []);
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to update backlog item:', err);
      alert('Failed to update backlog item. Please try again.');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this PBI? This action cannot be undone.')) {
      try {
        console.log('Deleting backlog item:', id);

        const response = await api.backlogs.delete(id);
        if (response.error) throw new Error(response.error);

        console.log('Delete successful for item:', id);

        // Refresh the backlog items
        const updatedResponse = await api.backlogs.getAll({
          project_id: parseInt(projectId),
          include_children: true,
          include_acceptance_criteria: true
        });
        
        if (updatedResponse.error) throw new Error(updatedResponse.error);
        setBacklogItems(updatedResponse.data || []);
        
        console.log('Backlog items refreshed after delete');
      } catch (err) {
        console.error('Failed to delete backlog item:', err);
        alert('Failed to delete backlog item. Please try again.');
      }
    }
  };

  const toggleItemExpansion = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const toggleHierarchyCollapse = (id: string) => {
    const newCollapsed = new Set(collapsedHierarchy);
    if (newCollapsed.has(id)) {
      newCollapsed.delete(id);
    } else {
      newCollapsed.add(id);
    }
    setCollapsedHierarchy(newCollapsed);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'ready': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'in-progress': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'done': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'blocked': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
      case 'user-story': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'bug': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'enhancement': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Backlog</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Project Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The requested project could not be found.</p>
          <Link
            href="/project"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Projects
          </Link>
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
            {project?.name ? `${project.name} - Product Backlog` : 'Product Backlog'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {project?.description || 'Manage and prioritize your product backlog items with detailed tracking'}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add PBI
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {backlogItems.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total PBIs</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {backlogItems.filter(item => item.status === BacklogStatus.DONE).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {backlogItems.filter(item => item.status === BacklogStatus.IN_PROGRESS).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {backlogItems.reduce((sum, item) => sum + (item.story_point || 0), 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Story Points</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search PBIs, descriptions, or acceptance criteria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value={BacklogPriority.HIGH}>High Priority</option>
              <option value={BacklogPriority.MEDIUM}>Medium Priority</option>
              <option value={BacklogPriority.LOW}>Low Priority</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value={BacklogStatus.TODO}>Todo</option>
              <option value={BacklogStatus.IN_PROGRESS}>In Progress</option>
              <option value={BacklogStatus.IN_REVIEW}>In Review</option>
              <option value={BacklogStatus.DONE}>Done</option>
              <option value={BacklogStatus.CANCELLED}>Cancelled</option>
            </select>

            <select
              value={filterLabel}
              onChange={(e) => setFilterLabel(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value={BacklogType.EPIC}>Epic</option>
              <option value={BacklogType.STORY}>Story</option>
              <option value={BacklogType.TASK}>Task</option>
              <option value={BacklogType.BUG}>Bug</option>
              <option value={BacklogType.FEATURE}>Feature</option>
              <option value={BacklogType.IMPROVEMENT}>Improvement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backlog Items List - Hierarchical */}
      <div className="space-y-4">
        {backlogItems.map((item) => {
          const hasChildren = backlogItems.some(child => child.parent_id === item.id);
          const isCollapsed = collapsedHierarchy.has(item.id.toString());
          
          return (
          <div 
            key={item.id} 
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${
              item.level > 0 ? `ml-8 border-l-4 ${
                item.item_type === BacklogType.STORY ? 'border-l-blue-300' : 
                'border-l-gray-300'
              }` : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Header with ID, Title, Labels, and Hierarchy Controls */}
                <div className="flex items-start gap-4 mb-3">
                  {/* Hierarchy Controls */}
                  <div className="flex items-center gap-2">
                    {hasChildren && (
                      <button
                        onClick={() => toggleHierarchyCollapse(item.id.toString())}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                        title={isCollapsed ? 'Expand children' : 'Collapse children'}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <span className={`text-sm font-mono text-gray-500 dark:text-gray-400 px-2 py-1 rounded ${
                      item.item_type === BacklogType.EPIC ? 'bg-purple-100 dark:bg-purple-900/20' :
                      item.item_type === BacklogType.STORY ? 'bg-blue-100 dark:bg-blue-900/20' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {item.item_type === BacklogType.EPIC ? 'EPIC' : 'PBI'}-{item.id}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      {/* Priority, Status, Story Points, and Assignee inline */}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                {item.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {item.story_point} SP
                </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
                <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLabelColor(item.item_type)}`}
                >
              {item.item_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
          {item.description}
        </p>

        {/* Expandable Acceptance Criteria */}
      {(item.acceptance_criteria && item.acceptance_criteria.length > 0) && (
          <div className="mb-4">
            <button
            onClick={() => toggleItemExpansion(item.id.toString())}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedItems.has(item.id.toString()) ? 'rotate-180' : ''}`} />
            Acceptance Criteria ({item.acceptance_criteria.length})
            </button>
          {expandedItems.has(item.id.toString()) && (
              <ul className="mt-2 space-y-1 pl-6">
            {item.acceptance_criteria.map((criteria) => (
              <li key={criteria.id} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                {criteria.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

                {/* Dates */}
                <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                  Created: {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                  Updated: {new Date(item.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => {
                    const editingData = {
                      ...item,
                      acceptance_criteria: (item.acceptance_criteria && Array.isArray(item.acceptance_criteria)) ? item.acceptance_criteria : []
                    };
                    console.log('Setting editing item:', editingData);
                    setEditingItem(editingData);
                  }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit PBI"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete PBI"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          );
        })}

        {backlogItems.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No PBIs found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No product backlog items match your current filters.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterPriority('all');
                setFilterStatus('all');
                setFilterLabel('all');
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <BacklogItemModal
        isOpen={isAddModalOpen || editingItem !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={(item: { title: string; description: string; priority: BacklogPriority; status: BacklogStatus; acceptanceCriteria: string[] }) => {
          if (editingItem) {
            const editData: BacklogItemForEdit = {
              ...editingItem,
              ...item,
              // Pass acceptance criteria titles for updating
              acceptance_criteria_titles: item.acceptanceCriteria
            };
            handleEditItem(editData);
          } else {
            handleAddItem({
              ...item,
              story_point: 0,
              item_type: BacklogType.STORY
            });
          }
        }}
        editingItem={editingItem ? {
          id: editingItem.id,
          title: editingItem.title,
          description: editingItem.description,
          priority: editingItem.priority,
          status: editingItem.status,
          story_point: editingItem.story_point,
          parent_id: editingItem.parent_id,
          item_type: editingItem.item_type,
          acceptanceCriteria: (() => {
            console.log('Processing editingItem for modal:', editingItem);
            if (editingItem.acceptance_criteria && Array.isArray(editingItem.acceptance_criteria) && editingItem.acceptance_criteria.length > 0) {
              return editingItem.acceptance_criteria.map(ac => ac.title);
            }
            return [''];
          })()
        } : null}
      />
    </div>
  );
};

export default ProjectBacklog;
