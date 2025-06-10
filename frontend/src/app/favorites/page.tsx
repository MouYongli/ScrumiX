'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Star, Clock, Users, Calendar, Search, Filter, Trash2, ExternalLink, FolderOpen, FileText, Target, CheckCircle2 } from 'lucide-react';
import FavoriteButton from '@/components/common/FavoriteButton';
import Breadcrumb from '@/components/common/Breadcrumb';

interface FavoriteItem {
  id: string;
  type: 'project' | 'task' | 'document' | 'sprint';
  title: string;
  description: string;
  url: string;
  addedAt: string;
  metadata?: {
    projectName?: string;
    status?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    assignee?: string;
  };
}

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'My Favorites', icon: <Heart className="w-4 h-4" /> }
  ];

  // Mock favorite data
  const mockFavorites: FavoriteItem[] = [
    {
      id: '1',
      type: 'project',
      title: 'E-commerce Platform Rebuild',
      description: 'Modern e-commerce platform development project based on React and Node.js',
      url: '/project/1/dashboard',
      addedAt: '2024-03-10T10:30:00Z',
      metadata: {
        status: 'active',
        assignee: '8 members',
      },
    },
    {
      id: '2',
      type: 'task',
      title: 'User Login API Development',
      description: 'Implement secure user authentication and session management',
      url: '/project/1/tasks/2',
      addedAt: '2024-03-12T14:20:00Z',
      metadata: {
        projectName: 'E-commerce Platform Rebuild',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2024-03-20',
        assignee: 'John',
      },
    },
    {
      id: '3',
      type: 'sprint',
      title: 'Sprint 5: User Management Module',
      description: 'Implement user registration, login, and personal information management functions',
      url: '/project/1/sprint/5',
      addedAt: '2024-03-08T09:15:00Z',
      metadata: {
        projectName: 'E-commerce Platform Rebuild',
        status: 'active',
        dueDate: '2024-03-25',
      },
    },
    {
      id: '4',
      type: 'document',
      title: 'API Design Document',
      description: 'RESTful API interface design specification and usage instructions',
      url: '/project/1/documents/api-design',
      addedAt: '2024-03-05T16:45:00Z',
      metadata: {
        projectName: 'E-commerce Platform Rebuild',
      },
    },
    {
      id: '5',
      type: 'task',
      title: 'Database Performance Optimization',
      description: 'Optimize product query SQL and add indexes',
      url: '/project/1/tasks/5',
      addedAt: '2024-03-11T11:30:00Z',
      metadata: {
        projectName: 'E-commerce Platform Rebuild',
        status: 'completed',
        priority: 'medium',
        assignee: 'Sarah',
      },
    },
  ];

  // Load favorite data
  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get favorite data from localStorage, if none use mock data
        const savedFavorites = localStorage.getItem('favorites');
        const favoritesData = savedFavorites ? JSON.parse(savedFavorites) : mockFavorites;
        
        setFavorites(favoritesData);
        setFilteredFavorites(favoritesData);
      } catch (error) {
        console.error('Failed to load favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  // Filter favorites
  useEffect(() => {
    let filtered = favorites;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.metadata?.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFavorites(filtered);
  }, [favorites, selectedType, searchTerm]);

  // Remove favorite
  const removeFavorite = (id: string) => {
    const updatedFavorites = favorites.filter(item => item.id !== id);
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="w-5 h-5" />;
      case 'task':
        return <Target className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      case 'sprint':
        return <Calendar className="w-5 h-5" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  // Get type tag color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'task':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'document':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'sprint':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'in-progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const typeOptions = [
    { value: 'all', label: 'All', count: favorites.length },
    { value: 'project', label: 'Project', count: favorites.filter(f => f.type === 'project').length },
    { value: 'task', label: 'Task', count: favorites.filter(f => f.type === 'task').length },
    { value: 'sprint', label: 'Sprint', count: favorites.filter(f => f.type === 'sprint').length },
    { value: 'document', label: 'Document', count: favorites.filter(f => f.type === 'document').length },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Favorites</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your favorite projects, tasks, and documents</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading favorite content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Favorites
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your favorite projects, tasks, and documents
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500" />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {favorites.length} favorites
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search box */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search favorite content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex gap-2">
              {typeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedType(option.value)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedType === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label} ({option.count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Favorite list */}
      {filteredFavorites.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm || selectedType !== 'all' ? 'No matching favorites found' : 'No favorites content yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || selectedType !== 'all' 
              ? 'Try adjusting search conditions or filters'
              : 'Start collecting content you are interested in'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFavorites.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Link
                    href={item.url}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="View Details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => removeFavorite(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Remove Favorite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metadata */}
              {item.metadata && (
                <div className="space-y-2 mb-4">
                  {item.metadata.projectName && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Project:</span>
                      <span className="text-gray-900 dark:text-white">{item.metadata.projectName}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm">
                    {item.metadata.status && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        <span className={getStatusColor(item.metadata.status)}>
                          {item.metadata.status === 'active' && 'In Progress'}
                          {item.metadata.status === 'in-progress' && 'Developing'}
                          {item.metadata.status === 'completed' && 'Completed'}
                        </span>
                      </div>
                    )}
                    
                    {item.metadata.priority && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 dark:text-gray-400">Priority:</span>
                        <span className={getPriorityColor(item.metadata.priority)}>
                          {item.metadata.priority === 'urgent' && 'Urgent'}
                          {item.metadata.priority === 'high' && 'High'}
                          {item.metadata.priority === 'medium' && 'Medium'}
                          {item.metadata.priority === 'low' && 'Low'}
                        </span>
                      </div>
                    )}
                    
                    {item.metadata.assignee && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{item.metadata.assignee}</span>
                      </div>
                    )}
                  </div>
                  
                  {item.metadata.dueDate && (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Deadline: {new Date(item.metadata.dueDate).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom information */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>Added on {new Date(item.addedAt).toLocaleDateString('en-US')}</span>
                </div>
                
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(item.type)}`}>
                  {item.type === 'project' && 'Project'}
                  {item.type === 'task' && 'Task'}
                  {item.type === 'document' && 'Document'}
                  {item.type === 'sprint' && 'Sprint'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage; 