import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, MessageCircle, FileText, Users, Calendar, CheckCircle, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { notificationsApi } from '../../utils/notifications-api';
import { 
  UserNotification, 
  NotificationFeed, 
  NotificationStatus, 
  NotificationType, 
  NotificationPriority 
} from '../../types/domain';

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(() => {
    // Try to restore from localStorage on initial load
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('scrumix_unread_count');
        const parsed = saved ? parseInt(saved, 10) : 0;
        return isNaN(parsed) ? 0 : parsed;
      } catch (error) {
        console.warn('Failed to load unread count from localStorage:', error);
        return 0;
      }
    }
    return 0;
  });
  const [lastKnownUnreadCount, setLastKnownUnreadCount] = useState(0);

  // Save unread count to localStorage whenever it changes
  const updateUnreadCount = useCallback((count: number | undefined) => {
    const validCount = typeof count === 'number' && !isNaN(count) ? count : 0;
    setUnreadCount(validCount);
    setLastKnownUnreadCount(validCount);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('scrumix_unread_count', validCount.toString());
      } catch (error) {
        console.warn('Failed to save unread count to localStorage:', error);
      }
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const hasLoadedRef = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum = 1, reset = false) => {
    // Don't fetch if already loading
    setLoading(prevLoading => {
      if (prevLoading) return prevLoading;
      
      // Set up the actual fetch in the next tick
      setTimeout(async () => {
        setError(null);

        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setLoading(false);
          setError('Request timed out');
          setNotifications([]);
          // Don't reset unread count on timeout - keep the existing count
        }, 10000); // 10 second timeout

        try {
          const response = await notificationsApi.getFeed({
            skip: (pageNum - 1) * 20,
            limit: 20,
            includeExpired: false
          });

          if (response.error) {
            // Handle authentication errors gracefully
            if (response.error.includes('Authentication failed') || response.error.includes('Could not validate credentials')) {
              setError('Please log in to view notifications');
              setNotifications([]);
              // Only reset unread count for auth errors if we haven't loaded any count yet
              if (unreadCount === 0) {
                setUnreadCount(0);
              }
              return;
            }
            throw new Error(response.error);
          }

          if (response.data) {
            const feedData = response.data;
            setNotifications(prev => reset ? feedData.notifications : [...prev, ...feedData.notifications]);
            updateUnreadCount(feedData.unreadCount ?? 0);
            setTotalCount(feedData.total);
            setHasMore(feedData.hasNext);
            setPage(pageNum);
          } else {
            // Handle case where data is null/undefined
            setNotifications([]);
            // Restore last known unread count if we have one
            if (lastKnownUnreadCount > 0) {
              setUnreadCount(lastKnownUnreadCount);
            }
            setError('No notifications available');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
          setError(errorMessage);
          setNotifications([]);
          // Don't reset unread count on general errors - only on auth errors
          if (errorMessage.includes('Authentication failed') || errorMessage.includes('Could not validate credentials')) {
            setUnreadCount(0);
            setLastKnownUnreadCount(0);
          } else if (lastKnownUnreadCount > 0) {
            // Restore last known count for non-auth errors
            setUnreadCount(lastKnownUnreadCount);
          }
          console.error('Failed to fetch notifications:', err);
        } finally {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }, 0);
      
      return true; // Set loading to true
    });
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      if (response.error) {
        // Silently fail for unread count - don't show errors for this
        if (!response.error.includes('Authentication failed') && !response.error.includes('Could not validate credentials')) {
          console.error('Failed to fetch unread count:', response.error);
        }
        return;
      }
      if (response.data) {
        updateUnreadCount(response.data.unread_count ?? 0);
      }
    } catch (err) {
      // Silently fail for unread count - this shouldn't disrupt the UI
      console.error('Failed to fetch unread count:', err);
    }
  }, [updateUnreadCount]);

  // Load notifications when opening
  useEffect(() => {
    if (isOpen && !hasLoadedRef.current && notifications.length === 0) {
      hasLoadedRef.current = true;
      fetchNotifications(1, true);
    }
    if (!isOpen) {
      hasLoadedRef.current = false;
      // When closing, ensure we preserve the unread count if we have notifications
      if (notifications.length > 0) {
        const currentUnreadCount = notifications.filter(n => n.status === 'unread').length;
        if (currentUnreadCount > 0 && currentUnreadCount !== unreadCount) {
          updateUnreadCount(currentUnreadCount);
        }
      }
    }
  }, [isOpen, notifications.length, notifications, unreadCount, updateUnreadCount]);

  // Periodically fetch unread count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_STATUS_CHANGED:
      case NotificationType.TASK_DEADLINE_APPROACHING:
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case NotificationType.MEETING_CREATED:
      case NotificationType.MEETING_REMINDER:
      case NotificationType.MEETING_UPDATED:
      case NotificationType.MEETING_CANCELLED:
        return <Calendar className="w-4 h-4 text-orange-500" />;
      case NotificationType.MENTION:
      case NotificationType.PROJECT_MEMBER_ADDED:
      case NotificationType.PROJECT_MEMBER_REMOVED:
        return <Users className="w-4 h-4 text-green-500" />;
      case NotificationType.BACKLOG_CREATED:
      case NotificationType.BACKLOG_UPDATED:
      case NotificationType.BACKLOG_ASSIGNED:
        return <FileText className="w-4 h-4 text-purple-500" />;
      case NotificationType.DOCUMENTATION_ADDED:
        return <FileText className="w-4 h-4 text-teal-500" />;
      case NotificationType.SPRINT_STARTED:
      case NotificationType.SPRINT_COMPLETED:
      case NotificationType.SPRINT_UPDATED:
      case NotificationType.SPRINT_ENDING:
        return <AlertTriangle className="w-4 h-4 text-indigo-500" />;
      case NotificationType.DEADLINE_APPROACHING:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case NotificationType.PROJECT_STATUS_CHANGED:
        return <Bell className="w-4 h-4 text-yellow-500" />;
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return <Bell className="w-4 h-4 text-gray-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.CRITICAL: return 'border-l-red-600';
      case NotificationPriority.HIGH: return 'border-l-red-400';
      case NotificationPriority.MEDIUM: return 'border-l-blue-500';
      case NotificationPriority.LOW: return 'border-l-gray-300';
      default: return 'border-l-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string | Date | undefined) => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const handleMarkAsRead = async (notification: UserNotification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (notification.status === NotificationStatus.READ) return;

    try {
      const response = await notificationsApi.markAsRead(notification.notification_id || notification.notificationId);
      if (response.error) {
        throw new Error(response.error);
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, status: NotificationStatus.READ, readAt: new Date() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleDismiss = async (notification: UserNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await notificationsApi.dismiss(notification.notification_id || notification.notificationId);
      if (response.error) {
        throw new Error(response.error);
      }

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      if (notification.status === NotificationStatus.UNREAD) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      if (response.error) {
        throw new Error(response.error);
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          status: NotificationStatus.READ, 
          readAt: new Date() 
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notification: UserNotification) => {
    // Mark as read if unread
    if (notification.status === NotificationStatus.UNREAD) {
      handleMarkAsRead(notification);
    }

    // Navigate to entity if URL exists
    const actionUrl = notification.notification.actionUrl || notification.notification.action_url;
    const entityUrl = notification.notification.entityUrl || notification.notification.entity_url;
    
    if (actionUrl) {
      window.open(actionUrl, '_blank');
    } else if (entityUrl && entityUrl !== '/') {
      window.location.href = entityUrl;
    }
  };

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

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <div className="flex gap-2 items-center">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Notifications List */}
            <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 text-gray-400 mx-auto mb-2 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {error && error.includes('log in') ? 'Please log in to view notifications' : 'No notifications'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {notifications.map((userNotification) => {
                    const notification = userNotification.notification;
                    return (
                    <div
                        key={userNotification.id}
                      className={`relative p-3 rounded-lg border-l-4 cursor-pointer transition-colors ${
                          userNotification.status === NotificationStatus.UNREAD
                          ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } ${getPriorityColor(notification.priority)}`}
                        onClick={() => handleNotificationClick(userNotification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.notificationType || notification.notification_type || 'system_announcement')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className={`text-sm font-medium ${
                                userNotification.status === NotificationStatus.UNREAD
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </h4>
                              <div className="flex items-center gap-1">
                                {(notification.actionUrl || notification.action_url) && (
                                  <ExternalLink className="w-3 h-3 text-gray-400" />
                                )}
                            <button
                                  onClick={(e) => handleDismiss(userNotification, e)}
                              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                            </div>
                            <p className={`text-xs mt-1 line-clamp-2 ${
                              userNotification.status === NotificationStatus.UNREAD
                              ? 'text-gray-700 dark:text-gray-300' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {notification.message}
                          </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {formatTimestamp(userNotification.createdAt || userNotification.created_at)}
                              </p>
                              {(notification.actionText || notification.action_text) && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  {notification.actionText || notification.action_text}
                                </span>
                              )}
                            </div>
                        </div>
                          {userNotification.status === NotificationStatus.UNREAD && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full p-3 text-sm text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                      ) : (
                        'Load more'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/notifications';
                }}
                className="w-full text-sm text-center text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter; 