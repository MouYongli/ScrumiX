'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Moon, Sun, Monitor, Check, Settings,
  Database, Trash2
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { clearPreferencesCache } from '@/utils/dateFormat';
import { authenticatedFetch } from '@/utils/auth';



interface UserProfile {
  language: string;
  timezone: string;
  date_format: string;
}

interface SettingsData {
  profile: UserProfile;
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsData>({
    profile: {
      language: 'en-US',
      timezone: 'Europe/Berlin',
      date_format: 'YYYY-MM-DD',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // Load user profile from backend
        let backendProfile = null;
        try {
          const response = await authenticatedFetch('/api/v1/users/me/profile');
          if (response.ok) {
            const userData = await response.json();
            backendProfile = {
              language: userData.language || 'en-US',
              timezone: userData.timezone || 'Europe/Berlin',
              date_format: userData.date_format || 'YYYY-MM-DD',
            };
          }
        } catch (error) {
          console.warn('Failed to load user profile from backend:', error);
        }



        // Load local settings as fallback
        const savedSettings = localStorage.getItem('userSettings');
        const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
        
        // Merge settings with priority: backend > localStorage > defaults
        setSettings({
          profile: backendProfile || parsedSettings.profile || {
            language: 'en-US',
            timezone: 'Europe/Berlin',
            date_format: 'YYYY-MM-DD',
          },
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Auto-save settings to backend
  const autoSaveSettings = async (updatedSettings: SettingsData) => {
    setAutoSaveStatus('saving');
    try {
      // Save profile preferences to backend
      if (updatedSettings.profile) {
        const response = await authenticatedFetch('/api/v1/users/me/profile', {
          method: 'PUT',
          body: JSON.stringify(updatedSettings.profile),
        });

        if (!response.ok) {
          console.warn('Failed to save profile preferences to backend');
          setAutoSaveStatus('error');
          return;
        }
      }


      
      // Save to localStorage as backup
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      
      // Clear preferences cache so new preferences take effect immediately
      clearPreferencesCache();
      
      setAutoSaveStatus('saved');
      
      // Reset status after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to auto-save settings:', error);
      // Still save locally even if backend fails
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }
  };

  // Update settings with auto-save
  const updateSetting = (section: keyof SettingsData, key: string, value: any) => {
    const updatedSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    };
    
    setSettings(updatedSettings);
    
    // Trigger auto-save after a short delay to avoid too many API calls
    setTimeout(() => autoSaveSettings(updatedSettings), 500);
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Customize your experience. Changes are automatically saved.
                    </p>
                  </div>
                  {/* Auto-save indicator for profile */}
                  <div className="flex items-center gap-2">
                    {autoSaveStatus === 'saving' && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Saving...</span>
                      </div>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Saved</span>
                      </div>
                    )}
                    {autoSaveStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-600">
                        <span className="text-sm">Save failed</span>
                      </div>
                    )}
                  </div>
                </div>
                
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
                    value={settings.profile?.timezone || 'Europe/Berlin'}
                    onChange={(e) => updateSetting('profile', 'timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="Europe/Berlin">Berlin (UTC+1/+2)</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.profile?.date_format || 'YYYY-MM-DD'}
                    onChange={(e) => updateSetting('profile', 'date_format', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="MM/DD/YYYY">03/15/2024 (US Format)</option>
                    <option value="DD/MM/YYYY">15/03/2024 (European Format)</option>
                    <option value="YYYY-MM-DD">2024-03-15 (ISO Format)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Changes are automatically saved
                  </p>
                </div>

                {/* Date Format Preview */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Date Format Preview
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Sample date:</span>
                      <span className="font-mono">
                        {(() => {
                          const locale = settings.profile?.date_format === 'MM/DD/YYYY' ? 'en-US' : 
                                       settings.profile?.date_format === 'DD/MM/YYYY' ? 'en-GB' : 'sv-SE';
                          return new Date().toLocaleDateString(locale, { 
                            timeZone: 'Europe/Berlin',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          });
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">With time:</span>
                      <span className="font-mono">
                        {(() => {
                          const locale = settings.profile?.date_format === 'MM/DD/YYYY' ? 'en-US' : 
                                       settings.profile?.date_format === 'DD/MM/YYYY' ? 'en-GB' : 'sv-SE';
                          return new Date().toLocaleString(locale, { 
                            timeZone: 'Europe/Berlin',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        })()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Timezone: Europe/Berlin (automatically adjusts for daylight saving time)
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