'use client';

/**
 * ProjectSidebar Component
 * 
 * Features:
 * - Displays current project information
 * - Shows current sprint status with real-time updates
 * - Automatically refreshes sprint data every 30 seconds
 * - Provides manual refresh functionality
 * 
 * Usage from parent component:
 * ```tsx
 * const sidebarRef = useRef<ProjectSidebarRef>(null);
 * 
 * // Trigger refresh when sprint status changes
 * const handleSprintStatusChange = () => {
 *   sidebarRef.current?.refreshSprintData();
 * };
 * 
 * <ProjectSidebar ref={sidebarRef} projectId={projectId} ... />
 * ```
 */

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
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

interface ProjectSidebarRef {
  refreshSprintData: () => Promise<void>;
}

interface ProjectData extends ApiProject {
  currentSprint: string | null;
  sprintContext: 'active' | 'planning' | 'completed' | null;
  progress: number;
  color: string;
  totalBacklogItems: number;
  completedBacklogItems: number;
  backlogStatusBreakdown: {
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
    cancelled: number;
  };
}

const ProjectSidebar = forwardRef<ProjectSidebarRef, ProjectSidebarProps>(({ 
  projectId, 
  isCollapsed, 
  onToggle 
}, ref) => {
  const pathname = usePathname();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);

  // Function to refresh project data (can be called externally)
  const refreshProjectData = async () => {
    if (!projectId) return;
    
    try {
      setIsRefreshing(true);
      // Fetch project data
      const projectResponse = await api.projects.getById(parseInt(projectId));
      if (projectResponse.error) throw new Error(projectResponse.error);
      
      // Fetch current sprint
      const sprintsResponse = await api.sprints.getAll();
      if (sprintsResponse.error) throw new Error(sprintsResponse.error);
      
      const projectSprints = sprintsResponse.data?.filter(sprint => 
        sprint.projectId === parseInt(projectId)
      ) || [];
      
      // Enhanced sprint detection logic
      let currentSprint = null;
      let sprintContext = null;
      
      // First priority: Find active sprint
      currentSprint = projectSprints.find(sprint => sprint.status === 'active');
      if (currentSprint) {
        sprintContext = 'active';
      }
      
      // Second priority: Find planning sprint that hasn't ended yet
      if (!currentSprint) {
        const now = new Date();
        currentSprint = projectSprints
          .filter(sprint => 
            sprint.status === 'planning' && 
            new Date(sprint.endDate) >= now
          )
          .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
        if (currentSprint) {
          sprintContext = 'planning';
        }
      }
      
      // Third priority: Find recently completed sprint (within last 7 days) for reference
      if (!currentSprint) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        currentSprint = projectSprints
          .filter(sprint => 
            sprint.status === 'completed' && 
            new Date(sprint.endDate) >= sevenDaysAgo
          )
          .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
        if (currentSprint) {
          sprintContext = 'completed';
        }
      }

      // Calculate project progress by getting backlog items for the project
      const backlogResponse = await api.backlogs.getAll({ 
        project_id: parseInt(projectId),
        limit: 1000 
      });
      const projectBacklogItems = backlogResponse.data || [];
      
      // Calculate progress based on completed backlog items (status = 'done')
      const totalBacklogItems = projectBacklogItems.length;
      const completedBacklogItems = projectBacklogItems.filter(item => item.status === 'done').length;
      const progress = totalBacklogItems > 0
        ? Math.round((completedBacklogItems / totalBacklogItems) * 100)
        : 0;
      
      // Calculate status breakdown
      const backlogStatusBreakdown = {
        todo: projectBacklogItems.filter(item => item.status === 'todo').length,
        in_progress: projectBacklogItems.filter(item => item.status === 'in_progress').length,
        in_review: projectBacklogItems.filter(item => item.status === 'in_review').length,
        done: completedBacklogItems,
        cancelled: projectBacklogItems.filter(item => item.status === 'cancelled').length
      };

      setProject({
        ...projectResponse.data,
        currentSprint: currentSprint ? currentSprint.sprintName : null,
        sprintContext: sprintContext as 'active' | 'planning' | 'completed' | null,
        progress,
        color: 'bg-blue-500', // You can map this based on project status or type
        totalBacklogItems,
        completedBacklogItems,
        backlogStatusBreakdown
      });
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProjectData();

    // Set up interval to refresh sprint data every 30 seconds
    const intervalId = setInterval(refreshProjectData, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [projectId]);

  // Auto-collapse preview box on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // md breakpoint
        setIsPreviewCollapsed(true);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useImperativeHandle(ref, () => ({
    refreshSprintData: refreshProjectData,
  }));

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
          <div className="p-3 pt-0">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ) : project ? (
                <>
                  {/* Project Header with Collapse Toggle */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 ${project.color} rounded-full mr-2`}></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {project.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title={isPreviewCollapsed ? "Expand preview" : "Collapse preview"}
                    >
                      <svg 
                        className={`w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                          isPreviewCollapsed ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                    {/* Collapsed indicator */}
                    {isPreviewCollapsed && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Click to expand
                      </span>
                    )}
                  </div>
                  
                  {/* Collapsible Content */}
                  <div className={`overflow-hidden transition-all duration-300 ${
                    isPreviewCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                  }`}>
                    
                    {/* Collapsed Summary */}
                    {isPreviewCollapsed && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                        {project.currentSprint ? (
                          <span>Active: {project.currentSprint} • {project.completedBacklogItems}/{project.totalBacklogItems} items</span>
                        ) : (
                          <span>{project.completedBacklogItems}/{project.totalBacklogItems} items • {project.progress}% complete</span>
                        )}
                      </div>
                    )}
                    
                    {/* Expanded Content */}
                    <div className={`${isPreviewCollapsed ? 'hidden' : 'block'}`}>
                    {/* Enhanced Current Sprint Display */}
                    {project.currentSprint ? (
                      <div className={`mb-2 p-1.5 rounded-lg border transition-colors ${
                        project.sprintContext === 'active' 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : project.sprintContext === 'planning'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Zap className={`w-3 h-3 ${
                              project.sprintContext === 'active'
                                ? 'text-green-600 dark:text-green-400'
                                : project.sprintContext === 'planning'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`} />
                            <span className={`text-xs font-medium ${
                              project.sprintContext === 'active'
                                ? 'text-green-800 dark:text-green-300'
                                : project.sprintContext === 'planning'
                                ? 'text-blue-800 dark:text-blue-300'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {project.sprintContext === 'active' ? 'Active Sprint' :
                               project.sprintContext === 'planning' ? 'Planning Sprint' :
                               project.sprintContext === 'completed' ? 'Recent Sprint' : 'Current Sprint'}
                            </span>
                          </div>
                          <button
                            onClick={refreshProjectData}
                            disabled={isRefreshing}
                            className={`p-0.5 rounded transition-colors ${
                              project.sprintContext === 'active'
                                ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/50'
                                : project.sprintContext === 'planning'
                                ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Refresh sprint data"
                          >
                            {isRefreshing ? (
                              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className={`text-xs font-medium truncate mb-1 ${
                          project.sprintContext === 'active'
                            ? 'text-green-700 dark:text-green-400'
                            : project.sprintContext === 'planning'
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {project.currentSprint}
                        </div>
                        <Link
                          href={`/project/${projectId}/sprint`}
                          className={`block w-full text-center text-xs rounded px-1.5 py-0.5 transition-colors ${
                            project.sprintContext === 'active'
                              ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-100 dark:bg-green-800/50 hover:bg-green-200 dark:hover:bg-green-800'
                              : project.sprintContext === 'planning'
                              ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-100 dark:bg-blue-800/50 hover:bg-blue-200 dark:hover:bg-blue-800'
                              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800/50'
                          }`}
                        >
                          {project.sprintContext === 'active' ? 'View Active Sprint' :
                           project.sprintContext === 'planning' ? 'View Planning Sprint' :
                           project.sprintContext === 'completed' ? 'View Sprint Details' : 'View Sprint'}
                        </Link>
                      </div>
                    ) : (
                      <div className="mb-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Current Sprint</span>
                          </div>
                          <button
                            onClick={refreshProjectData}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Refresh sprint data"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1">
                          No active sprint
                        </div>
                        <Link
                          href={`/project/${projectId}/sprint`}
                          className="block w-full text-center text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded px-1.5 py-0.5 transition-colors"
                        >
                          Manage Sprints
                        </Link>
                      </div>
                    )}
                    
                                         {/* Project Progress */}
                     <div className="mb-1">
                       <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                         <span>Project Progress</span>
                         <span>{project.progress}%</span>
                       </div>
                       <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                         <div 
                           className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                           style={{ width: `${project.progress}%` }}
                         ></div>
                       </div>
                     </div>
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
});

export default ProjectSidebar; 