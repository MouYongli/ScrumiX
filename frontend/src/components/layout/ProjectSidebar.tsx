'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, FileText, Zap, Kanban, Calendar, MessageSquare, 
  TrendingUp, BarChart3, Settings, Menu, ArrowLeft, Users, Target,
  Clock, GitBranch, CheckSquare, ListTodo, TrendingDown, BarChart
} from 'lucide-react';
import { api } from '@/utils/api';
import { ApiProject } from '@/types/api';

interface ProjectSidebarProps {
  projectId: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

interface ProjectData extends ApiProject {
  currentSprint: string | null;
  progress: number;
  color: string;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ 
  projectId, 
  isCollapsed, 
  onToggle 
}) => {
  const pathname = usePathname();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        // Fetch project data
        const projectResponse = await api.projects.getById(parseInt(projectId));
        if (projectResponse.error) throw new Error(projectResponse.error);
        
        // Fetch current sprint
        const sprintsResponse = await api.sprints.getAll();
        if (sprintsResponse.error) throw new Error(sprintsResponse.error);
        
        const projectSprints = sprintsResponse.data?.filter(sprint => 
          sprint.projectId === parseInt(projectId)
        ) || [];
        
        // Find current sprint
        const currentSprint = projectSprints
          .filter(sprint => new Date(sprint.endDate) >= new Date())
          .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

        // Calculate project progress
        const tasksResponse = await api.tasks.getAll({ limit: 100 });
        const projectTasks = tasksResponse.data?.tasks.filter(task => 
          (task as any).project_id === parseInt(projectId)
        ) || [];
        
        const progress = projectTasks.length > 0
          ? Math.round((projectTasks.filter(task => task.status === 'DONE').length / projectTasks.length) * 100)
          : 0;

        setProject({
          ...projectResponse.data,
          currentSprint: currentSprint ? `Sprint ${currentSprint.sprintNumber}` : null,
          progress,
          color: 'bg-blue-500' // You can map this based on project status or type
        });
      } catch (error) {
        console.error('Error fetching project data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  const navigationItems = [
    {
      name: 'Project Dashboard',
      href: `/project/${projectId}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      name: 'Backlog Management',
      href: `/project/${projectId}/backlog`,
      icon: ListTodo,
    },
    {
      name: 'Sprint Management',
      href: `/project/${projectId}/sprint`,
      icon: Zap,
    },
    {
      name: 'Meeting Management',
      href: `/project/${projectId}/meeting`,
      icon: Calendar,
    },
    {
      name: 'Documentation',
      href: `/project/${projectId}/documentation`,
      icon: FileText,
    },
  ];

  const teamItems = [
    {
      name: 'Team Members',
      href: `/project/${projectId}/team`,
      icon: Users,
    },
    {
      name: 'Project Settings',
      href: `/project/${projectId}/settings`,
      icon: Settings,
    },
  ];

  const projectStatus = {
    active: 'In Progress',
    planning: 'Planning',
    completed: 'Completed',
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-50 dark:bg-green-900/20',
      planning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
      completed: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      paused: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20',
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getStatusText = (status: string) => {
    const texts = {
      active: 'In Progress',
      planning: 'Planning',
      completed: 'Completed',
      paused: 'Paused',
    };
    return texts[status as keyof typeof texts] || 'Unknown';
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex flex-col h-full`}>
      
      {/* Sidebar Header - Project Info */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        {/* Back button and collapse button */}
        <div className="flex items-center justify-between p-4">
          {!isCollapsed && (
            <Link 
              href="/project"
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Projects
            </Link>
          )}
          <button
            onClick={onToggle}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <Menu className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Project Info Card */}
        {!isCollapsed && (
          <div className="p-4 pt-0">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ) : project ? (
                <>
                  <div className="flex items-center mb-2">
                    <div className={`w-3 h-3 ${project.color} rounded-full mr-2`}></div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {project.currentSprint || 'No Active Sprint'}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Project Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Project not found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Project Features */}
        <div className="space-y-1 mb-6">
          {!isCollapsed && (
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Project Features
              </h3>
            </div>
          )}
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`} />
                {!isCollapsed && (
                  <span className="font-medium truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Project Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        {!isCollapsed && (
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Project Management
            </h3>
          </div>
        )}
        <div className="space-y-1">
          {teamItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`} />
                {!isCollapsed && (
                  <span className="font-medium truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Project Workspace - ID: {projectId}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSidebar; 