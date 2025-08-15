'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, Calendar, Clock, Users, Video, Plus,
  MoreHorizontal, Play, Edit, Trash2, UserCheck,
  MessageSquare, Target, BarChart3, FolderOpen,
  X, Save, ChevronDown, AlertCircle
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ParticipantsTooltip from '@/components/common/ParticipantsTooltip';
import { api } from '@/utils/api';
import { MeetingType } from '@/types/enums';
import { ApiMeeting, ApiSprint, ApiProject } from '@/types/api';

// Meeting type configuration - maps backend enum values to display names
const meetingTypes = {
  'team_meeting': {
    name: 'Team Meeting',
    color: 'bg-blue-500',
    icon: MessageSquare,
  },
  'sprint_planning': {
    name: 'Sprint Planning',
    color: 'bg-green-500',
    icon: Target,
  },
  'sprint_review': {
    name: 'Sprint Review',
    color: 'bg-purple-500',
    icon: BarChart3,
  },
  'sprint_retrospective': {
    name: 'Sprint Retrospective',
    color: 'bg-orange-500',
    icon: UserCheck,
  },
  'daily_standup': {
    name: 'Daily Standup',
    color: 'bg-indigo-500',
    icon: MessageSquare,
  },
  'other': {
    name: 'Other',
    color: 'bg-gray-500',
    icon: MessageSquare,
  },
};

// Empty array for real meetings data
const meetingsData: any[] = [];

