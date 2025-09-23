/**
 * Dedicated notifications API module
 * This isolates notification functions to avoid import/compilation issues
 */

import { authenticatedFetch } from './auth';
import { ApiError } from '../types/api';

// Import notification types
import type { 
  NotificationFeed, 
  NotificationStats, 
  NotificationCreateRequest,
  NotificationBroadcastRequest,
  NotificationType,
  NotificationPriority,
  NotificationStatus
} from '../types/domain';

interface ApiResponse<T> {
  data: T | null;
  error?: string;
}

async function jsonFetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(endpoint, options);
    
    // Handle authentication errors gracefully
    if (response.status === 401) {
      return {
        data: null,
        error: 'Could not validate credentials'
      };
    }
    
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
      return {
        data: null,
        error: error.detail || `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    // Handle 204 No Content responses
    if (response.status === 204) {
      return { data: null };
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    // Handle network errors, authentication redirects, etc.
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    
    // Don't log auth errors to avoid console spam
    if (!errorMessage.includes('Authentication failed') && !errorMessage.includes('Could not validate credentials')) {
      console.error('API call failed:', errorMessage);
    }
    
    return {
      data: null,
      error: errorMessage,
    };
  }
}

// Request deduplication cache for notifications
const notificationCache = new Map<string, Promise<any>>();

function deduplicateNotificationRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  if (notificationCache.has(key)) {
    return notificationCache.get(key)!;
  }

  const promise = requestFn().finally(() => {
    notificationCache.delete(key);
  });

  notificationCache.set(key, promise);
  return promise;
}

// Clear notification cache
export function clearNotificationCache(): void {
  notificationCache.clear();
}

// Notification API functions
export const notificationsApi = {
  // Get notification feed with pagination and filtering
  getFeed: (params?: {
    skip?: number;
    limit?: number;
    notificationTypes?: NotificationType[];
    priorities?: NotificationPriority[];
    statuses?: NotificationStatus[];
    projectId?: number;
    includeExpired?: boolean;
    daysBack?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.notificationTypes) {
      params.notificationTypes.forEach(type => searchParams.append('notification_types', type));
    }
    if (params?.priorities) {
      params.priorities.forEach(priority => searchParams.append('priorities', priority));
    }
    if (params?.statuses) {
      params.statuses.forEach(status => searchParams.append('statuses', status));
    }
    if (params?.projectId) searchParams.append('project_id', params.projectId.toString());
    if (params?.includeExpired) searchParams.append('include_expired', params.includeExpired.toString());
    if (params?.daysBack) searchParams.append('days_back', params.daysBack.toString());
    
    return jsonFetch<NotificationFeed>(`/api/v1/notifications/feed?${searchParams.toString()}`);
  },

  // Get unread notification count
  getUnreadCount: () => deduplicateNotificationRequest('unreadCount', () => 
    jsonFetch<{ unread_count: number }>('/api/v1/notifications/unread-count')
  ),

  // Get notification statistics
  getStats: () => deduplicateNotificationRequest('stats', () => 
    jsonFetch<NotificationStats>('/api/v1/notifications/stats')
  ),

  // Mark notification as read
  markAsRead: (notificationId: number) => {
    // Clear caches after marking as read
    notificationCache.delete('unreadCount');
    notificationCache.delete('stats');
    
    return jsonFetch<{ message: string }>(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  },

  // Dismiss notification
  dismiss: (notificationId: number) => {
    // Clear caches after dismissing
    notificationCache.delete('unreadCount');
    notificationCache.delete('stats');
    
    return jsonFetch<{ message: string }>(`/api/v1/notifications/${notificationId}/dismiss`, {
      method: 'PUT'
    });
  },

  // Mark all notifications as read
  markAllAsRead: () => {
    // Clear caches after bulk operation
    notificationCache.delete('unreadCount');
    notificationCache.delete('stats');
    
    return jsonFetch<{ message: string }>('/api/v1/notifications/mark-all-read', {
      method: 'PUT'
    });
  },

  // Bulk update notification status
  bulkUpdate: (data: {
    notificationIds: number[];
    status: NotificationStatus;
    userId: number;
  }) => {
    // Clear caches after bulk operation
    notificationCache.delete('unreadCount');
    notificationCache.delete('stats');
    
    return jsonFetch<{ message: string }>('/api/v1/notifications/bulk-update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_ids: data.notificationIds,
        status: data.status,
        user_id: data.userId
      })
    });
  },

  // Create notification
  create: (data: NotificationCreateRequest) => {
    // Clear caches after creating notification
    notificationCache.delete('unreadCount');
    notificationCache.delete('stats');
    
    return jsonFetch<any>('/api/v1/notifications/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        message: data.message,
        notification_type: data.notificationType,
        priority: data.priority,
        action_url: data.actionUrl,
        action_text: data.actionText,
        expires_at: data.expiresAt?.toISOString(),
        recipient_user_ids: data.recipientUserIds,
        project_id: data.projectId,
        meeting_id: data.meetingId,
        backlog_item_id: data.backlogItemId,
        sprint_id: data.sprintId,
        task_id: data.taskId
      })
    });
  },

  // Broadcast notification
  broadcast: (data: NotificationBroadcastRequest) => {
    // Clear caches after broadcasting
    notificationCache.delete('unreadCount');
    notificationCache.delete('stats');
    
    return jsonFetch<any>('/api/v1/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        message: data.message,
        notification_type: data.notificationType,
        priority: data.priority,
        action_url: data.actionUrl,
        action_text: data.actionText,
        expires_at: data.expiresAt?.toISOString(),
        target_user_ids: data.targetUserIds,
        project_id: data.projectId,
        meeting_id: data.meetingId,
        backlog_item_id: data.backlogItemId,
        sprint_id: data.sprintId,
        task_id: data.taskId
      })
    });
  }
};

// Export as default for easier imports
export default notificationsApi;
