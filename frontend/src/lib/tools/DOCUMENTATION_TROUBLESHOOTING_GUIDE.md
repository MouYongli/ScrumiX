# Documentation Tools Troubleshooting Guide

## Issue: Agents Getting Stuck in Loading State

### Problem Description
When agents attempt to use documentation CRUD operations (like summarizing content), they get stuck in a loading state and don't respond.

### Root Cause Analysis
The issue was caused by incorrect URL construction in the documentation API calls, leading to malformed requests that would timeout or fail silently.

## Fixes Implemented

### 1. URL Construction Fix
**Problem**: Double slashes in API URLs
```typescript
// Before (incorrect)
const url = `${baseUrl}/documentations/${endpoint}`;
// Would create: /documentations// for empty endpoints

// After (fixed)
const url = `${baseUrl}/documentations${endpoint ? `/${endpoint}` : ''}`;
// Creates: /documentations for empty endpoints
```

### 2. Enhanced Error Handling and Logging
Added comprehensive logging to help diagnose issues:
```typescript
console.log(`Documentation API call: ${method} ${url}`);
console.log('Request body:', JSON.stringify(body, null, 2));
console.log(`Response status: ${response.status} ${response.statusText}`);
```

### 3. API Connectivity Test Tool
Added `testDocumentationApi` tool to all agents for diagnosing connection issues:
- Tests basic API connectivity
- Validates authentication
- Provides detailed troubleshooting steps
- Returns clear error messages

### 4. Schema Validation
Verified that our tool schemas match the backend exactly:
- ✅ `DocumentationCreate` fields match backend schema
- ✅ `DocumentationUpdate` fields match backend schema
- ✅ `DocumentationType` enum values match backend
- ✅ Field validation rules are consistent

## Tools Available for Troubleshooting

### For All Agents
- `testDocumentationApi`: Test API connectivity and authentication
- `getDocumentation`: Browse existing documentation (basic connectivity test)
- `getDocumentationById`: Get specific documentation (ID validation test)

### Error Patterns and Solutions

#### 1. "Authentication context missing"
**Cause**: No cookies passed to tool execution
**Solution**: Ensure user is logged in and cookies are being forwarded

#### 2. "HTTP 404: Not Found"
**Cause**: Incorrect API endpoint or documentation ID doesn't exist
**Solution**: Use `testDocumentationApi` to verify base connectivity

#### 3. "HTTP 500: Internal Server Error"
**Cause**: Backend service issue or database connectivity
**Solution**: Check backend logs and database connection

#### 4. Tool execution timeout/stuck
**Cause**: Network issues or malformed requests
**Solution**: Check console logs for detailed error information

## Usage Instructions for Each Agent

### Product Owner Agent
```
User: "Can you test if documentation is working?"
Agent: Uses testDocumentationApi tool to verify connectivity

User: "Summarize our requirements documentation"
Agent: 
1. Uses getDocumentation with project filter
2. Finds requirements documents
3. Uses getDocumentationById for detailed content
4. Provides summary
```

### Developer Agent
```
User: "Find technical documentation about authentication"
Agent:
1. Uses searchDocumentationByField with field="content" and query="authentication"
2. Reviews results
3. Uses getDocumentationById for detailed content if needed
```

### Scrum Master Agent
```
User: "Show me recent meeting notes"
Agent:
1. Uses getDocumentation with doc_type="meeting_notes"
2. Filters by recent dates
3. Provides summary of recent meetings
```

## Diagnostic Steps

### Step 1: Basic Connectivity
```
Use testDocumentationApi tool
- If successful: API is working, proceed to specific operations
- If failed: Check backend service and authentication
```

### Step 2: Authentication Check
```
Use getDocumentation tool with no filters
- If successful: Authentication is working
- If failed: Check user login status and cookie forwarding
```

### Step 3: Specific Operations
```
Test specific CRUD operations:
- Create: Use createDocumentation with minimal data
- Read: Use getDocumentationById with known ID
- Update: Use updateDocumentation with existing document
- Search: Use searchDocumentationByField with simple query
```

## Backend Verification

### Check Backend Service
1. Verify backend is running on correct port
2. Check `/api/v1/documentations/` endpoint accessibility
3. Verify database connectivity
4. Check authentication service status

### API Endpoint Verification
```bash
# Test basic endpoint
curl -X GET "http://localhost:8000/api/v1/documentations/" \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json"

# Expected: 200 OK with documentation array
```

## Environment Variables
Ensure correct configuration:
- `NEXT_PUBLIC_API_BASE_URL`: Should point to backend API
- Backend database connection working
- Authentication service configured

## Recent Changes Made

1. **Fixed URL construction** in `documentation-management.ts`
2. **Added debug logging** for all API calls
3. **Created test tool** for connectivity diagnosis
4. **Updated agent prompts** with troubleshooting guidance
5. **Verified schema compatibility** with backend

## Testing the Fix

### Manual Test Steps
1. Login to ScrumiX application
2. Navigate to any agent (Product Owner, Developer, or Scrum Master)
3. Ask: "Can you test the documentation API?"
4. Agent should use `testDocumentationApi` and report success
5. Ask: "Show me existing documentation"
6. Agent should use `getDocumentation` and show results
7. Ask: "Get details for documentation ID 1" (if exists)
8. Agent should use `getDocumentationById` and show details

### Expected Behavior
- No more loading state hangs
- Clear error messages if issues occur
- Successful CRUD operations when backend is accessible
- Helpful troubleshooting guidance from agents

## Monitoring and Logging

Check browser console for:
- API call logs with URLs and status codes
- Request/response bodies for debugging
- Error messages with specific details
- Authentication context information

The fixes ensure that all three agents can now successfully execute documentation CRUD operations without getting stuck in loading states.
