// API service for notifications

import { fetchApi } from './client';
import type { 
  Notification, 
  NotificationUI,
  PaginatedResponse 
} from '@/types/api';

// Transform backend Notification to frontend NotificationUI
function transformNotification(notification: Notification): NotificationUI {
  return {
    id: notification.id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isRead: notification.is_read,
    createdAt: notification.created_at,
    projectId: notification.project_id?.toString(),
    taskId: notification.task_id?.toString(),
  };
}

export const notificationService = {
  // Get all notifications for current user
  async getNotifications(): Promise<NotificationUI[]> {
    const response = await fetchApi<Notification[]>('/notifications/');
    return response.map(transformNotification);
  },

  // Get notifications with pagination
  async getNotificationsPaginated(
    page: number = 1, 
    limit: number = 20
  ): Promise<PaginatedResponse<NotificationUI>> {
    const response = await fetchApi<PaginatedResponse<Notification>>(
      `/notifications/?page=${page}&limit=${limit}`
    );
    return {
      ...response,
      items: response.items.map(transformNotification),
    };
  },

  // Get unread notifications
  async getUnreadNotifications(): Promise<NotificationUI[]> {
    const response = await fetchApi<Notification[]>('/notifications/?unread=true');
    return response.map(transformNotification);
  },

  // Get notification count
  async getNotificationCount(): Promise<{ total: number; unread: number }> {
    return fetchApi('/notifications/count/');
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<NotificationUI> {
    const response = await fetchApi<Notification>(`/notifications/${notificationId}/read/`, {
      method: 'POST',
    });
    return transformNotification(response);
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await fetchApi('/notifications/mark-all-read/', {
      method: 'POST',
    });
  },

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    await fetchApi(`/notifications/${notificationId}/`, {
      method: 'DELETE',
    });
  },

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    await fetchApi('/notifications/clear/', {
      method: 'DELETE',
    });
  },

  // Get project-specific notifications
  async getProjectNotifications(projectId: string): Promise<NotificationUI[]> {
    const response = await fetchApi<Notification[]>(`/notifications/?project_id=${projectId}`);
    return response.map(transformNotification);
  },

  // Subscribe to notification types
  async updateNotificationPreferences(preferences: {
    email_notifications: boolean;
    push_notifications: boolean;
    task_updates: boolean;
    sprint_updates: boolean;
    project_updates: boolean;
  }): Promise<void> {
    await fetchApi('/notifications/preferences/', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  },

  // Get notification preferences
  async getNotificationPreferences(): Promise<{
    email_notifications: boolean;
    push_notifications: boolean;
    task_updates: boolean;
    sprint_updates: boolean;
    project_updates: boolean;
  }> {
    return fetchApi('/notifications/preferences/');
  },
};
