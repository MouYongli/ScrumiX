"""
CRUD operations for Burndown Snapshots
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from datetime import date, datetime, timedelta

from .base import CRUDBase
from ..models.burndown_snapshot import BurndownSnapshot
from ..schemas.burndown_snapshot import BurndownSnapshotCreate, BurndownSnapshotUpdate


class BurndownSnapshotCRUD(CRUDBase[BurndownSnapshot, BurndownSnapshotCreate, BurndownSnapshotUpdate]):
    """CRUD operations for Burndown Snapshots."""
    
    def get_by_sprint_and_date(
        self, 
        db: Session, 
        sprint_id: int, 
        snapshot_date: date
    ) -> Optional[BurndownSnapshot]:
        """Get burndown snapshot by sprint ID and date"""
        return db.query(BurndownSnapshot).filter(
            and_(
                BurndownSnapshot.sprint_id == sprint_id,
                BurndownSnapshot.date == snapshot_date
            )
        ).first()
    
    def get_sprint_snapshots(
        self, 
        db: Session, 
        sprint_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[BurndownSnapshot]:
        """Get all burndown snapshots for a sprint, optionally filtered by date range"""
        query = db.query(BurndownSnapshot).filter(BurndownSnapshot.sprint_id == sprint_id)
        
        if start_date:
            query = query.filter(BurndownSnapshot.date >= start_date)
        
        if end_date:
            query = query.filter(BurndownSnapshot.date <= end_date)
        
        return query.order_by(BurndownSnapshot.date.asc()).all()
    
    def get_project_snapshots(
        self, 
        db: Session, 
        project_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[BurndownSnapshot]:
        """Get all burndown snapshots for a project, optionally filtered by date range"""
        query = db.query(BurndownSnapshot).filter(BurndownSnapshot.project_id == project_id)
        
        if start_date:
            query = query.filter(BurndownSnapshot.date >= start_date)
        
        if end_date:
            query = query.filter(BurndownSnapshot.date <= end_date)
        
        return query.order_by(BurndownSnapshot.date.asc()).all()
    
    def create_or_update_snapshot(
        self, 
        db: Session, 
        sprint_id: int,
        project_id: int,
        snapshot_date: date,
        completed_story_points: int,
        remaining_story_points: int
    ) -> BurndownSnapshot:
        """Create a new snapshot or update existing one for the same date"""
        existing = self.get_by_sprint_and_date(db, sprint_id, snapshot_date)
        
        if existing:
            # Update existing snapshot
            existing.completed_story_point = completed_story_points
            existing.remaining_story_point = remaining_story_points
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new snapshot
            snapshot_data = BurndownSnapshotCreate(
                sprint_id=sprint_id,
                project_id=project_id,
                date=snapshot_date,
                completed_story_point=completed_story_points,
                remaining_story_point=remaining_story_points
            )
            return self.create(db, obj_in=snapshot_data)
    
    def get_latest_snapshot(self, db: Session, sprint_id: int) -> Optional[BurndownSnapshot]:
        """Get the latest burndown snapshot for a sprint"""
        return db.query(BurndownSnapshot).filter(
            BurndownSnapshot.sprint_id == sprint_id
        ).order_by(desc(BurndownSnapshot.date)).first()
    
    def calculate_burndown_trend(
        self, 
        db: Session, 
        sprint_id: int
    ) -> Dict[str, Any]:
        """Calculate burndown trend analysis for a sprint"""
        snapshots = self.get_sprint_snapshots(db, sprint_id)
        
        if not snapshots:
            return {
                "total_snapshots": 0,
                "trend": "no_data",
                "velocity": 0.0,
                "projected_completion": None,
                "is_on_track": False
            }
        
        # Sort by date to ensure proper order
        snapshots.sort(key=lambda x: x.date)
        
        # Calculate daily velocity (story points completed per day)
        daily_velocities = []
        for i in range(1, len(snapshots)):
            prev_snapshot = snapshots[i-1]
            curr_snapshot = snapshots[i]
            
            days_diff = (curr_snapshot.date - prev_snapshot.date).days
            if days_diff > 0:
                points_completed = curr_snapshot.completed_story_point - prev_snapshot.completed_story_point
                daily_velocity = points_completed / days_diff
                daily_velocities.append(daily_velocity)
        
        # Calculate average velocity
        avg_velocity = sum(daily_velocities) / len(daily_velocities) if daily_velocities else 0.0
        
        # Determine trend
        latest_snapshot = snapshots[-1]
        if len(snapshots) >= 2:
            prev_snapshot = snapshots[-2]
            if latest_snapshot.remaining_story_point < prev_snapshot.remaining_story_point:
                trend = "decreasing"  # Good - remaining work is decreasing
            elif latest_snapshot.remaining_story_point > prev_snapshot.remaining_story_point:
                trend = "increasing"  # Bad - remaining work is increasing
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
        
        # Project completion date based on current velocity
        projected_completion = None
        if avg_velocity > 0 and latest_snapshot.remaining_story_point > 0:
            days_to_completion = latest_snapshot.remaining_story_point / avg_velocity
            projected_completion = latest_snapshot.date + timedelta(days=int(days_to_completion))
        
        return {
            "total_snapshots": len(snapshots),
            "trend": trend,
            "velocity": round(avg_velocity, 2),
            "projected_completion": projected_completion,
            "is_on_track": trend == "decreasing" and avg_velocity > 0,
            "current_remaining": latest_snapshot.remaining_story_point,
            "current_completed": latest_snapshot.completed_story_point
        }
    
    def get_burndown_chart_data(
        self, 
        db: Session, 
        sprint_id: int
    ) -> Dict[str, Any]:
        """
        Get formatted data for burndown chart visualization with complete sprint timeline.
        
        This method generates chart data for all days in the sprint duration, including:
        - Days with actual snapshots (from completed backlog items)
        - Days without snapshots (carry forward previous values)
        - Proper ideal burndown line based on sprint duration
        """
        from ..crud.sprint import sprint_crud
        
        # Get sprint details to determine date range
        sprint = sprint_crud.get_by_id(db, sprint_id)
        if not sprint or not sprint.start_date or not sprint.end_date:
            return {
                "dates": [],
                "remaining_points": [],
                "completed_points": [],
                "total_points": [],
                "ideal_line": []
            }
        
        # Get all existing snapshots for this sprint
        snapshots = self.get_sprint_snapshots(db, sprint_id)
        snapshots.sort(key=lambda x: x.date)
        
        # Create a map of date -> snapshot for quick lookup
        snapshot_map = {snapshot.date: snapshot for snapshot in snapshots}
        
        # Generate complete date range from sprint start to end (full sprint duration)
        start_date = sprint.start_date.date()
        end_date = sprint.end_date.date()
        
        # Initialize lists for chart data
        dates = []
        remaining_points = []
        completed_points = []
        total_points = []
        
        # Calculate initial total story points from sprint backlog
        from ..models.backlog import Backlog
        initial_total = db.query(func.sum(Backlog.story_point)).filter(
            and_(
                Backlog.sprint_id == sprint_id,
                Backlog.story_point.isnot(None)
            )
        ).scalar() or 0
        
        # Track the last known values for carry-forward
        last_completed = 0
        last_remaining = initial_total
        last_total = initial_total
        
        # Generate data for each day in the sprint
        current_date = start_date
        while current_date <= end_date:
            dates.append(current_date.isoformat())
            
            if current_date in snapshot_map:
                # Use actual snapshot data
                snapshot = snapshot_map[current_date]
                last_completed = snapshot.completed_story_point
                last_remaining = snapshot.remaining_story_point
                last_total = snapshot.total_story_points
            # else: carry forward the last known values
            
            completed_points.append(last_completed)
            remaining_points.append(last_remaining)
            total_points.append(last_total)
            
            current_date += timedelta(days=1)
        
        return {
            "dates": dates,
            "remaining_points": remaining_points,
            "completed_points": completed_points,
            "total_points": total_points,
            "sprint_duration_days": len(dates),
            "snapshots_with_data": len(snapshots),
            "initial_total_points": initial_total
        }
    
    def delete_sprint_snapshots(self, db: Session, sprint_id: int) -> int:
        """Delete all snapshots for a sprint"""
        result = db.query(BurndownSnapshot).filter(
            BurndownSnapshot.sprint_id == sprint_id
        ).delete()
        db.commit()
        return result
    
    def get_project_burndown_summary(
        self, 
        db: Session, 
        project_id: int,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get burndown summary for all sprints in a project over the last N days"""
        cutoff_date = date.today() - timedelta(days=days)
        
        snapshots = db.query(BurndownSnapshot).filter(
            and_(
                BurndownSnapshot.project_id == project_id,
                BurndownSnapshot.date >= cutoff_date
            )
        ).order_by(BurndownSnapshot.date.desc()).all()
        
        if not snapshots:
            return {
                "total_snapshots": 0,
                "active_sprints": 0,
                "total_story_points": 0,
                "completed_story_points": 0,
                "remaining_story_points": 0,
                "completion_percentage": 0.0
            }
        
        # Group by sprint
        sprint_data = {}
        for snapshot in snapshots:
            if snapshot.sprint_id not in sprint_data:
                sprint_data[snapshot.sprint_id] = []
            sprint_data[snapshot.sprint_id].append(snapshot)
        
        # Get latest snapshot for each sprint
        latest_snapshots = []
        for sprint_id, sprint_snapshots in sprint_data.items():
            latest = max(sprint_snapshots, key=lambda x: x.date)
            latest_snapshots.append(latest)
        
        # Calculate totals
        total_completed = sum(s.completed_story_point for s in latest_snapshots)
        total_remaining = sum(s.remaining_story_point for s in latest_snapshots)
        total_points = total_completed + total_remaining
        
        completion_percentage = (total_completed / total_points * 100) if total_points > 0 else 0.0
        
        return {
            "total_snapshots": len(snapshots),
            "active_sprints": len(sprint_data),
            "total_story_points": total_points,
            "completed_story_points": total_completed,
            "remaining_story_points": total_remaining,
            "completion_percentage": round(completion_percentage, 2)
        }


# Create CRUD instance
burndown_snapshot_crud = BurndownSnapshotCRUD(BurndownSnapshot)
