'use client';

import React, { useEffect, useState } from 'react';
import { 
  Settings, Save, Trash2, Users, Shield, Bell, Calendar, 
  Archive, FolderOpen, Globe, Lock, Eye, EyeOff, AlertTriangle,
  Plus, X, Edit2, Check
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { api } from '@/utils/api';
import { ApiProject } from '@/types/api';
import { ProjectStatus } from '@/types/enums';

interface ProjectSettingsProps {
  params: Promise<{ 'project-id': string }>;
}

// Local UI defaults for sections not yet integrated with backend
const defaultUISettings = {
  settings: {
    notifications: {
      taskUpdates: true,
      sprintUpdates: true,
      meetingReminders: true,
    },
    workflow: {
      autoAssignReviewer: true,
      requirePeerReview: true,
      autoCloseCompletedSprints: false,
    },
  },
};

const mockTeamMembers = [
  { id: '1', name: 'John Smith', email: 'john.smith@company.com', role: 'Product Owner', avatar: '' },
  { id: '2', name: 'Jane Doe', email: 'jane.doe@company.com', role: 'Scrum Master', avatar: '' },
  { id: '3', name: 'Mike Johnson', email: 'mike.johnson@company.com', role: 'Developer', avatar: '' },
  { id: '4', name: 'Sarah Wilson', email: 'sarah.wilson@company.com', role: 'Developer', avatar: '' },
];

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  // Predefined color options matching the project creation modal
  const colorOptions = [
    { value: 'bg-blue-500', label: 'Blue' },
    { value: 'bg-green-500', label: 'Green' },
    { value: 'bg-purple-500', label: 'Purple' },
    { value: 'bg-emerald-500', label: 'Emerald' },
    { value: 'bg-orange-500', label: 'Orange' },
    { value: 'bg-red-500', label: 'Red' },
    { value: 'bg-indigo-500', label: 'Indigo' },
    { value: 'bg-pink-500', label: 'Pink' }
  ];

  const [activeTab, setActiveTab] = useState('general');
  const [projectData, setProjectData] = useState<any>({ ...defaultUISettings });
  const [initialProjectData, setInitialProjectData] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real project data
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      setIsLoading(true);
      setError(null);
      const idNum = parseInt(projectId);
      try {
        const resp = await api.projects.getById(idNum);
        if (resp.error) throw new Error(resp.error);
        const data = resp.data as ApiProject;
        const merged = { ...defaultUISettings, ...data };
        setProjectData(merged);
        setInitialProjectData(merged);
      } catch (e: any) {
        setError(e?.message || 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: projectData?.name || 'Project', href: `/project/${projectId}/dashboard` },
    { label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Globe className="w-4 h-4" /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  // Helpers to convert date strings
  const toInputDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const toISODate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  };

  const handleSave = async () => {
    try {
      const idNum = parseInt(projectId);
      const payload: Partial<ApiProject> = {
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        color: projectData.color,
      } as any;

      // Validate dates (optional, backend also validates)
      if (payload.start_date && payload.end_date) {
        const s = new Date(payload.start_date);
        const e = new Date(payload.end_date);
        if (s >= e) {
          setError('End date must be after start date');
          return;
        }
      }

      const resp = await api.projects.update(idNum, payload as any);
      if (resp.error) throw new Error(resp.error);

      const updated = { ...defaultUISettings, ...resp.data };
      setProjectData(updated);
      setInitialProjectData(updated);
    setUnsavedChanges(false);
    setIsEditing(false);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to save project');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setProjectData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    setUnsavedChanges(true);
  };

  const handleSettingsChange = (category: string, field: string, value: any) => {
    setProjectData((prev: any) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [category]: {
          ...prev.settings[category as keyof typeof prev.settings],
          [field]: value
        }
      }
    }));
    setUnsavedChanges(true);
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmationText !== projectData?.name) {
      setError('Project name confirmation does not match');
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      const idNum = parseInt(projectId);
      const resp = await api.projects.delete(idNum);
      if (resp.error) throw new Error(resp.error);
      
      // Redirect to projects list after successful deletion
      window.location.href = '/project';
    } catch (e: any) {
      setError(e?.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={projectData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Status
            </label>
            <select
              value={projectData.status || ProjectStatus.ACTIVE}
              onChange={(e) => handleInputChange('status', e.target.value as ProjectStatus)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={!isEditing}
            >
              <option value={ProjectStatus.PLANNING}>Planning</option>
              <option value={ProjectStatus.ACTIVE}>Active</option>
              <option value={ProjectStatus.ON_HOLD}>On Hold</option>
              <option value={ProjectStatus.COMPLETED}>Completed</option>
              <option value={ProjectStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={toInputDate(projectData.start_date)}
                onChange={(e) => handleInputChange('start_date', toISODate(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={toInputDate(projectData.end_date)}
                onChange={(e) => handleInputChange('end_date', toISODate(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleInputChange('color', color.value)}
                  className={`w-10 h-10 rounded-lg ${color.value} border-2 transition-colors ${
                    projectData.color === color.value ? 'border-gray-900 dark:border-white' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  title={color.label}
              disabled={!isEditing}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select a color to represent this project
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Project
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (initialProjectData) setProjectData(initialProjectData);
                  setUnsavedChanges(false);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Workflow Settings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Workflow Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Auto-assign reviewer</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatically assign a reviewer to new tasks</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={projectData.settings.workflow.autoAssignReviewer}
                onChange={(e) => handleSettingsChange('workflow', 'autoAssignReviewer', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Require peer review</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">All tasks must be reviewed before completion</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={projectData.settings.workflow.requirePeerReview}
                onChange={(e) => handleSettingsChange('workflow', 'requirePeerReview', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Auto-close completed sprints</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatically close sprints when all tasks are completed</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={projectData.settings.workflow.autoCloseCompletedSprints}
                onChange={(e) => handleSettingsChange('workflow', 'autoCloseCompletedSprints', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Task updates</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when tasks are updated or completed</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={projectData.settings.notifications.taskUpdates}
              onChange={(e) => handleSettingsChange('notifications', 'taskUpdates', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Sprint updates</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Notifications about sprint planning and completion</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={projectData.settings.notifications.sprintUpdates}
              onChange={(e) => handleSettingsChange('notifications', 'sprintUpdates', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Meeting reminders</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reminders for upcoming meetings and standups</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={projectData.settings.notifications.meetingReminders}
              onChange={(e) => handleSettingsChange('notifications', 'meetingReminders', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after-border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="text-center py-12">
        <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Integrations Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          We're working hard to bring you powerful integrations with popular tools and services. 
          This feature will be available in a future update.
        </p>
      </div>
    </div>
  );

  const renderDangerTab = () => (
    <div className="space-y-6">
      {/* Delete Project */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Project</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Permanently delete this project and all of its data. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Project
              </button>
            ) : (
              <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200 font-medium mb-3">
                  Are you sure you want to delete this project?
                </p>
                <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                  Type <strong>{projectData?.name}</strong> to confirm deletion.
                </p>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type project name here"
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                />
                {error && (
                  <p className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteProject}
                    disabled={isDeleting || deleteConfirmationText !== projectData?.name}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                    Delete Project
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmationText('');
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project settings...</p>
        </div>
      )}
      {!isLoading && error && (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-900">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Error Loading Project
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {!isLoading && !error && (
        <>
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Project Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your project configuration, team members, and integrations
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        {activeTab === 'integrations' && renderIntegrationsTab()}
        {activeTab === 'danger' && renderDangerTab()}
      </div>
        </>
      )}
    </div>
  );
};

export default ProjectSettings; 