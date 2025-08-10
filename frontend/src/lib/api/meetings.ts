// API service for meetings

import { fetchApi } from './client';
import type { 
  Meeting, 
  MeetingUI, 
  CreateMeetingRequest,
  PaginatedResponse 
} from '@/types/api';

// Transform backend Meeting to frontend MeetingUI
function transformMeeting(meeting: Meeting): MeetingUI {
  return {
    id: meeting.id.toString(),
    title: meeting.title,
    description: meeting.description,
    type: meeting.type,
    startTime: meeting.start_time,
    endTime: meeting.end_time,
    location: meeting.location,
    meetingUrl: meeting.meeting_url,
    projectId: meeting.project_id.toString(),
    organizer: 'Unknown', // Will be populated from user relationships
    attendees: [], // Will be populated from meeting attendees
    agenda: [], // Additional UI field
    notes: '', // Additional UI field
    createdAt: meeting.created_at,
    updatedAt: meeting.updated_at,
  };
}

export const meetingService = {
  // Get all meetings for a project
  async getMeetings(projectId: string): Promise<MeetingUI[]> {
    const response = await fetchApi<Meeting[]>(`/projects/${projectId}/meetings/`);
    return response.map(transformMeeting);
  },

  // Get meetings with pagination
  async getMeetingsPaginated(
    projectId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<PaginatedResponse<MeetingUI>> {
    const response = await fetchApi<PaginatedResponse<Meeting>>(
      `/projects/${projectId}/meetings/?page=${page}&limit=${limit}`
    );
    return {
      ...response,
      items: response.items.map(transformMeeting),
    };
  },

  // Get a specific meeting
  async getMeeting(projectId: string, meetingId: string): Promise<MeetingUI> {
    const response = await fetchApi<Meeting>(`/projects/${projectId}/meetings/${meetingId}/`);
    return transformMeeting(response);
  },

  // Create a new meeting
  async createMeeting(projectId: string, data: Omit<CreateMeetingRequest, 'project_id'>): Promise<MeetingUI> {
    const response = await fetchApi<Meeting>(`/projects/${projectId}/meetings/`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        project_id: parseInt(projectId),
      }),
    });
    return transformMeeting(response);
  },

  // Update a meeting
  async updateMeeting(
    projectId: string, 
    meetingId: string, 
    data: Partial<CreateMeetingRequest>
  ): Promise<MeetingUI> {
    const response = await fetchApi<Meeting>(`/projects/${projectId}/meetings/${meetingId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return transformMeeting(response);
  },

  // Delete a meeting
  async deleteMeeting(projectId: string, meetingId: string): Promise<void> {
    await fetchApi<void>(`/projects/${projectId}/meetings/${meetingId}/`, {
      method: 'DELETE',
    });
  },

  // Get meetings by type
  async getMeetingsByType(projectId: string, type: string): Promise<MeetingUI[]> {
    const response = await fetchApi<Meeting[]>(`/projects/${projectId}/meetings/?type=${type}`);
    return response.map(transformMeeting);
  },

  // Get upcoming meetings
  async getUpcomingMeetings(projectId: string): Promise<MeetingUI[]> {
    const response = await fetchApi<Meeting[]>(`/projects/${projectId}/meetings/?upcoming=true`);
    return response.map(transformMeeting);
  },

  // Get meetings for a date range
  async getMeetingsInDateRange(
    projectId: string, 
    startDate: string, 
    endDate: string
  ): Promise<MeetingUI[]> {
    const response = await fetchApi<Meeting[]>(
      `/projects/${projectId}/meetings/?start_date=${startDate}&end_date=${endDate}`
    );
    return response.map(transformMeeting);
  },

  // Add attendee to meeting
  async addAttendee(projectId: string, meetingId: string, userId: string): Promise<void> {
    await fetchApi(`/projects/${projectId}/meetings/${meetingId}/attendees/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: parseInt(userId) }),
    });
  },

  // Remove attendee from meeting
  async removeAttendee(projectId: string, meetingId: string, userId: string): Promise<void> {
    await fetchApi(`/projects/${projectId}/meetings/${meetingId}/attendees/${userId}/`, {
      method: 'DELETE',
    });
  },

  // Get meeting attendees
  async getMeetingAttendees(projectId: string, meetingId: string): Promise<string[]> {
    const response = await fetchApi<{ user_id: number; name: string }[]>(
      `/projects/${projectId}/meetings/${meetingId}/attendees/`
    );
    return response.map(attendee => attendee.name);
  },

  // Update meeting notes
  async updateMeetingNotes(
    projectId: string, 
    meetingId: string, 
    notes: string
  ): Promise<void> {
    await fetchApi(`/projects/${projectId}/meetings/${meetingId}/notes/`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },
};
