import { tool } from 'ai';
import { actionItemManagementSchema } from '../../schemas/meetings';
import { requestWithAuth, type AuthContext } from '../../utils/http';

export const manageMeetingActionItemsTool = tool({
  description: `Manage meeting action items with CRUD operations.`,
  inputSchema: actionItemManagementSchema,
  execute: async (input, { experimental_context }) => {
    const validated = actionItemManagementSchema.parse(input);
    let meetingId = validated.meeting_id;
    if (!meetingId && validated.meeting_search) {
      const res = await requestWithAuth(`/meetings/?search=${encodeURIComponent(validated.meeting_search)}&limit=5`, { method: 'GET' }, experimental_context as AuthContext);
      const meetings = (res.data as any)?.meetings || (res.data as any) || [];
      if (meetings.length === 0) return `No meetings found matching "${validated.meeting_search}".`;
      if (meetings.length > 1) {
        const meetingList = meetings.slice(0, 5).map((m: any) => `- Meeting #${m.id}: ${m.title} (${new Date(m.start_datetime).toLocaleDateString()})`).join('\n');
        return `Multiple meetings found matching "${validated.meeting_search}". Please specify which one:\n${meetingList}`;
      }
      meetingId = meetings[0].id;
    }
    if (!meetingId) return `Please provide either 'meeting_id' or 'meeting_search' to identify the meeting.`;
    switch (validated.operation) {
      case 'create': {
        if (!validated.title) return `Provide 'title' for creating an action item.`;
        const response = await requestWithAuth('/meeting-action-items/', { method: 'POST', body: JSON.stringify({ meeting_id: meetingId, title: validated.title, due_date: validated.due_date }) }, experimental_context as AuthContext);
        if (response.error) return `Failed to create action item: ${response.error}`;
        const due = validated.due_date ? ` (Due: ${new Date(validated.due_date).toLocaleDateString()})` : '';
        return `Successfully created action item: "${validated.title}"${due}`;
      }
      case 'read': {
        const response = await requestWithAuth(`/meeting-action-items/?meeting_id=${meetingId}`, { method: 'GET' }, experimental_context as AuthContext);
        if (response.error) return `Failed to retrieve action items: ${response.error}`;
        const items = (response.data as any[]) || [];
        if (items.length === 0) return `No action items found for meeting #${meetingId}.`;
        return `Meeting #${meetingId} Action Items (${items.length}):\n${items.map((a: any, i: number) => `${i + 1}. ${a.title} ${a.completed ? '(completed)' : ''}`).join('\n')}`;
      }
      case 'update': {
        if (!validated.action_item_id || !validated.title) return `Provide both 'action_item_id' and 'title' for updating an action item.`;
        const response = await requestWithAuth(`/meeting-action-items/${validated.action_item_id}`, { method: 'PUT', body: JSON.stringify({ title: validated.title, due_date: validated.due_date, completed: validated.completed }) }, experimental_context as AuthContext);
        if (response.error) return `Failed to update action item: ${response.error}`;
        return `Successfully updated action item #${validated.action_item_id} to: "${validated.title}"`;
      }
      case 'delete': {
        if (!validated.action_item_id) return `Provide 'action_item_id' for deleting an action item.`;
        const response = await requestWithAuth(`/meeting-action-items/${validated.action_item_id}`, { method: 'DELETE' }, experimental_context as AuthContext);
        if (response.error) return `Failed to delete action item: ${response.error}`;
        return `Successfully deleted action item #${validated.action_item_id}.`;
      }
      case 'complete': {
        if (!validated.action_item_id) return `Provide 'action_item_id' to complete an action item.`;
        const response = await requestWithAuth(`/meeting-action-items/${validated.action_item_id}`, { method: 'PUT', body: JSON.stringify({ completed: true }) }, experimental_context as AuthContext);
        if (response.error) return `Failed to complete action item: ${response.error}`;
        return `Marked action item #${validated.action_item_id} as completed.`;
      }
      default:
        return `Unknown operation: ${validated.operation}`;
    }
  }
});



