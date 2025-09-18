// Core Scrum Master tools for sprint analysis and team coaching
export { getSprintInfoTool, analyzeSprintHealthTool } from './sprints';
export { analyzeVelocityTool, analyzeCurrentSprintVelocityTool } from './velocity';
export { analyzeBurndownTool } from './burndown';
export { analyzeRetrospectivesTool } from './retrospectives';
export { checkScrumComplianceTool } from './compliance';

// Aggregate all core scrum master tools
export const scrumMasterCoreTools = {
  getSprintInfo: getSprintInfoTool,
  analyzeSprintHealth: analyzeSprintHealthTool,
  analyzeVelocity: analyzeVelocityTool,
  analyzeBurndown: analyzeBurndownTool,
  analyzeCurrentSprintVelocity: analyzeCurrentSprintVelocityTool,
  analyzeRetrospectives: analyzeRetrospectivesTool,
  checkScrumCompliance: checkScrumComplianceTool,
};

export type ScrumMasterCoreTools = typeof scrumMasterCoreTools;
