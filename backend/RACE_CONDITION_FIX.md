# Race Condition Fix: Story Point Updates and Velocity Calculation

## Problem Description

There was a race condition in the backlog update process where:

1. User updates story points for a backlog item
2. Backend immediately calculates velocity **before** committing the story point changes
3. Velocity calculation queries the database and gets **outdated story point values**
4. Result: Velocity shows incorrect/outdated information

## Root Cause

The issue was in the `update_backlog` method in `BacklogCRUD` where velocity recalculation happened **before** the database transaction was committed:

### Before Fix (Race Condition)
```python
# Apply updates to backlog object (in memory only)
for field, value in update_data.items():
    setattr(backlog, field, value)

# Calculate velocity BEFORE committing changes
if story_points_changed:
    self._recalculate_sprint_velocity(db, sprint_id)  # ❌ Reads old values!

# Commit changes (too late!)
db.commit()
```

## Solution

Restructured the update flow to ensure database changes are committed **before** velocity recalculation:

### After Fix (Proper Sequence)
```python
# Apply updates to backlog object
for field, value in update_data.items():
    setattr(backlog, field, value)

# FIRST: Commit the backlog changes to ensure they're persisted
db.commit()
db.refresh(backlog)

# THEN: Handle velocity and burndown tracking with committed data
if story_points_changed:
    self._recalculate_sprint_velocity(db, sprint_id)  # ✅ Reads fresh values!
```

## Key Changes Made

**File:** `backend/src/scrumix/api/crud/backlog.py`

### 1. Moved Database Commit Before Velocity Calculation
```python
# First, commit the backlog changes to ensure they're persisted
db.commit()
db.refresh(backlog)

# Now handle velocity and burndown tracking with committed data
new_status = backlog.status
new_story_points = backlog.story_point
new_item_type = backlog.item_type
```

### 2. Added Clear Comments for Timing
```python
# Recalculate sprint velocity when story points change for completed items
# Now the updated story points are already committed to the database
self._recalculate_sprint_velocity(db, backlog.sprint_id)
```

### 3. Simplified Transaction Flow
- **Single commit point** for backlog changes
- **Separate commits** for velocity and burndown updates
- **Clear separation** between data updates and derived calculations

## Benefits

### ✅ **Data Consistency**
- Velocity calculations always use the **latest committed values**
- No more race conditions between updates and calculations
- Accurate sprint metrics immediately after story point changes

### ✅ **Reliable User Experience**
- Users see **immediate and correct** velocity updates
- Story point changes are **instantly reflected** in sprint metrics
- No need to refresh page or wait for background updates

### ✅ **Robust Transaction Handling**
- Proper **commit sequencing** ensures data integrity
- **Error handling** maintains database consistency
- **Clear separation** of concerns between data and calculations

## Technical Details

### Transaction Flow
1. **Apply updates** to backlog object (in-memory)
2. **Commit transaction** to persist backlog changes
3. **Refresh object** to ensure latest state
4. **Calculate velocity** using fresh database values
5. **Update related entities** (burndown snapshots, etc.)

### Affected Operations
- ✅ **Story point updates** for completed user stories/bugs
- ✅ **Item type changes** for completed items with story points
- ✅ **Status changes** (existing functionality maintained)
- ✅ **Bulk updates** (already handled correctly)

### Database Queries
- Velocity calculation now queries **committed data**
- Burndown snapshots use **up-to-date story points**
- Sprint metrics reflect **real-time changes**

## Testing Scenarios

### Before Fix (Race Condition)
1. User updates story points from 5 to 8
2. Velocity calculation runs → queries database → gets old value (5)
3. Database commits new value (8)
4. Result: Velocity shows incorrect calculation based on 5 points

### After Fix (Proper Sequence)
1. User updates story points from 5 to 8
2. Database commits new value (8)
3. Velocity calculation runs → queries database → gets new value (8)
4. Result: Velocity shows correct calculation based on 8 points

## Performance Impact

### ✅ **Minimal Performance Change**
- Same number of database operations
- Slightly better transaction isolation
- No additional overhead

### ✅ **Improved Reliability**
- Eliminates data inconsistency issues
- Reduces debugging complexity
- Ensures predictable behavior

## Backward Compatibility

- ✅ **No breaking changes** to existing APIs
- ✅ **Same response format** and timing
- ✅ **Existing tests** continue to work
- ✅ **Frontend integration** unchanged

This fix ensures that velocity calculations always use the most recent story point values, eliminating the race condition and providing users with accurate, real-time sprint metrics.
