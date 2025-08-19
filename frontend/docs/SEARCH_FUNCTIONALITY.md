# Search Functionality Documentation

## Overview

The ScrumiX application now features comprehensive search functionality with different scopes depending on the context:

- **Global Search**: Available in the workspace view, searches across all projects, tasks, meetings, backlogs, and sprints
- **Project Search**: Available within project pages, searches within the specific project scope

## Features

### Global Search (Workspace)

Located in the GlobalSidebar, this search allows users to find:

- **Projects**: Search by name and description
- **Tasks**: Search by title and description across all projects
- **Meetings**: Search by title, description, and location across all projects  
- **Backlog Items**: Search by title and description across all projects
- **Sprints**: Search by name and goal across all projects

### Project Search

Located in the ProjectSidebar when viewing a specific project, this search allows users to find within the current project:

- **Tasks**: Search by title and description within the project
- **Backlog Items**: Search by title and description within the project
- **Sprints**: Search by name and goal within the project
- **Meetings**: Search by title, description, and location within the project

### Search Features

- **Real-time search**: Results appear as you type with debounced requests
- **Recent searches**: Stores and displays recently searched terms
- **Smart sorting**: Results prioritized by relevance (exact matches first)
- **Loading states**: Visual feedback during search operations
- **Error handling**: User-friendly error messages
- **Keyboard navigation**: Support for Escape key to close search

## Usage

### Global Search

1. Navigate to the workspace view
2. The search bar appears in the GlobalSidebar (if not collapsed)
3. Type your search query
4. Results appear in real-time categorized by type
5. Click on any result to navigate to that item

### Project Search

1. Navigate to any project page (dashboard, backlog, sprint, etc.)
2. The search bar appears in the ProjectSidebar (if not collapsed)
3. Type your search query
4. Results are filtered to the current project context
5. Click on any result to navigate to that item within the project

## Backend API

### Global Search Endpoint

```
GET /api/v1/workspace/search
```

Parameters:
- `query` (required): Search term
- `entity_types` (optional): Comma-separated list of types to search (projects,tasks,meetings,backlogs,sprints)
- `limit` (optional): Maximum number of results (default: 50)

### Individual Entity Search

The system also supports searching individual entity types:

- `GET /api/v1/projects/?search={query}` - Search projects
- `GET /api/v1/tasks/?search={query}` - Search tasks
- `GET /api/v1/meetings/?search={query}` - Search meetings
- `GET /api/v1/backlogs/?search={query}` - Search backlog items
- `GET /api/v1/sprints/?search={query}` - Search sprints

## Implementation Details

### Frontend Components

- **SearchBar**: Reusable search component with scope-aware functionality
- **Debounced Search**: 300ms delay to prevent excessive API calls
- **Result Caching**: Implemented in API client to reduce duplicate requests
- **Local Storage**: Recent searches stored per scope (global/project)

### Backend Implementation

- **Unified Search API**: Single endpoint for cross-entity search
- **Project-Scoped Search**: Individual CRUD methods for project-specific searching
- **Optimized Queries**: Using indexed columns and efficient SQL patterns
- **Relevance Sorting**: Results sorted by title match relevance

### Search Result Format

```typescript
interface SearchResult {
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
```

## Performance Considerations

- **Debouncing**: Prevents excessive API calls during typing
- **Result Limiting**: Maximum results capped to prevent large payloads
- **Indexed Searches**: Backend uses database indexes for efficient queries
- **Request Deduplication**: Frontend prevents duplicate concurrent requests

## Future Enhancements

- Search filters (by type, status, date)
- Advanced search operators
- Search history management
- Full-text search capabilities
- Search analytics and usage metrics
