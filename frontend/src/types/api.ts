// API Response Types - These should match the backend schema responses exactly
import { TaskStatus, TaskPriority, ProjectStatus, MeetingType, MeetingParticipantRole } from './enums';

export interface ApiUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiTaskAssignee {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

export interface ApiTask {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  sprint_id: number;
  created_at: string;
  updated_at: string;
  // Backend returns assignees as user objects
  assignees: ApiTaskAssignee[];
}

export interface ApiMeeting {
  id: number;
  title: string;
  meetingType: MeetingType;        // camelCase (alias in backend)
  startDatetime: string;           // camelCase (alias in backend)
  description?: string;
  duration: number;
  location?: string;
  sprintId: number;                // camelCase (alias in backend)
  projectId: number;               // camelCase (alias in backend)
  createdAt: string;               // camelCase (alias in backend)
  updatedAt: string;               // camelCase (alias in backend)
  // Note: participants not included in MeetingResponse schema
}

export interface ApiMeetingParticipant {
  id: number;
  meetingId: number;
  userId?: number;                 // Optional for external participants
  role: MeetingParticipantRole;
  externalName?: string;           // For external participants
  externalEmail?: string;          // For external participants
  createdAt: string;
  updatedAt: string;
}

export interface ApiMeetingParticipantWithUser extends ApiMeetingParticipant {
  // User details (will be null for external participants)
  username?: string;
  email?: string;
  fullName?: string;
  // Helper properties
  displayName?: string;            // Computed display name
  displayEmail?: string;           // Computed display email
}

export interface ApiMeetingAgenda {
  agendaId: number;                // camelCase (alias in backend)
  meetingId: number;               // camelCase (alias in backend)
  title: string;
  createdAt: string;               // camelCase (alias in backend)
  updatedAt: string;               // camelCase (alias in backend)
}

export interface ApiMeetingActionItem {
  id: number;                      // Backend field name
  meeting_id: number;              // Backend field name
  title: string;
  due_date?: string;               // Backend field name
  created_at: string;              // Backend field name
  updated_at: string;              // Backend field name
  user: {                          // User who created the action item (matches backend field name)
    id: number;
    username?: string;
    email: string;
    full_name?: string;
  };
}

export interface ApiMeetingNote {
  noteId?: number;                 // camelCase (alias for 'id' in backend) - optional for backend compatibility
  id?: number;                     // Fallback field name in case backend doesn't use alias
  meetingId?: number;              // camelCase (alias for 'meeting_id' in backend)
  meeting_id?: number;             // Fallback field name
  content: string;
  parentNoteId?: number;           // camelCase (alias for 'parent_note_id' in backend)
  parent_note_id?: number;         // Fallback field name
  createdAt?: string;              // camelCase (alias for 'created_at' in backend)
  created_at?: string;             // Fallback field name
  updatedAt?: string;              // camelCase (alias for 'updated_at' in backend)
  updated_at?: string;             // Fallback field name
  user?: {                         // User who created the note
    id: number;
    username?: string;
    full_name?: string;
    email: string;
  };
  childNotes?: ApiMeetingNote[];   // Optional hierarchical children for tree structure
}

export enum ScrumRole {
  SCRUM_MASTER = "scrum_master",
  PRODUCT_OWNER = "product_owner",
  DEVELOPER = "developer"
}

export interface ProjectMember {
  id: number;
  role: ScrumRole;
  user: ApiUser;
}

export interface ProjectMemberResponse {
  id: number;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: ScrumRole;
  joined_at: string;
  is_admin: boolean;
}

export interface ApiProject {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  color?: string;
  last_activity_at: string;
  created_at?: string;
  updated_at?: string;
  // Computed fields from backend (matching ProjectResponse schema)
  progress: number;
  members: number;                           // Count, not array
  tasks: { completed: number; total: number }; // Object structure
  // User relationship data
  user_role?: ScrumRole;              // Current user's role in the project
  project_members?: ProjectMember[];         // List of project members with roles
}

// API Response wrappers
export interface TaskListResponse {
  tasks: ApiTask[];
  total: number;
  page: number;
  pages: number;
}

export interface MeetingListResponse {
  meetings: ApiMeeting[];
  total: number;
  page: number;
  pages: number;
}

export interface MeetingParticipantsResponse {
  meetingId: number;
  participants: ApiMeetingParticipantWithUser[];
  totalCount: number;
}

// Error response
export interface ApiError {
  detail: string;
  status_code?: number;
}

// Sprint API type (matching backend SprintResponse)
export interface ApiSprint {
  id: number;
  sprintName: string;
  sprintGoal?: string;
  startDate: string;
  endDate: string;
  status: string;
  sprintCapacity?: number;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

// Backlog API types
export interface ApiAcceptanceCriteria {
  id: number;
  backlog_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ApiBacklog {
  id: number;
  title: string;
  description: string;
  priority: BacklogPriority;
  status: BacklogStatus;
  story_point: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  sprint_id?: number;
  parent_id?: number;
  item_type: BacklogType;
  level: number;
  path: string;
  root_id: number;
  acceptance_criteria: ApiAcceptanceCriteria[];
  label?: string;
  assigned_to_id?: number;
}

export enum BacklogStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled'
}

export enum BacklogPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum BacklogType {
  EPIC = 'epic',
  STORY = 'story',
  BUG = 'bug',
}

// Documentation API types
export enum DocumentationType {
  SPRINT_REVIEW = "sprint_review",
  SPRINT_RETROSPECTIVE = "sprint_retrospective",
  REQUIREMENT = "requirement",
  DESIGN_ARCHITECTURE = "design_architecture",
  MEETING_REPORT = "meeting_report",
  USER_GUIDE = "user_guide",
  OTHER = "other"
}

export interface ApiTag {
  id: number;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Documentation {
  id: number;
  title: string;
  type: DocumentationType;
  description?: string;
  file_url?: string;
  project_id: number;
  created_at: string;
  updated_at: string;
  authors: Array<{
    id: number;
    full_name: string;
    email: string;
    role: string;
  }>;
}

export interface DocumentationCreate {
  title: string;
  type: DocumentationType;
  description?: string;
  file_url?: string;
  project_id: number;
  author_ids?: number[];
}

export interface DocumentationUpdate {
  title?: string;
  type?: DocumentationType;
  description?: string;
  file_url?: string;
  author_ids?: number[];
}
