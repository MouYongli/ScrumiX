# Semantic Search Integration for Product Owner Agent

## Overview

The Product Owner agent now has enhanced AI-powered semantic search capabilities using pgvector embeddings. This allows for intelligent discovery of backlog items and documentation based on meaning and context, not just keyword matching.

## New Capabilities Added

### 🧠 Semantic Backlog Search Tools

1. **semanticSearchBacklog** - AI-powered understanding of query meaning
2. **hybridSearchBacklog** - Combines semantic + keyword search  
3. **findSimilarBacklog** - Discovers related items using AI embeddings

### 📚 Semantic Documentation Search Tools

1. **searchDocumentationByField** - Targeted search in specific fields
2. **searchDocumentationMultiField** - Comprehensive multi-field search

## When to Use Each Tool

### Traditional Search (getBacklogItems)
- ✅ **Use for**: Exact text matches, specific keywords, filtering by status/priority
- ✅ **Examples**: "Find all items with 'login' in title", "Show high priority bugs"

### Semantic Search (semanticSearchBacklog)
- ✅ **Use for**: Conceptual queries, finding related features by meaning
- ✅ **Examples**: "authentication features", "user onboarding flow", "payment processing"

### Hybrid Search (hybridSearchBacklog)  
- ✅ **Use for**: Comprehensive discovery combining both approaches
- ✅ **Examples**: Complex queries where you want both exact matches and conceptual results

### Similar Items (findSimilarBacklog)
- ✅ **Use for**: Finding dependencies, templates, potential duplicates
- ✅ **Examples**: "Find items similar to this user story", "What work is related to item #123?"

## pgVector Models Available

### Backlog Items
- **Field**: Combined embedding (1536 dimensions)
- **Content**: Title + Description + Acceptance Criteria + Type + Priority
- **Use Cases**: Feature discovery, story similarity, dependency mapping

### Projects  
- **Field**: Combined embedding (1536 dimensions)
- **Content**: Name + Description + Status
- **Use Cases**: Project discovery, similar project identification

### Documentation
- **Fields**: Separate embeddings for title, description, content
- **Content**: Field-specific semantic understanding
- **Use Cases**: Requirements discovery, meeting notes, design docs

### Acceptance Criteria
- **Field**: Title embedding (1536 dimensions) 
- **Content**: Criteria description
- **Use Cases**: Finding similar acceptance patterns

## Example Usage Scenarios

### Scenario 1: Feature Discovery
**User Query**: "I need to find all authentication-related work in the project"

**Agent Response**: Uses `semanticSearchBacklog` with query "authentication security login user verification" to find:
- Login functionality items
- Password reset features  
- Two-factor authentication
- User verification stories
- Security-related bugs

### Scenario 2: Avoiding Duplicate Work
**User Query**: "Before creating a new payment feature, check if similar work exists"

**Agent Response**: 
1. Uses `semanticSearchBacklog` with "payment processing checkout billing"
2. If items found, uses `findSimilarBacklog` on most relevant items
3. Provides analysis of existing work and recommendations

### Scenario 3: Sprint Planning Support
**User Query**: "Find items similar to this completed user story for estimation reference"

**Agent Response**: Uses `findSimilarBacklog` with the completed item ID to find:
- Similar complexity items
- Related features for context
- Estimation patterns from similar work

### Scenario 4: Requirements Research
**User Query**: "Find documentation about user registration requirements"

**Agent Response**: Uses `searchDocumentationMultiField` with "user registration signup account creation" to find:
- Requirements documents
- Design specifications  
- Meeting notes with registration discussions
- User guides with registration flows

## Technical Implementation

### Frontend Tools Structure
```typescript
// Enhanced backlog management tools
export const backlogManagementTools = {
  // Core functionality
  createBacklogItem,
  getBacklogItems,
  
  // Semantic search capabilities
  semanticSearchBacklog,
  hybridSearchBacklog, 
  findSimilarBacklog,
  
  // Documentation search
  searchDocumentationByField,
  searchDocumentationMultiField
};
```

