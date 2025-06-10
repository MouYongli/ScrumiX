'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Edit2, Trash2, FolderOpen, 
  BookOpen, User, Tag, Clock, ChevronDown, ArrowUpDown,
  CheckCircle, Circle, AlertCircle, Target, FileText
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import UserStoryModal from '@/components/common/UserStoryModal';

interface UserStory {
  id: string;
  title: string;
  asA: string; // As a [user type]
  iWant: string; // I want [functionality]
  soThat: string; // So that [benefit]
  acceptanceCriteria: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'ready' | 'in-progress' | 'testing' | 'done';
  storyPoints: number;
  epic?: string;
  sprint?: string;
  assignee?: string;
  labels: string[];
  createdAt: string;
  estimatedHours?: number;
}

interface Epic {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface ProjectUserStoriesProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock data
const mockEpics: Epic[] = [
  { id: '1', name: 'User Authentication', description: 'User login and security features', color: 'bg-blue-500' },
  { id: '2', name: 'E-commerce', description: 'Shopping and payment features', color: 'bg-green-500' },
  { id: '3', name: 'Content Management', description: 'Content creation and management', color: 'bg-purple-500' },
  { id: '4', name: 'Analytics', description: 'Data tracking and reporting', color: 'bg-orange-500' },
];

const mockUserStories: UserStory[] = [
  {
    id: '1',
    title: 'User Registration',
    asA: 'new visitor',
    iWant: 'to create an account with email and password',
    soThat: 'I can access personalized features and save my preferences',
    acceptanceCriteria: [
      'Email validation is performed',
      'Password meets security requirements',
      'Confirmation email is sent',
      'User is redirected to welcome page after registration'
    ],
    priority: 'critical',
    status: 'ready',
    storyPoints: 8,
    epic: 'User Authentication',
    assignee: 'Sarah Johnson',
    labels: ['frontend', 'backend', 'security'],
    createdAt: '2024-03-10',
    estimatedHours: 16,
  },
  {
    id: '2',
    title: 'Product Search',
    asA: 'customer',
    iWant: 'to search for products by name, category, or keywords',
    soThat: 'I can quickly find items I want to purchase',
    acceptanceCriteria: [
      'Search bar is prominently displayed',
      'Search results are relevant and fast',
      'Filters can be applied to narrow results',
      'Search suggestions appear as user types'
    ],
    priority: 'high',
    status: 'in-progress',
    storyPoints: 13,
    epic: 'E-commerce',
    assignee: 'Mike Chen',
    labels: ['frontend', 'search', 'ux'],
    createdAt: '2024-03-09',
    estimatedHours: 24,
  },
  {
    id: '3',
    title: 'Shopping Cart Management',
    asA: 'customer',
    iWant: 'to add, remove, and modify items in my shopping cart',
    soThat: 'I can review and adjust my purchases before checkout',
    acceptanceCriteria: [
      'Add items to cart from product pages',
      'Update quantity of items in cart',
      'Remove items from cart',
      'Cart persists across browser sessions',
      'Cart total is calculated correctly'
    ],
    priority: 'critical',
    status: 'testing',
    storyPoints: 21,
    epic: 'E-commerce',
    assignee: 'Emily Rodriguez',
    labels: ['frontend', 'backend', 'cart'],
    createdAt: '2024-03-08',
    estimatedHours: 32,
  },
  {
    id: '4',
    title: 'Content Publishing',
    asA: 'content manager',
    iWant: 'to publish blog posts with rich text formatting',
    soThat: 'I can share engaging content with our audience',
    acceptanceCriteria: [
      'Rich text editor with formatting options',
      'Image upload and embedding capability',
      'Preview mode before publishing',
      'Schedule posts for future publication',
      'SEO metadata can be set'
    ],
    priority: 'medium',
    status: 'draft',
    storyPoints: 5,
    epic: 'Content Management',
    labels: ['cms', 'editor', 'seo'],
    createdAt: '2024-03-07',
    estimatedHours: 20,
  },
  {
    id: '5',
    title: 'User Analytics Dashboard',
    asA: 'business analyst',
    iWant: 'to view user behavior analytics and reports',
    soThat: 'I can make data-driven decisions to improve the platform',
    acceptanceCriteria: [
      'Dashboard shows key metrics and KPIs',
      'Interactive charts and graphs',
      'Date range filtering',
      'Export data to CSV/PDF',
      'Real-time data updates'
    ],
    priority: 'low',
    status: 'draft',
    storyPoints: 8,
    epic: 'Analytics',
    assignee: 'David Park',
    labels: ['analytics', 'dashboard', 'reporting'],
    createdAt: '2024-03-06',
    estimatedHours: 28,
  },
];

const ProjectUserStories: React.FC<ProjectUserStoriesProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [userStories, setUserStories] = useState<UserStory[]>(mockUserStories);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEpic, setFilterEpic] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  const [selectedStory, setSelectedStory] = useState<UserStory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Project Name', href: `/project/${projectId}/dashboard` },
    { label: 'User Stories', icon: <BookOpen className="w-4 h-4" /> }
  ];

  const filteredStories = userStories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.asA.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.iWant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.soThat.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || story.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || story.status === filterStatus;
    const matchesEpic = filterEpic === 'all' || story.epic === filterEpic;
    return matchesSearch && matchesPriority && matchesStatus && matchesEpic;
  });

  const sortedStories = [...filteredStories].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'points':
        return b.storyPoints - a.storyPoints;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
      case 'ready': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in-progress': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
      case 'testing': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      case 'done': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'ready': return <Circle className="w-4 h-4" />;
      case 'in-progress': return <Clock className="w-4 h-4" />;
      case 'testing': return <AlertCircle className="w-4 h-4" />;
      case 'done': return <CheckCircle className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getEpicColor = (epicName: string) => {
    const epic = mockEpics.find(e => e.name === epicName);
    return epic?.color || 'bg-gray-500';
  };

  const handleAddStory = (newStory: Omit<UserStory, 'id' | 'createdAt'>) => {
    const story: UserStory = {
      ...newStory,
      id: (userStories.length + 1).toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUserStories([...userStories, story]);
    setIsModalOpen(false);
  };

  const handleEditStory = (editedStory: UserStory) => {
    setUserStories(userStories.map(story => 
      story.id === editedStory.id ? editedStory : story
    ));
    setSelectedStory(null);
  };

  const handleDeleteStory = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user story?')) {
      setUserStories(userStories.filter(story => story.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Stories
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage user stories and requirements for your project
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Story
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStories.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userStories.filter(s => s.status === 'done').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userStories.filter(s => s.status === 'in-progress' || s.status === 'testing').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Story Points</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userStories.reduce((sum, story) => sum + story.storyPoints, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search user stories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="in-progress">In Progress</option>
              <option value="testing">Testing</option>
              <option value="done">Done</option>
            </select>

            <select
              value={filterEpic}
              onChange={(e) => setFilterEpic(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Epics</option>
              {mockEpics.map(epic => (
                <option key={epic.id} value={epic.name}>{epic.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="created">Sort by Created</option>
              <option value="priority">Sort by Priority</option>
              <option value="points">Sort by Story Points</option>
              <option value="title">Sort by Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Stories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedStories.map((story) => (
          <div key={story.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getPriorityColor(story.priority)}`}>
                    {story.priority.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(story.status)}`}>
                    {getStatusIcon(story.status)}
                    {story.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedStory(story)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteStory(story.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Epic Badge */}
              {story.epic && (
                <div className="mb-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${getEpicColor(story.epic)}`}>
                    {story.epic}
                  </span>
                </div>
              )}

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {story.title}
              </h3>

              {/* User Story Format */}
              <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                <p><span className="font-medium">As a</span> {story.asA}</p>
                <p><span className="font-medium">I want</span> {story.iWant}</p>
                <p><span className="font-medium">So that</span> {story.soThat}</p>
              </div>

              {/* Acceptance Criteria */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Acceptance Criteria ({story.acceptanceCriteria.length})
                </p>
                <div className="space-y-1">
                  {story.acceptanceCriteria.slice(0, 2).map((criteria, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{criteria}</span>
                    </div>
                  ))}
                  {story.acceptanceCriteria.length > 2 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 ml-5">
                      +{story.acceptanceCriteria.length - 2} more criteria
                    </p>
                  )}
                </div>
              </div>

              {/* Labels */}
              {story.labels.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {story.labels.map((label, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {story.storyPoints} pts
                  </span>
                  {story.estimatedHours && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {story.estimatedHours}h
                    </span>
                  )}
                </div>
                {story.assignee && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{story.assignee}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedStories.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No user stories found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by creating your first user story.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Story
          </button>
        </div>
      )}

      {/* User Story Modal */}
      <UserStoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddStory}
        epics={mockEpics}
      />

      {/* Edit User Story Modal */}
      {selectedStory && (
        <UserStoryModal
          isOpen={!!selectedStory}
          onClose={() => setSelectedStory(null)}
          onSubmit={(editedStory) => {
            const updatedStory: UserStory = {
              ...editedStory,
              id: selectedStory.id,
              createdAt: selectedStory.createdAt,
            };
            handleEditStory(updatedStory);
          }}
          editingStory={selectedStory}
          epics={mockEpics}
        />
      )}
    </div>
  );
};

export default ProjectUserStories;
