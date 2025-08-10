// API services barrel export

export { apiClient, ApiError } from './client';
export { projectService } from './projects';
export { taskService } from './tasks';
export { sprintService } from './sprints';
export { backlogService } from './backlog';
export { userService } from './users';
export { documentationService } from './documentation';
export { analyticsService } from './analytics';
export { notificationService } from './notifications';
export { meetingService } from './meetings';
export { favoriteService } from './favorites';

// Re-export types for convenience
export type * from '@/types/api';
