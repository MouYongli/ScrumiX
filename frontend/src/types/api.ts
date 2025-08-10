// Core API response types that match backend schemas

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ErrorResponse {
  detail: string;
  code?: string;
}

// API Status types matching backend enums
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'planning';
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

// Task types matching backend TaskResponse schema
export interface Task {
  id: number; // backend uses number, frontend string - we'll convert
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  story_point?: number;
  sprint_id?: number;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// Frontend-extended Task interface with additional UI fields
export interface TaskUI extends Omit<Task, 'id'> {
  id: string; // Frontend uses string IDs
  assignees: string[]; // Will be populated from user relationships
  labels: string[]; // Will be populated from tag relationships  
  dueDate?: string; // Additional frontend field
  epic?: string; // Additional frontend field
  sprintId?: string; // Frontend uses string IDs
}

// Project types matching backend ProjectResponse schema
export interface Project {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  color?: string;
  progress: number; // percentage 0-100
  members: number; // member count
  tasks: {
    completed: number;
    total: number;
  };
  last_activity_at: string; // ISO date string
}

// Frontend-extended Project interface
export interface ProjectUI extends Omit<Project, 'id'> {
  id: string; // Frontend uses string IDs
  startDate?: string; // camelCase for frontend
  endDate?: string; // camelCase for frontend
  lastActivity?: string; // camelCase for frontend
}

// Sprint types matching backend SprintResponse schema
export interface Sprint {
  id: number;
  sprintName: string; // matches backend alias
  sprintGoal?: string; // matches backend alias
  startDate: string; // ISO date string, matches backend alias
  endDate: string; // ISO date string, matches backend alias
  status: SprintStatus;
  sprintCapacity?: number; // matches backend alias
  projectId: number; // matches backend alias
  createdAt: string; // ISO date string, matches backend alias
  updatedAt: string; // ISO date string, matches backend alias
}

// Frontend-extended Sprint interface
export interface SprintUI extends Omit<Sprint, 'id' | 'projectId'> {
  id: string; // Frontend uses string IDs
  name: string; // Simplified name field for frontend
  goal?: string; // Simplified goal field for frontend
  startDate: string; // Keep camelCase
  endDate: string; // Keep camelCase
  capacity: number; // Simplified capacity field
  totalStoryPoints: number; // Additional calculated field
  completedStoryPoints: number; // Additional calculated field
  totalStories: number; // Additional calculated field
  completedStories: number; // Additional calculated field
  teamMembers: string[]; // Additional UI field
  createdAt: string; // Keep camelCase
}

// User/Team Member types (prepare for future backend integration)
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'product_owner' | 'scrum_master' | 'developer' | 'designer' | 'tester';
  avatar?: string;
  phone?: string;
  location?: string;
  joinedAt: string;
  isAdmin: boolean;
}

// API Request types for creating/updating
export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  story_point?: number;
  sprint_id?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  story_point?: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  start_date?: string;
  end_date?: string;
  color?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  start_date?: string;
  end_date?: string;
  color?: string;
}

export interface CreateSprintRequest {
  sprintName: string;
  sprintGoal?: string;
  startDate: string;
  endDate: string;
  status?: SprintStatus;
  sprintCapacity?: number;
  projectId: number;
}

export interface UpdateSprintRequest {
  sprintName?: string;
  sprintGoal?: string;
  startDate?: string;
  endDate?: string;
  status?: SprintStatus;
  sprintCapacity?: number;
}

// Backlog types - matching backend BacklogStatus, BacklogType, BacklogPriority
export type BacklogItemStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type BacklogItemType = 'epic' | 'story' | 'task' | 'bug' | 'feature' | 'improvement';
export type BacklogItemPriority = 'critical' | 'high' | 'medium' | 'low';

