# Event-Driven Burndown Chart Tracking System

## Overview

This implementation provides a comprehensive event-driven burndown chart tracking system for ScrumiX that automatically updates burndown snapshots when backlog items are completed, and generates complete sprint timeline charts with carry-forward values for days without completions.

## Key Features

### 1. Event-Driven Updates

**When a backlog item's status changes to DONE:**
- ✅ Automatically creates or updates a burndown snapshot for the current day
- ✅ Only creates snapshots when items are actually completed (not for other status changes)
- ✅ Updates existing snapshots if multiple items are completed on the same day
- ✅ Maintains cumulative completed story points for accurate tracking

**Implementation Location:** `backend/src/scrumix/api/services/velocity_tracking.py`

```python
def _update_burndown_snapshot(self, db: Session, sprint_id: int, project_id: int):
    """
    Update or create burndown snapshot for today when backlog items are completed.
    
    This method implements event-driven burndown tracking:
    - Only creates/updates snapshots when backlog items are actually completed
    - Updates existing snapshots if items are completed on the same day
    - Maintains cumulative completed story points for accurate burndown tracking
    """
```

### 2. Complete Sprint Timeline Generation

**Chart data includes all sprint days:**
- ✅ Generates data for every day from sprint start to end (or today if ongoing)
- ✅ Carries forward values for days without completions
- ✅ Shows 0 completed points for days with no activity
- ✅ Provides proper ideal burndown line based on sprint duration

**Implementation Location:** `backend/src/scrumix/api/crud/burndown_snapshot.py`

```python
def get_burndown_chart_data(self, db: Session, sprint_id: int) -> Dict[str, Any]:
    """
    Get formatted data for burndown chart visualization with complete sprint timeline.
    
    This method generates chart data for all days in the sprint duration, including:
    - Days with actual snapshots (from completed backlog items)
    - Days without snapshots (carry forward previous values)
    - Proper ideal burndown line based on sprint duration
    """
```

### 3. Integration Points

**Automatic Integration:**
- ✅ Integrated with existing backlog CRUD update operations
- ✅ Works with both single item updates and bulk status updates
- ✅ Maintains backward compatibility with existing velocity tracking

**Integration Points:**
- `backend/src/scrumix/api/crud/backlog.py` - `update_backlog()` method
- `backend/src/scrumix/api/crud/backlog.py` - `bulk_update_status()` method
- `backend/src/scrumix/api/routes/backlogs.py` - Status update endpoints

## API Endpoints

### Enhanced Burndown Chart Data
```
GET /api/v1/velocity/sprint/{sprint_id}/burndown
```

**Response includes:**
```json
{
  "dates": ["2024-01-01", "2024-01-02", "2024-01-03", ...],
  "remaining_points": [10, 10, 7, ...],
  "completed_points": [0, 0, 3, ...],
  "total_points": [10, 10, 10, ...],
  "ideal_line": [10.0, 7.5, 5.0, ...],
  "sprint_duration_days": 10,
  "snapshots_with_data": 3,
  "initial_total_points": 10
}
```

### Initialize Sprint Burndown
```
POST /api/v1/velocity/sprint/{sprint_id}/burndown/initialize
```

Creates an initial baseline snapshot for sprint start date with 0 completed points.

## Data Flow

### 1. Backlog Item Completion Flow

```
Backlog Status Update → DONE
    ↓
VelocityTrackingService.update_backlog_completion_status()
    ↓
_update_burndown_snapshot()
    ↓
Check if snapshot exists for today
    ↓
If exists: Update completed/remaining points
If not: Create new snapshot with current totals
```

### 2. Chart Data Generation Flow

```
Request burndown chart data
    ↓
Get sprint date range (start to end/today)
    ↓
Get all existing snapshots
    ↓
Generate data for each day:
  - If snapshot exists: Use actual values
  - If no snapshot: Carry forward last known values
    ↓
Calculate ideal burndown line
    ↓
Return complete timeline data
```

## Database Schema

### BurndownSnapshot Model

```python
class BurndownSnapshot(Base):
    id = Column(Integer, primary_key=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    date = Column(Date, nullable=False)
    completed_story_point = Column(Integer, default=0)
    remaining_story_point = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
```

**Key Indexes:**
- Unique constraint on (sprint_id, date) - one snapshot per day per sprint
- Performance indexes for common queries

## Testing

### Test Coverage

**Event-Driven Functionality:**
- ✅ Snapshot creation only on DONE status changes
- ✅ Snapshot updates for multiple completions on same day
- ✅ No snapshot creation for non-completion status changes

**Chart Data Generation:**
- ✅ Complete timeline generation with carry-forward values
- ✅ Proper ideal line calculation
- ✅ Accurate metadata (duration, snapshots with data, etc.)

**Test Location:** `backend/tests/test_velocity_tracking.py`

## Benefits

### 1. Performance
- Only creates snapshots when needed (actual completions)
- Efficient chart data generation with minimal database queries
- Proper indexing for fast lookups

### 2. Accuracy
- Event-driven updates ensure real-time accuracy
- Cumulative calculations prevent double-counting
- Complete timeline shows true sprint progress

### 3. User Experience
- Charts always show complete sprint timeline
- Clear visualization of progress vs. ideal
- Metadata helps understand data completeness

### 4. Scalability
- Minimal database writes (only on completions)
- Efficient carry-forward logic
- Proper transaction handling

## Usage Examples

### Frontend Integration

```typescript
// Get complete burndown chart data
const chartData = await api.get(`/velocity/sprint/${sprintId}/burndown`);

// Data includes all sprint days, even those without completions
chartData.dates.forEach((date, index) => {
  const completed = chartData.completed_points[index];
  const remaining = chartData.remaining_points[index];
  const ideal = chartData.ideal_line[index];
  
  // Render chart point for this date
  renderChartPoint(date, completed, remaining, ideal);
});
```

### Initialize Sprint Tracking

```typescript
// When starting a new sprint
await api.post(`/velocity/sprint/${sprintId}/burndown/initialize`);
```

## Migration Considerations

- ✅ Fully backward compatible with existing data
- ✅ No breaking changes to existing APIs
- ✅ Enhanced response schemas with additional metadata
- ✅ Existing snapshots work with new chart generation logic

## Configuration

No additional configuration required. The system uses existing:
- Database connections
- Sprint date ranges
- Backlog story points
- UTC timezone handling

## Monitoring

The system provides metadata for monitoring:
- `snapshots_with_data` - Days with actual completions
- `sprint_duration_days` - Total sprint timeline
- `initial_total_points` - Sprint scope

This helps identify:
- Sprints with limited activity
- Data completeness issues
- Sprint scope changes
