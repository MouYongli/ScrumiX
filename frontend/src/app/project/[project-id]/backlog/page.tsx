'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, ArrowUpDown, Edit2, Trash2, 
  FolderOpen, ListTodo, ChevronDown, ChevronRight, AlertCircle, Calendar, Clock
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import BacklogItemModal from '@/components/common/BacklogItemModal';

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'new' | 'ready' | 'in-progress' | 'done' | 'blocked';
  storyPoints: number;
  createdAt: string;
  lastUpdated: string;
  assignee?: string;
  labels: ('epic' | 'user-story' | 'bug' | 'enhancement')[];
  parentId?: string; // Reference to parent item (epic for user stories)
  type: 'epic' | 'user-story' | 'bug' | 'enhancement';
  hierarchyLevel: number; // 0 for epics, 1 for user stories
}

interface ProjectBacklogProps {
  params: Promise<{ 'project-id': string }>;
}

// Enhanced mock backlog data with hierarchical structure
const mockBacklogItems: BacklogItem[] = [
  // Epic: User Authentication System
  {
    id: '001',
    title: 'User Authentication System',
    description: 'As a product owner, I want a comprehensive authentication system so that users can securely access the application.',
    acceptanceCriteria: [
      'Multiple OAuth providers supported',
      'Security best practices implemented',
      'User session management included',
      'Password recovery functionality available'
    ],
    priority: 'high',
    status: 'in-progress',
    storyPoints: 0, // Epics typically don't have story points
    createdAt: '2024-03-10',
    lastUpdated: '2024-03-15',
    assignee: 'John Smith',
    labels: ['epic'],
    type: 'epic',
    hierarchyLevel: 0,
  },
  // User Story 1: Login with Google OAuth (child of Epic 001)
  {
    id: '002',
    title: 'Login with Google OAuth',
    description: 'As a user, I want to log in using my Google account so that I can quickly access the system without creating a new password.',
    acceptanceCriteria: [
      'Google OAuth integration works correctly',
      'User profile information is retrieved from Google',
      'Account linking works for existing users',
      'Error handling for failed OAuth attempts'
    ],
    priority: 'high',
    status: 'ready',
    storyPoints: 5,
    createdAt: '2024-03-11',
    lastUpdated: '2024-03-16',
    assignee: 'Jane Doe',
    labels: ['user-story'],
    parentId: '001',
    type: 'user-story',
    hierarchyLevel: 1,
  },
  // User Story 2: OAuth UI Implementation (child of Epic 001)
  
  // User Story 2: Login with GitHub OAuth (child of Epic 001)
  {
    id: '003',
    title: 'Login with GitHub OAuth',
    description: 'As a developer, I want to log in using my GitHub account so that I can access the system using my preferred developer platform.',
    acceptanceCriteria: [
      'GitHub OAuth integration works correctly',
      'Developer profile information is retrieved',
      'Repository access permissions are handled',
      'Fallback authentication available'
    ],
    priority: 'medium',
    status: 'new',
    storyPoints: 5,
    createdAt: '2024-03-12',
    lastUpdated: '2024-03-15',
    assignee: 'Alex Chen',
    labels: ['user-story'],
    parentId: '001',
    type: 'user-story',
    hierarchyLevel: 1,
  },
  // User Story 3: Password Reset via Email (child of Epic 001)
  {
    id: '004',
    title: 'Password Reset via Email',
    description: 'As a user, I want to reset my password via email so that I can regain access to my account if I forget my credentials.',
    acceptanceCriteria: [
      'Email reset link is secure and time-limited',
      'Password complexity requirements enforced',
      'User receives confirmation email',
      'Old sessions are invalidated on password change'
    ],
    priority: 'medium',
    status: 'ready',
    storyPoints: 3,
    createdAt: '2024-03-13',
    lastUpdated: '2024-03-16',
    assignee: 'Emma Davis',
    labels: ['user-story'],
    parentId: '001',
    type: 'user-story',
    hierarchyLevel: 1,
  },
  // Standalone Epic
  {
    id: '005',
    title: 'E-commerce Shopping Features',
    description: 'As a business owner, I want comprehensive shopping features so that customers can easily browse and purchase products.',
    acceptanceCriteria: [
      'Shopping cart functionality',
      'Product catalog management',
      'Payment processing integration',
      'Order management system'
    ],
    priority: 'high',
    status: 'new',
    storyPoints: 0,
    createdAt: '2024-03-09',
    lastUpdated: '2024-03-16',
    assignee: 'Product Team',
    labels: ['epic'],
    type: 'epic',
    hierarchyLevel: 0,
  },
  // Standalone Bug
  {
    id: '006',
    title: 'Fix Search Performance Issue',
    description: 'Searching for products is slow',
    acceptanceCriteria: [
      'Search results load within 2 seconds',
      'Auto-complete suggestions work properly',
      'Search handles special characters correctly',
      'No memory leaks in search functionality'
    ],
    priority: 'medium',
    status: 'new',
    storyPoints: 5,
    createdAt: '2024-03-08',
    lastUpdated: '2024-03-12',
    labels: ['bug'],
    type: 'bug',
    hierarchyLevel: 0,
  },
];

