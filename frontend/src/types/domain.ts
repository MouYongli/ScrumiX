// Domain/Business Logic Types - These represent how we work with data in the frontend
import { TaskStatus, TaskPriority, ProjectStatus, MeetingType } from './enums';

// Notification system enums
export enum NotificationType {
  TASK_ASSIGNED = "task_assigned",
  TASK_STATUS_CHANGED = "task_status_changed",
  TASK_DEADLINE_APPROACHING = "task_deadline_approaching",
  MEETING_CREATED = "meeting_created",
  MEETING_REMINDER = "meeting_reminder",
  MEETING_UPDATED = "meeting_updated",
  MEETING_CANCELLED = "meeting_cancelled",
  SPRINT_STARTED = "sprint_started",
  SPRINT_COMPLETED = "sprint_completed",
  SPRINT_UPDATED = "sprint_updated",
  BACKLOG_CREATED = "backlog_created",
  BACKLOG_UPDATED = "backlog_updated",
  BACKLOG_ASSIGNED = "backlog_assigned",
  PROJECT_MEMBER_ADDED = "project_member_added",
  PROJECT_MEMBER_REMOVED = "project_member_removed",
  PROJECT_STATUS_CHANGED = "project_status_changed",
  MENTION = "mention",
  SYSTEM_ANNOUNCEMENT = "system_announcement",
  DEADLINE_APPROACHING = "deadline_approaching"
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
  DISMISSED = "dismissed"
}

export enum DeliveryMethod {
  IN_APP = "in_app",
  EMAIL = "email",
  PUSH = "push"
}

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

// Notification system types
export interface Notification {
  id: number;
  title: string;
  message: string;
  notificationType: NotificationType;
  notification_type?: string; // API uses snake_case
  priority: NotificationPriority;
  actionUrl?: string;
  action_url?: string; // API uses snake_case
  actionText?: string;
  action_text?: string; // API uses snake_case
  expiresAt?: Date;
  expires_at?: Date; // API uses snake_case
  createdById?: number;
  created_by_id?: number; // API uses snake_case
  createdAt: Date;
  created_at?: Date; // API uses snake_case
  updatedAt: Date;
  updated_at?: Date; // API uses snake_case
  
  // Entity relationships
  projectId?: number;
  project_id?: number; // API uses snake_case
  meetingId?: number;
  meeting_id?: number; // API uses snake_case
  backlogItemId?: number;
  backlog_item_id?: number; // API uses snake_case
  sprintId?: number;
  sprint_id?: number; // API uses snake_case
  taskId?: number;
  task_id?: number; // API uses snake_case
  
  // Computed fields
  isExpired: boolean;
  is_expired?: boolean; // API uses snake_case
  entityUrl: string;
  entity_url?: string; // API uses snake_case
}

export interface UserNotification {
  id: number;
  userId: number;
  user_id?: number; // API uses snake_case
  notificationId: number;
  notification_id?: number; // API uses snake_case  
  status: NotificationStatus;
  deliveryMethod: DeliveryMethod;
  readAt?: Date;
  read_at?: Date; // API uses snake_case
  dismissedAt?: Date;
  dismissed_at?: Date; // API uses snake_case
  createdAt: Date;
  created_at?: Date; // API uses snake_case
  notification: Notification;
}

export interface NotificationFeed {
  notifications: UserNotification[];
  total: number;
  unreadCount: number;
  page: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  dismissedCount: number;
  countsByType: Record<string, number>;
  countsByPriority: Record<string, number>;
  recentActivity: Array<{
    id: number;
    title: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
}

export interface NotificationCreateRequest {
  title: string;
  message: string;
  notificationType: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
  recipientUserIds: number[];
  
  // Entity relationships
  projectId?: number;
  meetingId?: number;
  backlogItemId?: number;
  sprintId?: number;
  taskId?: number;
}

export interface NotificationBroadcastRequest {
  title: string;
  message: string;
  notificationType: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
  
  // Targeting
  targetUserIds?: number[];
  projectId?: number;
  
  // Entity context
  meetingId?: number;
  backlogItemId?: number;
  sprintId?: number;
  taskId?: number;
}
