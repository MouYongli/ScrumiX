/**
 * Legacy Scrum schemas - DEPRECATED
 * These schemas have been moved to their appropriate dedicated files.
 * This file provides backward compatibility by re-exporting from the new locations.
 * 
 * @deprecated Use the specific schema files instead:
 * - velocity.ts for velocity and burndown analysis
 * - retrospectives.ts for retrospective analysis  
 * - compliance.ts for compliance checking
 * - meetings.ts for meeting/event scheduling
 */

// Re-export velocity-related schemas from velocity.ts
export {
  getSprintVelocitySchema as legacyVelocityAnalysisSchema, // alias for backward compatibility
  getSprintVelocitySchema as legacyCurrentSprintVelocitySchema, // alias for backward compatibility
  getProjectVelocityMetricsSchema as sprintHealthAnalysisSchema, // alias for backward compatibility
  getProjectVelocityMetricsSchema as sprintMetricsSchema, // alias for backward compatibility
  getProjectVelocityTrendSchema as legacyBurndownAnalysisSchema // alias for backward compatibility
} from './velocity';

// Re-export retrospective schemas from retrospectives.ts
export {
  retrospectiveAnalysisSchema
} from './retrospectives';

// Re-export compliance schemas from compliance.ts
export {
  scrumComplianceCheckSchema as complianceCheckSchema // alias for backward compatibility
} from './compliance';

// Re-export meeting schemas from meetings.ts
export {
  scheduleEventSchema as scrumEventScheduleSchema // alias for backward compatibility
} from './meetings';