const ProjectBacklog: React.FC<ProjectBacklogProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>(mockBacklogItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLabel, setFilterLabel] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [collapsedHierarchy, setCollapsedHierarchy] = useState<Set<string>>(new Set());

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Project Name', href: `/project/${projectId}/dashboard` },
    { label: 'Product Backlog', icon: <ListTodo className="w-4 h-4" /> }
  ];

  // Build hierarchical structure
  const buildHierarchy = (items: BacklogItem[]) => {
    const itemMap = new Map<string, BacklogItem & { children: BacklogItem[] }>();
    const rootItems: (BacklogItem & { children: BacklogItem[] })[] = [];

    // Initialize all items in the map
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Build parent-child relationships
    items.forEach(item => {
      const itemWithChildren = itemMap.get(item.id)!;
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId)!.children.push(itemWithChildren);
      } else {
        rootItems.push(itemWithChildren);
      }
    });

    return rootItems;
  };

  // Flatten hierarchy for display with visibility control
  const flattenHierarchy = (hierarchyItems: (BacklogItem & { children: BacklogItem[] })[]) => {
    const result: BacklogItem[] = [];
    
    const traverse = (items: (BacklogItem & { children: BacklogItem[] })[], level = 0) => {
      items.forEach(item => {
        const { children, ...itemWithoutChildren } = item;
        result.push({ ...itemWithoutChildren, hierarchyLevel: level });
        
        // Only show children if parent is not collapsed
        if (!collapsedHierarchy.has(item.id) && children.length > 0) {
          traverse(children as any, level + 1);
        }
      });
    };
    
    traverse(hierarchyItems);
    return result;
  };

  const filteredItems = backlogItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.acceptanceCriteria.some(criteria => criteria.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesLabel = filterLabel === 'all' || item.labels.includes(filterLabel as any);
    return matchesSearch && matchesPriority && matchesStatus && matchesLabel;
  });

  const hierarchyItems = buildHierarchy(filteredItems);
  const displayItems = flattenHierarchy(hierarchyItems);

  const handleAddItem = (newItem: Omit<BacklogItem, 'id' | 'createdAt' | 'lastUpdated'>) => {
    const now = new Date().toISOString().split('T')[0];
    const item: BacklogItem = {
      ...newItem,
      id: (backlogItems.length + 1).toString().padStart(3, '0'),
      createdAt: now,
      lastUpdated: now,
      type: newItem.type || 'user-story',
      hierarchyLevel: newItem.hierarchyLevel || 0,
    };
    setBacklogItems([...backlogItems, item]);
    setIsAddModalOpen(false);
  };

  const handleEditItem = (editedItem: BacklogItem) => {
    const updatedItem = {
      ...editedItem,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setBacklogItems(backlogItems.map(item => 
      item.id === editedItem.id ? updatedItem : item
    ));
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this PBI? This action cannot be undone.')) {
      setBacklogItems(backlogItems.filter(item => item.id !== id));
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

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Product Backlog
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and prioritize your product backlog items with detailed tracking
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
            {backlogItems.filter(item => item.status === 'done').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {backlogItems.filter(item => item.status === 'in-progress').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {backlogItems.reduce((sum, item) => sum + item.storyPoints, 0)}
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
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="ready">Ready</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>

            <select
              value={filterLabel}
              onChange={(e) => setFilterLabel(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Labels</option>
              <option value="epic">Epic</option>
              <option value="user-story">User Story</option>
              <option value="bug">Bug</option>
              <option value="enhancement">Enhancement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backlog Items List - Hierarchical */}
      <div className="space-y-4">
        {displayItems.map((item) => {
          const hasChildren = backlogItems.some(child => child.parentId === item.id);
          const isCollapsed = collapsedHierarchy.has(item.id);
          
          return (
          <div 
            key={item.id} 
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${
              item.hierarchyLevel > 0 ? `ml-8 border-l-4 ${
                item.type === 'user-story' ? 'border-l-blue-300' : 
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
                        onClick={() => toggleHierarchyCollapse(item.id)}
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
                      item.type === 'epic' ? 'bg-purple-100 dark:bg-purple-900/20' :
                      item.type === 'user-story' ? 'bg-blue-100 dark:bg-blue-900/20' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {item.type === 'epic' ? 'EPIC' : 'PBI'}-{item.id}
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
                        {item.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {item.storyPoints} SP
                      </span>
                      {item.assignee && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          @{item.assignee}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.labels.map((label) => (
                        <span
                          key={label}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLabelColor(label)}`}
                        >
                          {label.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {item.description}
                </p>

                {/* Expandable Acceptance Criteria */}
                {item.acceptanceCriteria.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleItemExpansion(item.id)}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedItems.has(item.id) ? 'rotate-180' : ''}`} />
                      Acceptance Criteria ({item.acceptanceCriteria.length})
                    </button>
                    {expandedItems.has(item.id) && (
                      <ul className="mt-2 space-y-1 pl-6">
                        {item.acceptanceCriteria.map((criteria, index) => (
                          <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {criteria}
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
                    Created: {item.createdAt}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated: {item.lastUpdated}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setEditingItem(item)}
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

        {displayItems.length === 0 && (
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
        onSubmit={(item) => {
          if (editingItem) {
            handleEditItem({ ...item, id: editingItem.id, createdAt: editingItem.createdAt, lastUpdated: editingItem.lastUpdated });
          } else {
            handleAddItem(item);
          }
        }}
        editingItem={editingItem}
      />
    </div>
  );
};

export default ProjectBacklog;
