/**
 * Shared helper types for tools utilities
 */

// Authentication context type
export type AuthContext = { cookies?: string } | undefined;

// Generic API response type
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

// Common search parameters
export interface SearchParams {
  query: string;
  limit?: number;
  similarity_threshold?: number;
}

// Project context type
export interface ProjectContext {
  project_id: number;
  project_name: string;
}

// Sprint status types
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

// Backlog item status types  
export type BacklogStatus = 'todo' | 'in_progress' | 'done' | 'archived';

// Priority types
export type Priority = 'low' | 'medium' | 'high' | 'critical';

// Meeting types
export type MeetingType = 'daily_standup' | 'sprint_planning' | 'sprint_review' | 'retrospective' | 'backlog_refinement';

// Documentation types
export type DocumentationType = 'user_guide' | 'api_reference' | 'technical_spec' | 'meeting_notes' | 'requirements' | 'other';

// Velocity data type
export interface VelocityData {
  sprint: any;
  velocityPoints: number;
  completedItems: number;
  totalItems: number;
  totalStoryPoints: number;
}

// Burndown data type
export interface BurndownData {
  dates: string[];
  remaining_points: number[];
  completed_points: number[];
  initial_total_points: number;
  snapshots_with_data: number;
  sprint_duration_days: number;
}

// Trend analysis data type
export interface TrendData {
  velocity: number;
  trend: string;
  is_on_track: boolean;
  projected_completion?: string;
  total_snapshots: number;
}

// Search result type for semantic search
export interface SearchResult<T = any> {
  similarity_score?: number;
  similarity_scores?: Record<string, number>;
  [key: string]: any;
}

// Tool execution context type
export interface ToolContext {
  experimental_context?: AuthContext;
}

// HTTP method types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Date range type
export interface DateRange {
  start_date?: string;
  end_date?: string;
}

// Pagination parameters
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Sort parameters
export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

