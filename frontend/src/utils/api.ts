import { TaskStatus, TaskPriority, ProjectStatus, MeetingParticipantRole } from '@/types/enums';
import { 
  ApiUser, ApiTask, ApiMeeting, ApiMeetingAgenda, ApiMeetingNote, ApiMeetingActionItem, ApiProject, ApiSprint, ApiBacklog, ApiAcceptanceCriteria,
  TaskListResponse, MeetingListResponse, ApiError, ScrumRole, ProjectMemberResponse, Documentation, DocumentationCreate, DocumentationUpdate,
  ApiMeetingParticipant, ApiMeetingParticipantWithUser, MeetingParticipantsResponse, NotificationPreferencesResponse, NotificationPreferencesUpdate,
  ApiNotificationPreference, DeliveryChannel
} from '@/types/api';

// Personal Notes API types  
export interface PersonalNote {
  id: number;
  user_id: number;
  project_id: number;
  note_date: string; // YYYY-MM-DD format
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalNoteCreate {
  note_date: string; // YYYY-MM-DD format
  content: string;
}

export interface PersonalNoteUpdate {
  content: string;
}
import { authenticatedFetch } from '@/utils/auth';

interface ApiResponse<T> {
  data: T | null;
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
      return { data: null };
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

// Request deduplication cache
const inFlightRequests = new Map<string, Promise<any>>();

// Import notification types
import type { 
  NotificationFeed, 
  NotificationStats, 
  NotificationCreateRequest,
  NotificationBroadcastRequest,
  NotificationType,
  NotificationPriority,
  NotificationStatus
} from '../types/domain';

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
  
  users: {
    getProfile: () => deduplicateRequest('users:getProfile', () => 
      jsonFetch<any>('/api/v1/users/me/profile')
    ),
    updateProfile: (profileData: any) => {
      // Clear cache for profile-related requests after update
      inFlightRequests.delete('users:getProfile');
      inFlightRequests.delete('auth:getCurrentUser');
      inFlightRequests.delete('auth:verifyAuth');
      
      return jsonFetch<any>('/api/v1/users/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
    },
    changePassword: (passwordData: { current_password: string; new_password: string }) => 
      jsonFetch<any>('/api/v1/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData)
      }),
    deleteAccount: () => {
      // Clear all cache entries since user will be deleted
      clearApiCache();
      
      return jsonFetch<{ message: string }>('/api/v1/users/me', {
        method: 'DELETE'
      });
    },
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
    search: (params: {
      query: string;
      entity_types?: string;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('query', params.query);
      if (params.entity_types) searchParams.append('entity_types', params.entity_types);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      
      return jsonFetch<any>(`/api/v1/workspace/search?${searchParams.toString()}`);
    },
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
      creator_role?: ScrumRole;
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
      sprint_id?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.sprint_id) searchParams.append('sprint_id', params.sprint_id.toString());
      
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

  meetingParticipants: {
    // Get all participants for a meeting
    getByMeeting: (meetingId: number) => 
      jsonFetch<MeetingParticipantsResponse>(`/api/v1/meeting-participants/meeting/${meetingId}/participants`),
    
    // Add a single participant
    addParticipant: (meetingId: number, data: {
      userId?: number;
      externalName?: string;
      externalEmail?: string;
      role?: MeetingParticipantRole;
    }) => jsonFetch<ApiMeetingParticipant>(`/api/v1/meeting-participants/meeting/${meetingId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: data.userId,
        external_name: data.externalName,
        external_email: data.externalEmail,
        role: data.role || MeetingParticipantRole.GUEST,
      }),
    }),

    // Add multiple participants
    addMultipleParticipants: (meetingId: number, participants: Array<{
      userId?: number;
      externalName?: string;
      externalEmail?: string;
      role?: MeetingParticipantRole;
    }>) => jsonFetch<ApiMeetingParticipant[]>(`/api/v1/meeting-participants/meeting/${meetingId}/participants/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participants: participants.map(p => ({
          user_id: p.userId,
          external_name: p.externalName,
          external_email: p.externalEmail,
          role: p.role || MeetingParticipantRole.GUEST,
        }))
      }),
    }),

