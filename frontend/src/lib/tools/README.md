# ScrumiX AI Tools Documentation

This directory contains AI tools that enable intelligent agents to interact with the ScrumiX backend API and provide advanced Scrum management capabilities.

## Architecture Overview

The tools are built using the Vercel AI SDK 5 and follow a consistent pattern:

1. **Schema Definition**: Zod schemas for input validation and type safety
2. **Authentication Handling**: Secure cookie forwarding for API calls
3. **API Integration**: Direct calls to ScrumiX backend endpoints
4. **Rich Response Formatting**: Markdown-formatted responses with actionable insights

## Available Tools

### 1. Backlog Management Tools (`backlog-management.ts`)

Tools for the Product Owner agent to manage product backlogs.

#### `createBacklogItemTool`
- **Purpose**: Create new backlog items (epics, stories, bugs)
- **Key Features**:
  - Full validation with Zod schemas
  - Automatic acceptance criteria creation
  - Rich markdown responses with links
  - Support for hierarchical backlog items

#### `getBacklogItemsTool`
- **Purpose**: Retrieve and analyze current backlog state
- **Key Features**:
  - Advanced filtering by status, priority, type
  - Search functionality across titles and descriptions
  - Comprehensive statistics and summaries
  - Support for pagination and large datasets

### 2. Scrum Master Tools (`scrum-master.ts`)

Comprehensive tools for the Scrum Master agent to monitor and facilitate Scrum processes.

#### `analyzeSprintHealthTool`
- **Purpose**: Comprehensive sprint health analysis and monitoring
- **Key Features**:
  - Real-time progress tracking vs. timeline
  - Work distribution analysis (WIP limits)
  - Story point completion tracking
  - Automated issue detection and recommendations
  - Health scoring with actionable insights

#### `scheduleEventTool`
- **Purpose**: Schedule Scrum events with proper ceremony structure
- **Key Features**:
  - Support for all Scrum events (Planning, Daily, Review, Retrospective)
  - Event-specific defaults and guidance
  - Automated participant notifications
  - Preparation checklists for each event type

#### `analyzeVelocityTool`
- **Purpose**: Team velocity tracking and capacity planning
- **Key Features**:
  - Historical velocity analysis across multiple sprints
  - Consistency scoring and trend detection
  - Capacity forecasting for upcoming sprints
  - Sprint-by-sprint detailed breakdowns
  - Visual trend charts in ASCII format

#### `analyzeRetrospectivesTool`
- **Purpose**: Retrospective analysis and team coaching
- **Key Features**:
  - Action item tracking and completion rates
  - Pattern recognition across retrospectives
  - Team engagement assessment
  - Facilitation tips and improvement suggestions
  - Recurring theme identification

#### `checkScrumComplianceTool`
- **Purpose**: Scrum Guide compliance checking and deviation detection
- **Key Features**:
  - Comprehensive compliance scoring
  - Missing ceremony detection
  - Scope creep analysis
  - Sprint consistency validation
  - Automated recommendations for improvement

## Tool Integration Pattern

### Authentication Context
All tools require authentication context passed through the `experimental_context` parameter:

```typescript
const result = await tool.execute(input, { 
  experimental_context: { 
    cookies: 'session_cookie_string' 
  } 
});
```

### Error Handling
Consistent error handling pattern across all tools:

```typescript
async function makeAuthenticatedRequest(endpoint: string, options: RequestInit, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    return { error: 'Authentication context missing' };
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
```

### Response Formatting
Tools return rich markdown responses with:

- **Structured Headers**: Clear hierarchy with H1-H3 headings
- **Data Tables**: Organized information in markdown tables
- **Action Items**: Bulleted lists with clear next steps
- **Visual Elements**: ASCII charts and progress indicators
- **Contextual Links**: Deep links back to relevant UI sections

## Schema Validation (`schemas.ts`)

All tool inputs are validated using Zod schemas that provide:

- **Type Safety**: Full TypeScript type inference
- **Runtime Validation**: Input sanitization and validation
- **Error Messages**: Clear validation error messages
- **Documentation**: Schema descriptions for AI understanding

