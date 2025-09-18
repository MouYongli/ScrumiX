# ScrumiX AI Tools Documentation

This directory contains AI tools that enable intelligent agents to interact with the ScrumiX backend API and provide advanced Scrum management capabilities using a **modular, agent-focused architecture**.

## **New Modular Architecture**

The tools are organized by agent role and functionality, built using the Vercel AI SDK 5:

```
frontend/src/lib/tools/
├── product-owner/           # Product Owner specific tools
│   ├── backlog/            # Backlog management & semantic search
│   └── sprint/             # Sprint management & velocity tools
├── developer/              # Developer specific tools
│   ├── sprint-backlog.ts   # Sprint backlog management
│   ├── tasks.ts           # Task management
│   ├── semantic-tasks.ts  # Task semantic search & hybrid search
│   └── semantic-sprints.ts # Sprint semantic search & hybrid search
├── scrum-master/           # Scrum Master specific tools
│   └── core/              # Sprint analysis, meetings, retrospectives
├── utils/                  # Shared utilities across all agents
│   ├── documentation/     # Documentation CRUD & semantic search
│   └── web-search.ts     # Native web search capabilities
└── schemas/               # Centralized Zod schema definitions
```

### **Key Architectural Principles**

1. **Agent-Centric Organization**: Tools grouped by AI agent responsibilities
2. **Modular Design**: Each module focuses on specific functionality
3. **Shared Utilities**: Common tools available to all agents
4. **Centralized Schemas**: Consistent validation across the system
5. **Semantic Search Integration**: AI-powered search with hybrid algorithms

## **AI Agent Tools Overview**

### **Product Owner Agent**
**Location**: `product-owner/`

#### **Backlog Management** (`backlog/`)
- **Core CRUD Operations**: Create, read, update, delete backlog items
- **Semantic Search**: AI-powered backlog discovery with hybrid search
  - Semantic search using embeddings
  - BM25 keyword search
  - Hybrid search with Reciprocal Rank Fusion (RRF)
  - Duplicate detection and similarity matching

#### **Sprint & Velocity Management** (`sprint/`)
- **Sprint CRUD**: Complete sprint lifecycle management
- **Velocity Analysis**: Historical velocity tracking and forecasting
- **Semantic Sprint Search**: Find sprints by concept and meaning

### **Developer Agent**
**Location**: `developer/`

#### **Sprint Backlog Management**
- **Sprint Focus**: Get current active sprint and backlog items
- **Backlog Review**: Analyze and update sprint backlog items
- **Task Integration**: Create and manage tasks for backlog items

#### **Task Management**
- **CRUD Operations**: Full task lifecycle management
- **Sprint Integration**: Task-to-sprint relationship management

#### **Advanced Semantic Search**
- **Task Search**: Find tasks by meaning, technology, or functionality
- **Sprint Search**: Discover sprints by themes and goals
- **Hybrid Algorithms**: Industry-standard search combining semantic + keyword
- **Similarity Detection**: Find related tasks and potential duplicates

### **Scrum Master Agent**
**Location**: `scrum-master/`

#### **Sprint Analysis & Health Monitoring**

- **Sprint Health Analysis**: Real-time progress tracking and issue detection
- **Velocity Analysis**: Historical velocity tracking and capacity planning
- **Meeting Management**: Schedule and manage Scrum ceremonies
- **Retrospective Analysis**: Pattern recognition and team coaching
- **Compliance Checking**: Scrum Guide adherence monitoring

### **Shared Utilities**
**Location**: `utils/`

#### **Documentation Management** (`documentation/`)
- **CRUD Operations**: Create, read, update, delete documentation
- **Semantic Search**: AI-powered documentation discovery
  - Field-specific search (title, description, content)
  - Multi-field search with similarity scores
  - BM25 keyword search
  - Hybrid search with RRF
- **User Management**: Author assignment and project user handling
- **Type Support**: Sprint reviews, retrospectives, requirements, user guides

#### **Web Search Integration** (`web-search.ts`)
- **Native Search**: OpenAI and Google/Gemini native search tools
- **Model-Specific**: Automatic tool selection based on AI model
- **Fallback Support**: Graceful degradation for unsupported models

## **Advanced Semantic Search Features**

### **Hybrid Search Algorithm**
All semantic search implementations now include industry-standard hybrid search:

#### **Three Search Modes**:
1. **Semantic Search**: AI embeddings for meaning-based discovery
2. **BM25 Keyword Search**: Traditional keyword matching with intelligent scoring
3. **Hybrid Search**: Combines both approaches using:
   - **Reciprocal Rank Fusion (RRF)**: Industry standard (default)
   - **Weighted Scoring**: Configurable semantic/keyword weights

#### **Key Features**:
- **Duplicate Detection**: Intelligent similarity matching
- **Comprehensive Scoring**: Multiple similarity metrics
- **Flexible Thresholds**: Adjustable similarity requirements
- **Rich Formatting**: Detailed results with match percentages

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

## **Centralized Schema Validation**

**Location**: `schemas/`

All tool inputs are validated using centralized Zod schemas organized by domain:

- **`documentation.ts`**: Documentation CRUD and search schemas
- **`semantic-backlog.ts`**: Backlog semantic search schemas  
- **`semantic-task.ts`**: Task semantic search schemas
- **`semantic-sprint.ts`**: Sprint semantic search schemas

