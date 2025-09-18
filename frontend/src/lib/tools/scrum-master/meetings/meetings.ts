import { tool } from 'ai';
import { meetingManagementSchema } from '../../schemas/meetings';
import { requestWithAuth, getCurrentProjectContext, getUserTimezoneAndFormatDatetime, type AuthContext } from '../../utils';

export const manageMeetingsTool = tool({
  description: `Comprehensive meeting management with full CRUD operations. Create, read, update, delete, list with filtering.`,
  inputSchema: meetingManagementSchema,
  execute: async (input, { experimental_context }) => {
    const validated = meetingManagementSchema.parse(input);
    let projectId = validated.project_id;
    let projectName = '';
    if (!projectId && ['create', 'list'].includes(validated.operation)) {
      const projectContext = await getCurrentProjectContext(experimental_context);
      if (projectContext) { projectId = projectContext.project_id; projectName = projectContext.project_name; }
    }
    switch (validated.operation) {
      case 'create': {
        if (!validated.title || !validated.start_datetime) return `Please provide both 'title' and 'start_datetime'.`;
        if (!projectId) return `Unable to determine project context. Please provide a project_id.`;
        const tz = await getUserTimezoneAndFormatDatetime(validated.start_datetime, experimental_context as AuthContext);
        const createData = {
          title: validated.title,
          meeting_type: validated.meeting_type || 'other',
          start_datetime: tz.formattedDatetime,
          duration: validated.duration || 60,
          location: validated.location || '',
          description: validated.description || '',
          project_id: projectId,
          sprint_id: (validated as any).sprint_id
        };
        const createResponse = await requestWithAuth('/meetings/', { method: 'POST', body: JSON.stringify(createData) }, experimental_context as AuthContext);
        if (createResponse.error) return `Failed to create meeting: ${createResponse.error}`;
        const createdMeeting = createResponse.data as any;
        return `Successfully created meeting: "${validated.title}"

ID: #${createdMeeting.id} | Type: ${validated.meeting_type || 'other'} | ${tz.displayDateTime}`;
      }
      case 'read': {
        if (!validated.meeting_id) return `Please provide 'meeting_id' for reading meeting details.`;
        const readResponse = await requestWithAuth(`/meetings/${validated.meeting_id}`, { method: 'GET' }, experimental_context as AuthContext);
        if (readResponse.error) return `Failed to retrieve meeting: ${readResponse.error}`;
        const meeting = readResponse.data as any;
        const meetingStartDateTime = meeting.start_datetime || meeting.startDatetime || meeting.startDateTime;
        const meetingTypeFormatted = meeting.meeting_type || meeting.meetingType || 'other';
        const meetingProjectId = meeting.project_id || meeting.projectId;
        const meetingSprintId = meeting.sprint_id || meeting.sprintId;
        const meetingCreatedAt = meeting.created_at || meeting.createdAt;
        const meetingUpdatedAt = meeting.updated_at || meeting.updatedAt;
        const meetingDate = new Date(meetingStartDateTime);
        const participantsResponse = await requestWithAuth(`/meeting-participants/meeting/${validated.meeting_id}`, { method: 'GET' }, experimental_context as AuthContext);
        const participants = (participantsResponse.data as any[]) || [];
        const participantsList = participants.length > 0 
          ? participants.map((p: any) => p.full_name || p.external_name || 'Unknown').join(', ')
          : 'No participants assigned';
        return `# Meeting Details - ${meeting.title}

**Basic Information:**
- **Meeting ID:** #${meeting.id}
- **Type:** ${meetingTypeFormatted}
- **Date & Time:** ${meetingDate.toLocaleString()}
- **Duration:** ${meeting.duration} minutes
- **Location:** ${meeting.location || 'Not specified'}
- **Status:** ${meeting.status || 'Scheduled'}

**Project Information:**
- **Project ID:** ${meetingProjectId}
${meetingSprintId ? `- **Sprint ID:** ${meetingSprintId}` : ''}

**Participants:** ${participantsList}

**Description:**
${meeting.description || 'No description provided'}

**Created:** ${meetingCreatedAt ? new Date(meetingCreatedAt).toLocaleString() : 'Unknown'}
**Last Updated:** ${meetingUpdatedAt ? new Date(meetingUpdatedAt).toLocaleString() : 'Unknown'}`;
      }
      case 'update': {
        if (!validated.meeting_id) return `Please provide 'meeting_id' for updating a meeting.`;
        const updateData: any = {};
        if (validated.title !== undefined) updateData.title = validated.title;
        if (validated.meeting_type !== undefined) updateData.meeting_type = validated.meeting_type;
        if (validated.duration !== undefined) updateData.duration = validated.duration;
        if (validated.location !== undefined) updateData.location = validated.location;
        if (validated.description !== undefined) updateData.description = validated.description;
        if (validated.sprint_id !== undefined) updateData.sprint_id = validated.sprint_id;
        if (validated.start_datetime) {
          const tz = await getUserTimezoneAndFormatDatetime(validated.start_datetime, experimental_context as AuthContext);
          updateData.start_datetime = tz.formattedDatetime;
        }
        if (Object.keys(updateData).length === 0) return `No updates provided. Please specify at least one field to update.`;
        const updateResponse = await requestWithAuth(`/meetings/${validated.meeting_id}`, { method: 'PUT', body: JSON.stringify(updateData) }, experimental_context as AuthContext);
        if (updateResponse.error) return `Failed to update meeting: ${updateResponse.error}`;
        const updatedFields = Object.keys(updateData).join(', ');
        return `Successfully updated meeting #${validated.meeting_id}

**Updated Fields:** ${updatedFields}

The meeting details have been saved and participants will see the updated information.`;
      }
      case 'delete': {
        if (!validated.meeting_id) return `Please provide 'meeting_id' for deleting a meeting.`;
        const meetingToDeleteResponse = await requestWithAuth(`/meetings/${validated.meeting_id}`, { method: 'GET' }, experimental_context as AuthContext);
        if (meetingToDeleteResponse.error) return `Failed to find meeting to delete: ${meetingToDeleteResponse.error}`;
        const meetingToDelete = meetingToDeleteResponse.data as any;
        const deleteStartDateTime = meetingToDelete.start_datetime || meetingToDelete.startDatetime || meetingToDelete.startDateTime;
        const deleteMeetingType = meetingToDelete.meeting_type || meetingToDelete.meetingType || 'other';
        const deleteResponse = await requestWithAuth(`/meetings/${validated.meeting_id}`, { method: 'DELETE' }, experimental_context as AuthContext);
        if (deleteResponse.error) return `Failed to delete meeting: ${deleteResponse.error}`;
        return `Successfully deleted meeting: "${meetingToDelete.title}"

**Deleted Meeting Details:**
- **Meeting ID:** #${validated.meeting_id}
- **Type:** ${deleteMeetingType}
- **Date:** ${new Date(deleteStartDateTime).toLocaleDateString()}

⚠️ **Note:** This action cannot be undone. All associated agenda items, action items, and notes have also been removed.`;
      }
      case 'list': {
        const params = new URLSearchParams();
        if (projectId) params.append('project_id', String(projectId));
        if ((validated as any).search_term) params.append('search', String((validated as any).search_term));
        if ((validated as any).date_from) params.append('date_from', String((validated as any).date_from));
        if ((validated as any).date_to) params.append('date_to', String((validated as any).date_to));
        if (validated.meeting_type) params.append('meeting_type', String(validated.meeting_type));
        if ((validated as any).limit) params.append('limit', String((validated as any).limit));
        const listResponse = await requestWithAuth(`/meetings/?${params.toString()}`, { method: 'GET' }, experimental_context as AuthContext);
        if (listResponse.error) return `Failed to retrieve meetings: ${listResponse.error}`;
        const meetings = (listResponse.data as any)?.meetings || [];
        if (meetings.length === 0) return `No meetings found matching the specified criteria.${projectName ? ` (Project: ${projectName})` : ''}`;
        const meetingsList = meetings.map((m: any, index: number) => {
          const listStartDateTime = m.start_datetime || m.startDatetime || m.startDateTime;
          const listMeetingType = m.meeting_type || m.meetingType || 'other';
          const mDate = new Date(listStartDateTime);
          const typeDisplay = listMeetingType.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          return `${index + 1}. **${m.title}** (ID: #${m.id})
   - **Type:** ${typeDisplay}
   - **Date:** ${mDate.toLocaleDateString()} at ${mDate.toLocaleTimeString()}
   - **Duration:** ${m.duration} minutes
   - **Location:** ${m.location || 'Not specified'}`;
        }).join('\n\n');
        return `# Meetings List${projectName ? ` - ${projectName}` : ''}

Found ${meetings.length} meeting${meetings.length === 1 ? '' : 's'}:

${meetingsList}

**Filters Applied:**
${(validated as any).search_term ? `- Search: "${(validated as any).search_term}"` : ''}
${validated.meeting_type ? `- Type: ${validated.meeting_type}` : ''}
${(validated as any).date_from ? `- From: ${new Date((validated as any).date_from).toLocaleDateString()}` : ''}
${(validated as any).date_to ? `- To: ${new Date((validated as any).date_to).toLocaleDateString()}` : ''}

Use the meeting ID to read, update, or delete specific meetings.`;
      }
      default:
        return `Unknown operation: ${validated.operation}`;
    }
  }
});



