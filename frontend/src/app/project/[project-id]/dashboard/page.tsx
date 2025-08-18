'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Calendar, LayoutDashboard, Users, TrendingUp, CheckCircle2, Clock, AlertTriangle,
  Target, Zap, BarChart3, MessageSquare, Plus, ArrowRight, Activity,
  FolderOpen, CalendarDays, BarChart4
} from 'lucide-react';
import FavoriteButton from '@/components/common/FavoriteButton';
import Breadcrumb from '@/components/common/Breadcrumb';
import { Timeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { api } from '@/utils/api';
import { ApiProject, ApiTask, ApiMeeting, ApiSprint, ScrumRole } from '@/types/api';
import { ProjectStatus, TaskStatus } from '@/types/enums';

interface ProjectDashboardProps {
  params: Promise<{ 'project-id': string }>;
}

// Interface for computed dashboard data
interface DashboardData {
  project: ApiProject | null;
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  currentSprint: {
    name: string;
    progress: number;
    daysLeft: number;
    totalDays: number;
    startDate: string;
    endDate: string;
  } | null;
  team: {
    totalMembers: number;
    activeMembers: number;
    roles: {
      productOwner: number;
      scrumMaster: number;
      developers: number;
    };
  };
  velocity: {
    planned: number;
    completed: number;
    average: number;
  };
  recentActivities: Array<{
    id: number;
    user: string;
    action: string;
    target: string;
    time: string;
    type: string;
  }>;
  upcomingMeetings: Array<{
    id: number;
    title: string;
    type: string;
    time: string;
    attendees: number;
  }>;
  sprintKanbanData: {
    todo: Array<{
      id: number;
      title: string;
      priority: string;
      assignee: string;
    }>;
    inProgress: Array<{
      id: number;
      title: string;
      priority: string;
      assignee: string;
    }>;
    done: Array<{
      id: number;
      title: string;
      priority: string;
      assignee: string;
    }>;
  };
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    project: null,
    tasks: { total: 0, completed: 0, inProgress: 0, pending: 0 },
    currentSprint: null,
    team: { totalMembers: 0, activeMembers: 0, roles: { productOwner: 0, scrumMaster: 0, developers: 0 } },
    velocity: { planned: 0, completed: 0, average: 0 },
    recentActivities: [],
    upcomingMeetings: [],
    sprintKanbanData: { todo: [], inProgress: [], done: [] }
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sprint preview view state
  const [sprintViewType, setSprintViewType] = useState<'kanban' | 'timeline' | 'calendar'>('kanban');
  
  // Kanban drag and drop state
  const [kanbanData, setKanbanData] = useState<DashboardData['sprintKanbanData']>({
    todo: [],
    inProgress: [],
    done: []
  });
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState<number | null>(null); // Track which task is being updated
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tempDragState, setTempDragState] = useState<{
    task: any;
    sourceColumn: string;
    targetColumn: string;
  } | null>(null);
  
  // Timeline reference
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);

  // Helper function to format assignee display based on backend user_task.py structure
  // This function handles the assignee data structure returned by the backend:
  // - Backend uses UserTask model to manage task assignments
  // - get_task_assignee_details() returns: {id, username, full_name, email, role, assigned_at}
  // - Multiple users can be assigned to a single task
  // - Priority: full_name > username > email (extracted name) > fallback
  const getAssigneeDisplay = (assignees: any[]): string => {
    if (!assignees || assignees.length === 0) {
      return 'Unassigned';
    }
    
    // Handle backend assignee structure from user_task.py
    // Backend returns assignees as objects with: {id, username, full_name, email, role, assigned_at}
    const users = assignees.map(assignee => {
      if (typeof assignee === 'object') {
        // Backend provides full user details
        if (assignee.full_name && assignee.full_name.trim()) {
          return assignee.full_name;
        } else if (assignee.username && assignee.username.trim()) {
          return assignee.username;
        } else if (assignee.email) {
          // Extract name from email if no name/username available
          return assignee.email.split('@')[0];
        }
      } else if (typeof assignee === 'number') {
        // If it's just a user ID, we can't display the name here
        // This might happen if backend hasn't been updated yet
        console.warn(`Task has assignee ID ${assignee} but no user details. Backend may need update.`);
        return `User ${assignee}`;
      }
      return 'Unknown User';
    });
    
    // Filter out any undefined or empty names
    const validUsers = users.filter(name => name && name.trim() !== '');
    
    if (validUsers.length === 0) {
      return 'Unassigned';
    } else if (validUsers.length === 1) {
      return validUsers[0];
    } else if (validUsers.length === 2) {
      return `${validUsers[0]} & ${validUsers[1]}`;
    } else {
      return `${validUsers[0]} +${validUsers.length - 1} more`;
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch project data
        const projectResponse = await api.projects.getById(parseInt(projectId));
        if (projectResponse.error) throw new Error(projectResponse.error);
        
        const project = projectResponse.data;
        
        // Fetch project tasks - for now get all tasks and filter by project
        // TODO: Add project_id filter to API when backend supports it
        // Note: Backend should return tasks with assignees array containing user details
        // from user_task.py: {id, username, full_name, email, role, assigned_at}
        const tasksResponse = await api.tasks.getAll({ 
          limit: 100 
        });
        if (tasksResponse.error) throw new Error(tasksResponse.error);
        
        // Filter tasks by project (assuming tasks have project_id field)
        // If backend doesn't support this yet, we'll need to implement it
        const allTasks = tasksResponse.data?.tasks || [];
        
        // Debug: Log the structure of tasks to understand what we're receiving
        console.log('Raw tasks from API:', allTasks.slice(0, 2)); // Log first 2 tasks
        
        const tasks = allTasks.filter(task => {
          // Check if task has project_id field, if not, include all for now
          return (task as any).project_id === parseInt(projectId) || !(task as any).project_id;
        });
        
        // Debug: Log filtered tasks and their assignee structure
        console.log('Filtered tasks for project:', tasks.slice(0, 2));
        tasks.slice(0, 2).forEach((task, index) => {
          console.log(`Task ${index + 1} assignees:`, {
            taskId: task.id,
            taskTitle: task.title,
            assignees: task.assignees,
            assigneesType: typeof task.assignees,
            assigneesLength: Array.isArray(task.assignees) ? task.assignees.length : 'not array'
          });
        });
        
        // Try to get tasks with assignee information from sprint endpoints
        let tasksWithAssignees = tasks;
        
        // Debug: Log tasks with assignees
        console.log('Tasks with assignees:', tasksWithAssignees.slice(0, 2));
        
        // Debug: Check if any tasks have assignee information
        const tasksWithAssigneesInfo = tasksWithAssignees.filter(task => 
          task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0
        );
        console.log(`Tasks with assignee info: ${tasksWithAssigneesInfo.length}/${tasksWithAssignees.length}`);
        
        // Fetch project sprints
        const sprintsResponse = await api.sprints.getAll();
        if (sprintsResponse.error) throw new Error(sprintsResponse.error);
        
        const projectSprints = sprintsResponse.data?.filter(sprint => 
          sprint.projectId === parseInt(projectId)
        ) || [];
        
        // Find current sprint (most recent active sprint)
        const currentSprint = projectSprints
          .filter(sprint => new Date(sprint.endDate) >= new Date())
          .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
        
        // Try to get tasks with assignee information from sprint endpoints
        if (currentSprint) {
          try {
            const sprintBacklogResponse = await api.sprints.getSprintBacklog(currentSprint.id, {
              include_acceptance_criteria: false,
              limit: 1000
            });
            
            if (!sprintBacklogResponse.error && sprintBacklogResponse.data) {
              // Extract tasks from sprint backlog items
              const sprintTasks: any[] = [];
              sprintBacklogResponse.data.forEach(backlogItem => {
                if (backlogItem.tasks && Array.isArray(backlogItem.tasks)) {
                  sprintTasks.push(...backlogItem.tasks);
                }
              });
              
              // If we got tasks with assignee info, use them
              if (sprintTasks.length > 0) {
                console.log('Found tasks with assignee info from sprint backlog:', sprintTasks.slice(0, 2));
                tasksWithAssignees = sprintTasks;
              }
            }
          } catch (error) {
            console.warn('Failed to fetch sprint backlog for assignee info:', error);
          }
        }
        
        // Calculate sprint progress
        let sprintProgress = 0;
        let sprintDaysLeft = 0;
        let sprintTotalDays = 0;
        
        if (currentSprint) {
          const sprintStart = new Date(currentSprint.startDate);
          const sprintEnd = new Date(currentSprint.endDate);
          const now = new Date();
          
          sprintTotalDays = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
          sprintDaysLeft = Math.ceil((sprintEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (sprintTotalDays > 0) {
            sprintProgress = Math.round(((sprintTotalDays - sprintDaysLeft) / sprintTotalDays) * 100);
          }
        }
        
        // Calculate team composition
        const teamRoles = {
          productOwner: project.project_members?.filter(member => member.role === ScrumRole.PRODUCT_OWNER).length || 0,
          scrumMaster: project.project_members?.filter(member => member.role === ScrumRole.SCRUM_MASTER).length || 0,
          developers: project.project_members?.filter(member => member.role === ScrumRole.DEVELOPER).length || 0
        };
        
        // Calculate velocity from backlog items (user stories) since tasks don't have story points
        // We need to fetch backlog items to get story points for velocity calculation
        const backlogResponse = await api.backlogs.getAll({
          project_id: parseInt(projectId),
          include_children: true,
          include_acceptance_criteria: false
        });
        
        let totalStoryPoints = 0;
        let completedStoryPoints = 0;
        
        if (!backlogResponse.error && backlogResponse.data) {
          const backlogItems = backlogResponse.data;
          totalStoryPoints = backlogItems.reduce((sum, item) => sum + (item.story_point || 0), 0);
          completedStoryPoints = backlogItems
            .filter(item => item.status === 'done')
            .reduce((sum, item) => sum + (item.story_point || 0), 0);
        }
        
        // Fetch upcoming meetings
        const meetingsResponse = await api.meetings.getUpcoming(14);
        if (meetingsResponse.error) throw new Error(meetingsResponse.error);
        
        const projectMeetings = meetingsResponse.data?.filter(meeting => 
          meeting.projectId === parseInt(projectId)
        ) || [];
        
        // Calculate dashboard metrics
        const completedTasks = tasksWithAssignees.filter(task => task.status === TaskStatus.DONE);
        const inProgressTasks = tasksWithAssignees.filter(task => task.status === TaskStatus.IN_PROGRESS);
        const pendingTasks = tasksWithAssignees.filter(task => task.status === TaskStatus.TODO);
        
        // Debug: Log task counts and check for duplicates
        console.log('Task filtering results:', {
          total: tasksWithAssignees.length,
          completed: completedTasks.length,
          inProgress: inProgressTasks.length,
          pending: pendingTasks.length
        });
        
        // Check for duplicate task IDs across all statuses
        const allTaskIds = [
          ...completedTasks.map(t => t.id),
          ...inProgressTasks.map(t => t.id),
          ...pendingTasks.map(t => t.id)
        ];
        const uniqueTaskIds = new Set(allTaskIds);
        if (allTaskIds.length !== uniqueTaskIds.size) {
          console.warn('Duplicate task IDs detected:', {
            total: allTaskIds.length,
            unique: uniqueTaskIds.size,
            duplicates: allTaskIds.filter((id, index) => allTaskIds.indexOf(id) !== index)
          });
        }
        
        // Prepare kanban data (without story points) - ensure no duplicates
        const sprintKanbanData = {
          todo: pendingTasks.map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            assignee: getAssigneeDisplay(task.assignees || [])
          })),
          inProgress: inProgressTasks.map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            assignee: getAssigneeDisplay(task.assignees || [])
          })),
          done: completedTasks.map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            assignee: getAssigneeDisplay(task.assignees || [])
          }))
        };
        

        
                 // Prepare recent activities (simplified - using task updates)
         const recentActivities = tasksWithAssignees
           .slice(0, 4)
           .map((task, index) => ({
             id: task.id,
             user: getAssigneeDisplay(task.assignees || []),
             action: task.status === TaskStatus.DONE ? 'completed task' : 
                    task.status === TaskStatus.IN_PROGRESS ? 'started task' : 'updated task',
             target: task.title,
             time: `${index + 1} hour${index > 0 ? 's' : ''} ago`,
             type: task.status === TaskStatus.DONE ? 'task_completed' : 'task_updated'
           }));
        
        // Prepare upcoming meetings
        const upcomingMeetings = projectMeetings.slice(0, 3).map(meeting => ({
          id: meeting.id,
          title: meeting.title,
          type: meeting.meetingType,
          time: new Date(meeting.startDatetime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          attendees: 0 // Backend doesn't provide attendee count yet
        }));
        
        // Update dashboard data
        setDashboardData({
          project,
          tasks: {
            total: tasksWithAssignees.length,
            completed: completedTasks.length,
            inProgress: inProgressTasks.length,
            pending: pendingTasks.length
          },
          currentSprint: currentSprint ? {
            name: currentSprint.sprintName,
            progress: sprintProgress,
            daysLeft: Math.max(0, sprintDaysLeft),
            totalDays: sprintTotalDays,
            startDate: currentSprint.startDate,
            endDate: currentSprint.endDate
          } : null,
          team: {
            totalMembers: project.members,
            activeMembers: project.members, // Assuming all members are active
            roles: teamRoles
          },
          velocity: {
            planned: totalStoryPoints,
            completed: completedStoryPoints,
            average: projectSprints.length > 0 ? Math.round(totalStoryPoints / projectSprints.length) : 0
          },
          recentActivities,
          upcomingMeetings,
          sprintKanbanData
        });
        
        // Update kanban data state using synchronization function
        syncKanbanData(sprintKanbanData);
        
        // Debug: Log the final kanban data structure
        console.log('Final kanban data structure:', {
          todo: sprintKanbanData.todo.map(t => ({ id: t.id, title: t.title })),
          inProgress: sprintKanbanData.inProgress.map(t => ({ id: t.id, title: t.title })),
          done: sprintKanbanData.done.map(t => ({ id: t.id, title: t.title }))
        });
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [projectId]);

  // Function to refresh dashboard data
  const refreshDashboardData = () => {
    // Trigger a re-fetch of dashboard data
    window.location.reload(); // Simple approach for now, could be optimized later
  };

  // Function to refresh only the kanban data without page reload
  const refreshKanbanData = async () => {
    try {
      console.log('Refreshing kanban data...');
      
      // Fetch fresh task data for the current project
      const tasksResponse = await api.tasks.getAll({ 
        limit: 100 
      });
      
      if (tasksResponse.error) {
        console.warn('Failed to refresh tasks, using current data:', tasksResponse.error);
        return;
      }
      
      const allTasks = tasksResponse.data?.tasks || [];
      
      // Filter tasks by project (assuming tasks have project_id field)
      const tasks = allTasks.filter(task => {
        return (task as any).project_id === parseInt(projectId) || !(task as any).project_id;
      });
      
      // Re-categorize tasks by status
      const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE);
      const inProgressTasks = tasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
      const pendingTasks = tasks.filter(task => task.status === TaskStatus.TODO);
      
      // Create new kanban data
      const newKanbanData = {
        todo: pendingTasks.map(task => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          assignee: getAssigneeDisplay(task.assignees || [])
        })),
        inProgress: inProgressTasks.map(task => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          assignee: getAssigneeDisplay(task.assignees || [])
        })),
        done: completedTasks.map(task => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          assignee: getAssigneeDisplay(task.assignees || [])
        }))
      };
      
      // Update kanban data state
      setKanbanData(newKanbanData);
      
      // Update dashboard data counts
      setDashboardData(prev => ({
        ...prev,
        tasks: {
          total: tasks.length,
          completed: completedTasks.length,
          inProgress: inProgressTasks.length,
          pending: pendingTasks.length
        },
        sprintKanbanData: newKanbanData
      }));
      
      console.log('Kanban data refreshed successfully:', {
        total: tasks.length,
        todo: newKanbanData.todo.length,
        inProgress: newKanbanData.inProgress.length,
        done: newKanbanData.done.length
      });
      
    } catch (error) {
      console.error('Failed to refresh kanban data:', error);
      // Don't show error to user for background refresh
    }
  };

  // Function to refresh specific dashboard metrics without full reload
  const refreshDashboardMetrics = async () => {
    try {
      console.log('Refreshing dashboard metrics...');
      
      // Update task counts from current kanban data
      const totalTasks = kanbanData.todo.length + kanbanData.inProgress.length + kanbanData.done.length;
      
      setDashboardData(prev => ({
        ...prev,
        tasks: {
          total: totalTasks,
          completed: kanbanData.done.length,
          inProgress: kanbanData.inProgress.length,
          pending: kanbanData.todo.length
        }
      }));
      
      console.log('Dashboard metrics refreshed successfully');
      
    } catch (error) {
      console.error('Failed to refresh dashboard metrics:', error);
    }
  };

  // Function to synchronize kanban data with dashboard data
  const syncKanbanData = (dashboardKanbanData: DashboardData['sprintKanbanData']) => {
    // Validate the data structure first
    if (!validateKanbanData(dashboardKanbanData)) {
      console.error('Invalid kanban data structure, skipping synchronization');
      return;
    }
    
    // Ensure no duplicates exist in the new data
    const todo = dashboardKanbanData.todo.filter((task, index, self) => 
      index === self.findIndex(t => t.id === task.id)
    );
    const inProgress = dashboardKanbanData.inProgress.filter((task, index, self) => 
      index === self.findIndex(t => t.id === task.id)
    );
    const done = dashboardKanbanData.done.filter((task, index, self) => 
      index === self.findIndex(t => t.id === task.id)
    );
    
    // Update kanban data with deduplicated data
    setKanbanData({ todo, inProgress, done });
    
    console.log('Kanban data synchronized:', { todo: todo.length, inProgress: inProgress.length, done: done.length });
  };

  // Function to validate kanban data structure
  const validateKanbanData = (data: any): boolean => {
    if (!data || typeof data !== 'object') {
      console.error('Invalid kanban data structure:', data);
      return false;
    }
    
    const requiredColumns = ['todo', 'inProgress', 'done'];
    for (const column of requiredColumns) {
      if (!Array.isArray(data[column])) {
        console.error(`Column ${column} is not an array:`, data[column]);
        return false;
      }
    }
    
    // Check for duplicate task IDs across all columns
    const allTaskIds = [
      ...data.todo.map((t: any) => t.id),
      ...data.inProgress.map((t: any) => t.id),
      ...data.done.map((t: any) => t.id)
    ];
    
    const uniqueTaskIds = new Set(allTaskIds);
    if (allTaskIds.length !== uniqueTaskIds.size) {
      console.warn('Duplicate task IDs detected during validation:', {
        total: allTaskIds.length,
        unique: uniqueTaskIds.size,
        duplicates: allTaskIds.filter((id, index) => allTaskIds.indexOf(id) !== index)
      });
      return false;
    }
    
    return true;
  };

  // Ensure kanban data consistency and remove duplicates
  useEffect(() => {
    // Don't run cleanup during drag operations
    if (draggedItem || isUpdatingTask || tempDragState) {
      return;
    }
    
    if (kanbanData.todo.length > 0 || kanbanData.inProgress.length > 0 || kanbanData.done.length > 0) {
      // Check for duplicate task IDs across all columns
      const allTaskIds = [
        ...kanbanData.todo.map(t => t.id),
        ...kanbanData.inProgress.map(t => t.id),
        ...kanbanData.done.map(t => t.id)
      ];
      
      const uniqueTaskIds = new Set(allTaskIds);
      if (allTaskIds.length !== uniqueTaskIds.size) {
        console.warn('Duplicate task IDs detected in kanban data, cleaning up...');
        
        // Remove duplicates by keeping only the first occurrence of each task ID
        const cleanedKanbanData = {
          todo: kanbanData.todo.filter((task, index, self) => 
            index === self.findIndex(t => t.id === task.id)
          ),
          inProgress: kanbanData.inProgress.filter((task, index, self) => 
            index === self.findIndex(t => t.id === task.id)
          ),
          done: kanbanData.done.filter((task, index, self) => 
            index === self.findIndex(t => t.id === task.id)
          )
        };
        
        setKanbanData(cleanedKanbanData);
      }
    }
  }, [kanbanData, draggedItem, isUpdatingTask, tempDragState]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: any, sourceColumn: string) => {
    setDraggedItem({ task, sourceColumn });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(targetColumn);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedItem || draggedItem.sourceColumn === targetColumn) {
      return;
    }

    // Prevent dropping if the task is already in the target column
    const isAlreadyInTarget = kanbanData[targetColumn as keyof typeof kanbanData]
      .some(task => task.id === draggedItem.task.id);
    
    if (isAlreadyInTarget) {
      console.warn('Task already exists in target column:', draggedItem.task.id);
      return;
    }

    // Set temporary drag state for visual feedback
    setTempDragState({
      task: draggedItem.task,
      sourceColumn: draggedItem.sourceColumn,
      targetColumn: targetColumn
    });

    // Store the original kanban data for potential rollback
    const originalKanbanData = { ...kanbanData };
    
    // Create new kanban data with the task moved
    const newKanbanData = { ...kanbanData };
    
    // Remove task from source column
    newKanbanData[draggedItem.sourceColumn as keyof typeof newKanbanData] = 
      newKanbanData[draggedItem.sourceColumn as keyof typeof newKanbanData]
        .filter(task => task.id !== draggedItem.task.id);
    
    // Add task to target column
    newKanbanData[targetColumn as keyof typeof newKanbanData] = [
      ...newKanbanData[targetColumn as keyof typeof newKanbanData],
      draggedItem.task
    ];

    // Update task status in backend FIRST, before updating UI
    if (draggedItem.task.id) {
      setIsUpdatingTask(draggedItem.task.id);
      
      // Log the request details for debugging
      const targetStatus = targetColumn === 'todo' ? TaskStatus.TODO :
                          targetColumn === 'inProgress' ? TaskStatus.IN_PROGRESS :
                          TaskStatus.DONE;
      
      console.log('Updating task status:', {
        taskId: draggedItem.task.id,
        taskTitle: draggedItem.task.title,
        fromStatus: draggedItem.sourceColumn,
        toStatus: targetColumn,
        targetStatus: targetStatus,
        apiEndpoint: `/api/v1/tasks/${draggedItem.task.id}/status?status=${targetStatus}`
      });
      
      try {
        const updateResponse = await api.tasks.updateStatus(draggedItem.task.id, targetStatus);

        if (updateResponse.error) {
          throw new Error(updateResponse.error);
        }
        
        // Log the response for debugging
        console.log('Task status update response:', updateResponse);
        
        if (!updateResponse.data) {
          throw new Error('No data received from task status update');
        }
        
        console.log('Task status updated successfully:', updateResponse.data);
        
        // Only update the UI AFTER successful backend update
        setKanbanData(newKanbanData);
        
        // Clear temporary drag state
        setTempDragState(null);
        
        // Show success feedback
        setUpdateMessage({ type: 'success', message: `Task "${draggedItem.task.title}" moved to ${targetColumn === 'todo' ? 'To Do' : targetColumn === 'inProgress' ? 'In Progress' : 'Done'}` });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setUpdateMessage(null);
        }, 3000);
        
        // Update dashboard metrics immediately for better UX
        refreshDashboardMetrics();
        
        // Refresh the kanban data in the background to ensure consistency with backend
        setTimeout(() => {
          refreshKanbanData();
        }, 1000); // Slightly longer delay to ensure backend has processed the update
        
      } catch (err) {
        console.error('Failed to update task status with dedicated endpoint, trying fallback:', err);
        
        // Try fallback using the regular update endpoint
        try {
          console.log('Attempting fallback update using regular task update endpoint...');
          
          const fallbackResponse = await api.tasks.update(draggedItem.task.id, {
            status: targetStatus
          });
          
          if (fallbackResponse.error) {
            throw new Error(`Fallback also failed: ${fallbackResponse.error}`);
          }
          
          console.log('Fallback update successful:', fallbackResponse.data);
          
          // Update the UI after successful fallback update
          setKanbanData(newKanbanData);
          setTempDragState(null);
          
          setUpdateMessage({ type: 'success', message: `Task "${draggedItem.task.title}" moved to ${targetColumn === 'todo' ? 'To Do' : targetColumn === 'inProgress' ? 'In Progress' : 'Done'}` });
          
          setTimeout(() => {
            setUpdateMessage(null);
          }, 3000);
          
          // Update dashboard metrics immediately for better UX
          refreshDashboardMetrics();
          
          // Refresh the kanban data in the background to ensure consistency with backend
          setTimeout(() => {
            refreshKanbanData();
          }, 1000);
          
        } catch (fallbackErr) {
          console.error('Fallback update also failed:', fallbackErr);
          
          // Both attempts failed, revert the UI
          setKanbanData(originalKanbanData);
          setTempDragState(null);
          
          // Show error message to user with proper error handling
          let errorMessage = 'Unknown error occurred';
          
          // Handle different error types more specifically
          if (fallbackErr instanceof Error) {
            errorMessage = fallbackErr.message;
          } else if (typeof fallbackErr === 'string') {
            errorMessage = fallbackErr;
          } else if (fallbackErr && typeof fallbackErr === 'object') {
            // Try to extract meaningful error information
            if ('message' in fallbackErr && typeof fallbackErr.message === 'string') {
              errorMessage = fallbackErr.message;
            } else if ('detail' in fallbackErr && typeof fallbackErr.detail === 'string') {
              errorMessage = fallbackErr.detail;
            } else if ('status' in fallbackErr && typeof fallbackErr.status === 'number') {
              // Handle HTTP status errors
              const status = fallbackErr.status;
              if (status === 422) {
                errorMessage = 'Invalid request format. Please try again.';
              } else if (status === 404) {
                errorMessage = 'Task not found. It may have been deleted.';
              } else if (status === 403) {
                errorMessage = 'You do not have permission to update this task.';
              } else if (status >= 500) {
                errorMessage = 'Server error. Please try again later.';
              } else {
                errorMessage = `Request failed with status ${status}`;
              }
            } else {
              // Last resort: try to stringify the error object
              try {
                errorMessage = JSON.stringify(fallbackErr);
              } catch {
                errorMessage = 'An unexpected error occurred';
              }
            }
          }
          
          setUpdateMessage({ type: 'error', message: `Failed to update task status: ${errorMessage}` });
          
          // Clear error message after 5 seconds
          setTimeout(() => {
            setUpdateMessage(null);
          }, 5000);
        }
      } finally {
        setIsUpdatingTask(null);
        setDraggedItem(null);
      }
    } else {
      // If no task ID, just clear the dragged item and temp state
      setDraggedItem(null);
      setTempDragState(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  // Initialize timeline
  useEffect(() => {
    if (sprintViewType === 'timeline' && timelineRef.current && !timelineInstance.current && dashboardData.currentSprint) {
      // Prepare timeline data from real sprint data
      const items = new DataSet<any>([]);
      const groups = new DataSet<any>([]);
      
      // Add sprint as main group
      const sprint = dashboardData.currentSprint;
        groups.add({
        id: 'sprint',
        content: sprint.name,
        className: 'epic-group priority-high'
      });
      
      // Add tasks to timeline
      const allTasks = [
        ...dashboardData.sprintKanbanData.todo,
        ...dashboardData.sprintKanbanData.inProgress,
        ...dashboardData.sprintKanbanData.done
      ];
      
      allTasks.forEach((task, index) => {
        const startDay = Math.floor((index * 2) % 14) + 1; // Distribute tasks across sprint
        const duration = Math.max(1, Math.floor(Math.random() * 4) + 1);
        
          items.add({
            id: task.id,
          group: 'sprint',
            content: `${task.title} (${task.assignee})`,
          start: new Date(sprint.startDate),
          end: new Date(new Date(sprint.startDate).getTime() + (startDay + duration) * 24 * 60 * 60 * 1000),
            type: 'range',
          className: `task-item status-${task.id <= dashboardData.tasks.completed ? 'done' : 
                     task.id <= dashboardData.tasks.completed + dashboardData.tasks.inProgress ? 'inProgress' : 'todo'} priority-${task.priority}`
        });
      });

      // Timeline options
      const options = {
        width: '100%',
        height: '400px',
        margin: { item: 10, axis: 40 },
        orientation: 'top',
        showCurrentTime: false,
        zoomable: true,
        moveable: true,
        stack: true,
        stackSubgroups: true,
        groupOrder: 'id',
        editable: {
          add: false,
          updateTime: true,
          updateGroup: false,
          remove: false
        },
        format: {
          minorLabels: {
            millisecond: 'SSS',
            second: 's',
            minute: 'HH:mm',
            hour: 'HH:mm',
            weekday: 'ddd D',
            day: 'D',
            week: 'w',
            month: 'MMM',
            year: 'YYYY'
          }
        },
        start: new Date(sprint.startDate),
        end: new Date(sprint.endDate)
      };

      // Create timeline
      timelineInstance.current = new Timeline(timelineRef.current, items, options);
      timelineInstance.current.setGroups(groups);
    }
    
    return () => {
      if (timelineInstance.current) {
        timelineInstance.current.destroy();
        timelineInstance.current = null;
      }
    };
  }, [sprintViewType, dashboardData.currentSprint, dashboardData.sprintKanbanData, dashboardData.tasks]);

  // Breadcrumb items should always follow: home icon > project name > current route
  const breadcrumbItems = [
    { label: dashboardData.project?.name || 'Project', href: `/project/${projectId}/dashboard` },
    { label: 'Project Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-900">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No project data
  if (!dashboardData.project) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Project not found</p>
        </div>
      </div>
    );
  }

  // Validate kanban data before rendering
  if (!kanbanData || typeof kanbanData !== 'object') {
    console.error('Invalid kanban data:', kanbanData);
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-900">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
            Data Loading Issue
          </h3>
          <p className="text-gray-600 dark:text-gray-400">Kanban data is not properly loaded. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const project = dashboardData.project;

  // Prepare favorite data
  const favoriteItem = {
    id: projectId,
    type: 'project' as const,
    title: project.name,
    description: project.description || '',
    url: `/project/${projectId}/dashboard`,
    metadata: {
      status: project.status,
      assignee: `${project.members} members`,
    },
  };

  // Breadcrumb navigation

  return (
    <div className="space-y-8">
      {/* Timeline Custom Styles */}
      <style jsx global>{`
        .timeline-container .vis-timeline {
          border: none !important;
          font-family: inherit !important;
        }
        
        .timeline-container .vis-item {
          border-radius: 6px !important;
          border: none !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        .timeline-container .vis-item.epic-item {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
          color: white !important;
          font-weight: 600 !important;
          height: 30px !important;
        }
        
        .timeline-container .vis-item.task-item {
          height: 24px !important;
          font-size: 12px !important;
        }
        
        .timeline-container .vis-item.status-todo {
          background: linear-gradient(135deg, #9ca3af, #6b7280) !important;
          color: white !important;
        }
        
        .timeline-container .vis-item.status-inProgress {
          background: linear-gradient(135deg, #3b82f6, #1e40af) !important;
          color: white !important;
        }
        
        .timeline-container .vis-item.status-done {
          background: linear-gradient(135deg, #10b981, #059669) !important;
          color: white !important;
        }
        
        .timeline-container .vis-item.priority-high {
          border-left: 4px solid #ef4444 !important;
        }
        
        .timeline-container .vis-item.priority-medium {
          border-left: 4px solid #f59e0b !important;
        }
        
        .timeline-container .vis-item.priority-low {
          border-left: 4px solid #10b981 !important;
        }
        
        .timeline-container .vis-labelset .vis-label {
          background: #f8fafc !important;
          border-bottom: 1px solid #e2e8f0 !important;
          color: #1e293b !important;
          font-weight: 500 !important;
        }
        
        .timeline-container .vis-time-axis {
          background: #f1f5f9 !important;
          border-bottom: 1px solid #cbd5e1 !important;
        }
        
        .timeline-container .vis-time-axis .vis-text {
          color: #475569 !important;
          font-weight: 500 !important;
        }
        
        .timeline-container .vis-panel.vis-background {
          background: white !important;
        }
        
        .timeline-container .vis-grid.vis-vertical {
          border-left: 1px solid #e2e8f0 !important;
        }
        
        .timeline-container .vis-grid.vis-horizontal {
          border-top: 1px solid #f1f5f9 !important;
        }
      `}</style>
      
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {project.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {project.description || 'Project overview and real-time status'}
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
                      <p className="text-2xl font-bold text-green-600">{dashboardData.team.activeMembers}/{dashboardData.team.totalMembers}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {dashboardData.team.activeMembers} active
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
              <p className="text-2xl font-bold text-purple-600">{dashboardData.tasks.completed}/{dashboardData.tasks.total}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {Math.round((dashboardData.tasks.completed / dashboardData.tasks.total) * 100)}% completion rate
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sprint Remaining</p>
              <p className="text-2xl font-bold text-orange-600">{dashboardData.currentSprint?.daysLeft || 0} days</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {dashboardData.currentSprint?.totalDays || 0} days total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Sprint Status */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {dashboardData.currentSprint?.name || 'No Active Sprint'} Status
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
            {dashboardData.currentSprint && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Sprint Progress</span>
                  <span>{dashboardData.currentSprint.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${dashboardData.currentSprint.progress}%` }}
                ></div>
              </div>
            </div>
            )}

            {/* Task Distribution */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{dashboardData.tasks.completed}</p>
                <p className="text-sm text-green-700 dark:text-green-400">Completed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{dashboardData.tasks.inProgress}</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">In Progress</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">{dashboardData.tasks.pending}</p>
                <p className="text-sm text-gray-700 dark:text-gray-400">Pending</p>
              </div>
            </div>
            {/* Sprint Preview with View Selector */}
            {dashboardData.currentSprint && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Sprint Preview</h4>
                <Link 
                  href={`/project/${projectId}/kanban`}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                >
                  View Full Board
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              {/* View Type Selector */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4 w-fit">
                <button
                  onClick={() => setSprintViewType('kanban')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    sprintViewType === 'kanban'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Kanban
                </button>
                <button
                  onClick={() => setSprintViewType('timeline')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    sprintViewType === 'timeline'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart4 className="w-4 h-4" />
                  Timeline
                </button>
                <button
                  onClick={() => setSprintViewType('calendar')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    sprintViewType === 'calendar'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Calendar
                </button>
              </div>

              {/* Status Messages */}
              {updateMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  updateMessage.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {updateMessage.message}
                </div>
              )}

              {/* Processing Indicator */}
              {tempDragState && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Moving task "{tempDragState.task.title}" to {tempDragState.targetColumn === 'todo' ? 'To Do' : tempDragState.targetColumn === 'inProgress' ? 'In Progress' : 'Done'}...
                    </p>
                  </div>
                </div>
              )}

              {/* Kanban Instructions */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> Drag and drop tasks between columns to update their status. Changes are automatically saved to the backend.
                </p>
              </div>

              {/* Kanban View */}
              {sprintViewType === 'kanban' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* To Do Column */}
                  <div 
                    className={`bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 transition-colors ${
                      dragOverColumn === 'todo' ? 'bg-gray-100 dark:bg-gray-800/50 ring-2 ring-blue-400' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, 'todo')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'todo')}
                  >
                    <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      To Do ({Array.isArray(kanbanData.todo) ? kanbanData.todo.length : 0})
                    </h5>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Array.isArray(kanbanData.todo) && kanbanData.todo.map((task, index) => (
                        <div 
                          key={`todo-${task.id}-${index}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task, 'todo')}
                          onDragEnd={handleDragEnd}
                          className={`bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-sm cursor-move hover:shadow-md transition-shadow ${
                            draggedItem?.task.id === task.id ? 'opacity-50' : ''
                          } ${isUpdatingTask === task.id ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <h6 className="text-xs font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                            {task.title}
                          </h6>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 dark:text-gray-400">{task.assignee}</span>
                            <div className="flex items-center gap-1">
                              {isUpdatingTask === task.id && (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                              }`}>
                                {task.priority}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">Task</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!Array.isArray(kanbanData.todo) || kanbanData.todo.length === 0) && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          No tasks in To Do
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div 
                    className={`bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 transition-colors ${
                      dragOverColumn === 'inProgress' ? 'bg-blue-100 dark:bg-blue-800/30 ring-2 ring-blue-400' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, 'inProgress')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'inProgress')}
                  >
                    <h5 className="font-medium text-blue-700 dark:text-blue-300 text-sm mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      In Progress ({Array.isArray(kanbanData.inProgress) ? kanbanData.inProgress.length : 0})
                    </h5>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Array.isArray(kanbanData.inProgress) && kanbanData.inProgress.map((task, index) => (
                        <div 
                          key={`inProgress-${task.id}-${index}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task, 'inProgress')}
                          onDragEnd={handleDragEnd}
                          className={`bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-sm cursor-move hover:shadow-md transition-shadow ${
                            draggedItem?.task.id === task.id ? 'opacity-50' : ''
                          } ${isUpdatingTask === task.id ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <h6 className="text-xs font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                            {task.title}
                          </h6>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 dark:text-gray-400">{task.assignee}</span>
                            <div className="flex items-center gap-1">
                              {isUpdatingTask === task.id && (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                              }`}>
                                {task.priority}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">Task</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!Array.isArray(kanbanData.inProgress) || kanbanData.inProgress.length === 0) && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          No tasks in progress
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Done Column */}
                  <div 
                    className={`bg-green-50 dark:bg-green-900/20 rounded-lg p-4 transition-colors ${
                      dragOverColumn === 'done' ? 'bg-green-100 dark:bg-green-800/30 ring-2 ring-green-400' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, 'done')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'done')}
                  >
                    <h5 className="font-medium text-green-700 dark:text-green-300 text-sm mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Done ({Array.isArray(kanbanData.done) ? kanbanData.done.length : 0})
                    </h5>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Array.isArray(kanbanData.done) && kanbanData.done.map((task, index) => (
                        <div 
                          key={`done-${task.id}-${index}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task, 'done')}
                          onDragEnd={handleDragEnd}
                          className={`bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-sm cursor-move hover:shadow-md transition-shadow ${
                            draggedItem?.task.id === task.id ? 'opacity-50' : ''
                          } ${isUpdatingTask === task.id ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <h6 className="text-xs font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                            {task.title}
                          </h6>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 dark:text-gray-400">{task.assignee}</span>
                            <div className="flex items-center gap-1">
                              {isUpdatingTask === task.id && (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                              }`}>
                                {task.priority}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">Task</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!Array.isArray(kanbanData.done) || kanbanData.done.length === 0) && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          No completed tasks
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

                                          {/* Timeline View */}
              {sprintViewType === 'timeline' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-700 shadow-lg">
                  {/* Timeline Header */}
                  <div className="mb-6 pb-3 border-b-2 border-blue-100 dark:border-blue-800">
                    <h6 className="text-lg font-semibold text-blue-800 dark:text-blue-300 text-center bg-blue-50 dark:bg-blue-900/20 py-3 rounded-md">
                      📅 Interactive Sprint Timeline
                    </h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
                      Drag and zoom to explore the timeline. Click and drag items to reschedule.
                    </p>
                  </div>

                  {/* Timeline Container */}
                  <div 
                    ref={timelineRef} 
                    className="timeline-container border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                    style={{ minHeight: '400px' }}
                  />

                  {/* Timeline Legend */}
                  <div className="mt-4 flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">High Priority</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Medium Priority</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Low Priority</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Calendar View */}
              {sprintViewType === 'calendar' && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 p-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 14 }, (_, i) => {
                      const date = i + 1;
                                             const tasksForDay = [...kanbanData.todo, ...kanbanData.inProgress]
                         .filter((_, taskIndex) => (taskIndex + date) % 7 < 3);
                      
                      return (
                        <div key={date} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-1 min-h-[60px]">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mar {date}
                          </div>
                          <div className="space-y-1">
                            {tasksForDay.slice(0, 2).map((task) => (
                              <div 
                                key={task.id}
                                className={`text-xs px-1 py-0.5 rounded truncate ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                  'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                                }`}
                              >
                                {task.title}
                              </div>
                            ))}
                            {tasksForDay.length > 2 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                +{tasksForDay.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            )}
            
            {/* Team Velocity */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Team Velocity</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Planned Points</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{dashboardData.velocity.planned}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Completed Points</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{dashboardData.velocity.completed}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Average Velocity</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{dashboardData.velocity.average}</p>
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upcoming Meetings
              </h3>
            </div>

            <div className="space-y-3">
              {dashboardData.upcomingMeetings.map((meeting) => (
                <Link 
                  key={meeting.id} 
                  href={`/project/${projectId}/meeting/${meeting.id}`}
                  className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
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
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activities
              </h3>
            </div>

            <div className="space-y-3">
              {dashboardData.recentActivities.map((activity) => (
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

          {/* Alerts and Reminders */}
          {dashboardData.currentSprint && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800 dark:text-orange-300 text-sm">
                  Sprint Ending Soon
                </h4>
                <p className="text-orange-700 dark:text-orange-400 text-xs mt-1">
                    Current sprint ends in {dashboardData.currentSprint.daysLeft} days. Please ensure tasks are completed on time.
                </p>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
