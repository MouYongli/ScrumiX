// Custom React hooks for project data fetching

'use client';

import { useState, useEffect, useCallback } from 'react';
import { projectService, ApiError } from '@/lib/api';
import type { ProjectUI } from '@/types/api';

interface UseProjectsState {
  projects: ProjectUI[];
  isLoading: boolean;
  error: string | null;
}

interface UseProjectState {
  project: ProjectUI | null;
  isLoading: boolean;
  error: string | null;
}

// Hook for fetching all projects
export function useProjects() {
  const [state, setState] = useState<UseProjectsState>({
    projects: [],
    isLoading: true,
    error: null,
  });

  const fetchProjects = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const projects = await projectService.getProjects();
      setState({ projects, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch projects';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, []);

  const createProject = useCallback(async (projectData: Omit<ProjectUI, 'id' | 'progress' | 'members' | 'tasks' | 'lastActivity'>) => {
    try {
      const newProject = await projectService.createProject(projectData);
      setState(prev => ({ 
        ...prev, 
        projects: [...prev.projects, newProject] 
      }));
      return newProject;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to create project';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const updateProject = useCallback(async (projectId: string, projectData: Partial<ProjectUI>) => {
    try {
      const updatedProject = await projectService.updateProject(projectId, projectData);
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => 
          p.id === projectId ? updatedProject : p
        ),
      }));
      return updatedProject;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update project';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await projectService.deleteProject(projectId);
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== projectId),
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to delete project';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    ...state,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}

// Hook for fetching a single project
export function useProject(projectId: string | null) {
  const [state, setState] = useState<UseProjectState>({
    project: null,
    isLoading: !!projectId,
    error: null,
  });

  const fetchProject = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const project = await projectService.getProject(id);
      setState({ project, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch project';
      setState({ 
        project: null, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  }, []);

  const updateProject = useCallback(async (projectData: Partial<ProjectUI>) => {
    if (!projectId) return;
    
    try {
      const updatedProject = await projectService.updateProject(projectId, projectData);
      setState(prev => ({ 
        ...prev, 
        project: updatedProject 
      }));
      return updatedProject;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update project';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    } else {
      setState({ project: null, isLoading: false, error: null });
    }
  }, [projectId, fetchProject]);

  return {
    ...state,
    refetch: projectId ? () => fetchProject(projectId) : () => {},
    updateProject,
  };
}

// Hook for project statistics
export function useProjectStats(projectId: string | null) {
  const [stats, setStats] = useState<{
    totalTasks: number;
    completedTasks: number;
    totalSprints: number;
    activeSprints: number;
    totalMembers: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(!!projectId);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const projectStats = await projectService.getProjectStats(id);
      setStats(projectStats);
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch project statistics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchStats(projectId);
    } else {
      setStats(null);
      setIsLoading(false);
      setError(null);
    }
  }, [projectId, fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: projectId ? () => fetchStats(projectId) : () => {},
  };
}
