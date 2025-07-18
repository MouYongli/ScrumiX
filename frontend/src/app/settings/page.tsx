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

interface SettingsData {
  profile: {
    language: string;
    timezone: string;
    dateFormat: string;
  };
  notifications: {
    email: {
      projectUpdates: boolean;
      taskAssignments: boolean;
      sprintChanges: boolean;
      meetingReminders: boolean;
      weeklyDigest: boolean;
    };
    push: {
      taskDeadlines: boolean;
      mentionsAndComments: boolean;
      projectInvitations: boolean;
      systemUpdates: boolean;
    };
    inApp: {
      realTimeUpdates: boolean;
      soundNotifications: boolean;
      desktopNotifications: boolean;
    };
  };
  privacy: {
    profileVisibility: 'public' | 'team' | 'private';
    showOnlineStatus: boolean;
    allowProjectInvitations: boolean;
    dataCollection: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    loginAlerts: boolean;
  };
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
      email: {
        projectUpdates: true,
        taskAssignments: true,
        sprintChanges: true,
        meetingReminders: true,
        weeklyDigest: false,
      },
      push: {
        taskDeadlines: true,
        mentionsAndComments: true,
        projectInvitations: true,
        systemUpdates: false,
      },
      inApp: {
        realTimeUpdates: true,
        soundNotifications: true,
        desktopNotifications: true,
      },
    },
    privacy: {
      profileVisibility: 'team',
      showOnlineStatus: true,
      allowProjectInvitations: true,
      dataCollection: true,
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      loginAlerts: true,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update settings
  const updateSetting = (section: keyof SettingsData, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  // Update nested settings
  const updateNestedSetting = (section: keyof SettingsData, subsection: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...(prev[section] as any)[subsection],
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
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'security', label: 'Security', icon: Lock },
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
                    value={settings.profile.language}
                    onChange={(e) => updateSetting('profile', 'language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="zh-CN">简体中文</option>
                    <option value="ja-JP">日本語</option>
                  </select>
                </div>

                {/* Timezone Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.profile.timezone}
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
                    value={settings.profile.dateFormat}
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

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Settings</h2>
                
                {/* Email Notifications */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(settings.notifications.email).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2">
                        <span className="text-gray-700 dark:text-gray-300">
                          {key === 'projectUpdates' && 'Project Updates'}
                          {key === 'taskAssignments' && 'Task Assignments'}
                          {key === 'sprintChanges' && 'Sprint Changes'}
                          {key === 'meetingReminders' && 'Meeting Reminders'}
                          {key === 'weeklyDigest' && 'Weekly Digest'}
                        </span>
                        <button
                          onClick={() => updateNestedSetting('notifications', 'email', key, !value)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Push Notifications */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Push Notifications</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(settings.notifications.push).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2">
                        <span className="text-gray-700 dark:text-gray-300">
                          {key === 'taskDeadlines' && 'Task Deadline Reminders'}
                          {key === 'mentionsAndComments' && 'Mentions and Comments'}
                          {key === 'projectInvitations' && 'Project Invitations'}
                          {key === 'systemUpdates' && 'System Updates'}
                        </span>
                        <button
                          onClick={() => updateNestedSetting('notifications', 'push', key, !value)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* In-App Notifications */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">In-App Notifications</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(settings.notifications.inApp).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2">
                        <span className="text-gray-700 dark:text-gray-300">
                          {key === 'realTimeUpdates' && 'Real-time Updates'}
                          {key === 'soundNotifications' && 'Sound Notifications'}
                          {key === 'desktopNotifications' && 'Desktop Notifications'}
                        </span>
                        <button
                          onClick={() => updateNestedSetting('notifications', 'inApp', key, !value)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Privacy Settings</h2>
                
                {/* Profile Visibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={settings.privacy.profileVisibility}
                    onChange={(e) => updateSetting('privacy', 'profileVisibility', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="public">Public</option>
                    <option value="team">Team Members Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                {/* Other Privacy Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Show Online Status</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Let other users see your online status</p>
                    </div>
                    <button
                      onClick={() => updateSetting('privacy', 'showOnlineStatus', !settings.privacy.showOnlineStatus)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.privacy.showOnlineStatus ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.privacy.showOnlineStatus ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Allow Project Invitations</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Other users can invite you to join projects</p>
                    </div>
                    <button
                      onClick={() => updateSetting('privacy', 'allowProjectInvitations', !settings.privacy.allowProjectInvitations)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.privacy.allowProjectInvitations ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.privacy.allowProjectInvitations ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Data Collection</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Allow collection of anonymous usage data to improve service</p>
                    </div>
                    <button
                      onClick={() => updateSetting('privacy', 'dataCollection', !settings.privacy.dataCollection)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.privacy.dataCollection ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.privacy.dataCollection ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h2>
                
                {/* Two-Factor Authentication */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Two-Factor Authentication</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                  <button
                    onClick={() => updateSetting('security', 'twoFactorAuth', !settings.security.twoFactorAuth)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.security.twoFactorAuth ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.security.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Session Timeout */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <select
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={240}>4 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </div>

                {/* Login Alerts */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Login Alerts</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notify you when new devices sign in to your account</p>
                  </div>
                  <button
                    onClick={() => updateSetting('security', 'loginAlerts', !settings.security.loginAlerts)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.security.loginAlerts ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.security.loginAlerts ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Data Management</h2>
                
                {/* Export Data */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">Export Data</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Download all your data from Scrumix, including profile information, project data, favorites, and more.
                      </p>
                      <button
                        onClick={handleExportData}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Export Data
                      </button>
                    </div>
                  </div>
                </div>

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