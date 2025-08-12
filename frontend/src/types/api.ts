// API Response Types - These should match the backend schema responses exactly
import { TaskStatus, TaskPriority, ProjectStatus, MeetingType } from './enums';

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

export interface ApiTask {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  story_point?: number;
  sprint_id: number;
  created_at: string;
  updated_at: string;
  // Note: Backend relationships might be populated differently
  assignedUsers?: ApiUser[];
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
