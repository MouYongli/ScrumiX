'use client';

import React, { useState } from 'react';
import { 
  Settings, Save, Trash2, Users, Shield, Bell, Calendar, 
  Archive, FolderOpen, Globe, Lock, Eye, EyeOff, AlertTriangle,
  Plus, X, Edit2, Check
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

interface ProjectSettingsProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock project data
const mockProjectData = {
  id: '1',
  name: 'E-commerce Platform Refactoring',
  description: 'Modern e-commerce platform development project based on React and Node.js',
  status: 'active',
  visibility: 'private',
  createdAt: '2024-01-15',
  owner: {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
  },
  settings: {
    notifications: {
      emailDigest: true,
      taskUpdates: true,
      sprintUpdates: true,
      meetingReminders: true,
    },
    workflow: {
      autoAssignReviewer: true,
      requirePeerReview: true,
      autoCloseCompletedSprints: false,
    },
    permissions: {
      allowGuestView: false,
      requireApprovalForTasks: true,
      teamCanEditProject: true,
    },
  },
  integrations: [
    { id: '1', name: 'GitHub', status: 'connected', icon: '🐙' },
    { id: '2', name: 'Slack', status: 'connected', icon: '💬' },
    { id: '3', name: 'Jira', status: 'disconnected', icon: '🔷' },
  ],
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
  const project = mockProjectData;

  const [activeTab, setActiveTab] = useState('general');
  const [projectData, setProjectData] = useState(project);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: project.name, href: `/project/${projectId}/dashboard` },
    { label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'team', label: 'Team & Permissions', icon: <Users className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Globe className="w-4 h-4" /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const handleSave = () => {
    console.log('Saving project settings...', projectData);
    setUnsavedChanges(false);
    setIsEditing(false);
    // TODO: Implement actual save logic
  };

  const handleInputChange = (field: string, value: any) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
    setUnsavedChanges(true);
  };

  const handleSettingsChange = (category: string, field: string, value: any) => {
    setProjectData(prev => ({
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
              Project Visibility
            </label>
            <select
              value={projectData.visibility}
              onChange={(e) => handleInputChange('visibility', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={!isEditing}
            >
              <option value="private">Private</option>
              <option value="internal">Internal</option>
              <option value="public">Public</option>
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {projectData.visibility === 'private' && 'Only team members can view this project'}
              {projectData.visibility === 'internal' && 'Anyone in your organization can view this project'}
              {projectData.visibility === 'public' && 'Anyone can view this project'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Status
            </label>
            <select
              value={projectData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={!isEditing}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
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
                  setProjectData(project);
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

  const renderTeamTab = () => (
    <div className="space-y-6">
      {/* Team Members */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>

        <div className="space-y-3">
          {mockTeamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={member.role}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="Product Owner">Product Owner</option>
                  <option value="Scrum Master">Scrum Master</option>
                  <option value="Developer">Developer</option>
                  <option value="Tester">Tester</option>
                  <option value="Designer">Designer</option>
                </select>
                <button className="text-red-600 hover:text-red-700 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permissions</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Allow guest view</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Allow non-team members to view project</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={projectData.settings.permissions.allowGuestView}
                onChange={(e) => handleSettingsChange('permissions', 'allowGuestView', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Require approval for tasks</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">New tasks need approval before being added to sprint</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={projectData.settings.permissions.requireApprovalForTasks}
                onChange={(e) => handleSettingsChange('permissions', 'requireApprovalForTasks', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Team can edit project</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Allow team members to edit project settings</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={projectData.settings.permissions.teamCanEditProject}
                onChange={(e) => handleSettingsChange('permissions', 'teamCanEditProject', e.target.checked)}
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
            <h4 className="font-medium text-gray-900 dark:text-white">Email digest</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Receive daily/weekly project summary emails</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={projectData.settings.notifications.emailDigest}
              onChange={(e) => handleSettingsChange('notifications', 'emailDigest', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Integrations</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      <div className="space-y-3">
        {projectData.integrations.map((integration) => (
          <div key={integration.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{integration.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Status: <span className={`capitalize ${integration.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                    {integration.status}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {integration.status === 'connected' ? (
                <button className="px-3 py-1 text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-lg transition-colors">
                  Disconnect
                </button>
              ) : (
                <button className="px-3 py-1 text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-400 rounded-lg transition-colors">
                  Connect
                </button>
              )}
              <button className="px-3 py-1 text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded-lg transition-colors">
                Settings
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDangerTab = () => (
    <div className="space-y-6">
      {/* Archive Project */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3">
          <Archive className="w-5 h-5 text-orange-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Archive Project</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Archive this project to make it read-only. You can restore it later if needed.
            </p>
            <button className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
              Archive Project
            </button>
          </div>
        </div>
      </div>

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
                  Type <strong>{project.name}</strong> to confirm deletion.
                </p>
                <input
                  type="text"
                  placeholder="Type project name here"
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                />
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                    Delete Project
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
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
        {unsavedChanges && (
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">You have unsaved changes</span>
          </div>
        )}
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
        {activeTab === 'team' && renderTeamTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        {activeTab === 'integrations' && renderIntegrationsTab()}
        {activeTab === 'danger' && renderDangerTab()}
      </div>
    </div>
  );
};

export default ProjectSettings; 