### **Schema Benefits**:
- **Type Safety**: Full TypeScript type inference
- **Runtime Validation**: Input sanitization and validation
- **Consistent Validation**: Shared schemas across agents
- **Clear Documentation**: Schema descriptions for AI understanding

### **Example Schema Pattern**:
```typescript
// schemas/semantic-backlog.ts
export const hybridSearchBacklogSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .describe('Search query combining semantic meaning and keyword matching'),
  
  semantic_weight: z.number()
    .min(0.0, 'Weight must be between 0 and 1')
    .max(1.0, 'Weight must be between 0 and 1')
    .default(0.7)
    .describe('Weight for semantic search (default: 0.7)'),
  
  use_rrf: z.boolean()
    .default(true)
    .describe('Use Reciprocal Rank Fusion vs weighted scoring')
});

export type HybridSearchBacklogInput = z.infer<typeof hybridSearchBacklogSchema>;
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

## **Usage in AI Agents**

### **Product Owner Agent**
```typescript
import { productOwnerTools } from '@/lib/tools/product-owner';
import { getWebSearchToolsForModel } from '@/lib/tools/utils/web-search';

const result = await streamText({
  model: gateway(modelToUse),
  tools: {
    ...productOwnerTools,
    ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
  },
  messages: messages,
});
```

### **Developer Agent**
```typescript
import { developerTools } from '@/lib/tools/developer';
import { getWebSearchToolsForModel } from '@/lib/tools/utils/web-search';

const result = await streamText({
  model: gateway(modelToUse),
  tools: {
    ...developerTools,
    ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
  },
  messages: messages,
});
```

### **Scrum Master Agent**
```typescript
import { scrumMasterTools } from '@/lib/tools/scrum-master';
import { documentationTools } from '@/lib/tools/utils/documentation';
import { getWebSearchToolsForModel } from '@/lib/tools/utils/web-search';

const result = await streamText({
  model: gateway(modelToUse),
  tools: {
    ...scrumMasterTools,
    ...documentationTools,
    ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
  },
  messages: messages,
});
```

### **Individual Tool Collections**
```typescript
// Import specific tool collections
import { backlogTools, semanticBacklogManagementTools } from '@/lib/tools/product-owner/backlog';
import { sprintTools, velocityTools } from '@/lib/tools/product-owner/sprint';
import { semanticSearchTools, taskManagementTools } from '@/lib/tools/developer';
import { documentationTools } from '@/lib/tools/utils/documentation';
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

## **Extension Guidelines**

When adding new tools to the modular architecture:

### **1. Choose the Right Location**
- **Agent-Specific**: Place in appropriate agent folder (`product-owner/`, `developer/`, `scrum-master/`)
- **Shared Utilities**: Place in `utils/` if used by multiple agents
- **Schemas**: Always define schemas in `schemas/` folder

### **2. Follow Established Patterns**
```typescript
// Use centralized schemas
import { myToolSchema } from '../schemas/my-domain';

// Use shared utilities
import { requestWithAuth } from '../utils/http';

// Follow consistent tool structure
export const myTool = tool({
  description: 'Clear, detailed description for AI understanding',
  inputSchema: myToolSchema,
  execute: async (input, { experimental_context }) => {
    // Implementation
  }
});
```

### **3. Implement Semantic Search**
For new domains requiring search capabilities:
- Create schemas for semantic, BM25, and hybrid search
- Implement all three search modes for consistency
- Include duplicate detection and rich formatting
- Follow the pattern from existing semantic search implementations

### **4. Maintain Modular Exports**
```typescript
// Individual tool exports
export { myTool };

// Tool collection exports  
export const myToolCollection = {
  myTool,
  // other related tools
};

// Type definitions
export type MyToolCollection = typeof myToolCollection;
```

## **Security & Performance**

### **Security Considerations**
1. **Authentication**: All API calls require valid session cookies via `requestWithAuth`
2. **Input Validation**: Centralized Zod schemas prevent injection attacks
3. **Error Handling**: Sanitized error messages protect sensitive information
4. **Schema Validation**: Runtime validation ensures data integrity

### **Performance Optimization**
1. **Modular Loading**: Tools load only when needed by specific agents
2. **Parallel Requests**: Use Promise.all() for independent API calls
3. **Efficient Search**: Hybrid search algorithms optimize relevance vs. performance
4. **Response Streaming**: Long-running analysis uses streaming responses
5. **Centralized Utilities**: Shared code reduces bundle size

## **Migration from Legacy**

The new modular architecture replaces legacy monolithic files:

### **Legacy → New Mapping**
- `backlog-management.ts` → `product-owner/backlog/`
- `sprint-management.ts` → `product-owner/sprint/`
- `scrum-master.ts` → `scrum-master/core/`
- `documentation.ts` → `utils/documentation/`
- `schemas.ts` → `schemas/` (domain-specific files)

### **Benefits of New Architecture**
- **Agent-Focused**: Tools organized by AI agent responsibilities
- **Advanced Search**: Industry-standard hybrid search algorithms
- **Modular**: Import only what you need
- * Maintainable**: Clear separation of concerns
- * Scalable**: Easy to extend with new capabilities

This modular architecture enables powerful, specialized AI agents while maintaining code organization, security, and performance standards.