Example schema pattern:
```typescript
export const sprintHealthAnalysisSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to analyze'),
  
  include_burndown: z.boolean()
    .default(true)
    .describe('Whether to include burndown chart data'),
});

export type SprintHealthAnalysisInput = z.infer<typeof sprintHealthAnalysisSchema>;
```

## API Integration

### Backend Endpoints Used

The tools integrate with the following ScrumiX backend endpoints:

#### Sprint Management
- `GET /api/v1/sprints/` - List sprints with filtering
- `GET /api/v1/sprints/{id}` - Get sprint details
- `GET /api/v1/sprints/{id}/backlog` - Get sprint backlog items
- `GET /api/v1/sprints/{id}/statistics` - Get sprint statistics
- `POST /api/v1/sprints/{id}/start` - Start sprint
- `POST /api/v1/sprints/{id}/close` - Close sprint

#### Backlog Management
- `GET /api/v1/backlogs/` - List backlog items with filtering
- `POST /api/v1/backlogs/` - Create backlog item
- `POST /api/v1/acceptance-criteria/backlog/{id}/bulk` - Create acceptance criteria

#### Meeting Management
- `GET /api/v1/meetings/` - List meetings with filtering
- `POST /api/v1/meetings/` - Create meeting
- `GET /api/v1/meetings/type/{type}` - Get meetings by type
- `GET /api/v1/meeting-notes/` - Get meeting notes
- `GET /api/v1/meeting-action-items/` - Get action items

### Data Flow

1. **Input Validation**: Zod schema validates and transforms input
2. **Authentication Check**: Verify cookies are present in context
3. **API Calls**: Make authenticated requests to backend
4. **Data Processing**: Transform and analyze response data
5. **Insight Generation**: Apply business logic and detect patterns
6. **Response Formatting**: Generate rich markdown with recommendations

## Usage in AI Agents

### Product Owner Agent
```typescript
import { backlogManagementTools } from '@/lib/tools/backlog-management';

const tools = {
  ...backlogManagementTools,
  // other tools
};

// Use in generateText or streamText
const result = await generateText({
  model: openai('gpt-4'),
  tools: tools,
  messages: messages,
});
```

### Scrum Master Agent
```typescript
import { scrumMasterTools } from '@/lib/tools/scrum-master';

const tools = {
  ...scrumMasterTools,
  // other tools
};

// Use in generateText or streamText
const result = await generateText({
  model: openai('gpt-4'),
  tools: tools,
  messages: messages,
});
```

## Best Practices

### Tool Design
1. **Single Responsibility**: Each tool has a clear, focused purpose
2. **Rich Context**: Tools provide comprehensive context in responses
3. **Actionable Insights**: All analysis includes specific recommendations
4. **Error Recovery**: Graceful handling of API failures and edge cases

### Schema Design
1. **Descriptive Validation**: Clear error messages and field descriptions
2. **Reasonable Defaults**: Sensible defaults for optional parameters
3. **Type Safety**: Full TypeScript integration with inferred types
4. **Documentation**: Schema descriptions help AI understand usage

### Response Formatting
1. **Consistent Structure**: Predictable response format across tools
2. **Markdown Rich**: Use headers, lists, tables, and emphasis
3. **Actionable Content**: Always include next steps or recommendations
4. **Context Links**: Deep links to relevant UI sections when possible

## Extension Guidelines

When adding new tools:

1. **Follow the Pattern**: Use the established authentication and error handling patterns
2. **Validate Inputs**: Create comprehensive Zod schemas
3. **Rich Responses**: Format responses with markdown and actionable insights
4. **Test Thoroughly**: Ensure proper error handling and edge case coverage
5. **Document Well**: Update this README with new tool capabilities

## Security Considerations

1. **Authentication**: All API calls require valid session cookies
2. **Input Validation**: Zod schemas prevent injection attacks
3. **Error Handling**: Avoid exposing sensitive information in error messages
4. **Rate Limiting**: Respect backend rate limits and implement retries if needed

## Performance Optimization

1. **Parallel Requests**: Use Promise.all() for independent API calls
2. **Data Caching**: Consider caching frequently accessed data
3. **Response Streaming**: Use streaming for long-running analysis
4. **Pagination**: Handle large datasets with proper pagination

This tool architecture enables powerful AI agents that can provide intelligent, context-aware assistance for Scrum teams while maintaining security and performance standards.
