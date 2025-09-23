"""
Sprint CRUD comprehensive tests
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch

from scrumix.api.models.sprint import SprintStatus
from scrumix.api.schemas.sprint import SprintCreate, SprintUpdate
from scrumix.api.crud.sprint import sprint_crud


class TestSprintCRUDComprehensive:
    """Test sprint CRUD operations comprehensively"""

    def test_create_sprint_success(self, db_session: Session, test_project):
        """Test successful sprint creation"""
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Complete user stories 1-5",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            sprint_capacity=40,
            project_id=test_project.id
        )
        
        sprint = sprint_crud.create_sprint(db_session, sprint_data)
        assert sprint.sprint_name == sprint_data.sprint_name
        assert sprint.sprint_goal == sprint_data.sprint_goal
        assert sprint.status == sprint_data.status
        assert sprint.sprint_capacity == sprint_data.sprint_capacity
        assert sprint.project_id == sprint_data.project_id

    def test_create_sprint_duplicate_name_same_project(self, db_session: Session, test_project):
        """Test sprint creation with duplicate name in the same project (should fail)"""
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Complete user stories 1-5",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            sprint_capacity=40,
            project_id=test_project.id
        )
        
        sprint_crud.create_sprint(db_session, sprint_data)
        with pytest.raises(ValueError, match="Sprint with this name already exists in this project"):
            sprint_crud.create_sprint(db_session, sprint_data)

    def test_create_sprint_same_name_different_projects(self, db_session: Session, test_project):
        """Test sprint creation with same name in different projects (should succeed)"""
        # Create a second project
        from scrumix.api.models.project import Project
        second_project = Project(
            name="Second Test Project",
            description="Another test project",
            status="active"
        )
        db_session.add(second_project)
        db_session.commit()
        db_session.refresh(second_project)
        
        # Create sprint in first project
        sprint_data_1 = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Complete user stories 1-5",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            sprint_capacity=40,
            project_id=test_project.id
        )
        
        # Create sprint with same name in second project
        sprint_data_2 = SprintCreate(
            sprint_name="Sprint 1",  # Same name
            sprint_goal="Complete different user stories",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            sprint_capacity=30,
            project_id=second_project.id
        )
        
        # Both should succeed
        sprint1 = sprint_crud.create_sprint(db_session, sprint_data_1)
        sprint2 = sprint_crud.create_sprint(db_session, sprint_data_2)
        
        assert sprint1.sprint_name == sprint2.sprint_name
        assert sprint1.project_id != sprint2.project_id
        assert sprint1.id != sprint2.id

    def test_get_by_id_found(self, db_session: Session, test_project):
        """Test getting sprint by ID when it exists"""
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Complete user stories 1-5",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            sprint_capacity=40,
            project_id=test_project.id
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        found_sprint = sprint_crud.get_by_id(db_session, sprint_id=created_sprint.id)
        assert found_sprint is not None
        assert found_sprint.id == created_sprint.id
        assert found_sprint.sprint_name == sprint_data.sprint_name

    def test_get_by_name_found(self, db_session: Session, test_project):
        """Test getting sprint by name when it exists"""
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Complete user stories 1-5",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            sprint_capacity=40,
            project_id=test_project.id
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        found_sprint = sprint_crud.get_by_name(db_session, sprint_data.sprint_name)
        assert found_sprint is not None
        assert found_sprint.id == created_sprint.id
        assert found_sprint.sprint_name == sprint_data.sprint_name

    def test_get_by_name_and_project_found(self, db_session: Session, test_project):
        """Test getting sprint by name and project when it exists"""
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Complete user stories 1-5",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            sprint_capacity=40,
            project_id=test_project.id
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        found_sprint = sprint_crud.get_by_name_and_project(db_session, sprint_data.sprint_name, test_project.id)
        assert found_sprint is not None
        assert found_sprint.id == created_sprint.id
        assert found_sprint.sprint_name == sprint_data.sprint_name
        assert found_sprint.project_id == test_project.id

    def test_get_by_name_and_project_not_found_different_project(self, db_session: Session, test_project):
        """Test getting sprint by name and project when it exists in different project (should return None)"""
        # Create a second project
        from scrumix.api.models.project import Project
        second_project = Project(
            name="Second Test Project",
            description="Another test project",
            status="active"
        )
        db_session.add(second_project)
        db_session.commit()
        db_session.refresh(second_project)
        
        # Create sprint in first project
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Complete user stories 1-5",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            sprint_capacity=40,
            project_id=test_project.id
        )
        
        sprint_crud.create_sprint(db_session, sprint_data)
        
        # Try to find it in second project (should return None)
        found_sprint = sprint_crud.get_by_name_and_project(db_session, sprint_data.sprint_name, second_project.id)
        assert found_sprint is None