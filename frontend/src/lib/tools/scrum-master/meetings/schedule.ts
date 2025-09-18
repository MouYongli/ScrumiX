import { tool } from 'ai';
import { scheduleEventSchema } from '../../schemas/meetings';
import { requestWithAuth, getCurrentProjectContext, getUserTimezoneAndFormatDatetime, type AuthContext } from '../../utils';

export const scheduleEventTool = tool({
  description: `Schedule Scrum events including Planning, Daily, Review, Retrospective with timezone handling.`,
  inputSchema: scheduleEventSchema,
  execute: async (input, { experimental_context }) => {
    const validated = scheduleEventSchema.parse(input);
    let projectId = validated.project_id;
    let projectName = '';
    if (!projectId) {
      const projectContext = await getCurrentProjectContext(experimental_context);
      if (!projectContext) return `Unable to determine the current project context. Please provide a project_id.`;
      projectId = projectContext.project_id;
      projectName = projectContext.project_name;
    }
    const tz = await getUserTimezoneAndFormatDatetime(validated.start_datetime, experimental_context);
    const res = await requestWithAuth('/meetings/', { method: 'POST', body: JSON.stringify({
      title: validated.event_type,
      meeting_type: validated.event_type,
      start_datetime: tz.formattedDatetime,
      duration: validated.duration || 60,
      location: validated.location || '',
      description: validated.description || '',
      project_id: projectId,
      sprint_id: (validated as any).sprint_id
    }) }, experimental_context as AuthContext);
    if (res.error) return `Failed to schedule event: ${res.error}`;
    const eventTitle = validated.event_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `Successfully scheduled **${eventTitle}** for project ${projectName || projectId}
- **Date & Time:** ${tz.displayDateTime}
- **Duration:** ${validated.duration || 60} minutes`;
  }
});



