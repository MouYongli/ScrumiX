// Import core scrum tools
import { scrumMasterCoreTools } from './core';
import { 
  manageMeetingsTool,
  scheduleEventTool,
  manageMeetingAgendaTool,
  manageMeetingActionItemsTool
} from './meetings';
import { 
  documentationTools,
  createDocumentationTool,
  getDocumentationTool,
  getDocumentationByIdTool,
  updateDocumentationTool,
  deleteDocumentationTool,
  getCurrentUserTool,
  getProjectUsersTool,
  searchDocumentationByFieldTool,
  searchDocumentationMultiFieldTool
} from '../utils/documentation';

// Create meeting management tools aggregate
const meetingManagementTools = {
  manageMeetings: manageMeetingsTool,
  scheduleEvent: scheduleEventTool,
  manageMeetingAgenda: manageMeetingAgendaTool,
  manageMeetingActionItems: manageMeetingActionItemsTool,
};

// Export individual tools for direct access
export { scrumMasterCoreTools } from './core';
export { meetingManagementTools };
export { documentationTools };

// Export individual tools
export { getSprintInfoTool, analyzeSprintHealthTool } from './core/sprints';
export { analyzeVelocityTool, analyzeCurrentSprintVelocityTool } from './core/velocity';
export { analyzeBurndownTool } from './core/burndown';
export { analyzeRetrospectivesTool } from './core/retrospectives';
export { checkScrumComplianceTool } from './core/compliance';
export { manageMeetingsTool } from './meetings/meetings';
export { scheduleEventTool } from './meetings/schedule';
export { manageMeetingAgendaTool } from './meetings/agenda';
export { manageMeetingActionItemsTool } from './meetings/action-items';


// Aggregate all scrum master tools including documentation tools
export const scrumMasterTools = {
  // Core scrum analysis tools
  ...scrumMasterCoreTools,
  
  // Meeting management tools
  ...meetingManagementTools,
  
  // Shared documentation tools - available to ALL agents (explicitly defined)
  createDocumentation: createDocumentationTool,
  getDocumentation: getDocumentationTool,
  getDocumentationById: getDocumentationByIdTool,
  updateDocumentation: updateDocumentationTool,
  deleteDocumentation: deleteDocumentationTool,
  getCurrentUser: getCurrentUserTool,
  getProjectUsers: getProjectUsersTool,
  searchDocumentationByField: searchDocumentationByFieldTool,
  searchDocumentationMultiField: searchDocumentationMultiFieldTool,
};

export type ScrumMasterTools = typeof scrumMasterTools;