### Backend API Endpoints
```
POST /api/v1/semantic-search/semantic-search
POST /api/v1/semantic-search/hybrid-search  
GET  /api/v1/semantic-search/similar/{backlog_id}
POST /api/v1/semantic-search/documentation/field-search
POST /api/v1/semantic-search/documentation/multi-field-search
```

### Database Schema
```sql
-- Backlog items with combined embedding
ALTER TABLE backlogs ADD COLUMN embedding vector(1536);
ALTER TABLE backlogs ADD COLUMN embedding_updated_at timestamptz;

-- Projects with combined embedding  
ALTER TABLE projects ADD COLUMN embedding vector(1536);
ALTER TABLE projects ADD COLUMN embedding_updated_at timestamptz;

-- Documentation with field-specific embeddings
ALTER TABLE documentations ADD COLUMN title_embedding vector(1536);
ALTER TABLE documentations ADD COLUMN description_embedding vector(1536);
ALTER TABLE documentations ADD COLUMN content_embedding vector(1536);

-- Acceptance criteria with title embedding
ALTER TABLE acceptance_criteria ADD COLUMN embedding vector(1536);
```

## Testing the Integration

### Run Test Script
```bash
cd backend
python test_semantic_integration.py
```

### Test Cases Covered
- ✅ Embedding generation (single and batch)
- ✅ Semantic search functionality  
- ✅ Hybrid search combining approaches
- ✅ Similar items discovery
- ✅ Embedding update processes
- ✅ API endpoint availability

### Manual Testing Examples

1. **Semantic Search Test**:
   - Query: "user authentication features"
   - Expected: Items related to login, passwords, security

2. **Hybrid Search Test**:
   - Query: "payment checkout"  
   - Expected: Both exact "payment" matches and conceptually related billing items

3. **Similar Items Test**:
   - Use ID of existing item
   - Expected: Related items in same project with similarity scores

## Performance Considerations

### Embedding Generation
- **When**: Triggered on item creation/update
- **Cost**: ~1-2ms per item for OpenAI embeddings
- **Storage**: 1536 dimensions × 4 bytes = ~6KB per embedding

### Search Performance  
- **HNSW Index**: Optimized for high-dimensional vector similarity
- **Query Time**: <10ms for most searches
- **Scalability**: Handles thousands of items efficiently

### Optimization Tips
- Use similarity thresholds (0.6-0.8) to filter results
- Limit results to reasonable numbers (10-20)
- Update embeddings asynchronously when possible

## Future Enhancements

### Planned Improvements
1. **Cross-Project Search**: Find similar work across all projects
2. **Temporal Embeddings**: Consider time-based relevance
3. **User Preference Learning**: Adapt to user search patterns
4. **Multi-Language Support**: Handle different languages in content

### Integration Opportunities
1. **Sprint Planning**: Auto-suggest related items for sprints
2. **Backlog Refinement**: Identify items needing breakdown
3. **Dependency Detection**: Auto-discover item relationships
4. **Duplicate Prevention**: Warn when creating similar items

## Troubleshooting

### Common Issues

**No search results returned**:
- Lower similarity threshold (try 0.5 or 0.4)
- Check if embeddings are generated (`embedding_updated_at` not null)
- Verify OpenAI API key configuration

**Poor search quality**:
- Update embeddings with `force=true`
- Check embedding model version consistency
- Review searchable content generation

**Performance issues**:
- Verify HNSW indexes are created
- Check query complexity and result limits
- Monitor embedding generation queue

### Debug Commands
```bash
# Check embedding status
SELECT COUNT(*) FROM backlogs WHERE embedding IS NOT NULL;

# Force embedding updates  
POST /api/v1/semantic-search/update-embeddings {"force": true}

# Test single item embedding
POST /api/v1/semantic-search/update-embedding/{item_id}?force=true
```

## Conclusion

The semantic search integration transforms the Product Owner agent from a simple keyword-based tool into an intelligent assistant that understands context and meaning. This enables more effective backlog management, better feature discovery, and improved project planning through AI-powered insights.

The integration maintains backward compatibility while adding powerful new capabilities that enhance the Product Owner's workflow and decision-making process.
