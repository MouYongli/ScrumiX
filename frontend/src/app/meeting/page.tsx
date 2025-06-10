'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, Clock, Users, Plus, Filter, Search, 
  Video, MapPin, Bell, MoreVertical, Play, 
  CheckCircle2, AlertCircle, Timer, Target
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

interface Meeting {
  id: string;
  title: string;
  type: 'daily_standup' | 'sprint_planning' | 'sprint_review' | 'sprint_retrospective' | 'backlog_refinement' | 'release_planning';
  level: 'daily' | 'sprint' | 'product' | 'release';
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  duration: number; // minutes
  attendees: number;
  maxAttendees: number;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  description: string;
  sprintId?: string;
  projectId: string;
  recurrence?: 'daily' | 'weekly' | 'none';
}

const MeetingPage = () => {
  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Meeting Management', icon: <Calendar className="w-4 h-4" /> }
  ];

  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock meeting data
  const meetings: Meeting[] = [
    {
      id: '1',
      title: 'Daily Stand-up',
      type: 'daily_standup',
      level: 'daily',
      status: 'upcoming',
      startTime: '2024-03-15T09:00:00',
      endTime: '2024-03-15T09:15:00',
      duration: 15,
      attendees: 6,
      maxAttendees: 8,
      isOnline: true,
      meetingUrl: 'https://meet.google.com/abc-def-ghi',
      description: 'Sync yesterday\'s progress, today\'s plan, identify obstacles',
      sprintId: 'sprint-5',
      projectId: '1',
      recurrence: 'daily'
    },
    {
      id: '2',
      title: 'Sprint 6 Planning Meeting',
      type: 'sprint_planning',
      level: 'sprint',
      status: 'upcoming',
      startTime: '2024-03-18T14:00:00',
      endTime: '2024-03-18T18:00:00',
      duration: 240,
      attendees: 0,
      maxAttendees: 10,
      location: 'Room A',
      isOnline: false,
      description: 'Plan the goals and tasks for Sprint 6',
      sprintId: 'sprint-6',
      projectId: '1',
      recurrence: 'none'
    },
    {
      id: '3',
      title: 'Sprint 5 Review Meeting',
      type: 'sprint_review',
      level: 'sprint',
      status: 'completed',
      startTime: '2024-03-15T14:00:00',
      endTime: '2024-03-15T16:00:00',
      duration: 120,
      attendees: 12,
      maxAttendees: 15,
      isOnline: true,
      meetingUrl: 'https://zoom.us/j/123456789',
      description: 'Showcase the results of Sprint 5 and collect feedback from stakeholders',
      sprintId: 'sprint-5',
      projectId: '1',
      recurrence: 'none'
    },
    {
      id: '4',
      title: 'Sprint 5 Retrospective Meeting',
      type: 'sprint_retrospective',
      level: 'sprint',
      status: 'completed',
      startTime: '2024-03-15T16:30:00',
      endTime: '2024-03-15T18:00:00',
      duration: 90,
      attendees: 8,
      maxAttendees: 8,
      location: 'Room B',
      isOnline: false,
      description: 'Reflect on the work process of Sprint 5 and identify improvement points',
      sprintId: 'sprint-5',
      projectId: '1',
      recurrence: 'none'
    },
    {
      id: '5',
      title: 'Product Backlog Refinement',
      type: 'backlog_refinement',
      level: 'product',
      status: 'upcoming',
      startTime: '2024-03-16T10:00:00',
      endTime: '2024-03-16T11:30:00',
      duration: 90,
      attendees: 0,
      maxAttendees: 6,
      isOnline: true,
      meetingUrl: 'https://meet.google.com/xyz-abc-def',
      description: 'Refine user stories and estimate work',
      projectId: '1',
      recurrence: 'weekly'
    },
    {
      id: '6',
      title: 'Q2 Release Planning Meeting',
      type: 'release_planning',
      level: 'release',
      status: 'upcoming',
      startTime: '2024-03-20T09:00:00',
      endTime: '2024-03-20T17:00:00',
      duration: 480,
      attendees: 0,
      maxAttendees: 20,
      location: 'Main Conference Room',
      isOnline: false,
      description: 'Plan the overall roadmap for Q2',
      projectId: '1',
      recurrence: 'none'
    }
  ];

  // Meeting level configuration
  const meetingLevels = [
    { value: 'all', label: 'All Meetings', color: 'gray' },
    { value: 'daily', label: 'Daily Meetings', color: 'green', description: 'Daily meetings, quick sync' },
    { value: 'sprint', label: 'Sprint Meetings', color: 'blue', description: 'Sprint planning, review, and retrospective' },
    { value: 'product', label: 'Product Meetings', color: 'purple', description: 'Product backlog management' },
    { value: 'release', label: 'Release Meetings', color: 'orange', description: 'Release planning and review' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Get meeting type Chinese name and icon
  const getMeetingTypeInfo = (type: string) => {
    const typeMap = {
      daily_standup: { name: 'Daily Stand-up', icon: '🌅', duration: '15 minutes' },
      sprint_planning: { name: 'Sprint Planning', icon: '📋', duration: '4-8 hours' },
      sprint_review: { name: 'Sprint Review', icon: '🎯', duration: '2-4 hours' },
      sprint_retrospective: { name: 'Sprint Retrospective', icon: '🔄', duration: '1.5-3 hours' },
      backlog_refinement: { name: 'Backlog Refinement', icon: '📝', duration: '1-2 hours' },
      release_planning: { name: 'Release Planning', icon: '🚀', duration: 'All Day' },
    };
    return typeMap[type as keyof typeof typeMap] || { name: type, icon: '📅', duration: 'Unknown' };
  };

  // Get status style
  const getStatusStyle = (status: string) => {
    const statusStyles = {
      upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      in_progress: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return statusStyles[status as keyof typeof statusStyles] || statusStyles.upcoming;
  };

  // Get level color
  const getLevelColor = (level: string) => {
    const levelColors = {
      daily: 'border-l-green-500 bg-green-50 dark:bg-green-900/10',
      sprint: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
      product: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/10',
      release: 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10',
    };
    return levelColors[level as keyof typeof levelColors] || 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
  };

  // Filter meetings
  const filteredMeetings = meetings.filter(meeting => {
    const matchesLevel = selectedLevel === 'all' || meeting.level === selectedLevel;
    const matchesStatus = selectedStatus === 'all' || meeting.status === selectedStatus;
    const matchesSearch = searchTerm === '' || 
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesLevel && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Meeting Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage Scrum meetings at all levels to ensure efficient collaboration
          </p>
        </div>
        
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Create Meeting
        </button>
      </div>

      {/* Meeting level explanation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Scrum Meeting Level Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {meetingLevels.slice(1).map(level => (
            <div key={level.value} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className={`w-4 h-4 rounded-full bg-${level.color}-500 mb-2`}></div>
              <h4 className="font-medium text-gray-900 dark:text-white">{level.label}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {level.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Level filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex gap-2">
              {meetingLevels.map(level => (
                <button
                  key={level.value}
                  onClick={() => setSelectedLevel(level.value)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedLevel === level.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Meeting list */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No meetings found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create your first Scrum meeting
            </p>
          </div>
        ) : (
          filteredMeetings.map(meeting => {
            const typeInfo = getMeetingTypeInfo(meeting.type);
            return (
              <div
                key={meeting.id}
                className={`bg-white dark:bg-gray-800 border-l-4 ${getLevelColor(meeting.level)} rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {meeting.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {typeInfo.name} • {typeInfo.duration}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(meeting.status)}`}>
                        {selectedStatus === 'all' && (
                          <>
                            {meeting.status === 'upcoming' && 'Upcoming'}
                            {meeting.status === 'in_progress' && 'In Progress'}
                            {meeting.status === 'completed' && 'Completed'}
                            {meeting.status === 'cancelled' && 'Cancelled'}
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {meeting.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {new Date(meeting.startTime).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {meeting.duration} minutes
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {meeting.attendees}/{meeting.maxAttendees} people
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {meeting.isOnline ? (
                          <>
                            <Video className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Online Meeting</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">{meeting.location}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {meeting.recurrence && meeting.recurrence !== 'none' && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Bell className="w-4 h-4 text-blue-500" />
                        <span className="text-blue-600 dark:text-blue-400">
                          {meeting.recurrence === 'daily' && 'Daily Recurring'}
                          {meeting.recurrence === 'weekly' && 'Weekly Recurring'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {meeting.status === 'upcoming' && meeting.isOnline && meeting.meetingUrl && (
                      <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors">
                        <Play className="w-4 h-4" />
                        Join Meeting
                      </button>
                    )}
                    
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MeetingPage; 