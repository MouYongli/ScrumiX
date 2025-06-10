'use client';

import React, { useState } from 'react';
import { Bell, Check, X, AlertCircle, Info, MessageSquare } from 'lucide-react';

// Mock notification data
const mockNotifications = [
  {
    id: 1,
    type: 'task',
    title: 'New task assigned',
    message: 'You have been assigned to task "Implement user authentication"',
    project: 'E-commerce Platform',
    timestamp: '2024-03-20T10:30:00Z',
    read: false,
    icon: MessageSquare,
    priority: 'medium'
  },
  {
    id: 2,
    type: 'approval',
    title: 'Pull request review requested',
    message: 'Please review PR #123: "Add notification system"',
    project: 'E-commerce Platform',
    timestamp: '2024-03-20T09:15:00Z',
    read: false,
    icon: AlertCircle,
    priority: 'high'
  },
  {
    id: 3,
    type: 'system',
    title: 'System maintenance',
    message: 'Scheduled maintenance on March 25th, 2024',
    project: 'System',
    timestamp: '2024-03-19T16:45:00Z',
    read: true,
    icon: Info,
    priority: 'low'
  },
];

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState('all'); // all, unread, read

  const markAsRead = (notificationId: number) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const deleteNotification = (notificationId: number) => {
    setNotifications(notifications.filter(notification => notification.id !== notificationId));
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notification Center
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={markAllAsRead}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Mark all as read
            </button>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotifications.map((notification) => {
          const IconComponent = notification.icon;
          return (
            <div
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${
                notification.read 
                  ? 'border-gray-200 dark:border-gray-700' 
                  : 'border-blue-200 dark:border-blue-700'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.project}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      title="Delete notification"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredNotifications.length === 0 && (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' 
                ? "You're all caught up! No notifications to display."
                : `No ${filter} notifications to display.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage; 