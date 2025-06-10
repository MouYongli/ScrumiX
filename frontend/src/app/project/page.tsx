'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen, Plus, Search, MoreVertical, Users, Calendar,
  BarChart3, CheckCircle2, AlertCircle, Clock, Star
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import FavoriteButton from '@/components/common/FavoriteButton';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'planning';
  progress: number;
  members: number;
  tasks: {
    completed: number;
    total: number;
  };
  startDate: string;
  endDate: string;
  lastActivity: string;
  color: string;
}

const ProjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', icon: <FolderOpen className="w-4 h-4" /> }
  ];

  // Mock project data
  const projects: Project[] = [
    {
      id: '1',
      name: 'Mobile App Development',
      description: 'Customer-facing mobile application development project, including core features such as user authentication, product display, shopping cart, etc.',
      status: 'active',
      progress: 68,
      members: 8,
      tasks: { completed: 25, total: 37 },
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      lastActivity: '2024-03-15T14:30:00',
      color: 'bg-blue-500'
    },
    {
      id: '2',
      name: 'Corporate Website Rebuild',
      description: 'Company official website reconstruction project, using modern design and technology stack.',
      status: 'active',
      progress: 45,
      members: 5,
      tasks: { completed: 12, total: 28 },
      startDate: '2024-02-01',
      endDate: '2024-05-15',
      lastActivity: '2024-03-14T16:20:00',
      color: 'bg-green-500'
    },
    {
      id: '3',
      name: 'Data Analysis Platform',
      description: 'Data analysis and visualization platform developed for internal use.',
      status: 'planning',
      progress: 15,
      members: 6,
      tasks: { completed: 3, total: 20 },
      startDate: '2024-03-01',
      endDate: '2024-08-30',
      lastActivity: '2024-03-13T10:15:00',
      color: 'bg-purple-500'
    },
    {
      id: '4',
      name: 'Customer Service System Upgrade',
      description: 'Function upgrade and performance optimization project for existing customer service system.',
      status: 'completed',
      progress: 100,
      members: 4,
      tasks: { completed: 18, total: 18 },
      startDate: '2023-11-01',
      endDate: '2024-02-28',
      lastActivity: '2024-02-28T17:00:00',
      color: 'bg-emerald-500'
    },
    {
      id: '5',
      name: 'Supply Chain Management System',
      description: 'Supplier management system, including order management and inventory tracking.',
      status: 'on-hold',
      progress: 30,
      members: 7,
      tasks: { completed: 8, total: 25 },
      startDate: '2024-01-20',
      endDate: '2024-07-15',
      lastActivity: '2024-03-01T09:30:00',
      color: 'bg-orange-500'
    }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'In Progress' },
    { value: 'planning', label: 'Planning' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' }
  ];

  const getStatusInfo = (status: string) => {
    const statusMap = {
      active: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: '🟢' },
      planning: { label: 'Planning', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: '📋' },
      'on-hold': { label: 'On Hold', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: '⏸️' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: '✅' }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.active;
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Project List
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and track the progress of all projects
          </p>
        </div>
        
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Create Project
        </button>
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
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* 状态筛选 */}
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

      {/* 项目网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => {
          const statusInfo = getStatusInfo(project.status);
          const favoriteItem = {
            id: project.id,
            type: 'project' as const,
            title: project.name,
            description: project.description,
            url: `/project/${project.id}/dashboard`,
            metadata: {
              status: project.status,
              assignee: `${project.members} Members`,
            },
          };

          return (
            <Link
              key={project.id}
              href={`/project/${project.id}/dashboard`}
              className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden group"
            >
              {/* 项目颜色条 */}
              <div className={`h-2 ${project.color}`}></div>
              
              <div className="p-6">
                {/* 项目头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  <div onClick={(e) => e.preventDefault()}>
                    <FavoriteButton item={favoriteItem} />
                  </div>
                </div>

                {/* 项目描述 */}
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>

                {/* 进度条 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* 项目统计 */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {project.members}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Members</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {project.tasks.completed}/{project.tasks.total}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Tasks</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Days Remaining</div>
                  </div>
                </div>

                {/* 最后活动时间 */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    Last activity: {new Date(project.lastActivity).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No projects
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || selectedStatus !== 'all' ? 'No matching projects found' : 'Create your first project to start collaborating'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage; 