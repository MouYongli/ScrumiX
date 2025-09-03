'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Edit2, Trash2, FolderOpen, 
  Zap, Play, Square, Calendar, Target, TrendingUp,
  Clock, Users, CheckCircle, AlertCircle, MoreHorizontal,
  X, ChevronDown, BarChart3, ArrowRight
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { api } from '@/utils/api';

// Updated interface to match backend schema
interface Sprint {
  id: number;
  sprintName: string;
  sprintGoal?: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  sprintCapacity?: number;
  projectId: number;
  createdAt: string;
  updatedAt: string;
  // Frontend-only fields for display
  totalStoryPoints?: number;
  completedStoryPoints?: number;
  totalStories?: number;
  completedStories?: number;
  teamMembers?: string[];
}

interface ProjectSprintsProps {
  params: Promise<{ 'project-id': string }>;
}

// Add CreateSprintModal component
const CreateSprintModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sprintData: {
    sprintName: string;
    sprintGoal: string;
    startDate: string;
    endDate: string;
    sprintCapacity: number;
    status: 'planning' | 'active' | 'completed';
  }) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    sprintName: '',
    sprintGoal: '',
    startDate: '',
    endDate: '',
    sprintCapacity: 0,
      status: 'planning' as const
    });



  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.sprintName.trim()) {
      alert('Sprint name is required');
      return;
    }
    
    if (!formData.startDate || !formData.endDate) {
      alert('Start and end dates are required');
      return;
    }
    
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      alert('End date must be after start date');
      return;
    }

    onSubmit(formData);
    
    // Reset form
    setFormData({
      sprintName: '',
      sprintGoal: '',
      startDate: '',
      endDate: '',
      sprintCapacity: 0,
        status: 'planning'
    });
    onClose();
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Sprint</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Sprint Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.sprintName}
              onChange={(e) => setFormData(prev => ({ ...prev, sprintName: e.target.value }))}
              placeholder="e.g., Sprint 1 - User Authentication"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Sprint Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Goal <span className="text-gray-400 text-sm">(Optional)</span>
            </label>
            <textarea
              value={formData.sprintGoal}
              onChange={(e) => setFormData(prev => ({ ...prev, sprintGoal: e.target.value }))}
              placeholder="Describe the main objective of this sprint..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Time Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Capacity (Story Points)
            </label>
            <input
              type="number"
              value={formData.sprintCapacity}
              onChange={(e) => setFormData(prev => ({ ...prev, sprintCapacity: parseInt(e.target.value) || 0 }))}
              min="1"
              max="200"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Estimated total story points the team can complete in this sprint
            </p>
          </div>

          

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add EditSprintModal component before ProjectSprints component
const EditSprintModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sprintData: Sprint) => void;
  sprint: Sprint | null;
}> = ({ isOpen, onClose, onSubmit, sprint }) => {
  const [formData, setFormData] = useState<Sprint | null>(null);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);

  // Initialize form data when sprint changes
  useEffect(() => {
    if (sprint) {
      // Format dates for HTML date inputs (YYYY-MM-DD format)
      const formatDateForInput = (dateString: string) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };
      
      setFormData({
        ...sprint,
        startDate: formatDateForInput(sprint.startDate),
        endDate: formatDateForInput(sprint.endDate)
      });
    }
  }, [sprint]);

  // Mock team members - in real app, this would come from API
  const availableTeamMembers = [
    'Sarah Johnson',
    'Mike Chen', 
    'Emily Rodriguez',
    'David Park',
    'Lisa Wang',
    'James Smith',
    'Maria Gonzalez',
    'Alex Kim'
  ];

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData) return;

    // Basic validation
    if (!formData.sprintName.trim()) {
      alert('Sprint name is required');
      return;
    }
    
    if (!formData.startDate || !formData.endDate) {
      alert('Start and end dates are required');
      return;
    }
    
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      alert('End date must be after start date');
      return;
    }

    onSubmit(formData);
    onClose();
  };

  const toggleTeamMember = (member: string) => {
    if (!formData) return;
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        teamMembers: (prev.teamMembers || []).includes(member)
          ? (prev.teamMembers || []).filter(m => m !== member)
          : [...(prev.teamMembers || []), member]
      };
    });
  };

  const removeTeamMember = (member: string) => {
    if (!formData) return;
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        teamMembers: (prev.teamMembers || []).filter(m => m !== member)
      };
    });
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Sprint</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Sprint Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.sprintName}
              onChange={(e) => setFormData(prev => prev ? { ...prev, sprintName: e.target.value } : prev)}
              placeholder="e.g., Sprint 1 - User Authentication"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Sprint Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Goal <span className="text-gray-400 text-sm">(Optional)</span>
            </label>
            <textarea
              value={formData.sprintGoal}
              onChange={(e) => setFormData(prev => prev ? { ...prev, sprintGoal: e.target.value } : prev)}
              placeholder="Describe the main objective of this sprint..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Time Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => prev ? { ...prev, startDate: e.target.value } : prev)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => prev ? { ...prev, endDate: e.target.value } : prev)}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Capacity (Story Points)
            </label>
            <input
              type="number"
              value={formData.sprintCapacity}
              onChange={(e) => setFormData(prev => prev ? { ...prev, sprintCapacity: parseInt(e.target.value) || 0 } : prev)}
              min="1"
              max="200"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team Members
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center"
              >
                <span className="text-gray-500 dark:text-gray-400">
                  {(formData.teamMembers?.length || 0) === 0 
                    ? 'Select team members...' 
                    : `${formData.teamMembers?.length || 0} member${(formData.teamMembers?.length || 0) !== 1 ? 's' : ''} selected`
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transform transition-transform ${isTeamDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTeamDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {availableTeamMembers.map(member => (
                    <label key={member} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.teamMembers?.includes(member)}
                        onChange={() => toggleTeamMember(member)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{member}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {/* Selected team members */}
            {(formData.teamMembers?.length || 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.teamMembers?.map(member => (
                  <span
                    key={member}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member)}
                      className="hover:text-blue-600 dark:hover:text-blue-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => prev ? { ...prev, status: e.target.value as any } : prev)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



const ProjectSprints: React.FC<ProjectSprintsProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Project');
  const [projectDevelopers, setProjectDevelopers] = useState<Array<{
    id: number;
    email: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    role: string;
    joined_at: string;
    is_admin: boolean;
  }>>([]);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Sprints', icon: <Zap className="w-4 h-4" /> }
  ];

  const filteredSprints = sprints.filter(sprint => {
    const matchesSearch = sprint.sprintName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (sprint.sprintGoal?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sprint.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'active': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'completed': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <Calendar className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <Square className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const canStartSprint = (sprint: Sprint) => {
    const today = new Date();
    const sprintStartDate = new Date(sprint.startDate);
    
    // Compare dates (ignoring time)
    const todayDateString = today.toISOString().split('T')[0];
    const sprintStartDateString = sprintStartDate.toISOString().split('T')[0];
    
    return todayDateString === sprintStartDateString;
  };

  // Add useEffect to fetch sprints from API
  useEffect(() => {
    const fetchSprints = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.sprints.getByProject(parseInt(projectId, 10));
        if (response.data) {
          // Transform backend data to frontend format
          const transformedSprints: Sprint[] = response.data.map(sprint => ({
            ...sprint,
            // Cast status to the correct union type
            status: sprint.status as 'planning' | 'active' | 'completed' | 'cancelled',
            // Add frontend-only fields with default values
            totalStoryPoints: 0, // TODO: Calculate from tasks when available
            completedStoryPoints: 0, // TODO: Calculate from tasks when available
            totalStories: 0, // TODO: Calculate from tasks when available
            completedStories: 0, // TODO: Calculate from tasks when available
            teamMembers: [], // TODO: Get from project members when available
          }));
          setSprints(transformedSprints);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (error) {
        console.error('Error fetching sprints:', error);
        setError('Failed to fetch sprints');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchSprints();
    }
  }, [projectId]);

  // Add useEffect to fetch project details and developers
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const response = await api.projects.getById(parseInt(projectId, 10));
        if (response.data) {
          setProjectName(response.data.name);
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
        // Keep default project name if fetch fails
      }
    };

    const fetchProjectDevelopers = async () => {
      try {
        const projectMembersResponse = await api.projects.getMembers(parseInt(projectId, 10));
        if (projectMembersResponse.error) {
          console.warn('Failed to fetch project members:', projectMembersResponse.error);
          setProjectDevelopers([]);
        } else {
          // Filter only developers from the project members
          const developers = (projectMembersResponse.data || []).filter(
            (member: any) => member.role === 'developer'
          );
          setProjectDevelopers(developers);
        }
      } catch (memberError) {
        console.warn('Failed to fetch project members:', memberError);
        setProjectDevelopers([]);
      }
    };

    if (projectId) {
      fetchProjectDetails();
      fetchProjectDevelopers();
    }
  }, [projectId]);

  const handleStartSprint = (sprintId: number) => {
    // Check if there's already an active sprint
    const hasActiveSprint = sprints.some(sprint => sprint.status === 'active');
    
    if (hasActiveSprint) {
      alert('Cannot start a new sprint while another sprint is active. Please complete the current sprint first.');
      return;
    }

    // Find the sprint to check its start date
    const sprintToStart = sprints.find(sprint => sprint.id === sprintId);
    if (!sprintToStart) {
      alert('Sprint not found.');
      return;
    }

    // Check if current date matches sprint start date
    const today = new Date();
    const sprintStartDate = new Date(sprintToStart.startDate);
    
    // Compare dates (ignoring time)
    const todayDateString = today.toISOString().split('T')[0];
    const sprintStartDateString = sprintStartDate.toISOString().split('T')[0];
    
    if (todayDateString !== sprintStartDateString) {
      alert('⚠️ The start date doesn\'t match today. Please update the Sprint information before starting.');
      return;
    }
    
    api.sprints.start(sprintId)
      .then(response => {
        if (response.data) {
          // Transform backend response to frontend format
          const updatedSprint: Sprint = {
            ...response.data,
            status: response.data.status as 'planning' | 'active' | 'completed' | 'cancelled',
            totalStoryPoints: 0,
            completedStoryPoints: 0,
            totalStories: 0,
            completedStories: 0,
            teamMembers: [],
          };
          setSprints(sprints.map(sprint => 
            sprint.id === sprintId ? updatedSprint : sprint
          ));
        }
      })
      .catch(error => {
        console.error('Error starting sprint:', error);
        alert('Failed to start sprint.');
      });
  };

  const handleCompleteSprint = (sprintId: number) => {
    api.sprints.close(sprintId)
      .then(response => {
        if (response.data) {
          // Transform backend response to frontend format
          const updatedSprint: Sprint = {
            ...response.data,
            status: response.data.status as 'planning' | 'active' | 'completed' | 'cancelled',
            totalStoryPoints: 0,
            completedStoryPoints: 0,
            totalStories: 0,
            completedStories: 0,
            teamMembers: [],
          };
          setSprints(sprints.map(sprint => 
            sprint.id === sprintId ? updatedSprint : sprint
          ));
        }
      })
      .catch(error => {
        console.error('Error completing sprint:', error);
        alert('Failed to complete sprint.');
      });
  };

  const activeSprint = sprints.find(s => s.status === 'active');
  const hasActiveSprint = Boolean(activeSprint);
  const totalActiveStoryPoints = activeSprint?.totalStoryPoints || 0;
  const completedActiveStoryPoints = activeSprint?.completedStoryPoints || 0;

  const handleCreateSprint = (sprintData: {
    sprintName: string;
    sprintGoal: string;
    startDate: string;
    endDate: string;
    sprintCapacity: number;
    status: 'planning' | 'active' | 'completed';
  }) => {
    api.sprints.create({
      project_id: parseInt(projectId, 10),
      sprint_name: sprintData.sprintName,
      sprint_goal: sprintData.sprintGoal,
      start_date: sprintData.startDate,
      end_date: sprintData.endDate,
      sprint_capacity: sprintData.sprintCapacity,
      status: sprintData.status,
    })
    .then(response => {
      if (response.data) {
        // Transform backend response to frontend format
        const newSprint: Sprint = {
          ...response.data,
          status: response.data.status as 'planning' | 'active' | 'completed' | 'cancelled',
          totalStoryPoints: 0,
          completedStoryPoints: 0,
          totalStories: 0,
          completedStories: 0,
          teamMembers: [],
        };
        setSprints([...sprints, newSprint]);
      }
    })
    .catch(error => {
      console.error('Error creating sprint:', error);
      alert('Failed to create sprint.');
    });
  };

  const handleEditSprint = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setIsEditModalOpen(true);
  };

  const handleUpdateSprint = (updatedSprint: Sprint) => {
    api.sprints.update(updatedSprint.id, {
      sprint_name: updatedSprint.sprintName,
      sprint_goal: updatedSprint.sprintGoal,
      start_date: updatedSprint.startDate,
      end_date: updatedSprint.endDate,
      sprint_capacity: updatedSprint.sprintCapacity,
      status: updatedSprint.status,
    })
    .then(response => {
      if (response.data) {
        // Transform backend response to frontend format
        const updatedSprintData: Sprint = {
          ...response.data,
          status: response.data.status as 'planning' | 'active' | 'completed' | 'cancelled',
          totalStoryPoints: updatedSprint.totalStoryPoints || 0,
          completedStoryPoints: updatedSprint.completedStoryPoints || 0,
          totalStories: updatedSprint.totalStories || 0,
          completedStories: updatedSprint.completedStories || 0,
          teamMembers: updatedSprint.teamMembers || [],
        };
        setSprints(sprints.map(sprint => 
          sprint.id === updatedSprint.id ? updatedSprintData : sprint
        ));
        setSelectedSprint(null);
        setIsEditModalOpen(false);
      }
    })
    .catch(error => {
      console.error('Error updating sprint:', error);
      alert('Failed to update sprint.');
    });
  };

  const handleDeleteClick = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedSprint) {
      api.sprints.delete(selectedSprint.id)
        .then(() => {
          setSprints(sprints.filter(sprint => sprint.id !== selectedSprint.id));
          setSelectedSprint(null);
          setIsDeleteModalOpen(false);
        })
        .catch(error => {
          console.error('Error deleting sprint:', error);
          alert('Failed to delete sprint.');
        });
    }
  };

  // Calculate velocity for completed sprints only (matching velocity page logic)
  const calculateVelocity = async () => {
    try {
      // Filter for completed sprints only
      const completedSprints = sprints.filter(sprint => sprint.status === 'completed');
      
      // Sort by completion date (end date)
      completedSprints.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
      
      let totalCompletedStoryPoints = 0;
      let sprintCount = 0;
      const sprintVelocities: number[] = [];
      
      // Fetch backlog items for each completed sprint to get actual story points
      for (const sprint of completedSprints) {
        try {
          const backlogResponse = await api.sprints.getSprintBacklog(sprint.id);
          if (backlogResponse.data) {
            const backlogItems = backlogResponse.data;
            // Calculate completed story points (only items with status 'done')
            const completedItems = backlogItems.filter((item: any) => item.status === 'done');
            const completedStoryPoints = completedItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
            totalCompletedStoryPoints += completedStoryPoints;
            sprintVelocities.push(completedStoryPoints);
            sprintCount++;
          }
        } catch (backlogError) {
          console.error(`Error fetching backlog for sprint ${sprint.id}:`, backlogError);
          // Skip this sprint if backlog fetch fails
        }
      }
      
      // Calculate trend if we have at least 2 sprints
      if (sprintVelocities.length >= 2) {
        const recentVelocities = sprintVelocities.slice(-3); // Last 3 sprints
        const firstHalf = recentVelocities.slice(0, Math.ceil(recentVelocities.length / 2));
        const secondHalf = recentVelocities.slice(Math.ceil(recentVelocities.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const difference = secondAvg - firstAvg;
        if (Math.abs(difference) < 2) {
          setVelocityTrend('stable');
        } else if (difference > 0) {
          setVelocityTrend('improving');
        } else {
          setVelocityTrend('declining');
        }
      } else {
        setVelocityTrend(null);
      }
      
      return sprintCount > 0 ? Math.round(totalCompletedStoryPoints / sprintCount) : 0;
    } catch (error) {
      console.error('Error calculating velocity:', error);
      return 0;
    }
  };

  const [averageVelocity, setAverageVelocity] = useState<number>(0);
  const [isCalculatingVelocity, setIsCalculatingVelocity] = useState<boolean>(false);
  const [velocityTrend, setVelocityTrend] = useState<'stable' | 'improving' | 'declining' | null>(null);

  // Calculate velocity when sprints change
  useEffect(() => {
    if (sprints.length > 0) {
      setIsCalculatingVelocity(true);
      calculateVelocity()
        .then(setAverageVelocity)
        .finally(() => setIsCalculatingVelocity(false));
    }
  }, [sprints]);

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading sprints...</p>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Sprints
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sprint Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Plan, track, and manage your project sprints
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Sprint
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sprints</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{sprints.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sprint</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {sprints.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalActiveStoryPoints > 0 ? calculateProgress(completedActiveStoryPoints, totalActiveStoryPoints) : 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center min-w-0">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {sprints.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/project/${projectId}/velocity`}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Velocity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                 {isCalculatingVelocity ? (
                   <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></span>
                 ) : (
                   averageVelocity
                 )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {sprints.filter(s => s.status === 'completed').length} completed {sprints.filter(s => s.status === 'completed').length === 1 ? 'sprint' : 'sprints'}
                {velocityTrend && (
                  <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    velocityTrend === 'improving' 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                      : velocityTrend === 'declining'
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400'
                  }`}>
                    {velocityTrend === 'improving' && '↗ Improving'}
                    {velocityTrend === 'declining' && '↘ Declining'}
                    {velocityTrend === 'stable' && '→ Stable'}
                  </span>
                )}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Active Sprint Highlight */}
      {activeSprint && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-sm font-medium rounded-full">
                  <Play className="w-3 h-3" />
                  Active Sprint
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{activeSprint.sprintName}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{activeSprint.sprintGoal}</p>
            </div>
            <Link 
              href={`/project/${projectId}/sprint/${activeSprint.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              View Details
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {getDaysRemaining(activeSprint.endDate)} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Story Points</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeSprint.completedStoryPoints} / {activeSprint.totalStoryPoints}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Stories</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeSprint.completedStories} / {activeSprint.totalStories}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${calculateProgress(activeSprint.completedStoryPoints || 0, Math.max(activeSprint.totalStoryPoints || 1, 1))}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {calculateProgress(activeSprint.completedStoryPoints || 0, Math.max(activeSprint.totalStoryPoints || 1, 1))}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search sprints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sprint List */}
      <div className="space-y-6">
        {filteredSprints.map((sprint) => (
          <div key={sprint.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Sprint Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {sprint.sprintName}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sprint.status)}`}>
                      {getStatusIcon(sprint.status)}
                      {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{sprint.sprintGoal}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {projectDevelopers.length} {projectDevelopers.length === 1 ? 'developer' : 'developers'}
                    </span>
                    {sprint.status === 'active' && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getDaysRemaining(sprint.endDate)} days left
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {sprint.status === 'planning' && (
                    <div className="relative group">
                      <button
                        onClick={() => handleStartSprint(sprint.id)}
                        disabled={hasActiveSprint || !canStartSprint(sprint)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          hasActiveSprint || !canStartSprint(sprint)
                            ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        Start Sprint
                      </button>
                      {(hasActiveSprint || !canStartSprint(sprint)) && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {hasActiveSprint 
                            ? 'Complete the active sprint first'
                            : '⚠️ The start date doesn\'t match today. Please update the Sprint information before starting.'
                          }
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  )}
                  {sprint.status === 'active' && (
                    <button
                      onClick={() => handleCompleteSprint(sprint.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Complete Sprint
                    </button>
                  )}
                  <Link 
                    href={`/project/${projectId}/sprint/${sprint.id}`}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                  >
                    View Details
                  </Link>
                  <div className="relative group">
                    <button 
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                      onClick={() => setSelectedSprint(sprint)}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {selectedSprint?.id === sprint.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        <button
                          onClick={() => handleEditSprint(sprint)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Edit Sprint
                        </button>
                        <button
                          onClick={() => handleDeleteClick(sprint)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Sprint
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sprint Progress */}
              {sprint.totalStoryPoints !== undefined && sprint.totalStoryPoints > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Story Points</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {sprint.completedStoryPoints || 0} / {sprint.totalStoryPoints || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${calculateProgress(sprint.completedStoryPoints || 0, Math.max(sprint.totalStoryPoints || 1, 1))}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stories</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {sprint.completedStories || 0} / {sprint.totalStories || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${calculateProgress(sprint.completedStories || 0, Math.max(sprint.totalStories || 1, 1))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {sprint.totalStoryPoints || 0} / {sprint.sprintCapacity || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${calculateProgress(sprint.totalStoryPoints || 0, sprint.sprintCapacity || 1)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSprints.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No sprints found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by creating your first sprint.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Create Sprint
          </button>
        </div>
      )}

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSprint}
      />

      {/* Edit Sprint Modal */}
      <EditSprintModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSprint(null);
        }}
        onSubmit={handleUpdateSprint}
        sprint={selectedSprint}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedSprint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Sprint
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{selectedSprint.sprintName}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedSprint(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Sprint
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default ProjectSprints;
