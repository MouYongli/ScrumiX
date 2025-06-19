'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Calendar, LayoutDashboard, Users, TrendingUp, CheckCircle2, Clock, AlertTriangle,
  Target, Zap, BarChart3, MessageSquare, Plus, ArrowRight, Activity,
  FolderOpen
} from 'lucide-react';
import FavoriteButton from '@/components/common/FavoriteButton';
import Breadcrumb from '@/components/common/Breadcrumb';

interface ProjectDashboardProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock project data
const mockProjectData = {
  id: '1',
  name: 'E-commerce Platform Refactoring',
  description: 'Modern e-commerce platform development project based on React and Node.js',
  status: 'active',
  progress: 68,
  currentSprint: {
    name: 'Sprint 5',
    progress: 75,
    daysLeft: 3,
    totalDays: 14,
    startDate: '2024-03-01',
    endDate: '2024-03-15',
  },
  team: {
    totalMembers: 8,
    activeMembers: 7,
    roles: {
      productOwner: 1,
      scrumMaster: 1,
      developers: 6,
    },
  },
  tasks: {
    total: 45,
    completed: 32,
    inProgress: 8,
    pending: 5,
  },
  velocity: {
    planned: 50,
    completed: 42,
    average: 38,
  },
};

const recentActivities = [
  {
    id: 1,
    user: 'John Smith',
    action: 'completed task',
    target: 'User Login API Development',
    time: '10 minutes ago',
    type: 'task_completed',
  },
  {
    id: 2,
    user: 'Jane Doe',
    action: 'started task',
    target: 'Shopping Cart Feature Testing',
    time: '1 hour ago',
    type: 'task_started',
  },
  {
    id: 3,
    user: 'Mike Johnson',
    action: 'commented on',
    target: 'Database Optimization Plan',
    time: '2 hours ago',
    type: 'comment_added',
  },
  {
    id: 4,
    user: 'Sarah Wilson',
    action: 'created user story',
    target: 'Product Recommendation Algorithm',
    time: '3 hours ago',
    type: 'story_created',
  },
];

const upcomingMeetings = [
  {
    id: 1,
    title: 'Daily Standup',
    type: 'daily_standup',
    time: 'Tomorrow 09:00',
    attendees: 8,
  },
  {
    id: 2,
    title: 'Sprint Review',
    type: 'sprint_review',
    time: 'March 15, 14:00',
    attendees: 12,
  },
  {
    id: 3,
    title: 'Sprint Retrospective',
    type: 'sprint_retrospective',
    time: 'March 15, 16:00',
    attendees: 8,
  },
];

