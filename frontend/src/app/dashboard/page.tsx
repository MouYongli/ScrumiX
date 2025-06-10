'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Plus, Calendar, Users, BarChart3, TrendingUp, Clock, 
  Target, Zap, AlertCircle, CheckCircle2, ArrowRight,
  Activity, GitBranch, MessageSquare
} from 'lucide-react';

// Mock data
const userProjects = [
  {
    id: '1',
    name: 'E-commerce Platform Rebuild',
    description: 'Modern e-commerce platform based on React and Node.js',
    status: 'active',
    progress: 68,
    currentSprint: 'Sprint 5',
    daysLeft: 3,
    color: 'bg-blue-500',
    role: 'Product Owner',
    lastActivity: '2 hours ago',
    teamSize: 8,
    completedTasks: 24,
    totalTasks: 35,
  },
  {
    id: '2',
    name: 'Mobile App Development',
    description: 'Cross-platform mobile application development project',
    status: 'active',
    progress: 45,
    currentSprint: 'Sprint 3',
    daysLeft: 5,
    color: 'bg-green-500',
    role: 'Scrum Master',
    lastActivity: '1 hour ago',
    teamSize: 6,
    completedTasks: 18,
    totalTasks: 40,
  },
  {
    id: '3',
    name: 'Data Analytics Platform',
    description: 'Enterprise-level data analysis and visualization platform',
    status: 'planning',
    progress: 12,
    currentSprint: 'Planning',
    daysLeft: 0,
    color: 'bg-purple-500',
    role: 'Developer',
    lastActivity: '1 day ago',
    teamSize: 4,
    completedTasks: 3,
    totalTasks: 25,
  },
];

const recentActivities = [
  {
    id: 1,
    type: 'task_completed',
    user: 'John',
    action: 'completed a task',
    target: 'User Login Interface Development',
    project: 'E-commerce Platform Rebuild',
    time: '10 minutes ago',
    icon: CheckCircle2,
    color: 'text-green-600',
  },
  {
    id: 2,
    type: 'sprint_started',
    user: 'Sarah',
    action: 'started',
    target: 'Sprint 4',
    project: 'Mobile App Development',
    time: '2 hours ago',
    icon: Zap,
    color: 'text-blue-600',
  },
  {
    id: 3,
    type: 'meeting_scheduled',
    user: 'Mike',
    action: 'scheduled',
    target: 'Sprint Review Meeting',
    project: 'E-commerce Platform Rebuild',
    time: '4 hours ago',
    icon: Calendar,
    color: 'text-purple-600',
  },
  {
    id: 4,
    type: 'comment_added',
    user: 'Emily',
    action: 'commented on',
    target: 'Database Design Document',
    project: 'Data Analytics Platform',
    time: '6 hours ago',
    icon: MessageSquare,
    color: 'text-orange-600',
  },
];

const GlobalDashboardPage = () => {
  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
      planning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
      paused: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    };
    
    const statusText = {
      active: 'In Progress',
      planning: 'Planning',
      completed: 'Completed',
      paused: 'Paused',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status as keyof typeof statusStyles]}`}>
        {statusText[status as keyof typeof statusText]}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Global Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Welcome back! This is your overview of all projects
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {/* Global statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
              <p className="text-2xl font-bold text-blue-600">
                {userProjects.filter(p => p.status === 'active').length}
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Sprint</p>
              <p className="text-2xl font-bold text-green-600">
                {userProjects.filter(p => p.status === 'active').length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Team Members</p>
              <p className="text-2xl font-bold text-purple-600">
                {userProjects.reduce((sum, p) => sum + p.teamSize, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed Tasks This Week</p>
              <p className="text-2xl font-bold text-orange-600">
                {userProjects.reduce((sum, p) => sum + p.completedTasks, 0)}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My projects */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              My Projects
            </h2>
            <Link 
              href="/projects"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {userProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 ${project.color} rounded-full mt-1`}></div>
                    <div>
                      <Link 
                        href={`/project/${project.id}/dashboard`}
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition-colors"
                      >
                        {project.name}
                      </Link>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {project.description}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(project.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {project.progress}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Current Sprint</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {project.currentSprint}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Team Size</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {project.teamSize} people
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">My Role</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {project.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {project.completedTasks}/{project.totalTasks} Tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {project.lastActivity}
                    </span>
                  </div>
                  {project.daysLeft > 0 && (
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      {project.daysLeft} days remaining
                    </span>
                  )}
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
            ))}
          </div>
        </div>

        {/* Recent activities */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Recent Activities
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const IconComponent = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700`}>
                      <IconComponent className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{activity.user}</span>
                        {' '}{activity.action}{' '}
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activity.project} • {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link 
                href="/activity"
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center gap-1"
              >
                View All Activities
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboardPage; 