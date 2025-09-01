'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Filter, CheckCircle, X, ExternalLink, Loader2, Search, Calendar, ChevronDown, Settings, Archive, Trash2, Eye, EyeOff } from 'lucide-react';
import { notificationsApi } from '../../utils/notifications-api';
import { 
  UserNotification, 
  NotificationFeed, 
  NotificationStatus, 
  NotificationType, 
  NotificationPriority,
  NotificationStats
} from '../../types/domain';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    status: [] as NotificationStatus[],
    type: [] as NotificationType[],
    priority: [] as NotificationPriority[]
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [viewMode, setViewMode] = useState<'all' | 'unread' | 'read'>('all');

  // Fetch notifications with current filters
  const fetchNotifications = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(prevLoading => {
      if (prevLoading && !reset) return prevLoading;
    
      // Set up the actual fetch in the next tick
      setTimeout(async () => {
    setError(null);

    try {
      const response = await notificationsApi.getFeed({
        skip: (pageNum - 1) * 20,
        limit: 20,
        statuses: filters.status.length > 0 ? filters.status : undefined,
        notificationTypes: filters.type.length > 0 ? filters.type : undefined,
        priorities: filters.priority.length > 0 ? filters.priority : undefined,
        includeExpired: true
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const feedData = response.data;
        setNotifications(prev => reset ? feedData.notifications : [...prev, ...feedData.notifications]);
        setHasMore(feedData.hasNext);
        setPage(pageNum);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
      }, 0);
      
      return true; // Set loading to true
    });
  }, [filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await notificationsApi.getStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifications(1, true);
    fetchStats();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterType] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [filterType]: newValues
      };
    });
  };

  // Mark as read
  const handleMarkAsRead = async (notification: UserNotification) => {
    if (notification.status === NotificationStatus.READ) return;

    try {
      const response = await notificationsApi.markAsRead(notification.notification_id || notification.notificationId);
      if (response.error) {
        throw new Error(response.error);
      }

      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, status: NotificationStatus.READ, readAt: new Date() }
            : n
        )
      );
      
      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Dismiss notification
  const handleDismiss = async (notification: UserNotification) => {
    try {
      const response = await notificationsApi.dismiss(notification.notification_id || notification.notificationId);
      if (response.error) {
        throw new Error(response.error);
      }

      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      
      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      if (response.error) {
        throw new Error(response.error);
      }

      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          status: NotificationStatus.READ, 
          readAt: new Date() 
        }))
      );
      
      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Load more notifications
  const loadMore = () => {
    if (hasMore) {
      setLoading(prevLoading => {
        if (!prevLoading) {
      fetchNotifications(page + 1, false);
        }
        return prevLoading;
      });
    }
  };



  // Bulk operations
  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };

  const handleSelectNotification = (id: number) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      // Mark all selected as read (you'd need to implement this API endpoint)
      await Promise.all(
        selectedNotifications.map(id => {
          const notification = notifications.find(n => n.id === id);
          if (notification && notification.status === NotificationStatus.UNREAD) {
            return notificationsApi.markAsRead(notification.notification_id || notification.notificationId);
          }
          return Promise.resolve();
        })
      );
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          selectedNotifications.includes(n.id)
            ? { ...n, status: NotificationStatus.READ, readAt: new Date() }
            : n
        )
      );
      setSelectedNotifications([]);
      fetchStats();
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleBulkDismiss = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      await Promise.all(
        selectedNotifications.map(id => {
          const notification = notifications.find(n => n.id === id);
          if (notification) {
            return notificationsApi.dismiss(notification.notification_id || notification.notificationId);
          }
          return Promise.resolve();
        })
      );
      
      // Remove from local state
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
      setSelectedNotifications([]);
      fetchStats();
    } catch (err) {
      console.error('Failed to dismiss notifications:', err);
    }
  };

  // Filter and search
  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = notification.notification.title.toLowerCase().includes(query);
      const messageMatch = notification.notification.message.toLowerCase().includes(query);
      if (!titleMatch && !messageMatch) return false;
    }

    // View mode filter
    if (viewMode === 'unread' && notification.status !== NotificationStatus.UNREAD) return false;
    if (viewMode === 'read' && notification.status !== NotificationStatus.READ) return false;

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt || a.created_at || '').getTime() - new Date(b.createdAt || b.created_at || '').getTime();
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.notification.priority] || 0) - (priorityOrder[a.notification.priority] || 0);
      case 'newest':
      default:
        return new Date(b.createdAt || b.created_at || '').getTime() - new Date(a.createdAt || a.created_at || '').getTime();
    }
  });

  const clearAllFilters = () => {
    setFilters({
      status: [],
      type: [],
      priority: []
    });
    setSearchQuery('');
    setViewMode('all');
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.CRITICAL: return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case NotificationPriority.HIGH: return 'text-red-500 bg-red-50 dark:bg-red-900/10';
      case NotificationPriority.MEDIUM: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case NotificationPriority.LOW: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusColor = (status: NotificationStatus) => {
    switch (status) {
      case NotificationStatus.UNREAD: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case NotificationStatus.READ: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      case NotificationStatus.DISMISSED: return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const formatTimestamp = (timestamp: string | Date | undefined) => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-3">
              <div className="relative">
              <Bell className="w-8 h-8 text-blue-600" />
                {stats && stats.unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {stats.unreadCount > 9 ? '9+' : stats.unreadCount}
                  </span>
                )}
              </div>
              <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Stay updated with your latest activities
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              
              {selectedNotifications.length > 0 && (
                <>
                  <button
                    onClick={handleBulkMarkAsRead}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Mark Read ({selectedNotifications.length})
                  </button>
                  <button
                    onClick={handleBulkDismiss}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Dismiss ({selectedNotifications.length})
                  </button>
                </>
              )}
              
              {stats && stats.unreadCount > 0 && selectedNotifications.length === 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark All Read ({stats.unreadCount})
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalNotifications}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.unreadCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unread</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-green-600">
                  {stats.readCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Read</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-gray-600">
                  {stats.dismissedCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Dismissed</div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search and Quick Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Quick View Modes */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(['all', 'unread', 'read'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        viewMode === mode
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">By Priority</option>
                </select>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isFilterOpen
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Active Filters Display */}
            {(filters.status.length > 0 || filters.priority.length > 0 || filters.type.length > 0 || searchQuery) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-md">
                      Search: "{searchQuery}"
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                    </span>
                  )}
                  {filters.status.map(status => (
                    <span key={status} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs rounded-md">
                      {status}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('status', status)} />
                    </span>
                  ))}
                  {filters.priority.map(priority => (
                    <span key={priority} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 text-xs rounded-md">
                      {priority}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('priority', priority)} />
                    </span>
                  ))}
                  {filters.type.map(type => (
                    <span key={type} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 text-xs rounded-md">
                      {type.replace(/_/g, ' ')}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('type', type)} />
                    </span>
                  ))}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Expandable Filters Panel */}
          {isFilterOpen && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Filter */}
            <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status</h4>
              <div className="space-y-2">
                {Object.values(NotificationStatus).map(status => (
                      <label key={status} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => handleFilterChange('status', status)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                        <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium transition-all group-hover:scale-105 ${getStatusColor(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Priority</h4>
              <div className="space-y-2">
                {Object.values(NotificationPriority).map(priority => (
                      <label key={priority} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority)}
                      onChange={() => handleFilterChange('priority', priority)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                        <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium transition-all group-hover:scale-105 ${getPriorityColor(priority)}`}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Type</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.values(NotificationType).map(type => (
                      <label key={type} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(type)}
                      onChange={() => handleFilterChange('type', type)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Enhanced Notifications List */}
        <div className="space-y-3">
          {/* Bulk Selection Header */}
          {filteredNotifications.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select all ({filteredNotifications.length})
                  </span>
                </label>
                {selectedNotifications.length > 0 && (
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {selectedNotifications.length} selected
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </div>
            </div>
          )}

          {loading && notifications.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading notifications</h3>
              <p className="text-gray-600 dark:text-gray-400">Please wait while we fetch your latest updates...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filters'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {notifications.length === 0 
                  ? 'You\'ll see your notifications here when they arrive.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredNotifications.map((userNotification) => {
                const notification = userNotification.notification;
                const isSelected = selectedNotifications.includes(userNotification.id);
                const isUnread = userNotification.status === NotificationStatus.UNREAD;
                
                return (
                  <div
                    key={userNotification.id}
                    className={`group relative bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 hover:shadow-md ${
                      isUnread 
                        ? 'border-l-4 border-l-blue-500 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Selection Checkbox */}
                        <label className="flex items-center mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectNotification(userNotification.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          />
                        </label>

                        {/* Notification Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className={`font-semibold text-lg ${
                                isUnread
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </h3>
                              
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                                  {notification.priority.toUpperCase()}
                          </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(userNotification.status)}`}>
                                  {userNotification.status.charAt(0).toUpperCase() + userNotification.status.slice(1)}
                          </span>
                                {isUnread && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {notification.actionUrl && (
                          <button
                            onClick={() => window.open(notification.actionUrl, '_blank')}
                                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        
                              {isUnread && (
                          <button
                            onClick={() => handleMarkAsRead(userNotification)}
                                  className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Mark as read"
                          >
                                  <Eye className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDismiss(userNotification)}
                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatTimestamp(userNotification.createdAt || userNotification.created_at)}</span>
                              </div>
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {(notification.notificationType || notification.notification_type || 'notification').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                            
                            {(notification.actionText || notification.action_text) && (notification.actionUrl || notification.action_url) && (
                              <button
                                onClick={() => window.open(notification.actionUrl || notification.action_url, '_blank')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                {notification.actionText || notification.action_text}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load More */}
              {hasMore && (
                <div className="text-center py-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;