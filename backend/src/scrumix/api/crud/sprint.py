"""
Sprint-related CRUD operations
"""
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from scrumix.api.models.sprint import Sprint, SprintStatus
from scrumix.api.schemas.sprint import SprintCreate, SprintUpdate
from scrumix.api.crud.base import CRUDBase

class SprintCRUD(CRUDBase[Sprint, SprintCreate, SprintUpdate]):
    def create_sprint(self, db: Session, sprint_create: SprintCreate) -> Sprint:
        """Create a new sprint"""
        # Validate sprint name uniqueness
        existing_sprint = self.get_by_name(db, sprint_create.sprint_name)
        if existing_sprint:
            raise ValueError("Sprint with this name already exists")
        
        # Validate date range
        if sprint_create.end_date <= sprint_create.start_date:
            raise ValueError("End date must be after start date")
        
        # Create sprint object
        db_sprint = Sprint(
            sprint_name=sprint_create.sprint_name,
            sprint_goal=sprint_create.sprint_goal,
            start_date=sprint_create.start_date,
            end_date=sprint_create.end_date,
            status=sprint_create.status,
            sprint_capacity=sprint_create.sprint_capacity
        )
        
        db.add(db_sprint)
        db.commit()
        db.refresh(db_sprint)
        return db_sprint
    
    def get_by_id(self, db: Session, sprint_id: int) -> Optional[Sprint]:
        """Get sprint by ID"""
        return db.query(Sprint).filter(Sprint.sprint_id == sprint_id).first()
    
    def get_by_name(self, db: Session, sprint_name: str) -> Optional[Sprint]:
        """Get sprint by name"""
        return db.query(Sprint).filter(Sprint.sprint_name == sprint_name).first()
    
    def get_sprints(self, db: Session, skip: int = 0, limit: int = 100, 
                   status: Optional[SprintStatus] = None) -> List[Sprint]:
        """Get list of sprints"""
        query = db.query(Sprint)
        
        if status:
            query = query.filter(Sprint.status == status)
        
        return query.order_by(Sprint.start_date.desc()).offset(skip).limit(limit).all()
    
    def search_sprints(self, db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Sprint]:
        """Search sprints by name and goal"""
        query = db.query(Sprint).filter(
            or_(
                Sprint.sprint_name.ilike(f"%{search_term}%"),
                Sprint.sprint_goal.ilike(f"%{search_term}%")
            )
        )
        
        return query.order_by(Sprint.start_date.desc()).offset(skip).limit(limit).all()
    
    def update_sprint(self, db: Session, sprint_id: int, sprint_update: SprintUpdate) -> Optional[Sprint]:
        """Update sprint information"""
        sprint = self.get_by_id(db, sprint_id)
        if not sprint:
            return None
        
        update_data = sprint_update.model_dump(exclude_unset=True)
        
        # Check if name is already in use (if being updated)
        if "sprint_name" in update_data and update_data["sprint_name"] != sprint.sprint_name:
            existing_sprint = self.get_by_name(db, update_data["sprint_name"])
            if existing_sprint and existing_sprint.sprint_id != sprint_id:
                raise ValueError("Sprint name already in use")
        
        # Validate date range if dates are being updated
        start_date = update_data.get("start_date", sprint.start_date)
        end_date = update_data.get("end_date", sprint.end_date)
        if start_date and end_date and end_date <= start_date:
            raise ValueError("End date must be after start date")
        
        for field, value in update_data.items():
            setattr(sprint, field, value)
        
        # Update timestamp is handled automatically by SQLAlchemy
        db.commit()
        db.refresh(sprint)
        return sprint
    
    def delete_sprint(self, db: Session, sprint_id: int) -> bool:
        """Delete sprint"""
        sprint = self.get_by_id(db, sprint_id)
        if not sprint:
            return False
        
        db.delete(sprint)
        db.commit()
        return True
    
    def get_sprints_by_status(self, db: Session, status: SprintStatus,
                             skip: int = 0, limit: int = 100) -> List[Sprint]:
        """Get sprints by status"""
        return db.query(Sprint).filter(Sprint.status == status)\
                 .order_by(Sprint.start_date.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_active_sprints(self, db: Session, skip: int = 0, limit: int = 100) -> List[Sprint]:
        """Get currently active sprints"""
        now = datetime.now()
        return db.query(Sprint).filter(
            and_(
                Sprint.status == SprintStatus.ACTIVE,
                Sprint.start_date <= now,
                Sprint.end_date >= now
            )
        ).order_by(Sprint.start_date.desc()).offset(skip).limit(limit).all()
    
    def get_upcoming_sprints(self, db: Session, days_ahead: int = 30, 
                            skip: int = 0, limit: int = 100) -> List[Sprint]:
        """Get upcoming sprints within specified days"""
        now = datetime.now()
        future_date = now + timedelta(days=days_ahead)
        
        return db.query(Sprint).filter(
            and_(
                Sprint.status == SprintStatus.PLANNING,
                Sprint.start_date >= now,
                Sprint.start_date <= future_date
            )
        ).order_by(Sprint.start_date.asc()).offset(skip).limit(limit).all()
    
    def get_sprints_by_date_range(self, db: Session, start_date: datetime, end_date: datetime,
                                 skip: int = 0, limit: int = 100) -> List[Sprint]:
        """Get sprints within a date range"""
        return db.query(Sprint).filter(
            or_(
                and_(Sprint.start_date >= start_date, Sprint.start_date <= end_date),
                and_(Sprint.end_date >= start_date, Sprint.end_date <= end_date),
                and_(Sprint.start_date <= start_date, Sprint.end_date >= end_date)
            )
        ).order_by(Sprint.start_date.desc()).offset(skip).limit(limit).all()
    
    def count_sprints(self, db: Session, status: Optional[SprintStatus] = None) -> int:
        """Count sprints"""
        query = db.query(Sprint)
        if status:
            query = query.filter(Sprint.status == status)
        return query.count()
    
    def get_sprint_statistics(self, db: Session) -> dict:
        """Get sprint statistics"""
        total = self.count_sprints(db)
        
        # Count by status
        status_counts = {}
        for sprint_status in SprintStatus:
            status_counts[sprint_status.value] = self.count_sprints(db, sprint_status)
        
        # Get currently active sprints
        active_count = len(self.get_active_sprints(db))
        
        # Get average sprint duration
        sprints = db.query(Sprint).all()
        durations = [(s.end_date - s.start_date).days for s in sprints if s.start_date and s.end_date]
        avg_duration = sum(durations) // len(durations) if durations else 0
        
        # Get total capacity
        total_capacity = db.query(func.sum(Sprint.sprint_capacity)).scalar() or 0
        
        return {
            "total_sprints": total,
            "sprints_by_status": status_counts,
            "active_sprints": active_count,
            "average_duration_days": avg_duration,
            "total_capacity": total_capacity
        }
    
    def close_sprint(self, db: Session, sprint_id: int) -> Optional[Sprint]:
        """Close/complete a sprint"""
        sprint = self.get_by_id(db, sprint_id)
        if not sprint:
            return None
        
        sprint.status = SprintStatus.COMPLETED
        db.commit()
        db.refresh(sprint)
        return sprint
    
    def start_sprint(self, db: Session, sprint_id: int) -> Optional[Sprint]:
        """Start a sprint (change status to active)"""
        sprint = self.get_by_id(db, sprint_id)
        if not sprint:
            return None
        
        if sprint.status != SprintStatus.PLANNING:
            raise ValueError("Only planning sprints can be started")
        
        sprint.status = SprintStatus.ACTIVE
        db.commit()
        db.refresh(sprint)
        return sprint

# Create CRUD instance
sprint_crud = SprintCRUD(Sprint) 