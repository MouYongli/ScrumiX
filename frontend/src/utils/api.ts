import { TaskStatus, TaskPriority, ProjectStatus } from '@/types/enums';
import { 
  ApiUser, ApiTask, ApiMeeting, ApiMeetingAgenda, ApiMeetingNote, ApiMeetingActionItem, ApiProject, ApiSprint, ApiBacklog, ApiAcceptanceCriteria,
  TaskListResponse, MeetingListResponse, ApiError, ScrumRole, ProjectMemberResponse
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
    
    // Handle 204 No Content responses (common for DELETE operations)
    if (response.status === 204) {
      return { data: null as T };
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

// Request deduplication cache
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Deduplicate API calls by reusing in-flight requests
 */
function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  // If there's already a request in flight, return the existing promise
  if (inFlightRequests.has(key)) {
    console.log(`[API] Reusing in-flight request: ${key}`);
    return inFlightRequests.get(key)!;
  }

  // Create new request
  console.log(`[API] Starting new request: ${key}`);
  const promise = requestFn().finally(() => {
    // Remove from cache when request completes
    inFlightRequests.delete(key);
    console.log(`[API] Completed request: ${key}`);
  });

  // Cache the promise
  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Clear the deduplication cache (useful for testing or cleanup)
 */
export function clearApiCache(): void {
  inFlightRequests.clear();
  console.log('[API] Cache cleared');
}

// Clean up cache on page unload to prevent memory leaks
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearApiCache();
  });
}