// Mock kanban data for sprint preview
const sprintKanbanData = {
  todo: [
    { id: 1, title: 'Product Search API', priority: 'high', assignee: 'John D.', storyPoints: 5 },
    { id: 2, title: 'Payment Gateway Integration', priority: 'medium', assignee: 'Sarah M.', storyPoints: 8 },
    { id: 3, title: 'Email Notification System', priority: 'low', assignee: 'Mike R.', storyPoints: 3 },
  ],
  inProgress: [
    { id: 4, title: 'User Authentication Flow', priority: 'high', assignee: 'Jane S.', storyPoints: 5 },
    { id: 5, title: 'Shopping Cart Optimization', priority: 'medium', assignee: 'Tom W.', storyPoints: 3 },
  ],
  done: [
    { id: 6, title: 'Database Schema Design', priority: 'high', assignee: 'Alex K.', storyPoints: 8 },
    { id: 7, title: 'User Profile Components', priority: 'medium', assignee: 'Lisa P.', storyPoints: 5 },
    { id: 8, title: 'API Documentation', priority: 'low', assignee: 'David L.', storyPoints: 2 },
  ],
};

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];
  const project = mockProjectData;

  // Prepare favorite data
  const favoriteItem = {
    id: projectId,
    type: 'project' as const,
    title: project.name,
    description: project.description,
    url: `/project/${projectId}/dashboard`,
    metadata: {
      status: project.status,
      assignee: `${project.team.totalMembers} members`,
    },
  };

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: project.name, href: `/project/${projectId}/dashboard` },
    { label: 'Project Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Project Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {project.name} - Project overview and real-time status
          </p>
        </div>
        <div className="flex gap-3">
          <FavoriteButton 
            item={favoriteItem}
            showText={true}
            className="text-sm"
          />
          <Link
            href={`/project/${projectId}/sprint`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Manage Sprint
          </Link>
          <Link
            href={`/project/${projectId}/kanban`}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Target className="w-4 h-4" />
            Task Board
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Project Progress</p>
              <p className="text-2xl font-bold text-blue-600">{project.progress}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Team Members</p>
              <p className="text-2xl font-bold text-green-600">{project.team.activeMembers}/{project.team.totalMembers}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {project.team.activeMembers} active
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
              <p className="text-2xl font-bold text-purple-600">{project.tasks.completed}/{project.tasks.total}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {Math.round((project.tasks.completed / project.tasks.total) * 100)}% completion rate
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sprint Remaining</p>
              <p className="text-2xl font-bold text-orange-600">{project.currentSprint.daysLeft} days</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {project.currentSprint.totalDays} days total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Sprint Status */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {project.currentSprint.name} Status
              </h3>
              <Link 
                href={`/project/${projectId}/sprint`}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                View Details
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Sprint Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Sprint Progress</span>
                <span>{project.currentSprint.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${project.currentSprint.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Task Distribution */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{project.tasks.completed}</p>
                <p className="text-sm text-green-700 dark:text-green-400">Completed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{project.tasks.inProgress}</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">In Progress</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">{project.tasks.pending}</p>
                <p className="text-sm text-gray-700 dark:text-gray-400">Pending</p>
              </div>
            </div>
            {/* Kanban Board Preview */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Sprint Kanban Preview</h4>
                <Link 
                  href={`/project/${projectId}/kanban`}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                >
                  View Full Board
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {/* To Do Column */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    To Do ({sprintKanbanData.todo.length})
                  </h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sprintKanbanData.todo.map((task) => (
                      <div key={task.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h6 className="text-xs font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                          {task.title}
                        </h6>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 dark:text-gray-400">{task.assignee}</span>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">{task.storyPoints}pt</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* In Progress Column */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <h5 className="font-medium text-blue-700 dark:text-blue-300 text-sm mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    In Progress ({sprintKanbanData.inProgress.length})
                  </h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sprintKanbanData.inProgress.map((task) => (
                      <div key={task.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h6 className="text-xs font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                          {task.title}
                        </h6>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 dark:text-gray-400">{task.assignee}</span>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">{task.storyPoints}pt</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Done Column */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <h5 className="font-medium text-green-700 dark:text-green-300 text-sm mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Done ({sprintKanbanData.done.length})
                  </h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sprintKanbanData.done.map((task) => (
                      <div key={task.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h6 className="text-xs font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                          {task.title}
                        </h6>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 dark:text-gray-400">{task.assignee}</span>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">{task.storyPoints}pt</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Team Velocity */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Team Velocity</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Planned Points</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{project.velocity.planned}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Completed Points</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{project.velocity.completed}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Average Velocity</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{project.velocity.average}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mt-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Activities
              </h3>
              <Link 
                href={`/project/${projectId}/collaboration`}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upcoming Meetings
              </h3>
              <Link 
                href={`/project/${projectId}/meeting`}
                className="text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-5 h-5" />
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {meeting.title}
                  </h4>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {meeting.time}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {meeting.attendees} attendees
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                href={`/project/${projectId}/backlog`}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                📋 Manage Product Backlog
              </Link>
              <Link
                href={`/project/${projectId}/stories`}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                📝 Create User Stories
              </Link>
              <Link
                href={`/project/${projectId}/meeting`}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                📅 Schedule Meeting
              </Link>
              <Link
                href={`/project/${projectId}/reports`}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                📊 View Reports
              </Link>
            </div>
          </div>

          {/* Alerts and Reminders */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800 dark:text-orange-300 text-sm">
                  Sprint Ending Soon
                </h4>
                <p className="text-orange-700 dark:text-orange-400 text-xs mt-1">
                  Current sprint ends in {project.currentSprint.daysLeft} days. Please ensure tasks are completed on time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
