import { tool } from 'ai';
import { agendaManagementSchema } from '../../schemas/meetings';
import { requestWithAuth, type AuthContext } from '../../utils/http';

export const manageMeetingAgendaTool = tool({
  description: `Manage meeting agenda items with CRUD operations.`,
  inputSchema: agendaManagementSchema,
  execute: async (input, { experimental_context }) => {
    const validated = agendaManagementSchema.parse(input);
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
        if (validated.agenda_items && validated.agenda_items.length > 0) {
          const response = await requestWithAuth(`/meeting-agendas/meeting/${meetingId}/bulk`, { method: 'POST', body: JSON.stringify(validated.agenda_items) }, experimental_context as AuthContext);
          if (response.error) return `Failed to create agenda items: ${response.error}`;
          return `Successfully created ${validated.agenda_items.length} agenda items:\n${validated.agenda_items.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
        }
        if (validated.title) {
          const response = await requestWithAuth('/meeting-agendas/', { method: 'POST', body: JSON.stringify({ meeting_id: meetingId, title: validated.title, order_index: validated.order_index }) }, experimental_context as AuthContext);
          if (response.error) return `Failed to create agenda item: ${response.error}`;
          return `Successfully created agenda item: "${validated.title}"`;
        }
        return `Provide 'title' for single agenda item or 'agenda_items' for bulk creation.`;
      }
      case 'read': {
        const readResponse = await requestWithAuth(`/meeting-agendas/meeting/${meetingId}`, { method: 'GET' }, experimental_context as AuthContext);
        if (readResponse.error) return `Failed to retrieve agenda items: ${readResponse.error}`;
        const agendaItems = (readResponse.data as any[]) || [];
        if (agendaItems.length === 0) return `No agenda items found for meeting #${meetingId}.`;
        return `Meeting #${meetingId} Agenda (${agendaItems.length} items):\n${agendaItems.map((item: any, index: number) => `${index + 1}. ${item.title}`).join('\n')}`;
      }
      case 'update': {
        if (!validated.agenda_id || !validated.title) return `Provide both 'agenda_id' and 'title' for updating an agenda item.`;
        const response = await requestWithAuth(`/meeting-agendas/${validated.agenda_id}`, { method: 'PUT', body: JSON.stringify({ title: validated.title, order_index: validated.order_index }) }, experimental_context as AuthContext);
        if (response.error) return `Failed to update agenda item: ${response.error}`;
        return `Successfully updated agenda item #${validated.agenda_id} to: "${validated.title}"`;
      }
      case 'delete': {
        if (!validated.agenda_id) return `Provide 'agenda_id' for deleting an agenda item.`;
        const response = await requestWithAuth(`/meeting-agendas/${validated.agenda_id}`, { method: 'DELETE' }, experimental_context as AuthContext);
        if (response.error) return `Failed to delete agenda item: ${response.error}`;
        return `Successfully deleted agenda item #${validated.agenda_id}.`;
      }
      case 'reorder': {
        if (!validated.agenda_ids || validated.agenda_ids.length === 0) return `Provide 'agenda_ids' array for reordering agenda items.`;
        const response = await requestWithAuth('/meeting-agendas/reorder', { method: 'POST', body: JSON.stringify({ agenda_ids: validated.agenda_ids }) }, experimental_context as AuthContext);
        if (response.error) return `Failed to reorder agenda items: ${response.error}`;
        return `Successfully reordered ${validated.agenda_ids.length} agenda items.`;
      }
      default:
        return `Unknown operation: ${validated.operation}`;
    }
  }
});