export interface BacklogItem {
  id: number;
  title: string;
  description?: string;
  status: BacklogItemStatus;
  story_point?: number;
  priority: BacklogItemPriority;
  label?: string;
  item_type: BacklogItemType;
  parent_id?: number;
  root_id?: number;
  level: number;
  path?: string;
  created_at: string;
  updated_at: string;
  created_by_id?: number;
  assigned_to_id?: number;
  project_id: number;
  sprint_id?: number;
  // Populated from relationships
  acceptance_criteria?: { id: number; title: string; description?: string; is_met: boolean }[];
  assignee?: { id: number; username: string; email: string };
  creator?: { id: number; username: string; email: string };
}

export interface BacklogItemUI extends Omit<BacklogItem, 'id' | 'assigned_to_id' | 'parent_id' | 'project_id' | 'created_by_id' | 'root_id'> {
  id: string;
  acceptanceCriteria: string[];
  storyPoints: number;
  createdAt: string;
  lastUpdated: string;
  assignee?: string;
  parentId?: string;
  hierarchyLevel: number;
  type: BacklogItemType; // Frontend convenience field
  labels: string[]; // Frontend convenience field (maps from label)
}

// Documentation types
export interface DocumentationItem {
  id: number;
  title: string;
  content: string;
  type: 'guide' | 'api' | 'tutorial' | 'reference' | 'faq';
  category: string;
  tags: string[];
  author_id: number;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  project_id: number;
}

export interface DocumentationItemUI extends Omit<DocumentationItem, 'id' | 'author_id' | 'project_id'> {
  id: string;
  author: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
}

// Velocity/Analytics types
export interface VelocityData {
  sprint_id: number;
  sprint_name: string;
  planned_points: number;
  completed_points: number;
  completion_rate: number;
  start_date: string;
  end_date: string;
}

export interface BurndownData {
  date: string;
  remaining_points: number;
  ideal_remaining: number;
  completed_points: number;
}

export interface TeamVelocity {
  member_id: number;
  member_name: string;
  average_velocity: number;
  sprints_participated: number;
  total_completed_points: number;
}

// Notification types
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
  user_id: number;
  project_id?: number;
  task_id?: number;
}

export interface NotificationUI extends Omit<Notification, 'id' | 'user_id' | 'project_id' | 'task_id'> {
  id: string;
  isRead: boolean;
  createdAt: string;
  projectId?: string;
  taskId?: string;
}

// Favorites types
export interface Favorite {
  id: number;
  user_id: number;
  project_id?: number;
  task_id?: number;
  backlog_item_id?: number;
  created_at: string;
}

export interface FavoriteItem {
  id: string;
  type: 'project' | 'task' | 'backlog_item';
  title: string;
  description?: string;
  url: string;
  metadata: {
    status?: string;
    assignee?: string;
    priority?: string;
  };
}

// Meeting types
export interface Meeting {
  id: number;
  title: string;
  description: string;
  type: 'daily_standup' | 'sprint_planning' | 'retrospective' | 'review' | 'general';
  start_time: string;
  end_time: string;
  location?: string;
  meeting_url?: string;
  project_id: number;
  organizer_id: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingUI extends Omit<Meeting, 'id' | 'project_id' | 'organizer_id'> {
  id: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string;
  projectId: string;
  organizer: string;
  attendees: string[];
  agenda: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// API Request types for new entities
export interface CreateBacklogItemRequest {
  title: string;
  description?: string;
  status?: BacklogItemStatus;
  story_point?: number;
  priority: BacklogItemPriority;
  label?: string;
  item_type: BacklogItemType;
  parent_id?: number;
  level: number;
  assigned_to_id?: number;
  project_id: number;
  sprint_id?: number;
}

export interface CreateDocumentationRequest {
  title: string;
  content: string;
  type: 'guide' | 'api' | 'tutorial' | 'reference' | 'faq';
  category: string;
  tags: string[];
  is_published: boolean;
  project_id: number;
}

export interface CreateMeetingRequest {
  title: string;
  description: string;
  type: 'daily_standup' | 'sprint_planning' | 'retrospective' | 'review' | 'general';
  start_time: string;
  end_time: string;
  location?: string;
  meeting_url?: string;
  project_id: number;
}
