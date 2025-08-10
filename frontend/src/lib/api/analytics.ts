// API service for analytics and velocity data

import { fetchApi } from './client';
import type { 
  VelocityData, 
  BurndownData, 
  TeamVelocity 
} from '@/types/api';

export const analyticsService = {
  // Get velocity data for a project
  async getProjectVelocity(projectId: string): Promise<VelocityData[]> {
    return fetchApi<VelocityData[]>(`/projects/${projectId}/analytics/velocity/`);
  },

  // Get velocity data for a specific sprint
  async getSprintVelocity(projectId: string, sprintId: string): Promise<VelocityData> {
    return fetchApi<VelocityData>(`/projects/${projectId}/sprints/${sprintId}/velocity/`);
  },

  // Get burndown data for a sprint
  async getSprintBurndown(projectId: string, sprintId: string): Promise<BurndownData[]> {
    return fetchApi<BurndownData[]>(`/projects/${projectId}/sprints/${sprintId}/burndown/`);
  },

  // Get team velocity statistics
  async getTeamVelocity(projectId: string): Promise<TeamVelocity[]> {
    return fetchApi<TeamVelocity[]>(`/projects/${projectId}/analytics/team-velocity/`);
  },

  // Get project statistics summary
  async getProjectStats(projectId: string): Promise<{
    total_tasks: number;
    completed_tasks: number;
    total_story_points: number;
    completed_story_points: number;
    average_velocity: number;
    active_sprints: number;
    team_members: number;
  }> {
    return fetchApi(`/projects/${projectId}/analytics/stats/`);
  },

  // Get sprint completion trends
  async getSprintTrends(projectId: string, limit: number = 10): Promise<{
    sprint_name: string;
    completion_rate: number;
    planned_points: number;
    completed_points: number;
    end_date: string;
  }[]> {
    return fetchApi(`/projects/${projectId}/analytics/sprint-trends/?limit=${limit}`);
  },

  // Get task completion metrics
  async getTaskMetrics(projectId: string): Promise<{
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    by_assignee: Record<string, number>;
    average_completion_time: number;
    overdue_tasks: number;
  }> {
    return fetchApi(`/projects/${projectId}/analytics/task-metrics/`);
  },

  // Get productivity insights
  async getProductivityInsights(projectId: string): Promise<{
    best_performing_sprint: string;
    most_productive_member: string;
    bottleneck_analysis: {
      status: string;
      average_days: number;
    }[];
    velocity_trend: 'increasing' | 'decreasing' | 'stable';
    recommendations: string[];
  }> {
    return fetchApi(`/projects/${projectId}/analytics/insights/`);
  },

  // Export analytics data
  async exportAnalytics(projectId: string, format: 'csv' | 'json' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/projects/${projectId}/analytics/export/?format=${format}`, {
      headers: {
        'Accept': format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/pdf',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to export analytics data');
    }
    
    return response.blob();
  },
};
