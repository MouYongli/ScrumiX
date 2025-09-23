/**
 * Legacy compatibility layer for scrum-master.ts
 * Re-exports all tools from the new modular structure for backward compatibility
 */

// Re-export all tools from the new modular structure
export {
  // Core tools
  getSprintInfoTool,
  analyzeSprintHealthTool,
  analyzeVelocityTool,
  analyzeBurndownTool,
  analyzeCurrentSprintVelocityTool,
  analyzeRetrospectivesTool,
  checkScrumComplianceTool,
  
  // Meeting tools
  manageMeetingsTool,
  scheduleEventTool,
  manageMeetingAgendaTool,
  manageMeetingActionItemsTool,
  
  // Aggregated collections
  scrumMasterTools,
  scrumMasterCoreTools,
  meetingManagementTools,
  
  // Types
  type ScrumMasterTools,
} from '../index';

// Legacy export for backward compatibility - already exported above