export const api = {
  auth: {
    getCurrentUser: () => deduplicateRequest('auth:getCurrentUser', () => 
      jsonFetch<ApiUser>('/api/v1/users/me')
    ), // User profile endpoint
    verifyAuth: () => deduplicateRequest('auth:verifyAuth', () => 
      jsonFetch<ApiUser>('/api/v1/auth/me')
    ), // Auth verification endpoint
  },
  
  workspace: {
    getOverview: () => deduplicateRequest('workspace:getOverview', () => 
      jsonFetch<any>('/api/v1/workspace/overview')
    ),
    getProjects: () => deduplicateRequest('workspace:getProjects', () => 
      jsonFetch<ApiProject[]>('/api/v1/workspace/projects')
    ),
    getTasks: () => deduplicateRequest('workspace:getTasks', () => 
      jsonFetch<ApiTask[]>('/api/v1/workspace/tasks')
    ),
    getMeetings: () => deduplicateRequest('workspace:getMeetings', () => 
      jsonFetch<ApiTask[]>('/api/v1/workspace/meetings')
    ),
  },
  
  projects: {
    getCurrentUserProjects: () => deduplicateRequest('projects:getCurrentUserProjects', () => 
      jsonFetch<ApiProject[]>('/api/v1/projects/me')
    ),
    
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
    getMembers: (id: number) => jsonFetch<ProjectMemberResponse[]>(`/api/v1/projects/${id}/members`),
    inviteMember: (id: number, data: { user_id: number; role: string }) => jsonFetch<ProjectMemberResponse>(`/api/v1/projects/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    getAvailableUsers: (id: number) => jsonFetch<any[]>(`/api/v1/projects/${id}/available-users`),
    updateMember: (projectId: number, userId: number, data: { role: string }) => jsonFetch<ProjectMemberResponse>(`/api/v1/projects/${projectId}/members/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    removeMember: (projectId: number, userId: number) => jsonFetch<void>(`/api/v1/projects/${projectId}/members/${userId}`, {
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
    
    getById: (id: number) => jsonFetch<ApiTask>(`/api/v1/tasks/${id}`),
    
    update: (id: number, data: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
    }>) => jsonFetch<ApiTask>(`/api/v1/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    
    updateStatus: (id: number, status: TaskStatus) => 
      jsonFetch<ApiTask>(`/api/v1/tasks/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // No body needed since status is sent as query parameter
      }),
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

    // CRUD operations
    getAll: (params?: { 
      skip?: number; 
      limit?: number;
      meeting_type?: string;
      search?: string;
      upcoming_only?: boolean;
      date_from?: string;
      date_to?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.meeting_type) searchParams.append('meeting_type', params.meeting_type);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.upcoming_only) searchParams.append('upcoming_only', params.upcoming_only.toString());
      if (params?.date_from) searchParams.append('date_from', params.date_from);
      if (params?.date_to) searchParams.append('date_to', params.date_to);
      
      return jsonFetch<MeetingListResponse>(`/api/v1/meetings/?${searchParams.toString()}`);
    },

    getById: (id: number) => jsonFetch<ApiMeeting>(`/api/v1/meetings/${id}`),

    getByProject: (project_id: number) => 
      jsonFetch<ApiMeeting[]>(`/api/v1/projects/${project_id}/meetings`),

    create: (data: {
      title: string;
      meeting_type: string;
      start_datetime: string;
      description?: string;
      duration: number;
      location?: string;
      sprint_id: number;
      project_id: number;
    }) => 
      jsonFetch<ApiMeeting>('/api/v1/meetings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    update: (id: number, data: Partial<{
      title: string;
      meeting_type: string;
      start_datetime: string;
      description?: string;
      duration: number;
      location?: string;
      sprint_id: number;
      project_id: number;
    }>) => 
      jsonFetch<ApiMeeting>(`/api/v1/meetings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    delete: (id: number) => jsonFetch<void>(`/api/v1/meetings/${id}`, {
      method: 'DELETE',
    }),
  },

  meetingAgenda: {
    getByMeeting: (meeting_id: number) => 
      jsonFetch<ApiMeetingAgenda[]>(`/api/v1/meeting-agendas/meeting/${meeting_id}`),
    
    create: (data: { meeting_id: number; title: string }) => 
      jsonFetch<ApiMeetingAgenda>('/api/v1/meeting-agendas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    bulkCreate: (meeting_id: number, agenda_titles: string[]) => 
      jsonFetch<ApiMeetingAgenda[]>(`/api/v1/meeting-agendas/meeting/${meeting_id}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agenda_titles),
      }),
    
    update: (id: number, data: { title: string }) => 
      jsonFetch<ApiMeetingAgenda>(`/api/v1/meeting-agendas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) => jsonFetch<void>(`/api/v1/meeting-agendas/${id}`, {
      method: 'DELETE',
    }),
    
    deleteAllByMeeting: (meeting_id: number) => 
      jsonFetch<void>(`/api/v1/meeting-agendas/meeting/${meeting_id}/all`, {
        method: 'DELETE',
      }),
    
    reorder: (agenda_ids: number[]) => 
      jsonFetch<ApiMeetingAgenda[]>(`/api/v1/meeting-agendas/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agenda_ids }),
      }),
  },

  meetingNotes: {
    getByMeeting: (meeting_id: number) => 
      jsonFetch<ApiMeetingNote[]>(`/api/v1/meeting-notes/meeting/${meeting_id}`),
    
    create: (data: { meeting_id: number; content: string; user_id: number }) => 
      jsonFetch<ApiMeetingNote>('/api/v1/meeting-notes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },

  meetingActionItems: {
    getByMeeting: (meeting_id: number) => 
      jsonFetch<ApiMeetingActionItem[]>(`/api/v1/meeting-action-items/meeting/${meeting_id}`),
    
    create: (data: { meeting_id: number; title: string; due_date?: string }) => 
      jsonFetch<ApiMeetingActionItem>('/api/v1/meeting-action-items/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: { title?: string; due_date?: string }) => 
      jsonFetch<ApiMeetingActionItem>(`/api/v1/meeting-action-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) => jsonFetch<void>(`/api/v1/meeting-action-items/${id}`, {
      method: 'DELETE',
    }),
    
    deleteAllByMeeting: (meeting_id: number) => 
      jsonFetch<void>(`/api/v1/meeting-action-items/meeting/${meeting_id}/all`, {
        method: 'DELETE',
      }),
  },
  
  sprints: {
    getAll: () => jsonFetch<ApiSprint[]>('/api/v1/sprints/'),
    getByProject: (project_id: number) => jsonFetch<ApiSprint[]>(`/api/v1/sprints/?project_id=${project_id}`),
    getById: (id: number) => jsonFetch<ApiSprint>(`/api/v1/sprints/${id}`),
    create: (data: {
      sprint_name: string;
      sprint_goal?: string;
      start_date: string;
      end_date: string;
      status?: string;
      sprint_capacity?: number;
      project_id: number;
    }) => 
      jsonFetch<ApiSprint>('/api/v1/sprints/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: {
      sprint_name?: string;
      sprint_goal?: string;
      start_date?: string;
      end_date?: string;
      status?: string;
      sprint_capacity?: number;
    }) => 
      jsonFetch<ApiSprint>(`/api/v1/sprints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) => jsonFetch<void>(`/api/v1/sprints/${id}`, {
      method: 'DELETE',
    }),
    
    start: (id: number) => jsonFetch<ApiSprint>(`/api/v1/sprints/${id}/start`, {
      method: 'POST',
    }),
    
    close: (id: number) => jsonFetch<ApiSprint>(`/api/v1/sprints/${id}/close`, {
      method: 'POST',
    }),
    
    getByStatus: (status: string, params?: { skip?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      return jsonFetch<ApiSprint[]>(`/api/v1/sprints/status/${status}?${searchParams.toString()}`);
    },
    
    getActive: (params?: { skip?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      return jsonFetch<ApiSprint[]>(`/api/v1/sprints/active/current?${searchParams.toString()}`);
    },
    
    getUpcoming: (days_ahead: number = 30, params?: { skip?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('days_ahead', days_ahead.toString());
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      return jsonFetch<ApiSprint[]>(`/api/v1/sprints/upcoming/scheduled?${searchParams.toString()}`);
    },
    
    getByDateRange: (start_date: Date, end_date: Date, params?: { skip?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('start_date', start_date.toISOString());
      searchParams.append('end_date', end_date.toISOString());
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      return jsonFetch<ApiSprint[]>(`/api/v1/sprints/range/dates?${searchParams.toString()}`);
    },
    
    getStatistics: () => jsonFetch<any>('/api/v1/sprints/statistics/overview'),
    
    // Sprint Backlog Management
    getSprintBacklog: (sprintId: number, params?: { 
      skip?: number; 
      limit?: number;
      include_acceptance_criteria?: boolean;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.include_acceptance_criteria) searchParams.append('include_acceptance_criteria', params.include_acceptance_criteria.toString());
      return jsonFetch<any[]>(`/api/v1/sprints/${sprintId}/backlog?${searchParams.toString()}`);
    },
    
    getAvailableBacklogItems: (sprintId: number, projectId: number, params?: { 
      skip?: number; 
      limit?: number;
      item_type?: string;
      include_acceptance_criteria?: boolean;
    }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('project_id', projectId.toString());
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.item_type) searchParams.append('item_type', params.item_type);
      if (params?.include_acceptance_criteria) searchParams.append('include_acceptance_criteria', params.include_acceptance_criteria.toString());
      return jsonFetch<any[]>(`/api/v1/sprints/${sprintId}/backlog/available?${searchParams.toString()}`);
    },
    
    addBacklogItemToSprint: (sprintId: number, backlogId: number) => 
      jsonFetch<any>(`/api/v1/sprints/${sprintId}/backlog/${backlogId}`, {
        method: 'POST',
      }),
    
    removeBacklogItemFromSprint: (sprintId: number, backlogId: number) => 
      jsonFetch<any>(`/api/v1/sprints/${sprintId}/backlog/${backlogId}`, {
        method: 'DELETE',
      }),
    
    createTaskForBacklogItem: (sprintId: number, backlogId: number, taskData: any) => 
      jsonFetch<any>(`/api/v1/sprints/${sprintId}/backlog/${backlogId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      }),
    
    updateTask: (sprintId: number, taskId: number, taskData: any) => 
      jsonFetch<any>(`/api/v1/sprints/${sprintId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      }),
    
    deleteTask: (sprintId: number, taskId: number) => 
      jsonFetch<any>(`/api/v1/sprints/${sprintId}/tasks/${taskId}`, {
        method: 'DELETE',
      }),
    
    getSprintStatistics: (sprintId: number) => 
      jsonFetch<any>(`/api/v1/sprints/${sprintId}/statistics`),
    
    getProjectUsers: (sprintId: number) => 
      jsonFetch<any>(`/api/v1/sprints/${sprintId}/project-users`),
  },

  backlogs: {
    getAll: (params?: { 
      project_id?: number; 
      include_children?: boolean;
      include_acceptance_criteria?: boolean;
      status?: string;
      item_type?: string;
      search?: string;
      skip?: number;
      limit?: number;
      sprint_id?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.project_id) searchParams.append('project_id', params.project_id.toString());
      if (params?.include_children) searchParams.append('include_children', params.include_children.toString());
      if (params?.include_acceptance_criteria) searchParams.append('include_acceptance_criteria', params.include_acceptance_criteria.toString());
      if (params?.status) searchParams.append('status', params.status);
      if (params?.item_type) searchParams.append('item_type', params.item_type);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.sprint_id) searchParams.append('sprint_id', params.sprint_id.toString());
      
      return jsonFetch<ApiBacklog[]>(`/api/v1/backlogs/?${searchParams.toString()}`);
    },
    
    getById: (id: number) => jsonFetch<ApiBacklog>(`/api/v1/backlogs/${id}`),
    
    getEpics: (project_id: number) => 
      jsonFetch<ApiBacklog[]>(`/api/v1/backlogs/?project_id=${project_id}&item_type=epic`),
    
    create: (data: Omit<ApiBacklog, 'id' | 'created_at' | 'updated_at' | 'level' | 'path' | 'root_id' | 'acceptance_criteria'>) => 
      jsonFetch<ApiBacklog>('/api/v1/backlogs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: Partial<ApiBacklog>) => 
      jsonFetch<ApiBacklog>(`/api/v1/backlogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) => jsonFetch<void>(`/api/v1/backlogs/${id}`, {
      method: 'DELETE',
    }),
  },

  acceptanceCriteria: {
    create: (data: { backlog_id: number; title: string; description?: string }) => 
      jsonFetch<ApiAcceptanceCriteria>('/api/v1/acceptance-criteria/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    bulkCreate: (backlog_id: number, criteria_titles: string[]) => 
      jsonFetch<ApiAcceptanceCriteria[]>(`/api/v1/acceptance-criteria/backlog/${backlog_id}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria_titles),
      }),
    
    deleteAllByBacklogId: (backlog_id: number) => 
      jsonFetch<void>(`/api/v1/acceptance-criteria/backlog/${backlog_id}/all`, {
        method: 'DELETE',
      }),
  },
};
