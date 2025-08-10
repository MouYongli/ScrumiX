// Custom React hooks for task data fetching

'use client';

import { useState, useEffect, useCallback } from 'react';
import { taskService, ApiError } from '@/lib/api';
import type { TaskUI, TaskStatus } from '@/types/api';

interface UseTasksState {
  tasks: TaskUI[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

interface UseTaskState {
  task: TaskUI | null;
  isLoading: boolean;
  error: string | null;
}

interface TaskFilters {
  status?: TaskStatus;
  sprintId?: string;
  priority?: string;
}

// Hook for fetching tasks with filtering and pagination
export function useTasks(filters?: TaskFilters, page: number = 1, limit: number = 50) {
  const [state, setState] = useState<UseTasksState>({
    tasks: [],
    isLoading: true,
    error: null,
    total: 0,
    page: 1,
    pages: 1,
  });

  const fetchTasks = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const apiFilters = filters ? {
        status: filters.status,
        sprint_id: filters.sprintId ? parseInt(filters.sprintId) : undefined,
        priority: filters.priority,
      } : undefined;

      const response = await taskService.getTasks(page, limit, apiFilters);
      setState({
        tasks: response.tasks,
        total: response.total,
        page: response.page,
        pages: response.pages,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch tasks';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, [filters, page, limit]);

  const createTask = useCallback(async (taskData: Omit<TaskUI, 'id' | 'created_at' | 'updated_at' | 'assignees' | 'labels' | 'dueDate' | 'epic'>) => {
    try {
      const newTask = await taskService.createTask(taskData);
      setState(prev => ({ 
        ...prev, 
        tasks: [...prev.tasks, newTask],
        total: prev.total + 1,
      }));
      return newTask;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to create task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, taskData: Partial<TaskUI>) => {
    try {
      const updatedTask = await taskService.updateTask(taskId, taskData);
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === taskId ? updatedTask : t
        ),
      }));
      return updatedTask;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId),
        total: prev.total - 1,
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to delete task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      const updatedTask = await taskService.updateTaskStatus(taskId, status);
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === taskId ? updatedTask : t
        ),
      }));
      return updatedTask;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update task status';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    ...state,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  };
}

// Hook for fetching tasks by sprint
export function useSprintTasks(sprintId: string | null) {
  const [state, setState] = useState<UseTasksState>({
    tasks: [],
    isLoading: !!sprintId,
    error: null,
    total: 0,
    page: 1,
    pages: 1,
  });

  const fetchSprintTasks = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const tasks = await taskService.getTasksBySprint(id);
      setState({
        tasks,
        total: tasks.length,
        page: 1,
        pages: 1,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch sprint tasks';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      const updatedTask = await taskService.updateTaskStatus(taskId, status);
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === taskId ? updatedTask : t
        ),
      }));
      return updatedTask;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update task status';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  // Batch update for drag-and-drop operations
  const updateTasksStatus = useCallback(async (updates: Array<{ taskId: string; status: TaskStatus }>) => {
    try {
      const updatedTasks = await taskService.updateTasksStatus(updates);
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => {
          const update = updatedTasks.find(ut => ut.id === task.id);
          return update || task;
        }),
      }));
      return updatedTasks;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update task statuses';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  useEffect(() => {
    if (sprintId) {
      fetchSprintTasks(sprintId);
    } else {
      setState({
        tasks: [],
        isLoading: false,
        error: null,
        total: 0,
        page: 1,
        pages: 1,
      });
    }
  }, [sprintId, fetchSprintTasks]);

  return {
    ...state,
    refetch: sprintId ? () => fetchSprintTasks(sprintId) : () => {},
    updateTaskStatus,
    updateTasksStatus,
  };
}

// Hook for fetching a single task
export function useTask(taskId: string | null) {
  const [state, setState] = useState<UseTaskState>({
    task: null,
    isLoading: !!taskId,
    error: null,
  });

  const fetchTask = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const task = await taskService.getTask(id);
      setState({ task, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch task';
      setState({ 
        task: null, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  }, []);

  const updateTask = useCallback(async (taskData: Partial<TaskUI>) => {
    if (!taskId) return;
    
    try {
      const updatedTask = await taskService.updateTask(taskId, taskData);
      setState(prev => ({ 
        ...prev, 
        task: updatedTask 
      }));
      return updatedTask;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      fetchTask(taskId);
    } else {
      setState({ task: null, isLoading: false, error: null });
    }
  }, [taskId, fetchTask]);

  return {
    ...state,
    refetch: taskId ? () => fetchTask(taskId) : () => {},
    updateTask,
  };
}
