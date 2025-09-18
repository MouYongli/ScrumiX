import { z } from 'zod';

/**
 * Schema for Scrum compliance checking
 * Analyzes project adherence to Scrum practices and ceremonies
 */
export const scrumComplianceCheckSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to check Scrum compliance for'),
  
  check_period_days: z.number()
    .int('Check period must be a whole number')
    .min(7, 'Check period must be at least 7 days')
    .max(90, 'Check period cannot exceed 90 days')
    .default(30)
    .describe('Number of days to analyze for compliance patterns'),
  
  include_recommendations: z.boolean()
    .default(true)
    .describe('Whether to include specific recommendations for compliance improvements')
});

/**
 * Schema for ceremony compliance checking
 * Analyzes adherence to specific Scrum ceremonies
 */
export const ceremonyComplianceSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The project ID to check ceremony compliance for'),
  
  ceremony_types: z.array(z.enum(['sprint_planning', 'daily_standup', 'sprint_review', 'sprint_retrospective']))
    .optional()
    .describe('Specific ceremonies to check (all ceremonies if not specified)'),
  
  sprint_count: z.number()
    .int('Sprint count must be a whole number')
    .min(1, 'Must check at least 1 sprint')
    .max(10, 'Cannot check more than 10 sprints')
    .default(3)
    .describe('Number of recent sprints to analyze for ceremony compliance'),
  
  include_attendance: z.boolean()
    .default(true)
    .describe('Whether to include attendance analysis in compliance check'),
  
  include_timing: z.boolean()
    .default(true)
    .describe('Whether to include timing adherence (ceremony duration, frequency)')
});

/**
 * Schema for role compliance checking
 * Analyzes how well team members adhere to their Scrum roles
 */
export const roleComplianceSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The project ID to check role compliance for'),
  
  roles: z.array(z.enum(['product_owner', 'scrum_master', 'developer']))
    .optional()
    .describe('Specific roles to check (all roles if not specified)'),
  
  check_period_days: z.number()
    .int('Check period must be a whole number')
    .min(14, 'Role compliance requires at least 14 days of data')
    .max(90, 'Check period cannot exceed 90 days')
    .default(30)
    .describe('Number of days to analyze for role compliance'),
  
  include_responsibilities: z.boolean()
    .default(true)
    .describe('Whether to check fulfillment of role-specific responsibilities'),
  
  include_interactions: z.boolean()
    .default(true)
    .describe('Whether to analyze inter-role interactions and collaboration')
});

/**
 * Schema for artifact compliance checking
 * Analyzes proper creation and maintenance of Scrum artifacts
 */
export const artifactComplianceSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The project ID to check artifact compliance for'),
  
  artifacts: z.array(z.enum(['product_backlog', 'sprint_backlog', 'increment', 'burndown_chart']))
    .optional()
    .describe('Specific artifacts to check (all artifacts if not specified)'),
  
  sprint_count: z.number()
    .int('Sprint count must be a whole number')
    .min(1, 'Must check at least 1 sprint')
    .max(6, 'Cannot check more than 6 sprints for artifacts')
    .default(2)
    .describe('Number of recent sprints to analyze for artifact compliance'),
  
  include_quality: z.boolean()
    .default(true)
    .describe('Whether to assess artifact quality (completeness, clarity, updates)'),
  
  include_accessibility: z.boolean()
    .default(true)
    .describe('Whether to check if artifacts are accessible to all team members')
});

/**
 * Schema for process compliance checking
 * Analyzes adherence to Scrum processes and workflows
 */
export const processComplianceSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The project ID to check process compliance for'),
  
  processes: z.array(z.enum([
    'sprint_planning_process',
    'daily_scrum_process', 
    'sprint_review_process',
    'sprint_retrospective_process',
    'backlog_refinement',
    'definition_of_done'
  ])).optional()
    .describe('Specific processes to check (all processes if not specified)'),
  
  check_period_days: z.number()
    .int('Check period must be a whole number')
    .min(14, 'Process compliance requires at least 14 days of data')
    .max(60, 'Check period cannot exceed 60 days')
    .default(30)
    .describe('Number of days to analyze for process compliance'),
  
  include_deviations: z.boolean()
    .default(true)
    .describe('Whether to identify and analyze process deviations'),
  
  include_improvements: z.boolean()
    .default(true)
    .describe('Whether to suggest process improvements')
});

/**
 * Schema for comprehensive compliance report
 * Generates a complete compliance assessment across all areas
 */
export const comprehensiveComplianceSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The project ID to generate comprehensive compliance report for'),
  
  assessment_period_days: z.number()
    .int('Assessment period must be a whole number')
    .min(30, 'Comprehensive assessment requires at least 30 days of data')
    .max(90, 'Assessment period cannot exceed 90 days')
    .default(60)
    .describe('Number of days to analyze for comprehensive compliance assessment'),
  
  include_ceremonies: z.boolean()
    .default(true)
    .describe('Include ceremony compliance in the report'),
  
  include_roles: z.boolean()
    .default(true)
    .describe('Include role compliance in the report'),
  
  include_artifacts: z.boolean()
    .default(true)
    .describe('Include artifact compliance in the report'),
  
  include_processes: z.boolean()
    .default(true)
    .describe('Include process compliance in the report'),
  
  include_metrics: z.boolean()
    .default(true)
    .describe('Include quantitative compliance metrics'),
  
  include_recommendations: z.boolean()
    .default(true)
    .describe('Include actionable recommendations for improvement'),
  
  priority_focus: z.enum(['ceremonies', 'roles', 'artifacts', 'processes', 'balanced'])
    .default('balanced')
    .describe('Area to prioritize in the compliance assessment')
});

/**
 * Schema for compliance trend analysis
 * Analyzes compliance trends over time
 */
export const complianceTrendSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The project ID to analyze compliance trends for'),
  
  trend_period_days: z.number()
    .int('Trend period must be a whole number')
    .min(60, 'Trend analysis requires at least 60 days of data')
    .max(180, 'Trend period cannot exceed 180 days')
    .default(90)
    .describe('Number of days to analyze for compliance trends'),
  
  granularity: z.enum(['weekly', 'bi_weekly', 'monthly'])
    .default('weekly')
    .describe('Granularity for trend analysis'),
  
  focus_areas: z.array(z.enum(['ceremonies', 'roles', 'artifacts', 'processes']))
    .optional()
    .describe('Specific areas to focus trend analysis on (all areas if not specified)')
});

// Export TypeScript types
export type ScrumComplianceCheckInput = z.infer<typeof scrumComplianceCheckSchema>;
export type CeremonyComplianceInput = z.infer<typeof ceremonyComplianceSchema>;
export type RoleComplianceInput = z.infer<typeof roleComplianceSchema>;
export type ArtifactComplianceInput = z.infer<typeof artifactComplianceSchema>;
export type ProcessComplianceInput = z.infer<typeof processComplianceSchema>;
export type ComprehensiveComplianceInput = z.infer<typeof comprehensiveComplianceSchema>;
export type ComplianceTrendInput = z.infer<typeof complianceTrendSchema>;