    // Update participant role
    updateParticipantRole: (meetingId: number, participantId: number, role: MeetingParticipantRole) => 
      jsonFetch<ApiMeetingParticipant>(`/api/v1/meeting-participants/meeting/${meetingId}/participants/${participantId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      }),

    // Remove participant by participant ID
    removeParticipant: (meetingId: number, participantId: number) => 
      jsonFetch<{ message: string }>(`/api/v1/meeting-participants/meeting/${meetingId}/participants/${participantId}`, {
        method: 'DELETE',
      }),

    // Remove participant by user ID
    removeParticipantByUser: (meetingId: number, userId: number) => 
      jsonFetch<{ message: string }>(`/api/v1/meeting-participants/meeting/${meetingId}/participants/user/${userId}`, {
        method: 'DELETE',
      }),

    // Remove all participants from meeting
    removeAllParticipants: (meetingId: number) => 
      jsonFetch<{ message: string }>(`/api/v1/meeting-participants/meeting/${meetingId}/participants`, {
        method: 'DELETE',
      }),

    // Get participants count
    getParticipantsCount: (meetingId: number) => 
      jsonFetch<{ meeting_id: number; participants_count: number }>(`/api/v1/meeting-participants/meeting/${meetingId}/participants/count`),

    // Check if user is participant
    checkUserParticipation: (meetingId: number, userId: number) => 
      jsonFetch<{ user_id: number; meeting_id: number; is_participant: boolean; role?: string }>(`/api/v1/meeting-participants/meeting/${meetingId}/participants/check/${userId}`),

    // Get user's meetings
    getUserMeetings: (userId: number, params?: { skip?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      
      return jsonFetch<any[]>(`/api/v1/meeting-participants/user/${userId}/meetings?${searchParams.toString()}`);
    },
  },

  meetingAgenda: {
    getByMeeting: (meeting_id: number) => 
      jsonFetch<ApiMeetingAgenda[]>(`/api/v1/meeting-agendas/meeting/${meeting_id}`),
    
    create: (data: { meeting_id: number; title: string; order_index?: number }) => 
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
    
    update: (id: number, data: { title?: string; order_index?: number }) => 
      jsonFetch<ApiMeetingAgenda>(`/api/v1/meeting-agendas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    updateOrder: (id: number, new_order_index: number) => 
      jsonFetch<ApiMeetingAgenda>(`/api/v1/meeting-agendas/${id}/order?new_order_index=${new_order_index}`, {
        method: 'PUT',
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
    // Get notes by meeting ID with optional filters
    getByMeeting: (meeting_id: number, top_level_only = false, skip = 0, limit = 100) => 
      jsonFetch<ApiMeetingNote[]>(`/api/v1/meeting-notes/meeting/${meeting_id}?top_level_only=${top_level_only}&skip=${skip}&limit=${limit}`),
    
    // Get hierarchical note tree for a meeting
    getTreeByMeeting: (meeting_id: number) => 
      jsonFetch<{notes: ApiMeetingNote[], total: number, topLevelCount: number}>(`/api/v1/meeting-notes/meeting/${meeting_id}/tree`),
    
    // Create a new note
    create: (data: { meeting_id: number; content: string; parent_note_id?: number }) => 
      jsonFetch<ApiMeetingNote>('/api/v1/meeting-notes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    // Get a specific note by ID
    getById: (note_id: number) => 
      jsonFetch<ApiMeetingNote>(`/api/v1/meeting-notes/${note_id}`),
    
    // Update a note
    update: (note_id: number, data: { content: string }) => 
      jsonFetch<ApiMeetingNote>(`/api/v1/meeting-notes/${note_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    // Delete a note
    delete: (note_id: number) => 
      jsonFetch<void>(`/api/v1/meeting-notes/${note_id}`, {
        method: 'DELETE',
      }),
    
    // Create a reply to a note
    createReply: (note_id: number, content: string) => 
      jsonFetch<ApiMeetingNote>(`/api/v1/meeting-notes/${note_id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }),
    
    // Get children of a specific note
    getChildren: (note_id: number, skip = 0, limit = 100) => 
      jsonFetch<ApiMeetingNote[]>(`/api/v1/meeting-notes/${note_id}/children?skip=${skip}&limit=${limit}`),
    
    // Get the full thread of a note
    getThread: (note_id: number) => 
      jsonFetch<ApiMeetingNote[]>(`/api/v1/meeting-notes/${note_id}/thread`),
    
    // Delete all notes for a meeting
    deleteAllByMeeting: (meeting_id: number) => 
      jsonFetch<{message: string}>(`/api/v1/meeting-notes/meeting/${meeting_id}/all`, {
        method: 'DELETE',
      }),
    
    // Count notes for a meeting
    countByMeeting: (meeting_id: number, top_level_only = false) => 
      jsonFetch<{meeting_id: number, count: number, top_level_only: boolean}>(`/api/v1/meeting-notes/meeting/${meeting_id}/count?top_level_only=${top_level_only}`),
    
    // Search notes
    search: (query: string, meeting_id?: number, skip = 0, limit = 100) => {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        ...(meeting_id && { meeting_id: meeting_id.toString() })
      });
      return jsonFetch<ApiMeetingNote[]>(`/api/v1/meeting-notes/search/${encodeURIComponent(query)}?${params}`);
    },
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
    
    updateBacklogItemStatus: (sprintId: number, backlogId: number, status: string) => 
      jsonFetch<any>(`/api/v1/sprints/${sprintId}/backlog/${backlogId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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

  velocity: {
    // Sprint-level endpoints
    getSprintVelocity: (sprintId: number) => 
      jsonFetch<{
        sprint_id: number;
        velocity_points: number;
      }>(`/api/v1/velocity/sprint/${sprintId}/velocity`),

    getSprintBurndownChart: (sprintId: number, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      return jsonFetch<{
        dates: string[];
        remaining_points: number[];
        completed_points: number[];
        total_points: number[];
        sprint_duration_days: number;
        snapshots_with_data: number;
        initial_total_points: number;
      }>(`/api/v1/velocity/sprint/${sprintId}/burndown${queryString}`);
    },

    getSprintBurndownSnapshots: (sprintId: number, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      return jsonFetch<Array<{
        id: number;
        sprint_id: number;
        project_id: number;
        date: string;
        completed_story_point: number;
        remaining_story_point: number;
        created_at: string;
        updated_at: string;
      }>>(`/api/v1/velocity/sprint/${sprintId}/burndown/snapshots${queryString}`);
    },

    getSprintBurndownTrend: (sprintId: number) => 
      jsonFetch<{
        total_snapshots: number;
        trend: string;
        velocity: number;
        projected_completion: string | null;
        is_on_track: boolean;
        current_remaining: number;
        current_completed: number;
      }>(`/api/v1/velocity/sprint/${sprintId}/burndown/trend`),

    backfillSprintBurndownSnapshots: (sprintId: number, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      return jsonFetch<{
        message: string;
        snapshots_created: number;
      }>(`/api/v1/velocity/sprint/${sprintId}/burndown/backfill${queryString}`, {
        method: 'POST'
      });
    },

    // Project-level endpoints
    getProjectAverageVelocity: (projectId: number, excludeSprintId?: number) => {
      const params = new URLSearchParams();
      if (excludeSprintId) params.append('exclude_sprint_id', excludeSprintId.toString());
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      return jsonFetch<{
        project_id: number;
        average_velocity: number;
      }>(`/api/v1/velocity/project/${projectId}/velocity/average${queryString}`);
    },

    getProjectVelocityTrend: (projectId: number, limit: number = 5) => 
      jsonFetch<{
        project_id: number;
        velocity_trend: Array<{
          sprint_id: number;
          sprint_name: string;
          velocity_points: number;
          end_date: string | null;
        }>;
      }>(`/api/v1/velocity/project/${projectId}/velocity/trend?limit=${limit}`),

    getProjectVelocityMetrics: (projectId: number) => 
      jsonFetch<{
        project_id: number;
        total_completed_sprints: number;
        average_velocity: number;
        min_velocity: number;
        max_velocity: number;
        velocity_trend: Array<{
          sprint_id: number;
          sprint_name: string;
          velocity_points: number;
          end_date: string | null;
        }>;
        total_story_points: number;
      }>(`/api/v1/velocity/project/${projectId}/velocity/metrics`),

    getProjectBurndownSummary: (projectId: number, days: number = 30) => 
      jsonFetch<{
        total_snapshots: number;
        active_sprints: number;
        total_story_points: number;
        completed_story_points: number;
        remaining_story_points: number;
        completion_percentage: number;
      }>(`/api/v1/velocity/project/${projectId}/burndown/summary?days=${days}`),

    getProjectBurndownSnapshots: (projectId: number, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      return jsonFetch<Array<{
        id: number;
        sprint_id: number;
        project_id: number;
        date: string;
        completed_story_point: number;
        remaining_story_point: number;
        created_at: string;
        updated_at: string;
      }>>(`/api/v1/velocity/project/${projectId}/burndown/snapshots${queryString}`);
    },

    // Health check
    healthCheck: () => 
      jsonFetch<{
        status: string;
        service: string;
      }>('/api/v1/velocity/health'),
  },

  backlogs: {
    getAll: (params?: { 
      status?: string;
      priority?: string;
      item_type?: string;
      project_id?: number;
      sprint_id?: number;
      assigned_to_id?: number;
      search?: string;
      include_children?: boolean;
      include_acceptance_criteria?: boolean;
      skip?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.priority) searchParams.append('priority', params.priority);
      if (params?.item_type) searchParams.append('item_type', params.item_type);
      if (params?.project_id) searchParams.append('project_id', params.project_id.toString());
      if (params?.sprint_id) searchParams.append('sprint_id', params.sprint_id.toString());
      if (params?.assigned_to_id) searchParams.append('assigned_to_id', params.assigned_to_id.toString());
      if (params?.search) searchParams.append('search', params.search);
      if (params?.include_children) searchParams.append('include_children', params.include_children.toString());
      if (params?.include_acceptance_criteria) searchParams.append('include_acceptance_criteria', params.include_acceptance_criteria.toString());
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      
      return jsonFetch<ApiBacklog[]>(`/api/v1/backlogs/?${searchParams.toString()}`);
    },
    
    getById: (id: number) => jsonFetch<ApiBacklog>(`/api/v1/backlogs/${id}`),
    
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
    
    updateStatus: (id: number, status: string) => 
      jsonFetch<ApiBacklog>(`/api/v1/backlogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    
    delete: (id: number) => jsonFetch<void>(`/api/v1/backlogs/${id}`, {
      method: 'DELETE',
    }),
    
    getEpics: (projectId: number) => 
      jsonFetch<ApiBacklog[]>(`/api/v1/backlogs/?project_id=${projectId}&item_type=epic&include_children=true`),
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

// Documentation API
export const documentationApi = {
  // Get all documentation with optional filters
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    docType?: string;
    search?: string;
    projectId?: number;
  }): Promise<ApiResponse<Documentation[]>> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
      if (params?.docType) searchParams.append('doc_type', params.docType);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.projectId) searchParams.append('project_id', params.projectId.toString());

      const response = await authenticatedFetch(`/api/v1/documentations/?${searchParams.toString()}`);

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'An error occurred');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Get documentation by project ID
  getByProject: async (projectId: number, params?: {
    skip?: number;
    limit?: number;
    docType?: string;
    search?: string;
  }): Promise<ApiResponse<Documentation[]>> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
      if (params?.docType) searchParams.append('doc_type', params.docType);
      if (params?.search) searchParams.append('search', params.search);

