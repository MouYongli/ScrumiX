'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, Calendar, Clock, Users, Video, Plus,
  MoreHorizontal, Play, Edit, Trash2, UserCheck,
  MessageSquare, Target, BarChart3, FolderOpen
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ParticipantsTooltip from '@/components/common/ParticipantsTooltip';

// Meeting type configuration
const meetingTypes = {
  'daily-standup': {
    name: 'Daily Standup',
    color: 'bg-blue-500',
    icon: MessageSquare,
  },
  'sprint-planning': {
    name: 'Sprint Planning',
    color: 'bg-green-500',
    icon: Target,
  },
  'sprint-review': {
    name: 'Sprint Review',
    color: 'bg-purple-500',
    icon: BarChart3,
  },
  'sprint-retrospective': {
    name: 'Sprint Retrospective',
    color: 'bg-orange-500',
    icon: UserCheck,
  },
  'backlog-refinement': {
    name: 'Backlog Refinement',
    color: 'bg-indigo-500',
    icon: Edit,
  },
};

// Mock meeting data
const meetingsData = [
  {
    id: 'meeting-1',
    title: 'Daily Standup - Week 3',
    type: 'daily-standup',
    status: 'scheduled',
    date: '2024-03-15',
    time: '09:00',
    duration: 15,
    location: 'Zoom Meeting Room',
    facilitator: 'Alice Wang',
    participants: ['John Smith', 'Alice Wang', 'Bob Zhang', 'Carol Li', 'David Zhao'],
    description: 'Daily team sync meeting to share yesterday\'s progress, today\'s plans, and any blockers.',
    agenda: ['Work completed yesterday', 'Today\'s work plan', 'Encountered blockers'],
  },
  {
    id: 'meeting-2',
    title: 'Sprint 6 Planning Meeting',
    type: 'sprint-planning',
    status: 'scheduled',
    date: '2024-03-18',
    time: '14:00',
    duration: 120,
    location: 'Conference Room A',
    facilitator: 'Alice Wang',
    participants: ['John Smith', 'Alice Wang', 'Bob Zhang', 'Carol Li'],
    description: 'Plan Sprint 6 work content, estimate story points, and define Sprint goals.',
    agenda: ['Sprint 5 Review', 'Product Backlog Refinement', 'Story Point Estimation', 'Sprint 6 Goal Setting'],
  },
  {
    id: 'meeting-3',
    title: 'Sprint 5 Review Meeting',
    type: 'sprint-review',
    status: 'completed',
    date: '2024-03-12',
    time: '15:30',
    duration: 60,
    location: 'Conference Room B',
    facilitator: 'John Smith',
    participants: ['John Smith', 'Alice Wang', 'Bob Zhang', 'Carol Li', 'Product Manager', 'Designer'],
    description: 'Demonstrate Sprint 5 deliverables and collect stakeholder feedback.',
    agenda: ['Feature Demo', 'User Feedback Collection', 'Next Sprint Suggestions'],
    notes: 'Users are very satisfied with the new login flow, suggest adding social login options.',
  },
  {
    id: 'meeting-4',
    title: 'Sprint 5 Retrospective Meeting',
    type: 'sprint-retrospective',
    status: 'completed',
    date: '2024-03-13',
    time: '10:00',
    duration: 90,
    location: 'Conference Room A',
    facilitator: 'Alice Wang',
    participants: ['Alice Wang', 'Bob Zhang', 'Carol Li', 'David Zhao'],
    description: 'Review Sprint 5 work process and identify improvement points.',
    agenda: ['What went well', 'Areas for improvement', 'Action plan for next Sprint'],
    notes: 'Team collaboration has improved significantly, need to strengthen code review process.',
    actionItems: [
      'Establish code review checklist',
      'Increase automated test coverage',
      'Optimize deployment process'
    ],
  },
  {
    id: 'meeting-5',
    title: 'Product Backlog Refinement',
    type: 'backlog-refinement',
    status: 'in-progress',
    date: '2024-03-15',
    time: '16:00',
    duration: 60,
    location: 'Zoom Meeting Room',
    facilitator: 'John Smith',
    participants: ['John Smith', 'Alice Wang', 'Bob Zhang'],
    description: 'Refine and detail the product backlog in preparation for the next Sprint.',
    agenda: ['New requirements discussion', 'Existing story refinement', 'Priority adjustment'],
  },
  {
    id: 'meeting-6',
    title: 'Emergency Technical Discussion',
    type: 'daily-standup',
    status: 'cancelled',
    date: '2024-03-14',
    time: '11:00',
    duration: 30,
    location: 'Conference Room C',
    facilitator: 'Bob Zhang',
    participants: ['Bob Zhang', 'Carol Li'],
    description: 'Discuss solutions to production environment performance issues.',
    agenda: ['Problem analysis', 'Solution discussion', 'Implementation plan'],
  },
];

const ProjectMeetings = () => {
  const params = useParams();
  const projectId = params['project-id'] as string;
  const [meetings, setMeetings] = useState(meetingsData);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Get project name (should fetch from API in real project)
  const getProjectName = (id: string) => {
    const projects = {
      '1': 'E-commerce Platform Rebuild',
      '2': 'Mobile App Development',
      '3': 'Data Analytics Platform',
    };
    return projects[id as keyof typeof projects] || 'Unknown Project';
  };

  const projectName = getProjectName(projectId);

  // Breadcrumb data with icons
  const breadcrumbItems = [
    { label: 'Project', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Meeting Management', icon: <Calendar className="w-4 h-4" /> }
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
    if (selectedFilter === 'upcoming') return meeting.status === 'scheduled';
    if (selectedFilter === 'completed') return meeting.status === 'completed';
    return meeting.type === selectedFilter;
  });

  // Get meeting statistics
  const getMeetingStats = () => {
    const total = meetings.length;
    const scheduled = meetings.filter(m => m.status === 'scheduled').length;
    const completed = meetings.filter(m => m.status === 'completed').length;
    const inProgress = meetings.filter(m => m.status === 'in-progress').length;
    return { total, scheduled, completed, inProgress };
  };

  const stats = getMeetingStats();

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
            {projectName} - Manage all agile meetings
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
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
          { key: 'daily-standup', label: 'Daily Standup' },
          { key: 'sprint-planning', label: 'Sprint Planning' },
          { key: 'sprint-review', label: 'Sprint Review' },
          { key: 'sprint-retrospective', label: 'Sprint Retrospective' },
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

      {/* Meeting list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMeetings.map((meeting) => {
          const meetingType = meetingTypes[meeting.type as keyof typeof meetingTypes];
          const statusStyle = getStatusStyle(meeting.status);
          const IconComponent = meetingType.icon;

          return (
            <div
              key={meeting.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Meeting header */}
              <div className={`${meetingType.color} h-1`}></div>
              
              <div className="p-6">
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
                    <span>{meeting.date} {meeting.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{meeting.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Video className="w-4 h-4" />
                    <span>{meeting.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{meeting.participants.length} participants</span>
                  </div>
                </div>

                {/* Meeting description */}
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {meeting.description}
                </p>

                {/* Participant avatars */}
                <ParticipantsTooltip 
                  participants={meeting.participants} 
                  facilitator={meeting.facilitator}
                />

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Link 
                    href={`/project/${projectId}/meeting/${meeting.id}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {meeting.status === 'in-progress' ? (
                      <>
                        <Play className="w-4 h-4" />
                        Join Meeting
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        View Details
                      </>
                    )}
                  </Link>
                  <button className="border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-lg text-sm transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredMeetings.length === 0 && (
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
    </div>
  );
};

export default ProjectMeetings;
