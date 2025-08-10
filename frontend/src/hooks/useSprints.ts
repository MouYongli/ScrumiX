// Custom React hooks for sprint data fetching

'use client';

import { useState, useEffect, useCallback } from 'react';
import { sprintService, ApiError } from '@/lib/api';
import type { SprintUI } from '@/types/api';

interface UseSprintsState {
  sprints: SprintUI[];
  isLoading: boolean;
  error: string | null;
}

interface UseSprintState {
  sprint: SprintUI | null;
  isLoading: boolean;
  error: string | null;
}

interface UseSprintStatsState {
  stats: {
    totalStoryPoints: number;
    completedStoryPoints: number;
    totalTasks: number;
    completedTasks: number;
    burndownData: Array<{ day: string; remaining: number; ideal: number }>;
  } | null;
  isLoading: boolean;
  error: string | null;
}

interface UseVelocityState {
  velocityData: Array<{
    sprint: string;
    velocity: number;
    capacity: number;
  }>;
  isLoading: boolean;
  error: string | null;
}

// Hook for fetching sprints for a project
export function useSprints(projectId: string | null) {
  const [state, setState] = useState<UseSprintsState>({
    sprints: [],
    isLoading: !!projectId,
    error: null,
  });

  const fetchSprints = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const sprints = await sprintService.getSprints(id);
      setState({ sprints, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch sprints';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, []);

  const createSprint = useCallback(async (sprintData: Omit<SprintUI, 'id' | 'totalStoryPoints' | 'completedStoryPoints' | 'totalStories' | 'completedStories' | 'teamMembers' | 'createdAt'>) => {
    if (!projectId) throw new Error('Project ID is required');
    
    try {
      const newSprint = await sprintService.createSprint(projectId, sprintData);
      setState(prev => ({ 
        ...prev, 
        sprints: [...prev.sprints, newSprint] 
      }));
      return newSprint;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to create sprint';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [projectId]);

  const updateSprint = useCallback(async (sprintId: string, sprintData: Partial<SprintUI>) => {
    try {
      const updatedSprint = await sprintService.updateSprint(sprintId, sprintData);
      setState(prev => ({
        ...prev,
        sprints: prev.sprints.map(s => 
          s.id === sprintId ? updatedSprint : s
        ),
      }));
      return updatedSprint;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update sprint';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const deleteSprint = useCallback(async (sprintId: string) => {
    try {
      await sprintService.deleteSprint(sprintId);
      setState(prev => ({
        ...prev,
        sprints: prev.sprints.filter(s => s.id !== sprintId),
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to delete sprint';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const startSprint = useCallback(async (sprintId: string) => {
    try {
      const updatedSprint = await sprintService.startSprint(sprintId);
      setState(prev => ({
        ...prev,
        sprints: prev.sprints.map(s => 
          s.id === sprintId ? updatedSprint : s
        ),
      }));
      return updatedSprint;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to start sprint';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const completeSprint = useCallback(async (sprintId: string) => {
    try {
      const updatedSprint = await sprintService.completeSprint(sprintId);
      setState(prev => ({
        ...prev,
        sprints: prev.sprints.map(s => 
          s.id === sprintId ? updatedSprint : s
        ),
      }));
      return updatedSprint;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to complete sprint';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchSprints(projectId);
    } else {
      setState({ sprints: [], isLoading: false, error: null });
    }
  }, [projectId, fetchSprints]);

  return {
    ...state,
    refetch: projectId ? () => fetchSprints(projectId) : () => {},
    createSprint,
    updateSprint,
    deleteSprint,
    startSprint,
    completeSprint,
  };
}

// Hook for fetching a single sprint
export function useSprint(sprintId: string | null) {
  const [state, setState] = useState<UseSprintState>({
    sprint: null,
    isLoading: !!sprintId,
    error: null,
  });

  const fetchSprint = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const sprint = await sprintService.getSprint(id);
      setState({ sprint, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch sprint';
      setState({ 
        sprint: null, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  }, []);

  const updateSprint = useCallback(async (sprintData: Partial<SprintUI>) => {
    if (!sprintId) return;
    
    try {
      const updatedSprint = await sprintService.updateSprint(sprintId, sprintData);
      setState(prev => ({ 
        ...prev, 
        sprint: updatedSprint 
      }));
      return updatedSprint;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to update sprint';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [sprintId]);

  useEffect(() => {
    if (sprintId) {
      fetchSprint(sprintId);
    } else {
      setState({ sprint: null, isLoading: false, error: null });
    }
  }, [sprintId, fetchSprint]);

  return {
    ...state,
    refetch: sprintId ? () => fetchSprint(sprintId) : () => {},
    updateSprint,
  };
}

// Hook for fetching active sprint
export function useActiveSprint(projectId: string | null) {
  const [state, setState] = useState<UseSprintState>({
    sprint: null,
    isLoading: !!projectId,
    error: null,
  });

  const fetchActiveSprint = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const sprint = await sprintService.getActiveSprint(id);
      setState({ sprint, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch active sprint';
      setState({ 
        sprint: null, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchActiveSprint(projectId);
    } else {
      setState({ sprint: null, isLoading: false, error: null });
    }
  }, [projectId, fetchActiveSprint]);

  return {
    ...state,
    refetch: projectId ? () => fetchActiveSprint(projectId) : () => {},
  };
}

// Hook for sprint statistics
export function useSprintStats(sprintId: string | null) {
  const [state, setState] = useState<UseSprintStatsState>({
    stats: null,
    isLoading: !!sprintId,
    error: null,
  });

  const fetchSprintStats = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const stats = await sprintService.getSprintStats(id);
      setState({ stats, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch sprint statistics';
      setState({ 
        stats: null, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  }, []);

  useEffect(() => {
    if (sprintId) {
      fetchSprintStats(sprintId);
    } else {
      setState({ stats: null, isLoading: false, error: null });
    }
  }, [sprintId, fetchSprintStats]);

  return {
    ...state,
    refetch: sprintId ? () => fetchSprintStats(sprintId) : () => {},
  };
}

// Hook for project velocity data
export function useProjectVelocity(projectId: string | null, limit: number = 10) {
  const [state, setState] = useState<UseVelocityState>({
    velocityData: [],
    isLoading: !!projectId,
    error: null,
  });

  const fetchVelocity = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const velocityData = await sprintService.getProjectVelocity(id, limit);
      setState({ velocityData, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch velocity data';
      setState({ 
        velocityData: [], 
        isLoading: false, 
        error: errorMessage 
      });
    }
  }, [limit]);

  useEffect(() => {
    if (projectId) {
      fetchVelocity(projectId);
    } else {
      setState({ velocityData: [], isLoading: false, error: null });
    }
  }, [projectId, fetchVelocity]);

  return {
    ...state,
    refetch: projectId ? () => fetchVelocity(projectId) : () => {},
  };
}
