# Velocity and Burndown Tracking Implementation

## Overview

This implementation provides efficient, Scrum-compliant velocity and burndown tracking for ScrumiX using FastAPI, SQLAlchemy, and PostgreSQL with AI-agent-friendly data structures.

## Key Features

### Sprint Velocity Tracking
- **Event-driven updates**: Velocity points are automatically updated when backlog items are marked as DONE or reopened
- **Real-time calculation**: No need for manual velocity calculations
- **Historical tracking**: Average velocity calculated on-demand from completed sprints

### Burndown Tracking
- **Daily snapshots**: Automatic creation of burndown snapshots showing completed and remaining story points
- **Trend analysis**: Built-in analysis of burndown trends with velocity calculations
- **Chart-ready data**: API endpoints provide data formatted for burndown chart visualization

## Database Schema Changes

### 1. Sprint Model Updates
```sql
-- Added velocity_points field to sprints table
ALTER TABLE sprints ADD COLUMN velocity_points INTEGER NOT NULL DEFAULT 0;
CREATE INDEX ix_sprints_velocity_points ON sprints (velocity_points);
```

### 2. Backlog Model Updates
```sql
-- Added completed_at timestamp to backlogs table
ALTER TABLE backlogs ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX ix_backlogs_completed_at ON backlogs (completed_at);
```

### 3. New BurndownSnapshot Table
```sql
CREATE TABLE burndown_snapshots (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER NOT NULL REFERENCES sprints(id),
    project_id INTEGER NOT NULL REFERENCES projects(id),
    date DATE NOT NULL,
    completed_story_point INTEGER NOT NULL DEFAULT 0,
    remaining_story_point INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE UNIQUE INDEX idx_burndown_sprint_date ON burndown_snapshots (sprint_id, date);
CREATE INDEX idx_burndown_project_date ON burndown_snapshots (project_id, date);
CREATE INDEX idx_burndown_sprint_date_points ON burndown_snapshots (sprint_id, date, completed_story_point, remaining_story_point);
```

## Implementation Components

### 1. Models (`backend/src/scrumix/api/models/`)

#### BurndownSnapshot Model
- Tracks daily progress snapshots for sprints
- Includes computed properties for total points and completion percentage
- Optimized with composite indexes for efficient queries

#### Updated Sprint Model
- Added `velocity_points` field for tracking completed story points
- Maintains relationship with burndown snapshots

#### Updated Backlog Model
- Added `completed_at` timestamp for tracking completion events
- Automatically set when status changes to DONE

### 2. CRUD Operations (`backend/src/scrumix/api/crud/`)

#### BurndownSnapshot CRUD
- `create_or_update_snapshot()`: Creates or updates daily snapshots
- `get_sprint_snapshots()`: Retrieves snapshots for burndown charts
- `calculate_burndown_trend()`: Analyzes sprint progress trends
- `get_burndown_chart_data()`: Formats data for chart visualization

### 3. Service Layer (`backend/src/scrumix/api/services/`)

#### VelocityTrackingService
- **Event-driven logic**: Handles backlog status changes automatically
- **Velocity management**: Increments/decrements sprint velocity points
- **Burndown updates**: Creates daily snapshots when items are completed
- **Analytics**: Calculates average velocity and trend analysis

### 4. API Endpoints (`backend/src/scrumix/api/routes/velocity.py`)

#### Sprint Endpoints
- `GET /velocity/sprint/{sprint_id}/burndown` - Get burndown chart data
- `GET /velocity/sprint/{sprint_id}/burndown/snapshots` - Get raw snapshots
- `GET /velocity/sprint/{sprint_id}/burndown/trend` - Get trend analysis
- `POST /velocity/sprint/{sprint_id}/burndown/backfill` - Backfill missing snapshots

#### Project Endpoints
- `GET /velocity/project/{project_id}/velocity/average` - Get average velocity
- `GET /velocity/project/{project_id}/velocity/trend` - Get velocity trend
- `GET /velocity/project/{project_id}/velocity/metrics` - Get comprehensive metrics
- `GET /velocity/project/{project_id}/burndown/summary` - Get project burndown summary

## Event-Driven Architecture

### Automatic Velocity Updates
When a backlog item status changes:

1. **DONE Status**: 
   - Set `completed_at` timestamp
   - Increment sprint `velocity_points`
   - Create/update daily burndown snapshot

2. **Reopened from DONE**:
   - Clear `completed_at` timestamp
   - Decrement sprint `velocity_points`
   - Update daily burndown snapshot

### Integration Points
- Backlog CRUD operations automatically trigger velocity updates
- Bulk status updates handle multiple items efficiently
- No manual intervention required for accurate tracking

## API Usage Examples

### Get Sprint Burndown Chart
```bash
GET /api/v1/velocity/sprint/123/burndown
```

Response:
```json
{
  "dates": ["2024-09-01", "2024-09-02", "2024-09-03"],
  "remaining_points": [30, 25, 18],
  "completed_points": [0, 5, 12],
  "total_points": [30, 30, 30],
  "ideal_line": [30, 20, 10]
}
```

### Get Project Velocity Metrics
```bash
GET /api/v1/velocity/project/456/velocity/metrics
```

Response:
```json
{
  "project_id": 456,
  "total_completed_sprints": 5,
  "average_velocity": 13.2,
  "min_velocity": 8,
  "max_velocity": 20,
  "velocity_trend": [...],
  "total_story_points": 66
}
```

## Performance Optimizations

### Database Indexes
- Composite indexes for common query patterns
- Unique constraints prevent duplicate snapshots
- Optimized for time-series queries

### Efficient Queries
- Single queries for burndown data retrieval
- Batch operations for multiple backlog updates
- On-demand calculations avoid pre-computation overhead

### Scalable Architecture
- Event-driven updates minimize database load
- Stateless service design enables horizontal scaling
- Indexed queries support large datasets

## AI Agent Integration

### Structured Data Format
- Consistent JSON schemas for all endpoints
- Standardized field names across models
- Comprehensive metadata in API responses

### Analytical Capabilities
- Trend analysis with actionable insights
- Velocity predictions and projections
- Progress tracking with completion percentages

### Query Flexibility
- Date range filtering for historical analysis
- Project-level aggregations
- Sprint-specific detailed views

## Testing

The implementation includes comprehensive tests covering:
- Velocity increment/decrement on status changes
- Burndown snapshot creation and updates
- Trend analysis calculations
- Average velocity computations
- Edge cases and error handling

## Migration Applied

The database migration `23d40bd15071_add_velocity_tracking_and_burndown_snapshots` has been successfully applied, adding all necessary schema changes.

## Health Check

Velocity tracking system health can be verified via:
```bash
GET /api/v1/velocity/health
```

Response:
```json
{
  "status": "healthy",
  "service": "velocity_tracking"
}
```

## Next Steps

1. **Frontend Integration**: Connect the velocity API endpoints to dashboard components
2. **Reporting**: Add sprint retrospective reports using velocity data
3. **Alerts**: Implement notifications for velocity anomalies
4. **Forecasting**: Add sprint completion date predictions based on current velocity

## Compliance

This implementation follows Scrum best practices:
- ✅ Velocity calculated from completed story points only
- ✅ Burndown charts show daily progress
- ✅ Historical data preserved for retrospectives
- ✅ Real-time updates reflect current sprint status
- ✅ No manual data entry required for accuracy