const ProjectMeetings = () => {
  const params = useParams();
  const projectId = params['project-id'] as string;
  const [meetings, setMeetings] = useState<ApiMeeting[]>([]);
  const [sprints, setSprints] = useState<ApiSprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<ApiMeeting | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState<ApiMeeting | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Fetch meetings and sprints from API
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch meetings
        const meetingsResponse = await api.meetings.getByProject(parseInt(projectId));
        if (meetingsResponse.error) throw new Error(meetingsResponse.error);
        

        
        setMeetings(meetingsResponse.data || []);
        
        // Fetch sprints for this project
        const sprintsResponse = await api.sprints.getByProject(parseInt(projectId));
        if (sprintsResponse.error) {
          console.warn('Failed to fetch sprints:', sprintsResponse.error);
          // Don't fail completely if sprints can't be fetched
          setSprints([]);
        } else {
          setSprints(sprintsResponse.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: MeetingType.DAILY_STANDUP,
    date: '',
    time: '',
    duration: 30,
    location: '',
    description: '',
    agenda: ['']
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState<{
    date?: string;
    time?: string;
    title?: string;
    location?: string;
  }>({});

  // Project state
  const [project, setProject] = useState<ApiProject | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setProjectLoading(true);
        const projectResponse = await api.projects.getById(parseInt(projectId));
        if (projectResponse.error) throw new Error(projectResponse.error);
        setProject(projectResponse.data);
      } catch (error) {
        console.error('Error fetching project:', error);
        setError('Failed to fetch project information');
      } finally {
        setProjectLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const projectName = project?.name || 'Loading...';

  // Breadcrumb data with icons
  const breadcrumbItems = [
    { label: 'Home', href: '/', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Meetings', icon: <Calendar className="w-4 h-4" /> }
  ];

  // Get status style
  const getStatusStyle = (status: string) => {
    const styles = {
      'scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
      'in-progress': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
      'completed': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    };
    
    const texts = {
      'scheduled': 'Scheduled',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };

    return {
      className: styles[status as keyof typeof styles],
      text: texts[status as keyof typeof texts],
    };
  };

  // Filter meetings
  const filteredMeetings = meetings.filter(meeting => {
    if (selectedFilter === 'all') return true;
    const datetimeValue = meeting.startDatetime || (meeting as any).start_datetime;
    const start = parseDatetimeSafely(datetimeValue);
    if (!start) return false;
    if (selectedFilter === 'upcoming') return start > new Date();
    if (selectedFilter === 'completed') return start < new Date();
    return meeting.meetingType === selectedFilter;
  });

  // Get meeting statistics
  const getMeetingStats = () => {
    const total = meetings.length;
    const now = new Date();
    const upcoming = meetings.filter(m => {
      const datetimeValue = m.startDatetime || (m as any).start_datetime;
      const d = parseDatetimeSafely(datetimeValue);
      return d ? d > now : false;
    }).length;
    const completed = meetings.filter(m => {
      const datetimeValue = m.startDatetime || (m as any).start_datetime;
      const d = parseDatetimeSafely(datetimeValue);
      return d ? d < now : false;
    }).length;
    const inProgress = 0; // TODO: Add status field to backend
    return { total, scheduled: upcoming, completed, inProgress };
  };

  const stats = getMeetingStats();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside all dropdown elements
      const dropdowns = document.querySelectorAll('[data-dropdown-container]');
      let isOutside = true;
      
      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target as Node)) {
          isOutside = false;
        }
      });
      
      if (isOutside) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Validate form fields
  const validateDateTime = (date: string, time: string): { isValid: boolean; error?: string } => {
    if (!date || !time) {
      return { isValid: true }; // Don't validate incomplete input
    }

    const inputDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (inputDateTime <= now) {
      const diffMinutes = Math.floor((now.getTime() - inputDateTime.getTime()) / (1000 * 60));
      if (diffMinutes < 1) {
        return { isValid: false, error: 'Meeting time must be at least 1 minute in the future' };
      } else if (diffMinutes < 60) {
        return { isValid: false, error: `Meeting time is ${diffMinutes} minutes in the past` };
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return { isValid: false, error: `Meeting time is ${hours} hour${hours > 1 ? 's' : ''} in the past` };
      } else {
        const days = Math.floor(diffMinutes / 1440);
        return { isValid: false, error: `Meeting date is ${days} day${days > 1 ? 's' : ''} in the past` };
      }
    }
    
    return { isValid: true };
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: name === 'duration' ? parseInt(value) || 0 : value
    };
    
    setFormData(newFormData);
    
    // Real-time validation for date/time fields
    const newErrors = { ...formErrors };
    
    if (name === 'date' || name === 'time') {
      const dateToValidate = name === 'date' ? value : newFormData.date;
      const timeToValidate = name === 'time' ? value : newFormData.time;
      
      const validation = validateDateTime(dateToValidate, timeToValidate);
      if (!validation.isValid) {
        newErrors.date = validation.error;
        newErrors.time = validation.error;
      } else {
        delete newErrors.date;
        delete newErrors.time;
      }
      
      // Clear any previous page-level errors
      setError(null);
    }
    
    // Validate required fields
    if (name === 'title') {
      if (!value.trim()) {
        newErrors.title = 'Meeting title is required';
      } else {
        delete newErrors.title;
      }
    }
    
    if (name === 'location') {
      if (!value.trim()) {
        newErrors.location = 'Meeting location is required';
      } else {
        delete newErrors.location;
      }
    }
    
    setFormErrors(newErrors);
  };

  // Handle agenda item changes
  const handleAgendaChange = (index: number, value: string) => {
    const newAgenda = [...formData.agenda];
    newAgenda[index] = value;
    setFormData(prev => ({ ...prev, agenda: newAgenda }));
  };

  // Add new agenda item
  const addAgendaItem = () => {
    setFormData(prev => ({ ...prev, agenda: [...prev.agenda, ''] }));
  };

  // Remove agenda item
  const removeAgendaItem = (index: number) => {
      const newAgenda = formData.agenda.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, agenda: newAgenda }));
  };

  // Handle form submission for creating new meeting
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create meeting data for API - handle timezone properly
      // Parse the date and time as local time, then convert to UTC for storage
      const localDateTime = new Date(`${formData.date}T${formData.time}`);
      
      // Check for validation errors before submitting
      const dateTimeValidation = validateDateTime(formData.date, formData.time);
      if (!dateTimeValidation.isValid) {
        // Validation errors are already shown in the form
        return;
      }
      
      // Create a UTC datetime that represents the same local time
      // This ensures the time the user sees is the time they entered
      const utcDateTime = new Date(localDateTime.getTime() - localDateTime.getTimezoneOffset() * 60000);
      
      // Get the first available sprint or create a default one if none exist
      let sprintId = 1; // Default fallback
      if (sprints.length > 0) {
        sprintId = sprints[0].id;
      } else {
        // Try to create a default sprint for this project
        try {
          const defaultSprintData = {
            sprint_name: `Default Sprint ${new Date().getFullYear()}`,
            sprint_goal: 'Default sprint for meetings',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            project_id: parseInt(projectId)
          };
          const sprintResponse = await api.sprints.create(defaultSprintData);
          if (sprintResponse.data) {
            sprintId = sprintResponse.data.id;
            // Refresh sprints list
            const refreshSprintsResponse = await api.sprints.getByProject(parseInt(projectId));
            if (refreshSprintsResponse.data) {
              setSprints(refreshSprintsResponse.data);
            }
          }
        } catch (sprintError) {
          console.warn('Failed to create default sprint:', sprintError);
          // Continue with default sprintId = 1
        }
      }
      
      const meetingData = {
      title: formData.title,
        meeting_type: formData.type as MeetingType,
        start_datetime: utcDateTime.toISOString(),
        description: formData.description,
      duration: formData.duration,
      location: formData.location,
        sprint_id: sprintId,
        project_id: parseInt(projectId)
      };

      const response = await api.meetings.create(meetingData);
      if (response.error) {
        const errorMessage = typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
        throw new Error(errorMessage);
      }

      // Create agenda items if any
      if (formData.agenda.length > 0 && response.data) {
        const agendaTitles = formData.agenda.filter(item => item.trim() !== '');
        if (agendaTitles.length > 0) {
          await api.meetingAgenda.bulkCreate(response.data.id, agendaTitles);
        }
      }

      // Refresh meetings list
      const refreshResponse = await api.meetings.getByProject(parseInt(projectId));
      if (refreshResponse.error) throw new Error(refreshResponse.error);
      
      setMeetings(refreshResponse.data || []);
    
    // Reset form and close modal
    resetForm();
    setShowAddModal(false);
    } catch (error) {
      console.error('Error creating meeting:', error);
      // Show more specific error information
      if (error instanceof Error) {
        setError(`Failed to create meeting: ${error.message}`);
      } else {
        setError('Failed to create meeting: Unknown error occurred');
      }
    }
  };

  // Handle form submission for editing meeting
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingMeeting) {
      return;
    }

    try {
      // Update meeting data for API - handle timezone properly
      // Parse the date and time as local time, then convert to UTC for storage
      const localDateTime = new Date(`${formData.date}T${formData.time}`);
      // For editing, allow any date (including past dates for completed meetings)
      // No validation needed here - users should be able to edit historical meetings
      
      // Create a UTC datetime that represents the same local time
      // This ensures the time the user sees is the time they entered
      const utcDateTime = new Date(localDateTime.getTime() - localDateTime.getTimezoneOffset() * 60000);
      
      // Get the first available sprint or use a default (same logic as create)
      const sprintId = sprints.length > 0 ? sprints[0].id : 1;
      
      const updateData = {
      title: formData.title,
        meeting_type: formData.type as MeetingType,
        start_datetime: utcDateTime.toISOString(),
        description: formData.description,
      duration: formData.duration,
      location: formData.location,
        sprint_id: sprintId,
        project_id: parseInt(projectId)
      };

      const response = await api.meetings.update(editingMeeting.id, updateData);
      if (response.error) {
        const errorMessage = typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
        throw new Error(errorMessage);
      }

      // Update agenda items - first delete all existing, then create new ones
      await api.meetingAgenda.deleteAllByMeeting(editingMeeting.id);
      const agendaTitles = formData.agenda.filter(item => item.trim() !== '');
      if (agendaTitles.length > 0) {
        await api.meetingAgenda.bulkCreate(editingMeeting.id, agendaTitles);
      }

      // Refresh meetings list
      const refreshResponse = await api.meetings.getByProject(parseInt(projectId));
      if (refreshResponse.error) throw new Error(refreshResponse.error);
      
      setMeetings(refreshResponse.data || []);
    
    // Reset form and close modal
    resetForm();
    setShowEditModal(false);
    setEditingMeeting(null);
    setOpenDropdown(null);
    } catch (error) {
      console.error('Error updating meeting:', error);
      // Show more specific error information
      if (error instanceof Error) {
        setError(`Failed to update meeting: ${error.message}`);
      } else {
        setError('Failed to update meeting: Unknown error occurred');
      }
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      title: '',
      type: MeetingType.DAILY_STANDUP,
      date: '',
      time: '',
      duration: 30,
      location: '',
      description: '',
      agenda: ['']
    });
    setFormErrors({});
  };

  // Close modal
  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingMeeting(null);
    setOpenDropdown(null);
    resetForm();
  };

  // Utility function to safely parse datetime - enhanced to handle microseconds and various formats
  function parseDatetimeSafely(datetimeValue: any): Date | null {
    if (!datetimeValue) return null;
    
    try {
      // Handle various possible formats
      let dateToTry: Date;
      
      if (typeof datetimeValue === 'string') {
        // Normalize common issues:
        // - Replace space separator with 'T'
        // - Trim microseconds to milliseconds (3 digits) to satisfy JS Date parser
        let normalized = datetimeValue.trim();
        
        // Handle various separators and formats
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) {
          normalized = normalized.replace(' ', 'T');
        }
        
        // Handle different timezone formats
        // Replace +00:00 with Z for UTC
        normalized = normalized.replace(/\+00:00$/, 'Z');
        // Replace +00 with Z for UTC
        normalized = normalized.replace(/\+00$/, 'Z');
        
        // Reduce fractional seconds to max 3 digits
        normalized = normalized.replace(/\.(\d{3})\d+(?=(Z|[+\-]\d{2}:?\d{2})?$)/, '.$1');

        // Try to parse as ISO string first
        dateToTry = new Date(normalized);
        
        // If that fails, try to parse common string formats
        if (isNaN(dateToTry.getTime())) {
          // Try to parse as "YYYY-MM-DD HH:MM:SS" format
          const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
          if (isoMatch) {
            const [, year, month, day, hour, minute, second] = isoMatch;
            dateToTry = new Date(
              parseInt(year), 
              parseInt(month) - 1, 
              parseInt(day), 
              parseInt(hour), 
              parseInt(minute), 
              parseInt(second)
            );
          } else {
            // Try to parse as "YYYY-MM-DD" format
            const dateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
              const [, year, month, day] = dateMatch;
              dateToTry = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
          }
        }
        
        // If still invalid, try parsing without timezone info
        if (isNaN(dateToTry.getTime())) {
          // Remove timezone info and try again
          const noTzMatch = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/);
          if (noTzMatch) {
            const noTzString = noTzMatch[1];
            dateToTry = new Date(noTzString);
          }
        }
      } else if (typeof datetimeValue === 'object' && datetimeValue.constructor === Object) {
        // Handle case where datetime is returned as object with date components
        if (datetimeValue.year && datetimeValue.month && datetimeValue.day) {
          // Extract date components (month is 0-indexed in JavaScript)
          dateToTry = new Date(
            datetimeValue.year, 
            datetimeValue.month - 1, 
            datetimeValue.day, 
            datetimeValue.hour || 0, 
            datetimeValue.minute || 0, 
            datetimeValue.second || 0
          );
        } else if (datetimeValue.$date) {
          // Handle MongoDB-style date objects
          dateToTry = new Date(datetimeValue.$date);
        } else if (datetimeValue.timestamp) {
          // Handle timestamp objects
          dateToTry = new Date(datetimeValue.timestamp);
        } else if (datetimeValue.value) {
          // Handle generic value objects
          dateToTry = new Date(datetimeValue.value);
        } else {
          // Try to parse as-is
          dateToTry = new Date(datetimeValue);
        }
      } else if (typeof datetimeValue === 'number') {
        // Handle timestamp numbers
        dateToTry = new Date(datetimeValue);
      } else {
        // Try to parse as-is
        dateToTry = new Date(datetimeValue);
      }
      
      // Check if the parsed date is valid
      if (!isNaN(dateToTry.getTime())) {
        return dateToTry;
      }
      
    } catch (error) {
      console.error('Error parsing datetime:', error, 'Value:', datetimeValue);
    }
    
    return null;
  }

  // Handle edit meeting
  const handleEditMeeting = async (meeting: ApiMeeting) => {
    setEditingMeeting(meeting);
    
    // Convert API meeting data to form data with error handling
    let dateStr = '';
    let timeStr = '';
    
    // Handle both possible field names from backend
    const datetimeValue = meeting.startDatetime || (meeting as any).start_datetime;
    
    const startDate = parseDatetimeSafely(datetimeValue);
    
    if (startDate) {
      // Convert from UTC back to local time for editing
      // The startDate is in UTC, but we want to show the local time equivalent
      const localDate = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000);
      dateStr = localDate.toISOString().split('T')[0];
      timeStr = localDate.toISOString().split('T')[1].substring(0, 5);

    } else {
      console.warn('Could not parse startDatetime for meeting:', meeting.id, 'Value:', datetimeValue);
      
      // Don't set fallback values - let the user see empty fields and set them manually
      // This preserves the original meeting time and doesn't change it to current time
      dateStr = '';
      timeStr = '';
    }
    
    // Load existing agenda items
    let agendaItems = [''];
    try {
      const agendaResponse = await api.meetingAgenda.getByMeeting(meeting.id);
      if (agendaResponse.data && agendaResponse.data.length > 0) {
        agendaItems = agendaResponse.data.map(item => item.title);
      }
    } catch (error) {
      console.error('Error loading agenda items:', error);
    }
    
    setFormData({
      title: meeting.title || '',
      type: meeting.meetingType || MeetingType.TEAM_MEETING,
      date: dateStr,
      time: timeStr,
      duration: meeting.duration || 30,
      location: meeting.location || '',
      description: meeting.description || '',
      agenda: agendaItems
    });
    setFormErrors({}); // Clear any validation errors when editing
    setShowEditModal(true);
    setOpenDropdown(null);
  };

  // Handle delete meeting
  const handleDeleteMeeting = (meeting: ApiMeeting) => {
    setDeletingMeeting(meeting);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  // Confirm delete meeting
  const confirmDeleteMeeting = async () => {
    if (deletingMeeting) {
      try {
        const response = await api.meetings.delete(deletingMeeting.id);
        if (response.error) throw new Error(response.error);

        // Refresh meetings list
        const refreshResponse = await api.meetings.getByProject(parseInt(projectId));
        if (refreshResponse.error) throw new Error(refreshResponse.error);
        
        setMeetings(refreshResponse.data || []);
      setShowDeleteModal(false);
      setDeletingMeeting(null);
      } catch (error) {
        console.error('Error deleting meeting:', error);
        // TODO: Show error notification
      }
    }
  };

  // Cancel delete meeting
  const cancelDeleteMeeting = () => {
    setShowDeleteModal(false);
    setDeletingMeeting(null);
  };

  // Toggle dropdown
  const toggleDropdown = (meetingId: number) => {
    setOpenDropdown(openDropdown === meetingId.toString() ? null : meetingId.toString());
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />

      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Project Meetings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {projectLoading ? (
              <span className="animate-pulse">Loading project information...</span>
            ) : (
              `${projectName} - Manage all agile meetings`
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={projectLoading}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            projectLoading
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-gray-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Plus className="w-5 h-5" />
          Schedule Meeting
        </button>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Meetings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scheduled}</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <Play className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
            <UserCheck className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'completed', label: 'Completed' },
          { key: MeetingType.DAILY_STANDUP, label: 'Daily Standup' },
          { key: MeetingType.SPRINT_PLANNING, label: 'Sprint Planning' },
          { key: MeetingType.SPRINT_REVIEW, label: 'Sprint Review' },
          { key: MeetingType.SPRINT_RETROSPECTIVE, label: 'Sprint Retrospective' },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setSelectedFilter(filter.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFilter === filter.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading meetings...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Meetings
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Meeting list */}
      {!isLoading && !error && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative mb-8">
        {filteredMeetings.map((meeting) => {
          const meetingType = meetingTypes[meeting.meetingType as keyof typeof meetingTypes] || meetingTypes.other;
          const statusStyle = getStatusStyle('scheduled'); // TODO: Add status field to backend
          const IconComponent = meetingType.icon;

          return (
            <div
              key={meeting.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow relative"
            >
              {/* Meeting header */}
              <div className={`${meetingType.color} h-1 rounded-t-lg`}></div>
              
              <div className="p-6 pb-4 relative">
                {/* Title and status */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`${meetingType.color} p-2 rounded-lg`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {meeting.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {meetingType.name}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle.className}`}>
                    {statusStyle.text}
                  </span>
                </div>

                {/* Meeting information */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {(() => {
                        // Handle both possible field names from backend
                        const datetimeValue = meeting.startDatetime || (meeting as any).start_datetime;
                        const startDate = parseDatetimeSafely(datetimeValue);
                        if (startDate) {
                          return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                        }

                        return 'Date not available';
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{meeting.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Video className="w-4 h-4" />
                    <span>{meeting.location || 'No location specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>0 participants</span> {/* TODO: Add participants field to backend */}
                  </div>
                </div>

                {/* Meeting description */}
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {meeting.description}
                </p>

                {/* Participant avatars */}
                <ParticipantsTooltip 
                  participants={[]} // TODO: Add participants field to backend
                  facilitator={''} // TODO: Add facilitator field to backend
                />

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Link 
                    href={`/project/${projectId}/meeting/${meeting.id}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {(() => {
                      const now = new Date();
                      const datetimeValue = meeting.startDatetime || (meeting as any).start_datetime;
                      const meetingStart = parseDatetimeSafely(datetimeValue);
                      
                      if (meetingStart) {
                        const meetingEnd = new Date(meetingStart.getTime() + meeting.duration * 60000);
                        
                        if (now >= meetingStart && now <= meetingEnd) {
                          return (
                      <>
                        <Play className="w-4 h-4" />
                        Join Meeting
                      </>
                          );
                        }
                      }
                      
                      return (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        View Details
                      </>
                      );
                    })()}
                  </Link>
                  
                  {/* Dropdown menu - only show for non-completed meetings or show with different styling */}
                  <div className="relative" data-dropdown-container>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(meeting.id);
                      }}
                      className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {openDropdown === meeting.id.toString() && (
                      <div 
                        className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100] min-w-[120px]"
                        style={{ 
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '0.25rem'
                        }}
                      >
                        <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditMeeting(meeting);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMeeting(meeting);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredMeetings.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No meetings found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No meetings found with current filter criteria. Try different filters or create a new meeting.
          </p>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Schedule New Meeting
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Meeting Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    formErrors.title 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter meeting title"
                />
                {formErrors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.title}</p>
                )}
              </div>

              {/* Meeting Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {Object.entries(meetingTypes).map(([key, type]) => (
                    <option key={key} value={key}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      formErrors.date 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {formErrors.date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      formErrors.time 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {formErrors.time && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.time}</p>
                  )}
                </div>
              </div>

              {/* Duration and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    min="15"
                    max="480"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      formErrors.location 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="e.g., Conference Room A, Zoom Link"
                  />
                  {formErrors.location && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.location}</p>
                  )}
                </div>
              </div>

              {/* TODO: Add facilitator field to backend */}



              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter meeting description"
                />
              </div>

              {/* Agenda Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agenda Items
                </label>
                <div className="space-y-2">
                  {formData.agenda.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleAgendaChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder={`Agenda item ${index + 1}`}
                      />
                        <button
                          type="button"
                          onClick={() => removeAgendaItem(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAgendaItem}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add agenda item
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Object.keys(formErrors).length > 0}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    Object.keys(formErrors).length > 0
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-gray-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Meeting
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body - Same form as create but with different submit handler */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Meeting Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter meeting title"
                />
              </div>

              {/* Meeting Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {Object.entries(meetingTypes).map(([key, type]) => (
                    <option key={key} value={key}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Duration and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    min="15"
                    max="480"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Conference Room A, Zoom Link"
                  />
                </div>
              </div>



              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter meeting description"
                />
              </div>

              {/* Agenda Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agenda Items
                </label>
                <div className="space-y-2">
                  {formData.agenda.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleAgendaChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder={`Agenda item ${index + 1}`}
                      />
                        <button
                          type="button"
                          onClick={() => removeAgendaItem(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAgendaItem}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add agenda item
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete Meeting
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{deletingMeeting.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteMeeting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMeeting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMeetings;
