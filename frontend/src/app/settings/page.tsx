'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, User, Shield, Palette, Globe, 
  Save, Moon, Sun, Monitor, Check, Settings,
  Mail, MessageSquare, Calendar, Smartphone, 
  Lock, Eye, Database, Download, Trash2
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';

interface NotificationSettings {
  meeting_reminders: boolean;
  documentation_reminders: boolean;
  project_updates: boolean;
  deadline_reminders: boolean;
}

interface SettingsData {
  profile: {
    language: string;
    timezone: string;
    dateFormat: string;
  };
  notifications: NotificationSettings;
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsData>({
    profile: {
      language: 'en-US',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
    },
    notifications: {
      meeting_reminders: true,
      documentation_reminders: true,
      project_updates: true,
      deadline_reminders: true,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to load notification preferences from backend first
        let backendNotifications = null;
        try {
          const response = await fetch('/api/v1/user-notification-preferences/?delivery_channel=in_app', {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            backendNotifications = data.preferences;
          }
        } catch (error) {
          console.warn('Failed to load notification preferences from backend:', error);
        }

        // Load local settings
        const savedSettings = localStorage.getItem('userSettings');
        const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
        
        // Merge settings with priority: backend > localStorage > defaults
        setSettings({
          profile: {
            language: 'en-US',
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            ...parsedSettings.profile,
          },
          notifications: {
            meeting_reminders: true,
            documentation_reminders: true,
            project_updates: true,
            deadline_reminders: true,
            ...parsedSettings.notifications,
            ...(backendNotifications || {}),
          },
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Save settings
  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Save notification preferences to backend
      if (settings.notifications) {
        const response = await fetch('/api/v1/user-notification-preferences/', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            // Add auth header if needed
          },
          credentials: 'include',
          body: JSON.stringify({
            preferences: settings.notifications,
            delivery_channel: 'in_app'
          }),
        });

        if (!response.ok) {
          console.warn('Failed to save notification preferences to backend, saving locally');
        }
      }
      
      // Always save to localStorage as backup
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Still save locally even if backend fails
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // Update settings
  const updateSetting = (section: keyof SettingsData, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  // Update nested settings
  const updateNestedSetting = (section: keyof SettingsData, subsection: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [subsection]: {
          ...((prev[section] as any)?.[subsection] || {}),
          [key]: value,
        },
      },
    }));
  };

  // Export data
  const handleExportData = () => {
    const userData = {
      profile: JSON.parse(localStorage.getItem('user') || '{}'),
      settings: settings,
      favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrumiX-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete account
  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (window.confirm('Please confirm again to delete your account. All data will be permanently deleted.')) {
        // Clear all local data
        localStorage.clear();
        // Redirect to home page
        window.location.href = '/';
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'Preferences', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data Management', icon: Database },
  ];

  const themeOptions = [
    { value: 'light', label: 'Light Theme', icon: Sun },
    { value: 'dark', label: 'Dark Theme', icon: Moon },
    { value: 'system', label: 'Follow System', icon: Monitor },
  ];

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account settings and preferences
          </p>
        </div>
        
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isSaved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            
            {/* Preferences */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h2>
                
                {/* Theme Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Theme Appearance
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {themeOptions.map(option => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                          className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                            theme === option.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={settings.profile?.language || 'en-US'}
                    onChange={(e) => updateSetting('profile', 'language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="en-US">English (US)</option>
                  </select>
                </div>

                {/* Timezone Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.profile?.timezone || 'America/New_York'}
                    onChange={(e) => updateSetting('profile', 'timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="America/New_York">New York (UTC-5)</option>
                    <option value="Europe/London">London (UTC+0)</option>
                    <option value="Asia/Shanghai">Shanghai (UTC+8)</option>
                    <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.profile?.dateFormat || 'MM/DD/YYYY'}
                    onChange={(e) => updateSetting('profile', 'dateFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="MM/DD/YYYY">03/15/2024</option>
                    <option value="DD/MM/YYYY">15/03/2024</option>
                    <option value="YYYY-MM-DD">2024-03-15</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose which notifications you want to receive. These settings apply to in-app notifications.
                </p>
                
                <div className="space-y-4">
                  {/* Meeting Reminders */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Meeting Reminders</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get notified about upcoming meetings and meeting updates
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications?.meeting_reminders || false}
                        onChange={(e) => updateSetting('notifications', 'meeting_reminders', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Documentation Reminders */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Documentation Updates</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get notified when new documentation is added or updated
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications?.documentation_reminders || false}
                        onChange={(e) => updateSetting('notifications', 'documentation_reminders', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Project Updates */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Project Updates</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get notified about project changes, member additions, and status updates
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications?.project_updates || false}
                        onChange={(e) => updateSetting('notifications', 'project_updates', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Deadline Reminders */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Deadline Reminders</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get notified about approaching deadlines for tasks and sprints
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications?.deadline_reminders || false}
                        onChange={(e) => updateSetting('notifications', 'deadline_reminders', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">Email Notifications</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Email notifications are currently being developed. For now, you'll receive notifications within the app.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Data Management</h2>

                {/* Delete Account */}
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-red-900 dark:text-red-100">Delete Account</h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone, please proceed with caution.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 