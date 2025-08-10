// Task API service functions

import { apiClient } from './client';
import type { 
  Task, 
  TaskUI, 
  CreateTaskRequest, 
  UpdateTaskRequest,
  PaginatedResponse,
  TaskStatus 
} from '@/types/api';

// Transform backend Task to frontend TaskUI
function transformTaskToUI(task: Task): TaskUI {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    story_point: task.story_point,
    sprintId: task.sprint_id ? String(task.sprint_id) : undefined,
    // These fields will need to be populated from additional API calls or relationships
    assignees: [], // TODO: Populate from user relationships
    labels: [], // TODO: Populate from tag relationships
    dueDate: undefined, // TODO: Add to backend or calculate from sprint end date
    epic: undefined, // TODO: Add epic/story relationship to backend
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

// Transform frontend TaskUI to backend Task format for requests
function transformTaskFromUI(task: Partial<TaskUI>): Partial<CreateTaskRequest | UpdateTaskRequest> {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    story_point: task.story_point,
    sprint_id: task.sprintId ? parseInt(task.sprintId) : undefined,
  };
}

export const taskService = {
  // Get all tasks
  async getTasks(
    page: number = 1, 
    limit: number = 50,
    filters?: {
      status?: TaskStatus;
      sprint_id?: number;
      priority?: string;
    }
  ): Promise<{ tasks: TaskUI[]; total: number; page: number; pages: number }> {
    const query = apiClient.buildQuery({ page, limit, ...filters });
    const response = await apiClient.get<{
      tasks: Task[];
      total: number;
      page: number;
      pages: number;
    }>(`/tasks${query}`);
    
    return {
      tasks: response.tasks.map(transformTaskToUI),
      total: response.total,
      page: response.page,
      pages: response.pages,
    };
  },

  // Get task by ID
  async getTask(taskId: string): Promise<TaskUI> {
    const response = await apiClient.get<Task>(`/tasks/${taskId}`);
    return transformTaskToUI(response);
  },

  // Create new task
  async createTask(taskData: Omit<TaskUI, 'id' | 'created_at' | 'updated_at' | 'assignees' | 'labels' | 'dueDate' | 'epic'>): Promise<TaskUI> {
    const requestData = transformTaskFromUI(taskData);
    const response = await apiClient.post<Task>('/tasks', requestData);
    return transformTaskToUI(response);
  },

  // Update task
  async updateTask(taskId: string, taskData: Partial<TaskUI>): Promise<TaskUI> {
    const requestData = transformTaskFromUI(taskData);
    const response = await apiClient.patch<Task>(`/tasks/${taskId}`, requestData);
    return transformTaskToUI(response);
  },

  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}`);
  },

  // Get tasks by sprint
  async getTasksBySprint(sprintId: string): Promise<TaskUI[]> {
    const query = apiClient.buildQuery({ sprint_id: parseInt(sprintId) });
    const response = await apiClient.get<{
      tasks: Task[];
      total: number;
      page: number;
      pages: number;
    }>(`/tasks${query}`);
    
    return response.tasks.map(transformTaskToUI);
  },

  // Get tasks by project (through sprints)
  async getTasksByProject(projectId: string): Promise<TaskUI[]> {
    // This would require a backend endpoint that filters tasks by project
    // For now, we'll get all tasks and filter client-side (not ideal for production)
    const response = await apiClient.get<{
      tasks: Task[];
      total: number;
      page: number;
      pages: number;
    }>('/tasks?limit=1000'); // High limit to get most tasks
    
    return response.tasks.map(transformTaskToUI);
  },

  // Update task status (common operation)
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskUI> {
    const response = await apiClient.patch<Task>(`/tasks/${taskId}`, { status });
    return transformTaskToUI(response);
  },

  // Batch update task statuses (for drag-and-drop operations)
  async updateTasksStatus(updates: Array<{ taskId: string; status: TaskStatus }>): Promise<TaskUI[]> {
    // If backend supports batch updates, use that. Otherwise, make individual requests
    const updatedTasks = await Promise.all(
      updates.map(({ taskId, status }) => this.updateTaskStatus(taskId, status))
    );
    return updatedTasks;
  },
};
