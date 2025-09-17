# Velocity and Ideal Burndown Chart Fixes

## Overview

Fixed two critical issues with the burndown chart system:
1. Sprint velocity not updating when story points of user stories/bugs are modified
2. Ideal burndown chart not respecting weekends (should remain flat on weekends)

## Issue 1: Sprint Velocity Updates on Story Point Changes

### Problem
When users updated story points for completed backlog items of type "user story" or "bug", the sprint velocity was not recalculated, leading to outdated velocity information.

### Solution
Enhanced the `update_backlog` method in `BacklogCRUD` to detect story point changes and recalculate sprint velocity.

**File:** `backend/src/scrumix/api/crud/backlog.py`

### Changes Made

#### 1. Enhanced Update Tracking
```python
# Store old values for velocity tracking
old_status = backlog.status
old_story_points = backlog.story_point
old_item_type = backlog.item_type
```

#### 2. Story Point Change Detection
```python
# Story point changes for completed user stories/bugs trigger velocity recalculation
elif (backlog.sprint_id and 
      backlog.status == BacklogStatus.DONE and 
      backlog.item_type in [BacklogType.STORY, BacklogType.BUG] and
      "story_point" in update_data and 
      new_story_points != old_story_points):
    
    # Recalculate sprint velocity when story points change for completed items
    self._recalculate_sprint_velocity(db, backlog.sprint_id)
    needs_burndown_update = True
```

#### 3. Item Type Change Detection
```python
# Item type changes for completed items with story points trigger velocity recalculation
elif (backlog.sprint_id and 
      backlog.status == BacklogStatus.DONE and 
      backlog.story_point and
      "item_type" in update_data and 
      new_item_type != old_item_type):
    
    # Recalculate sprint velocity when item type changes for completed items
    self._recalculate_sprint_velocity(db, backlog.sprint_id)
    needs_burndown_update = True
```

#### 4. New Velocity Recalculation Method
```python
def _recalculate_sprint_velocity(self, db: Session, sprint_id: int) -> None:
    """Recalculate sprint velocity based on completed story points"""
    from ..models.sprint import Sprint
    
    # Calculate total completed story points for user stories and bugs only
    completed_points = db.query(func.sum(Backlog.story_point)).filter(
        and_(
            Backlog.sprint_id == sprint_id,
            Backlog.status == BacklogStatus.DONE,
            Backlog.item_type.in_([BacklogType.STORY, BacklogType.BUG]),
            Backlog.story_point.isnot(None)
        )
    ).scalar() or 0
    
    # Update sprint velocity
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if sprint:
        sprint.velocity_points = completed_points
        sprint.updated_at = datetime.utcnow()
        db.commit()
```

### Trigger Conditions
The system now updates sprint velocity when:
- ✅ **Story points are modified** for completed user stories or bugs
- ✅ **Item type is changed** for completed items with story points
- ✅ **Status changes** (existing functionality maintained)

### Scope
- Only affects **completed items** (status = DONE)
- Only considers **user stories** and **bugs** for velocity calculation
- Automatically updates **burndown snapshots** when velocity changes

## Issue 2: Ideal Burndown Chart Weekend Behavior

### Problem
The ideal burndown line decreased linearly every day, including weekends (Saturday and Sunday), which is unrealistic since teams typically don't work on weekends.

### Solution
Modified the frontend ideal burndown calculation to only decrease on working days and remain flat on weekends.

**File:** `frontend/src/app/project/[project-id]/sprint/[sprint-id]/page.tsx`

### Changes Made

#### Enhanced Ideal Burndown Calculation
```typescript
// Calculate ideal burndown for this day (only decrease on working days)
const initialTotal = chartData.initial_total_points;
let idealRemaining = initialTotal;

if (chartData.dates.length > 1) {
  // Count working days up to this point
  let workingDaysElapsed = 0;
  let totalWorkingDays = 0;
  
  // Count total working days in sprint
  for (let i = 0; i < chartData.dates.length; i++) {
    const dayDate = new Date(chartData.dates[i]);
    const dayOfWeek = dayDate.getDay();
    const isDayWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday or Saturday
    
    if (isDayWorkingDay) {
      totalWorkingDays++;
      if (i <= index) {
        workingDaysElapsed++;
      }
    }
  }
  
  // Calculate ideal remaining based on working days only
  if (totalWorkingDays > 0) {
    if (isWorkingDay) {
      // Working day: decrease linearly based on working days elapsed
      idealRemaining = initialTotal * (1 - ((workingDaysElapsed - 1) / (totalWorkingDays - 1)));
    } else {
      // Weekend: carry forward from previous working day
      // ... carry forward logic
    }
  }
}
```

### Behavior Changes

#### Before Fix
- Ideal line decreased every day: Mon ↘️ Tue ↘️ Wed ↘️ Thu ↘️ Fri ↘️ **Sat ↘️ Sun ↘️** Mon ↘️

#### After Fix  
- Ideal line only decreases on working days: Mon ↘️ Tue ↘️ Wed ↘️ Thu ↘️ Fri ↘️ **Sat ➡️ Sun ➡️** Mon ↘️

### Weekend Logic
- **Working Days (Mon-Fri):** Ideal burndown decreases linearly
- **Weekends (Sat-Sun):** Ideal burndown remains flat (carries forward from Friday)
- **Calculation:** Based on working days only, not calendar days

## Benefits

### 1. Accurate Velocity Tracking
- ✅ Sprint velocity always reflects current story point totals
- ✅ Real-time updates when story points are modified
- ✅ Proper filtering for user stories and bugs only
- ✅ Automatic burndown chart updates

### 2. Realistic Ideal Burndown
- ✅ Respects typical work schedules (no weekend work)
- ✅ More accurate project planning and expectations
- ✅ Better comparison between ideal and actual progress
- ✅ Industry-standard burndown chart behavior

### 3. Enhanced User Experience
- ✅ Immediate feedback when making story point changes
- ✅ Accurate velocity calculations for sprint planning
- ✅ Realistic burndown projections
- ✅ Professional-grade Scrum tool behavior

## Technical Implementation

### Backend Changes
- Enhanced `update_backlog` method with comprehensive change detection
- New `_recalculate_sprint_velocity` method for velocity updates
- Automatic burndown snapshot refresh on velocity changes
- Proper transaction handling and database commits

### Frontend Changes
- Working day-aware ideal burndown calculation
- Weekend carry-forward logic implementation
- Proper working day counting algorithm
- Maintained existing chart visualization

### Integration Points
- Existing velocity tracking service integration
- Burndown snapshot system compatibility  
- No breaking changes to existing APIs
- Backward compatible with existing data

## Testing Scenarios

### Velocity Updates
1. ✅ Update story points for completed user story → Velocity recalculates
2. ✅ Update story points for completed bug → Velocity recalculates  
3. ✅ Update story points for incomplete item → No velocity change
4. ✅ Update story points for task/epic → No velocity change
5. ✅ Change item type from story to task → Velocity recalculates

### Ideal Burndown
1. ✅ Sprint with weekends → Ideal line flat on Sat/Sun
2. ✅ Sprint starting on weekend → Proper working day calculation
3. ✅ Short sprint (2-3 days) → Correct ideal line behavior
4. ✅ Long sprint (3+ weeks) → Consistent weekend handling

This implementation ensures accurate velocity tracking and realistic burndown projections, bringing the system in line with professional Scrum tool standards.

