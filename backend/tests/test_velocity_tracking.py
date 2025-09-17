"""
Tests for velocity tracking and burndown functionality
"""
import pytest
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session

from scrumix.api.models.backlog import Backlog, BacklogStatus
from scrumix.api.models.sprint import Sprint, SprintStatus
from scrumix.api.models.project import Project, ProjectStatus
from scrumix.api.models.burndown_snapshot import BurndownSnapshot
from scrumix.api.crud.burndown_snapshot import burndown_snapshot_crud
from scrumix.api.services.velocity_tracking import velocity_tracking_service
from scrumix.api.schemas.burndown_snapshot import BurndownSnapshotCreate


class TestVelocityTracking:
    """Test velocity tracking functionality"""
    
    def test_velocity_increment_on_completion(self, db_session: Session, test_user, test_project):
        """Test that velocity points are incremented when backlog is marked as DONE"""
        # Create a sprint
        sprint = Sprint(
            sprint_name="Test Sprint",
            sprint_goal="Test goal",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.ACTIVE,
            project_id=test_project.id,
            velocity_points=0
        )
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        # Create a backlog item
        backlog = Backlog(
            title="Test Backlog Item",
            description="Test description",
            status=BacklogStatus.TODO,
            story_point=5,
            project_id=test_project.id,
            sprint_id=sprint.id
        )
        db_session.add(backlog)
        db_session.commit()
        db_session.refresh(backlog)
        
        # Verify initial state
        assert sprint.velocity_points == 0
        assert backlog.completed_at is None
        
        # Mark backlog as DONE
        result = velocity_tracking_service.update_backlog_completion_status(
            db=db_session,
            backlog=backlog,
            new_status=BacklogStatus.DONE,
            old_status=BacklogStatus.TODO
        )
        
        # Verify updates
        assert result["velocity_updated"] is True
        assert result["burndown_updated"] is True
        assert result["completed_at_updated"] is True
        
        # Refresh and check
        db_session.refresh(sprint)
        db_session.refresh(backlog)
        
        assert sprint.velocity_points == 5
        assert backlog.completed_at is not None
        assert backlog.status == BacklogStatus.DONE
    
    def test_velocity_decrement_on_reopen(self, db_session: Session, test_user, test_project):
        """Test that velocity points are decremented when backlog is reopened"""
        # Create a sprint with some velocity
        sprint = Sprint(
            sprint_name="Test Sprint 2",
            sprint_goal="Test goal",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.ACTIVE,
            project_id=test_project.id,
            velocity_points=5
        )
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        # Create a completed backlog item
        backlog = Backlog(
            title="Test Backlog Item 2",
            description="Test description",
            status=BacklogStatus.DONE,
            story_point=3,
            project_id=test_project.id,
            sprint_id=sprint.id,
            completed_at=datetime.now()
        )
        db_session.add(backlog)
        db_session.commit()
        db_session.refresh(backlog)
        
        # Reopen the backlog
        result = velocity_tracking_service.update_backlog_completion_status(
            db=db_session,
            backlog=backlog,
            new_status=BacklogStatus.IN_PROGRESS,
            old_status=BacklogStatus.DONE
        )
        
        # Verify updates
        assert result["velocity_updated"] is True
        assert result["burndown_updated"] is True
        assert result["completed_at_updated"] is True
        
        # Refresh and check
        db_session.refresh(sprint)
        db_session.refresh(backlog)
        
        assert sprint.velocity_points == 2  # 5 - 3
        assert backlog.completed_at is None
        assert backlog.status == BacklogStatus.IN_PROGRESS
    
    def test_burndown_snapshot_creation(self, db_session: Session, test_user, test_project):
        """Test that burndown snapshots are created correctly"""
        # Create a sprint
        sprint = Sprint(
            sprint_name="Test Sprint 3",
            sprint_goal="Test goal",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.ACTIVE,
            project_id=test_project.id,
            velocity_points=0
        )
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        # Create burndown snapshot
        today = date.today()
        snapshot = burndown_snapshot_crud.create_or_update_snapshot(
            db=db_session,
            sprint_id=sprint.id,
            project_id=test_project.id,
            snapshot_date=today,
            completed_story_points=10,
            remaining_story_points=20
        )
        
        # Verify snapshot
        assert snapshot is not None
        assert snapshot.sprint_id == sprint.id
        assert snapshot.project_id == test_project.id
        assert snapshot.date == today
        assert snapshot.completed_story_point == 10
        assert snapshot.remaining_story_point == 20
        
        # Test update existing snapshot
        updated_snapshot = burndown_snapshot_crud.create_or_update_snapshot(
            db=db_session,
            sprint_id=sprint.id,
            project_id=test_project.id,
            snapshot_date=today,
            completed_story_points=15,
            remaining_story_points=15
        )
        
        # Should be the same snapshot, just updated
        assert updated_snapshot.id == snapshot.id
        assert updated_snapshot.completed_story_point == 15
        assert updated_snapshot.remaining_story_point == 15
    
    def test_calculate_average_velocity(self, db_session: Session, test_user, test_project):
        """Test average velocity calculation"""
        # Create completed sprints with different velocities
        sprints = []
        velocities = [10, 15, 20, 8, 12]
        
        for i, velocity in enumerate(velocities):
            sprint = Sprint(
                sprint_name=f"Completed Sprint {i+1}",
                sprint_goal="Test goal",
                start_date=datetime.now() - timedelta(days=30),
                end_date=datetime.now() - timedelta(days=16),
                status=SprintStatus.COMPLETED,
                project_id=test_project.id,
                velocity_points=velocity
            )
            db_session.add(sprint)
            sprints.append(sprint)
        
        db_session.commit()
        
        # Calculate average velocity
        avg_velocity = velocity_tracking_service.calculate_sprint_velocity_average(
            db=db_session,
            project_id=test_project.id
        )
        
        expected_avg = sum(velocities) / len(velocities)  # 13.0
        assert avg_velocity == expected_avg
    
    def test_burndown_trend_analysis(self, db_session: Session, test_user, test_project):
        """Test burndown trend analysis"""
        # Create a sprint
        sprint = Sprint(
            sprint_name="Trend Test Sprint",
            sprint_goal="Test goal",
            start_date=datetime.now() - timedelta(days=7),
            end_date=datetime.now() + timedelta(days=7),
            status=SprintStatus.ACTIVE,
            project_id=test_project.id,
            velocity_points=0
        )
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        # Create snapshots showing progress
        base_date = date.today() - timedelta(days=3)
        snapshots_data = [
            (base_date, 0, 30),
            (base_date + timedelta(days=1), 5, 25),
            (base_date + timedelta(days=2), 12, 18),
            (base_date + timedelta(days=3), 20, 10)
        ]
        
        for snapshot_date, completed, remaining in snapshots_data:
            burndown_snapshot_crud.create_or_update_snapshot(
                db=db_session,
                sprint_id=sprint.id,
                project_id=test_project.id,
                snapshot_date=snapshot_date,
                completed_story_points=completed,
                remaining_story_points=remaining
            )
        
        # Analyze trend
        trend_analysis = burndown_snapshot_crud.calculate_burndown_trend(
            db=db_session,
            sprint_id=sprint.id
        )
        
        assert trend_analysis["total_snapshots"] == 4
        assert trend_analysis["trend"] == "decreasing"  # Good trend
        assert trend_analysis["velocity"] > 0
        assert trend_analysis["is_on_track"] is True
        assert trend_analysis["current_remaining"] == 10
        assert trend_analysis["current_completed"] == 20


@pytest.fixture
def test_project(db_session: Session):
    """Create a test project"""
    project = Project(
        name="Test Project",
        description="Test project for velocity tracking",
        status=ProjectStatus.ACTIVE
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project
