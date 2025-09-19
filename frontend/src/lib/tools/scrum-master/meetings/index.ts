// Meeting management tools for Scrum Master
import { manageMeetingsTool } from './meetings';
import { scheduleEventTool } from './schedule';
import { manageMeetingAgendaTool } from './agenda';
import { manageMeetingActionItemsTool } from './action-items';

// Export individual tools
export { manageMeetingsTool } from './meetings';
export { scheduleEventTool } from './schedule';
export { manageMeetingAgendaTool } from './agenda';
export { manageMeetingActionItemsTool } from './action-items';

// Aggregate all meeting management tools
export const meetingManagementTools = {
  manageMeetings: manageMeetingsTool,
  scheduleEvent: scheduleEventTool,
  manageMeetingAgenda: manageMeetingAgendaTool,
  manageMeetingActionItems: manageMeetingActionItemsTool,
};

export type MeetingManagementTools = typeof meetingManagementTools;
