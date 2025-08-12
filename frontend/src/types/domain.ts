// Domain/Business Logic Types - These represent how we work with data in the frontend
import { TaskStatus, TaskPriority, ProjectStatus, MeetingType } from './enums';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string; // Computed field
  isActive?: boolean;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoint?: number;
  sprintId: number;
  createdAt: Date;
  updatedAt: Date;
  assignedUsers: User[];
  // UI-specific computed properties
  isOverdue?: boolean;
  daysUntilDue?: number;
  priorityColor?: string;
}

export interface Meeting {
  id: number;
  title: string;
  meetingType: MeetingType;
  startDateTime: Date;
  description?: string;
  duration: number; // in minutes
  location?: string;
  sprintId: number;
  projectId: number;
  createdAt: Date;
  updatedAt: Date;
  participants: User[];
  // UI-specific computed properties
  endDateTime?: Date;
  isUpcoming?: boolean;
  isOngoing?: boolean;
  displayDuration?: string;
  meetingTypeDisplay?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  color?: string;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  progress: number;
  members: User[];
  tasksCompleted: number;
  tasksTotal: number;
  // UI-specific computed properties
  statusDisplay?: string;
  memberCount?: number;
  isActive?: boolean;
  role?: string; // User's role in this project
}

export interface Sprint {
  id: number;
  sprintName: string;
  sprintGoal?: string;
  startDate: Date;
  endDate: Date;
  status: string;
  sprintCapacity?: number;
  projectId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Extended types for UI components
export interface ProjectWithDetails extends Project {
  tasks: Task[];
  upcomingMeetings: Meeting[];
  todoTasks?: Task[];
  inProgressTasks?: Task[];
  doneTasks?: Task[];
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
