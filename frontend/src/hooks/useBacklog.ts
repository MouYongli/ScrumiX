// Custom React hooks for backlog items

import { useState, useEffect, useCallback } from 'react';
import { backlogService } from '@/lib/api';
import type { BacklogItemUI, CreateBacklogItemRequest } from '@/types/api';

export function useBacklogItems(projectId: string) {
  const [backlogItems, setBacklogItems] = useState<BacklogItemUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBacklogItems = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await backlogService.getBacklogItems(projectId);
      setBacklogItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch backlog items');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBacklogItems();
  }, [fetchBacklogItems]);

  const createBacklogItem = useCallback(async (itemData: Omit<CreateBacklogItemRequest, 'project_id'>) => {
    try {
      const newItem = await backlogService.createBacklogItem(projectId, itemData);
      setBacklogItems((prev) => [...prev, newItem]);
      return newItem;
    } catch (err: any) {
      setError(err.message || 'Failed to create backlog item');
      throw err;
    }
  }, [projectId]);

  const updateBacklogItem = useCallback(async (itemId: string, itemData: Partial<CreateBacklogItemRequest>) => {
    try {
      const updatedItem = await backlogService.updateBacklogItem(projectId, itemId, itemData);
      setBacklogItems((prev) =>
        prev.map((item) => (item.id === itemId ? updatedItem : item))
      );
      return updatedItem;
    } catch (err: any) {
      setError(err.message || 'Failed to update backlog item');
      throw err;
    }
  }, [projectId]);

  const deleteBacklogItem = useCallback(async (itemId: string) => {
    try {
      await backlogService.deleteBacklogItem(projectId, itemId);
      setBacklogItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete backlog item');
      throw err;
    }
  }, [projectId]);

  const moveToSprint = useCallback(async (itemId: string, sprintId: string) => {
    try {
      const updatedItem = await backlogService.moveToSprint(projectId, itemId, sprintId);
      setBacklogItems((prev) =>
        prev.map((item) => (item.id === itemId ? updatedItem : item))
      );
      return updatedItem;
    } catch (err: any) {
      setError(err.message || 'Failed to move item to sprint');
      throw err;
    }
  }, [projectId]);

  return {
    backlogItems,
    isLoading,
    error,
    createBacklogItem,
    updateBacklogItem,
    deleteBacklogItem,
    moveToSprint,
    refetch: fetchBacklogItems,
  };
}

export function useBacklogItem(projectId: string, itemId: string) {
  const [backlogItem, setBacklogItem] = useState<BacklogItemUI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBacklogItem = useCallback(async () => {
    if (!projectId || !itemId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await backlogService.getBacklogItem(projectId, itemId);
      setBacklogItem(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch backlog item');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, itemId]);

  useEffect(() => {
    fetchBacklogItem();
  }, [fetchBacklogItem]);

  return {
    backlogItem,
    isLoading,
    error,
    refetch: fetchBacklogItem,
  };
}

export function useBacklogItemsByType(projectId: string, type: string) {
  const [backlogItems, setBacklogItems] = useState<BacklogItemUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBacklogItemsByType = useCallback(async () => {
    if (!projectId || !type) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await backlogService.getBacklogItemsByType(projectId, type);
      setBacklogItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch backlog items');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, type]);

  useEffect(() => {
    fetchBacklogItemsByType();
  }, [fetchBacklogItemsByType]);

  return {
    backlogItems,
    isLoading,
    error,
    refetch: fetchBacklogItemsByType,
  };
}
