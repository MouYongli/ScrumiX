'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Filter, CheckCircle, X, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
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

  // Refresh all data
  const refresh = () => {
    fetchNotifications(1, true);
    fetchStats();
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              {stats && stats.unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

        {/* Filters */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {Object.values(NotificationStatus).map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => handleFilterChange('status', status)}
                      className="mr-2"
                    />
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="space-y-2">
                {Object.values(NotificationPriority).map(priority => (
                  <label key={priority} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority)}
                      onChange={() => handleFilterChange('priority', priority)}
                      className="mr-2"
                    />
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(priority)}`}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.values(NotificationType).map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(type)}
                      onChange={() => handleFilterChange('type', type)}
                      className="mr-2"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {loading && notifications.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No notifications found</p>
            </div>
          ) : (
            <>
              {notifications.map((userNotification) => {
                const notification = userNotification.notification;
                return (
                  <div
                    key={userNotification.id}
                    className={`p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${
                      userNotification.status === NotificationStatus.UNREAD ? 'border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`font-medium ${
                            userNotification.status === NotificationStatus.UNREAD
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(userNotification.status)}`}>
                            {userNotification.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatTimestamp(userNotification.createdAt || userNotification.created_at)}</span>
                          {notification.actionText && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {notification.actionText}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {notification.actionUrl && (
                          <button
                            onClick={() => window.open(notification.actionUrl, '_blank')}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        
                        {userNotification.status === NotificationStatus.UNREAD && (
                          <button
                            onClick={() => handleMarkAsRead(userNotification)}
                            className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDismiss(userNotification)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
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