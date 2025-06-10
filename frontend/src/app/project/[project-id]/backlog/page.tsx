'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, ArrowUpDown, Edit2, Trash2, 
  FolderOpen, ListTodo, ChevronDown, AlertCircle
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import BacklogItemModal from '@/components/common/BacklogItemModal';

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'new' | 'ready' | 'in-progress' | 'done';
  storyPoints: number;
  createdAt: string;
  assignee?: string;
}

interface ProjectBacklogProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock backlog data
const mockBacklogItems: BacklogItem[] = [
  {
    id: '1',
    title: 'User Authentication System',
    description: 'Implement secure user authentication with OAuth 2.0',
    priority: 'high',
    status: 'ready',
    storyPoints: 8,
    createdAt: '2024-03-10',
    assignee: 'John Smith',
  },
  {
    id: '2',
    title: 'Shopping Cart Feature',
    description: 'Create shopping cart functionality with real-time updates',
    priority: 'high',
    status: 'in-progress',
    storyPoints: 13,
    createdAt: '2024-03-09',
    assignee: 'Jane Doe',
  },
  {
    id: '3',
    title: 'Product Search Optimization',
    description: 'Improve search algorithm and add filters',
    priority: 'medium',
    status: 'new',
    storyPoints: 5,
    createdAt: '2024-03-08',
  },
];

const ProjectBacklog: React.FC<ProjectBacklogProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>(mockBacklogItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Project Name', href: `/project/${projectId}/dashboard` },
    { label: 'Product Backlog', icon: <ListTodo className="w-4 h-4" /> }
  ];

  const filteredItems = backlogItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const handleAddItem = (newItem: Omit<BacklogItem, 'id' | 'createdAt'>) => {
    const item: BacklogItem = {
      ...newItem,
      id: (backlogItems.length + 1).toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setBacklogItems([...backlogItems, item]);
    setIsAddModalOpen(false);
  };

  const handleEditItem = (editedItem: BacklogItem) => {
    setBacklogItems(backlogItems.map(item => 
      item.id === editedItem.id ? editedItem : item
    ));
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setBacklogItems(backlogItems.filter(item => item.id !== id));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'ready': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'in-progress': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'done': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
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
            Manage and prioritize your product backlog items
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search backlog items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
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
            </select>
          </div>
        </div>
      </div>

      {/* Backlog Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title & Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Story Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {item.description}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {item.storyPoints}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {item.assignee || '-'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No items found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No backlog items match your current filters.
            </p>
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
            handleEditItem({ ...item, id: editingItem.id, createdAt: editingItem.createdAt });
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
