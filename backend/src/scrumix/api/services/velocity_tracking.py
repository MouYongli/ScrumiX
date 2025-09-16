"""
Velocity and Burndown Tracking Service

This service handles event-driven updates for sprint velocity and burndown tracking.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from sqlalchemy import and_, func

from ..models.backlog import Backlog, BacklogStatus
from ..models.sprint import Sprint, SprintStatus
from ..models.burndown_snapshot import BurndownSnapshot
from ..crud.burndown_snapshot import burndown_snapshot_crud
from ..crud.sprint import sprint_crud


class VelocityTrackingService:
    """Service for handling velocity and burndown tracking logic"""
    
    def update_backlog_completion_status(
        self,
        db: Session,
        backlog: Backlog,
        new_status: BacklogStatus,
        old_status: BacklogStatus = None
    ) -> Dict[str, Any]:
        """
        Handle backlog status changes and update velocity/burndown tracking
        
        Args:
            db: Database session
            backlog: The backlog item being updated
            new_status: The new status
            old_status: The previous status (optional)
            
        Returns:
            Dictionary with update results
        """
        result = {
            "velocity_updated": False,
            "burndown_updated": False,
            "completed_at_updated": False,
            "errors": []
        }
        
        try:
            # Update completed_at timestamp based on status change
            if new_status == BacklogStatus.DONE and old_status != BacklogStatus.DONE:
                # Item is being marked as DONE
                backlog.completed_at = datetime.utcnow()
                result["completed_at_updated"] = True
                
                # Update velocity if item has story points and is in a sprint
                if backlog.story_point and backlog.sprint_id:
                    self._increment_sprint_velocity(db, backlog.sprint_id, backlog.story_point)
                    result["velocity_updated"] = True
                
                # Update burndown snapshot
                if backlog.sprint_id and backlog.project_id:
                    self._update_burndown_snapshot(db, backlog.sprint_id, backlog.project_id)
                    result["burndown_updated"] = True
                    
            elif old_status == BacklogStatus.DONE and new_status != BacklogStatus.DONE:
                # Item is being reopened from DONE
                backlog.completed_at = None
                result["completed_at_updated"] = True
                
                # Decrement velocity if item has story points and is in a sprint
                if backlog.story_point and backlog.sprint_id:
                    self._decrement_sprint_velocity(db, backlog.sprint_id, backlog.story_point)
                    result["velocity_updated"] = True
                
                # Update burndown snapshot
                if backlog.sprint_id and backlog.project_id:
                    self._update_burndown_snapshot(db, backlog.sprint_id, backlog.project_id)
                    result["burndown_updated"] = True
            
            db.commit()
            
        except Exception as e:
            db.rollback()
            result["errors"].append(str(e))
            
        return result
    
    def _increment_sprint_velocity(self, db: Session, sprint_id: int, story_points: int) -> None:
        """Increment the velocity points for a sprint"""
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if sprint:
            sprint.velocity_points += story_points
            sprint.updated_at = datetime.utcnow()
    
    def _decrement_sprint_velocity(self, db: Session, sprint_id: int, story_points: int) -> None:
        """Decrement the velocity points for a sprint"""
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if sprint:
            sprint.velocity_points = max(0, sprint.velocity_points - story_points)
            sprint.updated_at = datetime.utcnow()
    
    def _update_burndown_snapshot(self, db: Session, sprint_id: int, project_id: int) -> None:
        """
        Update or create burndown snapshot for today when backlog items are completed.
        
        This method implements event-driven burndown tracking:
        - Only creates/updates snapshots when backlog items are actually completed
        - Updates existing snapshots if items are completed on the same day
        - Maintains cumulative completed story points for accurate burndown tracking
        """
        # Use UTC date to align with frontend ISO date handling
        today = datetime.utcnow().date()
        
        # Calculate current completed story points for the sprint (cumulative)
        # This includes all items marked as DONE, regardless of when they were completed
        completed_points = db.query(func.sum(Backlog.story_point)).filter(
            and_(
                Backlog.sprint_id == sprint_id,
                Backlog.status == BacklogStatus.DONE,
                Backlog.story_point.isnot(None)
            )
        ).scalar() or 0
        
        # Calculate total points once and derive remaining to avoid double counting
        total_points = db.query(func.sum(Backlog.story_point)).filter(
            and_(
                Backlog.sprint_id == sprint_id,
                Backlog.story_point.isnot(None)
            )
        ).scalar() or 0
        
        remaining_points = max(0, total_points - completed_points)
        
        # Only create/update snapshot if there are completed points
        # This ensures we don't create empty snapshots for days with no progress
        if completed_points > 0:
            # Check if snapshot already exists for today
            existing_snapshot = burndown_snapshot_crud.get_by_sprint_and_date(
                db, sprint_id, today
            )
            
            if existing_snapshot:
                # Update existing snapshot with new completed points
                # This handles multiple completions on the same day
                existing_snapshot.completed_story_point = completed_points
                existing_snapshot.remaining_story_point = remaining_points
                existing_snapshot.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_snapshot)
            else:
                # Create new snapshot for today
                burndown_snapshot_crud.create_or_update_snapshot(
                    db=db,
                    sprint_id=sprint_id,
                    project_id=project_id,
                    snapshot_date=today,
                    completed_story_points=completed_points,
                    remaining_story_points=remaining_points
                )
    
    def create_initial_sprint_snapshot(
        self, 
        db: Session, 
        sprint_id: int, 
        project_id: int
    ) -> Optional[BurndownSnapshot]:
        """
        Create initial burndown snapshot for sprint start date.
        
        This creates a baseline snapshot with 0 completed points and all points remaining.
        Should be called when a sprint is started or when backlog items are added to a sprint.
        
        Args:
            db: Database session
            sprint_id: Sprint ID
            project_id: Project ID
            
        Returns:
            Created snapshot or None if sprint not found
        """
        from ..crud.sprint import sprint_crud
        
        sprint = sprint_crud.get_by_id(db, sprint_id)
        if not sprint or not sprint.start_date:
            return None
        
        start_date = sprint.start_date.date()
        
        # Check if initial snapshot already exists
        existing = burndown_snapshot_crud.get_by_sprint_and_date(db, sprint_id, start_date)
        if existing:
            return existing
        
        # Calculate total story points for the sprint
        total_points = db.query(func.sum(Backlog.story_point)).filter(
            and_(
                Backlog.sprint_id == sprint_id,
                Backlog.story_point.isnot(None)
            )
        ).scalar() or 0
        
        # Create initial snapshot with 0 completed, all remaining
        if total_points > 0:
            return burndown_snapshot_crud.create_or_update_snapshot(
                db=db,
                sprint_id=sprint_id,
                project_id=project_id,
                snapshot_date=start_date,
                completed_story_points=0,
                remaining_story_points=total_points
            )
        
        return None

    def calculate_sprint_velocity_average(
        self, 
        db: Session, 
        project_id: int, 
        exclude_sprint_id: Optional[int] = None
    ) -> float:
        """
        Calculate average velocity across completed sprints in a project
        
        Args:
            db: Database session
            project_id: Project ID
            exclude_sprint_id: Optional sprint ID to exclude from calculation
            
        Returns:
            Average velocity in story points per sprint
        """
        query = db.query(Sprint.velocity_points).filter(
            and_(
                Sprint.project_id == project_id,
                Sprint.status == SprintStatus.COMPLETED,
                Sprint.velocity_points > 0
            )
        )
        
        if exclude_sprint_id:
            query = query.filter(Sprint.id != exclude_sprint_id)
        
        velocities = query.all()
        
        if not velocities:
            return 0.0
        
        velocity_values = [v[0] for v in velocities]
        return sum(velocity_values) / len(velocity_values)
    
    def get_sprint_velocity_trend(
        self, 
        db: Session, 
        project_id: int, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get velocity trend for the last N completed sprints in a project
        
        Args:
            db: Database session
            project_id: Project ID
            limit: Number of recent sprints to include
            
        Returns:
            List of sprint velocity data
        """
        sprints = db.query(Sprint).filter(
            and_(
                Sprint.project_id == project_id,
                Sprint.status == SprintStatus.COMPLETED
            )
        ).order_by(Sprint.end_date.desc()).limit(limit).all()
        
        trend_data = []
        for sprint in reversed(sprints):  # Reverse to get chronological order
            trend_data.append({
                "sprint_id": sprint.id,
                "sprint_name": sprint.sprint_name,
                "velocity_points": sprint.velocity_points,
                "end_date": sprint.end_date.date() if sprint.end_date else None
            })
        
        return trend_data
    
    def create_daily_burndown_snapshots(
        self, 
        db: Session, 
        sprint_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> int:
        """
        Create burndown snapshots for each day in a sprint's date range
        This is useful for backfilling missing snapshots
        
        Args:
            db: Database session
            sprint_id: Sprint ID
            start_date: Optional start date (defaults to sprint start date)
            end_date: Optional end date (defaults to today or sprint end date)
            
        Returns:
            Number of snapshots created
        """
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            return 0
        
        # Determine date range
        if not start_date:
            start_date = sprint.start_date.date() if sprint.start_date else date.today()
        
        if not end_date:
            sprint_end = sprint.end_date.date() if sprint.end_date else date.today()
            end_date = min(sprint_end, date.today())
        
        snapshots_created = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Check if snapshot already exists for this date
            existing = burndown_snapshot_crud.get_by_sprint_and_date(
                db, sprint_id, current_date
            )
            
            if not existing:
                # Calculate story points for this date
                # For simplicity, we'll use current values
                # In a real implementation, you might want to calculate historical values
                completed_points = db.query(func.sum(Backlog.story_point)).filter(
                    and_(
                        Backlog.sprint_id == sprint_id,
                        Backlog.status == BacklogStatus.DONE,
                        Backlog.story_point.isnot(None)
                    )
                ).scalar() or 0
                
                remaining_points = db.query(func.sum(Backlog.story_point)).filter(
                    and_(
                        Backlog.sprint_id == sprint_id,
                        Backlog.status != BacklogStatus.DONE,
                        Backlog.story_point.isnot(None)
                    )
                ).scalar() or 0
                
                burndown_snapshot_crud.create_or_update_snapshot(
                    db=db,
                    sprint_id=sprint_id,
                    project_id=sprint.project_id,
                    snapshot_date=current_date,
                    completed_story_points=completed_points,
                    remaining_story_points=remaining_points
                )
                snapshots_created += 1
            
            current_date += timedelta(days=1)
        
        return snapshots_created
    
    def get_project_velocity_metrics(
        self, 
        db: Session, 
        project_id: int
    ) -> Dict[str, Any]:
        """
        Get comprehensive velocity metrics for a project
        
        Args:
            db: Database session
            project_id: Project ID
            
        Returns:
            Dictionary with velocity metrics
        """
        # Get completed sprints
        completed_sprints = db.query(Sprint).filter(
            and_(
                Sprint.project_id == project_id,
                Sprint.status == SprintStatus.COMPLETED
            )
        ).order_by(Sprint.end_date.desc()).all()
        
        if not completed_sprints:
            return {
                "total_completed_sprints": 0,
                "average_velocity": 0.0,
                "min_velocity": 0,
                "max_velocity": 0,
                "velocity_trend": [],
                "total_story_points": 0
            }
        
        velocities = [sprint.velocity_points for sprint in completed_sprints]
        total_story_points = sum(velocities)
        
        return {
            "total_completed_sprints": len(completed_sprints),
            "average_velocity": round(total_story_points / len(completed_sprints), 2),
            "min_velocity": min(velocities),
            "max_velocity": max(velocities),
            "velocity_trend": self.get_sprint_velocity_trend(db, project_id, limit=10),
            "total_story_points": total_story_points
        }


# Create service instance
velocity_tracking_service = VelocityTrackingService()
