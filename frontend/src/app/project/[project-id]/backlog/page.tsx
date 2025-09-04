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

// Extended type for hierarchical display
interface HierarchicalBacklogItem extends BacklogItem {
  children?: HierarchicalBacklogItem[];
}

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
        
        if (projectResponse.data) {
          setProject({
            id: projectResponse.data.id,
            name: projectResponse.data.name,
            description: projectResponse.data.description
          });
        }
        
        // Fetch backlog items for the project
        const response = await api.backlogs.getAll({
          project_id: parseInt(projectId),
          include_children: true,
          include_acceptance_criteria: true
        });
        
        if (response.error) throw new Error(response.error);
        
        // Transform the data to match our interface
        const items = (response.data || []).map(item => ({
          ...item,
          acceptance_criteria: Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria : []
        }));
        
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BacklogItem | null>(null);

  // Validate editingItem state to ensure acceptance_criteria is always an array
  useEffect(() => {
    if (editingItem && (!editingItem.acceptance_criteria || !Array.isArray(editingItem.acceptance_criteria))) {
      setEditingItem({
        ...editingItem,
        acceptance_criteria: []
      });
    }
  }, [editingItem]);

  // Function to organize backlog items hierarchically
  const organizeHierarchically = (items: BacklogItem[]) => {
    const itemMap = new Map<number, HierarchicalBacklogItem>();
    const rootItems: HierarchicalBacklogItem[] = [];
    
    // First pass: create a map of all items
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Second pass: organize into parent-child relationships
    items.forEach(item => {
      if (item.parent_id && itemMap.has(item.parent_id)) {
        const parent = itemMap.get(item.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(itemMap.get(item.id)!);
      } else {
        rootItems.push(itemMap.get(item.id)!);
      }
    });

    return rootItems;
  };

  // Function to render a single backlog item with its children
  const renderBacklogItem = (item: HierarchicalBacklogItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isCollapsed = collapsedHierarchy.has(item.id.toString());
    
    return (
      <div key={item.id}>
        <div 
          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${
            depth > 0 ? `ml-${depth * 8} border-l-4 ${
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
                  Created: {new Date(item.created_at).toLocaleDateString('en-US', { timeZone: 'Europe/Berlin' })}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated: {new Date(item.updated_at).toLocaleDateString('en-US', { timeZone: 'Europe/Berlin' })}
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
                   setEditingItem(editingData);
                 }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Edit PBI"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteItemClick(item)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete PBI"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Render children if not collapsed */}
        {hasChildren && !isCollapsed && (
          <div className="space-y-4">
            {item.children!.map(child => renderBacklogItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: project?.name || 'Project', href: `/project/${projectId}/dashboard` },
    { label: 'Product Backlog', href: `/project/${projectId}/backlog` }
  ];

  // Filter backlog items based on search and filters
  const filteredBacklogItems = backlogItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.acceptance_criteria && item.acceptance_criteria.some(ac => 
        ac.title.toLowerCase().includes(searchTerm.toLowerCase())
                         ));
    
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesLabel = filterLabel === 'all' || item.item_type === filterLabel;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesLabel;
  });

  // Toggle item expansion for acceptance criteria
  const toggleItemExpansion = (itemId: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(itemId)) {
      newExpandedItems.delete(itemId);
    } else {
      newExpandedItems.add(itemId);
    }
    setExpandedItems(newExpandedItems);
  };

  // Toggle hierarchy collapse for parent items
  const toggleHierarchyCollapse = (itemId: string) => {
    const newCollapsedHierarchy = new Set(collapsedHierarchy);
    if (newCollapsedHierarchy.has(itemId)) {
      newCollapsedHierarchy.delete(itemId);
    } else {
      newCollapsedHierarchy.add(itemId);
    }
    setCollapsedHierarchy(newCollapsedHierarchy);
  };

  // Color utility functions
  const getPriorityColor = (priority: BacklogPriority) => {
    switch (priority) {
      case BacklogPriority.CRITICAL: return 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      case BacklogPriority.HIGH: return 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300';
      case BacklogPriority.MEDIUM: return 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
      case BacklogPriority.LOW: return 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      default: return 'border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: BacklogStatus) => {
    switch (status) {
      case BacklogStatus.TODO: return 'border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
      case BacklogStatus.IN_PROGRESS: return 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
      case BacklogStatus.IN_REVIEW: return 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
      case BacklogStatus.DONE: return 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case BacklogStatus.CANCELLED: return 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      default: return 'border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'story': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'bug': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  // Handle adding new items
  const handleAddItem = async (itemData: any) => {
    try {
      const newItem = {
        ...itemData,
        project_id: parseInt(projectId),
        acceptance_criteria: itemData.acceptanceCriteria || []
      };

      const response = await api.backlogs.create(newItem);
      if (response.error) throw new Error(response.error);

      // Refresh the backlog items
      const refreshResponse = await api.backlogs.getAll({
        project_id: parseInt(projectId),
        include_children: true,
        include_acceptance_criteria: true
      });
      
      if (refreshResponse.error) throw new Error(refreshResponse.error);
      
      const items = (refreshResponse.data || []).map(item => ({
        ...item,
        acceptance_criteria: Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria : []
      }));

      setBacklogItems(items);
      setIsAddModalOpen(false);
      
      // Show a success message for the newly created item
      if (newItem.item_type === BacklogType.EPIC) {
        console.log('Epic created successfully! It will now be available as a parent option for user stories.');
      } else if (newItem.item_type === BacklogType.BUG) {
        console.log('Bug created successfully!');
      } else {
        console.log('User story created successfully!');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      // You might want to show a toast notification here
    }
  };

  // Handle editing items
  const handleEditItem = async (itemData: any) => {
    try {
      const updateData = {
        title: itemData.title,
        description: itemData.description,
        priority: itemData.priority,
        status: itemData.status,
        story_point: itemData.story_point,
        parent_id: itemData.parent_id || null, // Ensure null is properly handled
        item_type: itemData.item_type
      };

      const response = await api.backlogs.update(itemData.id, updateData);
      if (response.error) throw new Error(response.error);

      // Handle acceptance criteria updates
      if (itemData.acceptance_criteria_titles && itemData.acceptance_criteria_titles.length > 0) {
        // Delete existing acceptance criteria
        await api.acceptanceCriteria.deleteAllByBacklogId(itemData.id);
          
          // Create new acceptance criteria
        const criteriaData = itemData.acceptance_criteria_titles
          .filter((title: string) => title.trim() !== '')
          .map((title: string) => ({ title: title.trim() }));
        
        if (criteriaData.length > 0) {
          await api.acceptanceCriteria.bulkCreate(itemData.id, criteriaData.map((c: any) => c.title));
        }
      }

      // Refresh the backlog items
      const refreshResponse = await api.backlogs.getAll({
        project_id: parseInt(projectId),
        include_children: true,
        include_acceptance_criteria: true
      });
      
      if (refreshResponse.error) throw new Error(refreshResponse.error);
      
      const items = (refreshResponse.data || []).map(item => ({
        ...item,
        acceptance_criteria: Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria : []
      }));

      setBacklogItems(items);
      setEditingItem(null);
    } catch (error) {
      console.error('Error editing item:', error);
      // You might want to show a toast notification here
    }
  };

  // Handle delete item click (opens modal)
  const handleDeleteItemClick = (item: BacklogItem) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  // Handle actual deletion (called from modal)
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const response = await api.backlogs.delete(itemToDelete.id);
      if (response.error) throw new Error(response.error);

      // Refresh the backlog items
      const refreshResponse = await api.backlogs.getAll({
        project_id: parseInt(projectId),
        include_children: true,
        include_acceptance_criteria: true
      });
      
      if (refreshResponse.error) throw new Error(refreshResponse.error);
      
      const items = (refreshResponse.data || []).map(item => ({
        ...item,
        acceptance_criteria: Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria : []
      }));

      setBacklogItems(items);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      
      console.log(`${itemToDelete.item_type === BacklogType.EPIC ? 'Epic' : itemToDelete.item_type === BacklogType.BUG ? 'Bug' : 'User story'} "${itemToDelete.title}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting item:', error);
      // You might want to show a toast notification here
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading backlog...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-32 w-32 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Backlog</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
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
              <option value={BacklogType.STORY}>User Story</option>
              <option value={BacklogType.BUG}>Bug</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backlog Items List - Hierarchical */}
      <div className="space-y-4">
        {organizeHierarchically(filteredBacklogItems).map((item) => renderBacklogItem(item))}
      </div>

      {/* Add/Edit Modal */}
      <BacklogItemModal
        isOpen={isAddModalOpen || editingItem !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={(item) => {
          if (editingItem) {
            const editData: any = {
              ...editingItem,
              ...item,
              // Pass acceptance criteria titles for updating
              acceptance_criteria_titles: item.acceptanceCriteria
            };
            handleEditItem(editData);
          } else {
            handleAddItem({
              ...item
              // story_point is now preserved from the form data
              // item_type is now preserved from the form data
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
             if (editingItem && editingItem.acceptance_criteria && Array.isArray(editingItem.acceptance_criteria) && editingItem.acceptance_criteria.length > 0) {
              return editingItem.acceptance_criteria.map(ac => ac.title);
            }
             return [];
          })()
        } : null}
        projectId={parseInt(projectId)}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                    Delete {itemToDelete.item_type === BacklogType.EPIC ? 'Epic' : 
                            itemToDelete.item_type === BacklogType.BUG ? 'Bug' : 'User Story'}
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete this {itemToDelete.item_type === BacklogType.EPIC ? 'epic' : 
                  itemToDelete.item_type === BacklogType.BUG ? 'bug' : 'user story'}?
                </p>
                
                {/* Item Details */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 border-red-400">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        itemToDelete.item_type === BacklogType.EPIC ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' :
                        itemToDelete.item_type === BacklogType.BUG ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        {itemToDelete.item_type === BacklogType.EPIC ? 'EPIC' : 
                         itemToDelete.item_type === BacklogType.BUG ? 'BUG' : 'STORY'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {itemToDelete.title}
                      </h4>
                      {itemToDelete.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {itemToDelete.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          itemToDelete.priority === BacklogPriority.HIGH ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                          itemToDelete.priority === BacklogPriority.MEDIUM ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {itemToDelete.priority} Priority
                        </span>
                        <span>
                          {itemToDelete.story_point} {itemToDelete.story_point === 1 ? 'Point' : 'Points'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning for epics with children */}
                {itemToDelete.item_type === BacklogType.EPIC && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <div className="w-5 h-5 text-amber-600 dark:text-amber-400">⚠️</div>
                      </div>
                      <div>
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                          Warning: Epic Deletion
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Deleting this epic may affect associated user stories. Make sure to reassign any child stories to another epic if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                Delete {itemToDelete.item_type === BacklogType.EPIC ? 'Epic' : 
                        itemToDelete.item_type === BacklogType.BUG ? 'Bug' : 'Story'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBacklog;
