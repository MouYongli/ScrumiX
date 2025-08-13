import { TaskStatus, ProjectStatus } from '@/types/enums';
import { 
  ApiUser, ApiTask, ApiMeeting, ApiProject, ApiSprint,
  TaskListResponse, MeetingListResponse, ApiError, ScrumRole
} from '@/types/api';
import { authenticatedFetch } from '@/utils/auth';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

async function jsonFetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(endpoint, options);
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'An error occurred');
    }
    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      data: null as T,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

export const api = {
  auth: {
    getCurrentUser: () => jsonFetch<ApiUser>('/api/v1/users/me'), // User profile endpoint
    verifyAuth: () => jsonFetch<ApiUser>('/api/v1/auth/me'), // Auth verification endpoint
  },
  
  workspace: {
    getOverview: () => jsonFetch<any>('/api/v1/workspace/overview'),
    getProjects: () => jsonFetch<ApiProject[]>('/api/v1/workspace/projects'),
    getTasks: () => jsonFetch<ApiTask[]>('/api/v1/workspace/tasks'),
    getMeetings: () => jsonFetch<ApiMeeting[]>('/api/v1/workspace/meetings'),
  },
  
  projects: {
    getCurrentUserProjects: () => jsonFetch<ApiProject[]>('/api/v1/projects/me'),
    
    getAll: (params?: { 
      status?: string;
      search?: string;
      skip?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      
      return jsonFetch<ApiProject[]>(`/api/v1/projects/?${searchParams.toString()}`);
    },
    getById: (id: number) => jsonFetch<ApiProject>(`/api/v1/projects/${id}`),
    getByStatus: (status: ProjectStatus) => 
      jsonFetch<ApiProject[]>(`/api/v1/projects/status/${status}`),
    create: (data: {
      name: string;
      description: string;
      status: ProjectStatus;
      start_date: string;
      end_date: string;
      color: string;
      members?: { user_id: number; role: ScrumRole }[];
    }) => jsonFetch<ApiProject>('/api/v1/projects/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<{
      name: string;
      description: string;
      status: ProjectStatus;
      start_date: string;
      end_date: string;
      color: string;
    }>) => jsonFetch<ApiProject>(`/api/v1/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    delete: (id: number) => jsonFetch<void>(`/api/v1/projects/${id}`, {
      method: 'DELETE',
    }),
  },
  
  tasks: {
    getAll: (params?: { 
      status?: TaskStatus;
      search?: string;
      skip?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      
      return jsonFetch<TaskListResponse>(`/api/v1/tasks/?${searchParams.toString()}`);
    },
    
    getByStatus: (status: TaskStatus) => 
      jsonFetch<ApiTask[]>(`/api/v1/tasks/status/${status}`),
      
    getRecent: () => jsonFetch<ApiTask[]>('/api/v1/tasks/recent/list'),
  },
  
  meetings: {
    getUpcoming: (days: number = 7) => 
      jsonFetch<ApiMeeting[]>(`/api/v1/meetings/upcoming?days=${days}`),
      
    getToday: () => jsonFetch<ApiMeeting[]>('/api/v1/meetings/today'),
    
    getOngoing: () => jsonFetch<ApiMeeting[]>('/api/v1/meetings/ongoing'),
    
    getByDateRange: (start_date: Date, end_date: Date) => {
      const params = new URLSearchParams({
        start_date: start_date.toISOString(),
        end_date: end_date.toISOString(),
      });
      return jsonFetch<ApiMeeting[]>(`/api/v1/meetings/range?${params.toString()}`);
    },
  },
  
  sprints: {
    getAll: () => jsonFetch<ApiSprint[]>('/api/v1/sprints/'),
  },
};
