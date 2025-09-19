# Frontend Type Architecture

## Overview

This document explains our TypeScript type architecture for the ScrumiX frontend, which follows best practices for maintainable and type-safe frontend-backend integration.

## Type Structure

### 1. API Types (`/types/api.ts`)

**Purpose**: Represent the exact structure of data received from the backend API.

- These types match the backend schema responses exactly
- Use snake_case to match backend naming conventions
- Include all fields that the API returns
- Never add computed or UI-specific fields here

```typescript
interface ApiUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### 2. Domain Types (`/types/domain.ts`)

**Purpose**: Represent how we work with data in the frontend application.

- Use camelCase for JavaScript/TypeScript conventions
- Include computed properties for UI needs
- Transform data types (e.g., string dates to Date objects)
- Add UI-specific flags and helper properties

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string; // Computed field
  isActive?: boolean;
}
```

### 3. Enums (`/types/enums.ts`)

**Purpose**: Shared enumerations that match backend definitions.

- Ensure consistency between frontend and backend
- Provide type safety for status fields
- Single source of truth for enumerated values

### 4. Mappers (`/utils/mappers.ts`)

**Purpose**: Convert between API types and Domain types.

- Transform snake_case to camelCase
- Convert string dates to Date objects
- Add computed properties
- Handle data transformation logic

```typescript
export const mapApiUserToDomain = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  username: apiUser.username,
  email: apiUser.email,
  firstName: apiUser.first_name,
  lastName: apiUser.last_name,
  displayName: apiUser.first_name && apiUser.last_name 
    ? `${apiUser.first_name} ${apiUser.last_name}`
    : apiUser.username,
  isActive: apiUser.is_active ?? true,
});
```

## Benefits of This Architecture

### 1. Type Safety
- Compile-time guarantees that API responses match expected types
- Catch breaking changes when backend schemas change
- Prevent runtime errors from type mismatches

### 2. Maintainability
- Clear separation of concerns
- Easy to update when API changes
- Centralized transformation logic

### 3. Developer Experience
- IntelliSense and autocompletion
- Better refactoring capabilities
- Self-documenting code

### 4. Flexibility
- Add UI-specific computed properties without affecting API types
- Transform data formats to match frontend needs
- Handle backward compatibility

## Usage Patterns

### API Service Layer
```typescript
// api.ts - Returns API types
export const api = {
  auth: {
    getCurrentUser: () => authenticatedFetch<ApiUser>('/users/me'),
  },
  // ...
};
```

### Component Layer
```typescript
// component.tsx - Uses Domain types
const [currentUser, setCurrentUser] = useState<User | null>(null);

useEffect(() => {
  const fetchUser = async () => {
    const response = await api.auth.getCurrentUser();
    if (!response.error) {
      const user = mapApiUserToDomain(response.data);
      setCurrentUser(user);
    }
  };
  fetchUser();
}, []);
```

## Best Practices

### 1. Never Mix API and Domain Types
```typescript
// Bad - mixing API and Domain types
interface ProjectWithTasks {
  id: number;
  name: string;
  created_at: string; // API format
  tasks: Task[]; // Domain format
}

// Good - consistent type layer
interface ProjectWithDetails extends Project { // Domain type
  tasks: Task[]; // Domain type
  upcomingMeetings: Meeting[]; // Domain type
}
```

### 2. Always Use Mappers
```typescript
// Bad - direct API usage in components
const user = apiResponse.data; // ApiUser type

// Good - transform to domain type
const user = mapApiUserToDomain(apiResponse.data); // User type
```

### 3. Keep API Types Minimal
```typescript
// Bad - adding UI concerns to API type
interface ApiTask {
  id: number;
  title: string;
  status: TaskStatus;
  priorityColor?: string; // UI concern
}

// ✅ Good - UI concerns in domain type
interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  priorityColor?: string; // Added in mapper
}
```

### 4. Use Computed Properties
```typescript
// In mapper
export const mapApiMeetingToDomain = (apiMeeting: ApiMeeting): Meeting => {
  const startDateTime = new Date(apiMeeting.start_datetime);
  const endDateTime = new Date(startDateTime.getTime() + apiMeeting.duration * 60000);
  const now = new Date();
  
  return {
    // ... other fields
    startDateTime,
    endDateTime,
    isUpcoming: startDateTime > now,
    isOngoing: startDateTime <= now && endDateTime > now,
    displayDuration: formatDuration(apiMeeting.duration),
  };
};
```

## Migration Guide

When the backend API changes:

1. **Update API types** (`/types/api.ts`) to match new backend schema
2. **Update mappers** (`/utils/mappers.ts`) to handle new fields
3. **Update domain types** if needed for new UI requirements
4. **Components automatically get type checking** for any breaking changes

## File Organization

```
src/
├── types/
│   ├── api.ts          # Backend API response types
│   ├── domain.ts       # Frontend business logic types
│   └── enums.ts        # Shared enumerations
├── utils/
│   ├── api.ts          # API service layer
│   └── mappers.ts      # Type transformation functions
└── components/         # React components using domain types
```

This architecture provides a robust foundation for type-safe frontend development while maintaining flexibility and maintainability as the application grows.
