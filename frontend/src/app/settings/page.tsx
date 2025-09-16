'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Moon, Sun, Monitor, Check, Settings,
  Database, Trash2, AlertTriangle, X, Shield
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { clearPreferencesCache } from '@/utils/dateFormat';
import { authenticatedFetch } from '@/utils/auth';
import { api } from '@/utils/api';



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
  
  // Delete account modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState(1);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // Delete account handlers
  const openDeleteModal = () => {
    setIsDeleteModalOpen(true);
    setDeleteConfirmationStep(1);
    setDeleteConfirmationText('');
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteConfirmationStep(1);
    setDeleteConfirmationText('');
    setIsDeleting(false);
    setDeleteError(null);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      // Call the API to delete the account from the database
      const response = await api.users.deleteAccount();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Account successfully deleted from database
      console.log('Account deleted successfully:', response.data?.message);
      
      // Clear all local data
      localStorage.clear();
      
      // Clear any cached API data
      // (already done in the API call)
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete account:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const canProceedToStep2 = deleteConfirmationStep === 1;
  const canDeleteAccount = deleteConfirmationStep === 2 && deleteConfirmationText === 'DELETE MY ACCOUNT';

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
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                        Danger Zone
                      </h3>
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                        Delete Account
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-4 leading-relaxed">
                        Once you delete your account, there is no going back. This will permanently delete your account, 
                        all your projects, sprint data, documentation, and remove you from any teams you're part of.
                      </p>
                      <div className="bg-red-100 dark:bg-red-900/60 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-red-900 dark:text-red-100 mb-1">
                              What will be deleted:
                            </h5>
                            <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                              <li>• Your profile and account information</li>
                              <li>• All projects you own or are a member of</li>
                              <li>• Sprint history and backlog items</li>
                              <li>• Meeting notes and documentation</li>
                              <li>• Personal calendar entries</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={openDeleteModal}
                        className="bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500/50 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete My Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Account
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Step {deleteConfirmationStep} of 2
                  </p>
                </div>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {deleteConfirmationStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">
                          This action is irreversible
                        </h3>
                        <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                          Deleting your account will permanently remove all data associated with your account. 
                          This includes all projects, sprints, tasks, documentation, and team memberships.
                        </p>
                        <div className="bg-red-100 dark:bg-red-900/60 rounded-lg p-3">
                          <h4 className="font-medium text-red-900 dark:text-red-100 mb-2 text-sm">
                            Data that will be permanently deleted:
                          </h4>
                          <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                            <li>• Profile information and preferences</li>
                            <li>• All owned and participated projects</li>
                            <li>• Sprint history and backlog items</li>
                            <li>• Meeting recordings and documentation</li>
                            <li>• Personal notes and calendar entries</li>
                            <li>• Team memberships and role assignments</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-sm">
                          Consider these alternatives:
                        </h4>
                        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                          <li>• Export your data first using the export feature</li>
                          <li>• Leave teams instead of deleting your entire account</li>
                          <li>• Archive projects instead of permanent deletion</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {deleteConfirmationStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Final Confirmation
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      To confirm account deletion, type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE MY ACCOUNT</span> in the field below.
                    </p>
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      placeholder="Type DELETE MY ACCOUNT"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                      disabled={isDeleting}
                      autoFocus
                    />
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className={`w-3 h-3 rounded-full ${
                        canDeleteAccount ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}></div>
                      <span>
                        {canDeleteAccount 
                          ? 'Confirmation text matches - ready to delete' 
                          : 'Type the exact phrase to enable deletion'
                        }
                      </span>
                    </div>
                  </div>
                  
                  {/* Error Display */}
                  {deleteError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                            Deletion Failed
                          </h4>
                          <p className="text-sm text-red-800 dark:text-red-200">
                            {deleteError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex gap-3 rounded-b-xl">
              {deleteConfirmationStep === 1 ? (
                <>
                  <button
                    onClick={closeDeleteModal}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteConfirmationStep(2)}
                    className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500/50 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    I Understand, Continue
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setDeleteConfirmationStep(1)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={!canDeleteAccount || isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500/50 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Deleting Account...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete My Account
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage; 