      const response = await authenticatedFetch(`/api/v1/documentations/project/${projectId}?${searchParams.toString()}`);

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'An error occurred');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Get documentation by ID
  getById: async (id: number): Promise<ApiResponse<Documentation>> => {
    try {
      const response = await authenticatedFetch(`/api/v1/documentations/${id}`);

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'An error occurred');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Create new documentation
  create: async (documentation: DocumentationCreate): Promise<ApiResponse<Documentation>> => {
    try {
      const response = await authenticatedFetch('/api/v1/documentations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentation),
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Update documentation
  update: async (id: number, documentation: DocumentationUpdate): Promise<ApiResponse<Documentation>> => {
    try {
      const response = await authenticatedFetch(`/api/v1/documentations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentation),
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Delete documentation
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await authenticatedFetch(`/api/v1/documentations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Get documentation statistics
  getStatistics: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await authenticatedFetch('/api/v1/documentations/statistics/overview');

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  getProjectUsers: async (projectId: number): Promise<ApiResponse<Array<{
    id: number;
    full_name: string;
    email: string;
    username?: string;
  }>>> => {
    try {
      const response = await authenticatedFetch(`/api/v1/documentations/project/${projectId}/users`);

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'An error occurred');
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch project users' };
    }
  },

  notifications: {
    // Get notification feed with pagination and filtering
    getFeed: (params?: {
      skip?: number;
      limit?: number;
      notificationTypes?: NotificationType[];
      priorities?: NotificationPriority[];
      statuses?: NotificationStatus[];
      projectId?: number;
      includeExpired?: boolean;
      daysBack?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.notificationTypes) {
        params.notificationTypes.forEach(type => searchParams.append('notification_types', type));
      }
      if (params?.priorities) {
        params.priorities.forEach(priority => searchParams.append('priorities', priority));
      }
      if (params?.statuses) {
        params.statuses.forEach(status => searchParams.append('statuses', status));
      }
      if (params?.projectId) searchParams.append('project_id', params.projectId.toString());
      if (params?.includeExpired) searchParams.append('include_expired', params.includeExpired.toString());
      if (params?.daysBack) searchParams.append('days_back', params.daysBack.toString());
      
      return jsonFetch<NotificationFeed>(`/api/v1/notifications/feed?${searchParams.toString()}`);
    },

    // Get unread notification count
    getUnreadCount: () => deduplicateRequest('notifications:unreadCount', () => 
      jsonFetch<{ unread_count: number }>('/api/v1/notifications/unread-count')
    ),

    // Get notification statistics
    getStats: () => deduplicateRequest('notifications:stats', () => 
      jsonFetch<NotificationStats>('/api/v1/notifications/stats')
    ),

    // Mark notification as read
    markAsRead: (notificationId: number) => {
      // Clear unread count cache after marking as read
      inFlightRequests.delete('notifications:unreadCount');
      inFlightRequests.delete('notifications:stats');
      
      return jsonFetch<{ message: string }>(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
    },

    // Dismiss notification
    dismiss: (notificationId: number) => {
      // Clear caches after dismissing
      inFlightRequests.delete('notifications:unreadCount');
      inFlightRequests.delete('notifications:stats');
      
      return jsonFetch<{ message: string }>(`/api/v1/notifications/${notificationId}/dismiss`, {
        method: 'PUT'
      });
    },

    // Mark all notifications as read
    markAllAsRead: () => {
      // Clear caches after bulk operation
      inFlightRequests.delete('notifications:unreadCount');
      inFlightRequests.delete('notifications:stats');
      
      return jsonFetch<{ message: string }>('/api/v1/notifications/mark-all-read', {
        method: 'PUT'
      });
    },

    // Bulk update notification status
    bulkUpdate: (data: {
      notificationIds: number[];
      status: NotificationStatus;
      userId: number;
    }) => {
      // Clear caches after bulk operation
      inFlightRequests.delete('notifications:unreadCount');
      inFlightRequests.delete('notifications:stats');
      
      return jsonFetch<{ message: string }>('/api/v1/notifications/bulk-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_ids: data.notificationIds,
          status: data.status,
          user_id: data.userId
        })
      });
    },

    // Create notification
    create: (data: NotificationCreateRequest) => {
      // Clear caches after creating notification
      inFlightRequests.delete('notifications:unreadCount');
      inFlightRequests.delete('notifications:stats');
      
      return jsonFetch<any>('/api/v1/notifications/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          notification_type: data.notificationType,
          priority: data.priority,
          action_url: data.actionUrl,
          action_text: data.actionText,
          expires_at: data.expiresAt?.toISOString(),
          recipient_user_ids: data.recipientUserIds,
          project_id: data.projectId,
          meeting_id: data.meetingId,
          backlog_item_id: data.backlogItemId,
          sprint_id: data.sprintId,
          task_id: data.taskId
        })
      });
    },

    // Broadcast notification
    broadcast: (data: NotificationBroadcastRequest) => {
      // Clear caches after broadcasting
      inFlightRequests.delete('notifications:unreadCount');
      inFlightRequests.delete('notifications:stats');
      
      return jsonFetch<any>('/api/v1/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          notification_type: data.notificationType,
          priority: data.priority,
          action_url: data.actionUrl,
          action_text: data.actionText,
          expires_at: data.expiresAt?.toISOString(),
          target_user_ids: data.targetUserIds,
          project_id: data.projectId,
          meeting_id: data.meetingId,
          backlog_item_id: data.backlogItemId,
          sprint_id: data.sprintId,
          task_id: data.taskId
        })
      });
    }
  },

  notificationPreferences: {
    // Get user's notification preferences
    get: (deliveryChannel: string = 'in_app') => deduplicateRequest(
      `notificationPreferences:get:${deliveryChannel}`,
      () => jsonFetch<import('../types/api').NotificationPreferencesResponse>(`/api/v1/notification-preferences/?delivery_channel=${deliveryChannel}`)
    ),

    // Update user's notification preferences
    update: (data: import('../types/api').NotificationPreferencesUpdate) => {
      // Clear cache after update
      inFlightRequests.delete(`notificationPreferences:get:${data.delivery_channel || 'in_app'}`);
      
      return jsonFetch<import('../types/api').NotificationPreferencesResponse>('/api/v1/notification-preferences/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },

    // Get detailed notification preferences
    getAll: (deliveryChannel: string = 'in_app') => deduplicateRequest(
      `notificationPreferences:getAll:${deliveryChannel}`,
      () => jsonFetch<import('../types/api').ApiNotificationPreference[]>(`/api/v1/notification-preferences/all?delivery_channel=${deliveryChannel}`)
    ),

    // Initialize default preferences
    initialize: (deliveryChannel: string = 'in_app') => {
      // Clear cache after initialization
      inFlightRequests.delete(`notificationPreferences:get:${deliveryChannel}`);
      
      return jsonFetch<import('../types/api').NotificationPreferencesResponse>(`/api/v1/notification-preferences/initialize?delivery_channel=${deliveryChannel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  personalNotes: {
    // Get personal notes for a project
    getByProject: (projectId: number, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      return deduplicateRequest(
        `personalNotes:getByProject:${projectId}:${queryString}`,
        () => jsonFetch<PersonalNote[]>(`/api/v1/projects/${projectId}/personal-notes${queryString}`)
      );
    },

    // Create a personal note
    create: (projectId: number, noteData: PersonalNoteCreate) => {
      // Clear cache after creation
      inFlightRequests.delete(`personalNotes:getByProject:${projectId}:`);
      
      return jsonFetch<PersonalNote>(`/api/v1/projects/${projectId}/personal-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
    },

    // Update a personal note
    update: (projectId: number, noteDate: string, noteData: PersonalNoteUpdate) => {
      // Clear cache after update
      inFlightRequests.delete(`personalNotes:getByProject:${projectId}:`);
      
      return jsonFetch<PersonalNote>(`/api/v1/projects/${projectId}/personal-notes/${noteDate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
    },

    // Delete a personal note
    delete: (projectId: number, noteDate: string) => {
      // Clear cache after deletion
      inFlightRequests.delete(`personalNotes:getByProject:${projectId}:`);
      
      return jsonFetch<{ message: string }>(`/api/v1/projects/${projectId}/personal-notes/${noteDate}`, {
        method: 'DELETE'
      });
    }
  },
};

// Export personal notes API separately to ensure it's available
export const personalNotesApi = {
  // Get personal notes for a project
  getByProject: (projectId: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    return deduplicateRequest(
      `personalNotes:getByProject:${projectId}:${queryString}`,
      () => jsonFetch<PersonalNote[]>(`/api/v1/projects/${projectId}/personal-notes${queryString}`)
    );
  },

  // Create a personal note
  create: (projectId: number, noteData: PersonalNoteCreate) => {
    // Clear cache after creation
    inFlightRequests.delete(`personalNotes:getByProject:${projectId}:`);
    
    return jsonFetch<PersonalNote>(`/api/v1/projects/${projectId}/personal-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  },

  // Update a personal note
  update: (projectId: number, noteDate: string, noteData: PersonalNoteUpdate) => {
    // Clear cache after update
    inFlightRequests.delete(`personalNotes:getByProject:${projectId}:`);
    
    return jsonFetch<PersonalNote>(`/api/v1/projects/${projectId}/personal-notes/${noteDate}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  },

  // Delete a personal note
  delete: (projectId: number, noteDate: string) => {
    // Clear cache after deletion
    inFlightRequests.delete(`personalNotes:getByProject:${projectId}:`);
    
    return jsonFetch<{ message: string }>(`/api/v1/projects/${projectId}/personal-notes/${noteDate}`, {
      method: 'DELETE'
    });
  }
};

// Export notification preferences separately to ensure it's available
export const notificationPreferences = {
  // Get user's notification preferences
  get: (deliveryChannel: string = 'in_app') => deduplicateRequest(
    `notificationPreferences:get:${deliveryChannel}`,
    () => jsonFetch<import('../types/api').NotificationPreferencesResponse>(`/api/v1/notification-preferences/?delivery_channel=${deliveryChannel}`)
  ),

  // Update user's notification preferences
  update: (data: import('../types/api').NotificationPreferencesUpdate) => {
    // Clear cache after update
    inFlightRequests.delete(`notificationPreferences:get:${data.delivery_channel || 'in_app'}`);
    
    return jsonFetch<import('../types/api').NotificationPreferencesResponse>('/api/v1/notification-preferences/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Get detailed notification preferences
  getAll: (deliveryChannel: string = 'in_app') => deduplicateRequest(
    `notificationPreferences:getAll:${deliveryChannel}`,
    () => jsonFetch<import('../types/api').ApiNotificationPreference[]>(`/api/v1/notification-preferences/all?delivery_channel=${deliveryChannel}`)
  ),

  // Initialize default preferences
  initialize: (deliveryChannel: string = 'in_app') => {
    // Clear cache after initialization
    inFlightRequests.delete(`notificationPreferences:get:${deliveryChannel}`);
    
    return jsonFetch<import('../types/api').NotificationPreferencesResponse>(`/api/v1/notification-preferences/initialize?delivery_channel=${deliveryChannel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
