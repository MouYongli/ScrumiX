'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, Folder, CheckSquare, Calendar, FileText, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
// Simple debounce implementation
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export interface SearchResult {
  id: number;
  title: string;
  type: 'project' | 'task' | 'sprint' | 'backlog' | 'meeting' | 'documentation';
  description?: string;
  projectId?: number;
  projectName?: string;
  status?: string;
  url: string;
  metadata?: Record<string, any>;
}

interface SearchBarProps {
  scope: 'global' | 'project';
  projectId?: string;
  placeholder?: string;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
  maxResults?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  scope,
  projectId,
  placeholder = 'Search...',
  onResultClick,
  className = '',
  maxResults = 10
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const storageKey = scope === 'global' ? 'recentGlobalSearches' : `recentProjectSearches_${projectId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, [scope, projectId]);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const storageKey = scope === 'global' ? 'recentGlobalSearches' : `recentProjectSearches_${projectId}`;
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }, [scope, projectId, recentSearches]);

  // Search function with different scopes
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const searchResults: SearchResult[] = [];

      if (scope === 'global') {
        // Use unified workspace search API
        const searchRes = await api.workspace.search({
          query: searchQuery,
          limit: maxResults
        });

        if (searchRes.data?.results) {
          searchRes.data.results.forEach((result: any) => {
            searchResults.push({
              id: result.id,
              title: result.title,
              type: result.type,
              description: result.description,
              status: result.status,
              url: result.url,
              projectId: result.project_id,
              projectName: result.project_name,
              metadata: result.metadata || {}
            });
          });
        }

      } else if (scope === 'project' && projectId) {
        // Project-specific search
        const projectIdNum = parseInt(projectId);
        
        const [tasksRes, backlogsRes, sprintsRes, meetingsRes] = await Promise.allSettled([
          api.tasks.getAll({ search: searchQuery, limit: maxResults }),
          api.backlogs.getAll({ search: searchQuery, project_id: projectIdNum, limit: maxResults }),
          api.sprints.getByProject(projectIdNum),
          api.meetings.getByProject(projectIdNum)
        ]);

        // Process project-specific tasks
        if (tasksRes.status === 'fulfilled' && tasksRes.value.data?.tasks) {
          tasksRes.value.data.tasks
            .filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           task.description?.toLowerCase().includes(searchQuery.toLowerCase()))
            .forEach(task => {
              searchResults.push({
                id: task.id,
                title: task.title,
                type: 'task',
                description: task.description,
                status: task.status,
                url: `/project/${projectId}/kanban`,
                metadata: { priority: task.priority }
              });
            });
        }

        // Process project-specific backlogs
        if (backlogsRes.status === 'fulfilled' && backlogsRes.value.data) {
          backlogsRes.value.data.forEach(backlog => {
            searchResults.push({
              id: backlog.id,
              title: backlog.title,
              type: 'backlog',
              description: backlog.description,
              status: backlog.status,
              url: `/project/${projectId}/backlog`,
              metadata: { 
                itemType: backlog.itemType,
                priority: backlog.priority
              }
            });
          });
        }

        // Process project-specific sprints
        if (sprintsRes.status === 'fulfilled' && sprintsRes.value.data) {
          sprintsRes.value.data
            .filter(sprint => sprint.sprintName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             sprint.sprintGoal?.toLowerCase().includes(searchQuery.toLowerCase()))
            .forEach(sprint => {
              searchResults.push({
                id: sprint.id,
                title: sprint.sprintName,
                type: 'sprint',
                description: sprint.sprintGoal,
                status: sprint.status,
                url: `/project/${projectId}/sprint/${sprint.id}`,
                metadata: { 
                  startDate: sprint.startDate,
                  endDate: sprint.endDate
                }
              });
            });
        }

        // Process project-specific meetings
        if (meetingsRes.status === 'fulfilled' && meetingsRes.value.data) {
          meetingsRes.value.data
            .filter(meeting => meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              meeting.description?.toLowerCase().includes(searchQuery.toLowerCase()))
            .forEach(meeting => {
              searchResults.push({
                id: meeting.id,
                title: meeting.title,
                type: 'meeting',
                description: meeting.description,
                url: `/project/${projectId}/meeting/${meeting.id}`,
                metadata: { 
                  startDateTime: meeting.startDateTime,
                  meetingType: meeting.meetingType 
                }
              });
            });
        }
      }

      // Sort results by relevance and limit
      const sortedResults = searchResults
        .sort((a, b) => {
          // Prioritize exact title matches
          const aExactMatch = a.title.toLowerCase() === searchQuery.toLowerCase();
          const bExactMatch = b.title.toLowerCase() === searchQuery.toLowerCase();
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;
          
          // Then prioritize title starts with
          const aStartsWith = a.title.toLowerCase().startsWith(searchQuery.toLowerCase());
          const bStartsWith = b.title.toLowerCase().startsWith(searchQuery.toLowerCase());
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          
          // Finally alphabetical
          return a.title.localeCompare(b.title);
        })
        .slice(0, maxResults);

      setResults(sortedResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [scope, projectId, maxResults]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      performSearch(searchQuery);
    }, 300),
    [performSearch]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.trim()) {
      debouncedSearch(value);
    } else {
      setResults([]);
      setError(null);
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    setIsOpen(false);
    setQuery('');
    setResults([]);
    
    if (onResultClick) {
      onResultClick(result);
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    setIsOpen(true);
    debouncedSearch(searchQuery);
  };

  // Handle clear
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsOpen(false);
  };

  // Handle focus
  const handleFocus = () => {
    setIsOpen(true);
  };

  // Handle blur with delay to allow clicks
  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for result type
  const getResultIcon = (type: SearchResult['type']) => {
    const iconClass = "w-4 h-4 flex-shrink-0";
    switch (type) {
      case 'project': return <Folder className={iconClass} />;
      case 'task': return <CheckSquare className={iconClass} />;
      case 'sprint': return <Zap className={iconClass} />;
      case 'backlog': return <FileText className={iconClass} />;
      case 'meeting': return <Calendar className={iconClass} />;
      case 'documentation': return <FileText className={iconClass} />;
      default: return <Search className={iconClass} />;
    }
  };

  // Get result type label
  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'project': return 'Project';
      case 'task': return 'Task';
      case 'sprint': return 'Sprint';
      case 'backlog': return 'Backlog';
      case 'meeting': return 'Meeting';
      case 'documentation': return 'Documentation';
      default: return 'Item';
    }
  };

  return (
    <div ref={searchContainerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          
          {/* Loading State */}
          {isLoading && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="ml-2">Searching...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 text-center text-red-500 dark:text-red-400">
              {error}
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && query.trim() && results.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found for "{query}"
            </div>
          )}

          {/* Recent Searches (shown when no query) */}
          {!query.trim() && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((recentQuery, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(recentQuery)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{recentQuery}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {!isLoading && !error && results.length > 0 && (
            <div className="p-2">
              {scope === 'global' && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Global Search Results
                </div>
              )}
              {scope === 'project' && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Project Search Results
                </div>
              )}
              
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.url}
                  onClick={() => handleResultClick(result)}
                  className="block px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {result.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                          {getResultTypeLabel(result.type)}
                        </span>
                        {result.status && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            {result.status}
                          </span>
                        )}
                      </div>
                      {result.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {result.description}
                        </p>
                      )}
                      {scope === 'global' && result.projectName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          in {result.projectName}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
