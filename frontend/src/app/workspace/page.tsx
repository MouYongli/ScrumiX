'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, Users, CheckCircle2, Clock, Plus, ExternalLink, ArrowRight, Target, BarChart3
} from 'lucide-react';
import { api } from '@/utils/api';
import { TaskStatus, TaskPriority, ProjectStatus, MeetingType } from '@/types/enums';
import { User, ProjectWithDetails, Sprint } from '@/types/domain';
import { 
  mapApiUserToDomain, 
  mapApiTaskToDomain, 
  mapApiMeetingToDomain, 
  mapApiProjectToDomain,
  mapApiSprintToDomain,
  createProjectWithDetails,
  formatScrumRole
} from '@/utils/mappers';

const MyWorkspacePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First fetch current user
        const userResponse = await api.auth.getCurrentUser();
        if (userResponse.error || !userResponse.data) throw new Error(userResponse.error || 'Failed to get current user');
        const currentUser = mapApiUserToDomain(userResponse.data);
        setCurrentUser(currentUser);

        // Fetch workspace data using the new workspace endpoint
        const workspaceResponse = await api.workspace.getOverview();
        if (workspaceResponse.error) throw new Error(workspaceResponse.error);

        const workspaceData = workspaceResponse.data;
        
        // Map data to domain models and preserve additional fields from workspace API
        const projects = workspaceData.projects.map((apiProject: any) => {
          const domainProject = mapApiProjectToDomain(apiProject);
          return {
            ...domainProject,
            memberCount: apiProject.member_count || 0,  // Use the actual member count from workspace API
            role: formatScrumRole(apiProject.user_role) || 'Member'  // Add formatted role from workspace API response
          };
        });
        const sprints = workspaceData.active_sprints.map(mapApiSprintToDomain);
        const allTasks = workspaceData.recent_tasks.map(mapApiTaskToDomain);
        const allMeetings = workspaceData.upcoming_meetings.map((apiMeeting: any) => {
          const domainMeeting = mapApiMeetingToDomain(apiMeeting);
          return {
            ...domainMeeting,
            participantCount: apiMeeting.participant_count || 0  // Use the actual participant count from workspace API
          };
        });

        // Create sprint-to-project mapping
        const sprintToProject = new Map<number, number>();
        sprints.forEach((sprint: Sprint) => sprintToProject.set(sprint.id, sprint.projectId));

        // Create projects with properly scoped tasks and meetings
        const projectsWithDetails = await Promise.all(projects.map(async (project: any) => {
          // Filter tasks by project (via sprint relationship)
          const projectTasks = allTasks.filter((task: any) => 
            sprintToProject.get(task.sprintId) === project.id
          );

          // Filter tasks to only show assigned to current user (if assignedUsers exists)
          const userTasks = projectTasks.filter((task: any) =>
            task.assignedUsers.length === 0 || // Show unassigned tasks
            task.assignedUsers.some((user: any) => user.id === currentUser.id)
          );

          // Filter meetings by project
          const projectMeetings = allMeetings.filter((meeting: any) => 
            meeting.projectId === project.id
          );

          // Calculate project progress based on user stories and bugs only
          let progress = 0;
          try {
            const backlogResponse = await api.backlogs.getAll({ 
              project_id: project.id,
              limit: 1000 
            });
            const projectBacklogItems = backlogResponse.data || [];
            
            // Filter to only count user stories and bugs for progress calculation
            const storyAndBugItems = projectBacklogItems.filter((item: any) => 
              item.item_type === 'story' || item.item_type === 'bug'
            );
            
            const totalStoryAndBugItems = storyAndBugItems.length;
            const completedStoryAndBugItems = storyAndBugItems.filter((item: any) => item.status === 'done').length;
            progress = totalStoryAndBugItems > 0
              ? Math.round((completedStoryAndBugItems / totalStoryAndBugItems) * 100)
              : 0;
          } catch (err) {
            console.error(`Error fetching backlog for project ${project.id}:`, err);
            progress = 0;
          }

          return createProjectWithDetails(project, userTasks, projectMeetings, progress);
        }));

        setProjects(projectsWithDetails);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-md bg-green-600 text-white">
            Active
          </span>
        );
      case ProjectStatus.PLANNING:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white">
            Planning
          </span>
        );
      case ProjectStatus.COMPLETED:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-md bg-gray-600 text-white">
            Completed
          </span>
        );
      case ProjectStatus.ON_HOLD:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-md bg-yellow-600 text-white">
            On Hold
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-md bg-red-600 text-white">
            Cancelled
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading workspace</div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
            My Workspace
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Overview of all your projects & tasks
          </p>
        </div>

        {/* Projects */}
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="max-w-md mx-auto">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Welcome to Your Workspace
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  You haven't joined any projects yet. Create your first project or ask a team member to invite you to get started with your agile journey.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/project"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Create Project
                  </Link>
                  <Link
                    href="/notifications"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Check Invitations
                  </Link>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Get started with ScrumiX:
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Create and manage project backlogs
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Plan and track sprint progress
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Collaborate with your team
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Schedule and manage meetings
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            projects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
            >
              {/* Project Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                  <div className={`w-3 h-3 ${project.color || 'bg-blue-500'} rounded-sm mt-2`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link 
                        href={`/project/${project.id}/dashboard`}
                        className="text-xl font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        {project.name}
                      </Link>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{project.memberCount || 0}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-base mt-1 mb-2">
                      {project.description}
                    </p>
                    <p className="text-gray-500 dark:text-gray-500 text-base">
                      Role: {project.role || 'Member'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(project.status)}
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{project.progress}%</span>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden min-w-[200px]">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Todo Section */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Todo</h3>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {project.tasks.filter(t => t.status === TaskStatus.TODO).length} tasks
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.tasks
                      .filter(task => task.status === TaskStatus.TODO)
                      .map((task) => (
                        <div key={task.id} className="space-y-2 bg-white dark:bg-gray-600 rounded-lg p-3 shadow-sm">
                          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                            {task.title}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Created: {task.createdAt.toLocaleDateString()}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${task.priorityColor}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* In Progress Section */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">In Progress</h3>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {project.tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length} tasks
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.tasks
                      .filter(task => task.status === TaskStatus.IN_PROGRESS)
                      .map((task) => (
                        <div key={task.id} className="space-y-2 bg-white dark:bg-gray-600 rounded-lg p-3 shadow-sm">
                          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                            {task.title}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                Updated: {task.updatedAt.toLocaleDateString()}
                              </span>
                              {task.assignedUsers.length > 0 && (
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  • {task.assignedUsers[0].displayName}
                                </span>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${task.priorityColor}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Meetings Section */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Meetings</h3>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {project.upcomingMeetings.length} upcoming
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.upcomingMeetings.length > 0 ? (
                      project.upcomingMeetings.map((meeting) => (
                        <div key={meeting.id} className="space-y-2 bg-white dark:bg-gray-600 rounded-lg p-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed flex-1">
                              {meeting.title}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {meeting.meetingTypeDisplay}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <Calendar className="w-3 h-3" />
                              <span>{meeting.startDateTime.toLocaleDateString()}</span>
                              <span>• {(meeting as any).participantCount || 0} participants</span>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {meeting.displayDuration}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="w-6 h-6 mx-auto mb-2 text-gray-500 dark:text-gray-600" />
                        <p className="text-xs text-gray-600 dark:text-gray-500">No upcoming meetings</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyWorkspacePage;