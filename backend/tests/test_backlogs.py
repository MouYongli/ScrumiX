"""
Backlog management API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock

from scrumix.api.models.backlog import BacklogStatus, BacklogPriority
from scrumix.api.models.project import Project
from datetime import datetime, timedelta


@pytest.fixture
def test_project(db_session):
    """Create a test project."""
    project = Project(
        name="Test Project for Backlogs",
        description="A test project",
        status="active",
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30)
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project

class TestBacklogEndpoints:
    """Test backlog management endpoints"""

    def test_get_backlogs_success(self, client, auth_headers):
        """Test getting backlogs list"""
        response = client.get("/api/v1/backlogs/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_unauthorized(self, client):
        """Test getting backlogs without authentication"""
        response = client.get("/api/v1/backlogs/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_backlogs_with_pagination(self, client, auth_headers):
        """Test getting backlogs with pagination"""
        response = client.get("/api/v1/backlogs/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_with_status_filter(self, client, auth_headers):
        """Test getting backlogs with status filter"""
        response = client.get("/api/v1/backlogs/?status=to-do", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_with_invalid_status(self, client, auth_headers):
        """Test getting backlogs with invalid status"""
        response = client.get("/api/v1/backlogs/?status=invalid", headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid status" in response.json()["detail"]

    def test_get_backlogs_with_priority_filter(self, client, auth_headers):
        """Test getting backlogs with priority filter"""
        response = client.get("/api/v1/backlogs/?priority=high", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_with_invalid_priority(self, client, auth_headers):
        """Test getting backlogs with invalid priority"""
        response = client.get("/api/v1/backlogs/?priority=invalid", headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid priority" in response.json()["detail"]

    def test_get_backlogs_with_search(self, client, auth_headers):
        """Test getting backlogs with search"""
        response = client.get("/api/v1/backlogs/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_root_only(self, client, auth_headers):
        """Test getting only root backlog items"""
        response = client.get("/api/v1/backlogs/?root_only=true", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_create_backlog_success(self, client, auth_headers, test_project):
        """Test successful backlog creation"""
        backlog_data = {
            "title": "Test Backlog Item",
            "description": "A test backlog item",
            "status": "todo",
            "priority": "medium",
            "story_point": 3,
            "project_id": test_project.id
        }
        
        response = client.post("/api/v1/backlogs/", json=backlog_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == backlog_data["title"]
        assert data["description"] == backlog_data["description"]
        assert data["status"] == backlog_data["status"]
        assert data["priority"] == backlog_data["priority"]
        assert data["story_point"] == backlog_data["story_point"]
        assert "id" in data

    def test_create_backlog_invalid_data(self, client, auth_headers):
        """Test backlog creation with invalid data"""
        backlog_data = {
            "title": "",  # Empty title
            "description": "A test backlog item",
            "status": "to-do"
            # Missing project_id
        }
        
        response = client.post("/api/v1/backlogs/", json=backlog_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_backlog_unauthorized(self, client):
        """Test backlog creation without authentication"""
        backlog_data = {
            "title": "Test Backlog Item",
            "description": "A test backlog item",
            "status": "to-do"
        }
        
        response = client.post("/api/v1/backlogs/", json=backlog_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_backlog_by_id_success(self, client, auth_headers, db_session, test_project):
        """Test getting backlog by ID"""
        from scrumix.api.models.backlog import Backlog
        
        # Create a backlog first
        backlog = Backlog(
            title="Test Backlog for Get",
            description="A test backlog for getting",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        db_session.add(backlog)
        db_session.commit()
        
        response = client.get(f"/api/v1/backlogs/{backlog.backlog_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == backlog.backlog_id
        assert data["title"] == backlog.title
        assert data["description"] == backlog.description

    def test_get_backlog_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent backlog"""
        response = client.get("/api/v1/backlogs/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_backlog_by_id_unauthorized(self, client):
        """Test getting backlog without authentication"""
        response = client.get("/api/v1/backlogs/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_backlog_success(self, client, auth_headers, db_session, test_project):
        """Test successful backlog update"""
        from scrumix.api.models.backlog import Backlog
        
        # Create a backlog first
        backlog = Backlog(
            title="Test Backlog for Update",
            description="A test backlog for updating",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        db_session.add(backlog)
        db_session.commit()
        
        update_data = {
            "title": "Updated Backlog Title",
            "description": "Updated description",
            "status": "in-progress"
        }
        
        response = client.put(f"/api/v1/backlogs/{backlog.backlog_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["status"] == update_data["status"]

    def test_update_backlog_not_found(self, client, auth_headers):
        """Test updating non-existent backlog"""
        update_data = {
            "title": "Updated Backlog Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/backlogs/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_backlog_unauthorized(self, client):
        """Test updating backlog without authentication"""
        update_data = {
            "title": "Updated Backlog Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/backlogs/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_backlog_success(self, client, auth_headers, db_session, test_project):
        """Test successful backlog deletion"""
        from scrumix.api.models.backlog import Backlog
        
        # Create a backlog to delete
        backlog = Backlog(
            title="Test Backlog for Deletion",
            description="A test backlog for deletion",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        db_session.add(backlog)
        db_session.commit()
        
        response = client.delete(f"/api/v1/backlogs/{backlog.backlog_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Backlog item deleted successfully"

    def test_delete_backlog_not_found(self, client, auth_headers):
        """Test deleting non-existent backlog"""
        response = client.delete("/api/v1/backlogs/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_backlog_unauthorized(self, client):
        """Test deleting backlog without authentication"""
        response = client.delete("/api/v1/backlogs/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestBacklogCRUD:
    """Test backlog CRUD operations"""

    def test_create_backlog_success(self, db_session, test_project):
        """Test successful backlog creation"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate
        
        backlog_data = BacklogCreate(
            title="Test Backlog Item",
            description="A test backlog item",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            story_point=3,
            project_id=test_project.id
        )
        
        backlog = backlog_crud.create(db_session, obj_in=backlog_data)
        assert backlog.title == backlog_data.title
        assert backlog.description == backlog_data.description
        assert backlog.status == backlog_data.status
        assert backlog.priority == backlog_data.priority
        assert backlog.story_point == backlog_data.story_point

    def test_get_backlog_by_id(self, db_session, test_project):
        """Test getting backlog by ID"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate
        
        # Create a backlog first
        backlog_data = BacklogCreate(
            title="Test Backlog for Get",
            description="A test backlog for getting",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        
        created_backlog = backlog_crud.create(db_session, obj_in=backlog_data)
        
        # Get the backlog
        backlog = backlog_crud.get(db_session, id=created_backlog.backlog_id)
        assert backlog is not None
        assert backlog.title == backlog_data.title

    def test_get_backlogs_with_pagination(self, db_session, test_project):
        """Test getting backlogs with pagination"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate
        
        # Create some backlogs
        for i in range(5):
            backlog_data = BacklogCreate(
                title=f"Test Backlog {i}",
                description=f"A test backlog {i}",
                status=BacklogStatus.TODO,
                priority=BacklogPriority.MEDIUM,
                project_id=test_project.id
            )
            backlog_crud.create(db_session, obj_in=backlog_data)
            
        # Get backlogs with pagination
        backlogs = backlog_crud.get_backlogs(db_session, skip=0, limit=3)
        assert len(backlogs) == 3
        
        backlogs = backlog_crud.get_backlogs(db_session, skip=3, limit=3)
        assert len(backlogs) == 2

    def test_get_backlogs_with_status_filter(self, db_session, test_project):
        """Test getting backlogs with status filter"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate
        
        # Create some backlogs with different statuses
        backlog_data_todo = BacklogCreate(
            title="To-Do Backlog",
            description="A to-do backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        backlog_crud.create(db_session, obj_in=backlog_data_todo)
        
        backlog_data_in_progress = BacklogCreate(
            title="In Progress Backlog",
            description="An in-progress backlog",
            status=BacklogStatus.IN_PROGRESS,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        backlog_crud.create(db_session, obj_in=backlog_data_in_progress)

        # Get to-do backlogs
        todo_backlogs = backlog_crud.get_backlogs(db_session, status=BacklogStatus.TODO)
        assert len(todo_backlogs) == 1
        assert todo_backlogs[0].status == BacklogStatus.TODO
        
        # Get in-progress backlogs
        in_progress_backlogs = backlog_crud.get_backlogs(db_session, status=BacklogStatus.IN_PROGRESS)
        assert len(in_progress_backlogs) == 1
        assert in_progress_backlogs[0].status == BacklogStatus.IN_PROGRESS

    def test_get_backlogs_with_priority_filter(self, db_session, test_project):
        """Test getting backlogs with priority filter"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate
        
        # Create some backlogs with different priorities
        backlog_data_high = BacklogCreate(
            title="High Priority Backlog",
            description="A high priority backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.HIGH,
            project_id=test_project.id
        )
        backlog_crud.create(db_session, obj_in=backlog_data_high)
        
        backlog_data_low = BacklogCreate(
            title="Low Priority Backlog",
            description="A low priority backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.LOW,
            project_id=test_project.id
        )
        backlog_crud.create(db_session, obj_in=backlog_data_low)

        # Get high priority backlogs
        high_priority_backlogs = backlog_crud.get_backlogs(db_session, priority=BacklogPriority.HIGH)
        assert len(high_priority_backlogs) == 1
        assert high_priority_backlogs[0].priority == BacklogPriority.HIGH
        
        # Get low priority backlogs
        low_priority_backlogs = backlog_crud.get_backlogs(db_session, priority=BacklogPriority.LOW)
        assert len(low_priority_backlogs) == 1
        assert low_priority_backlogs[0].priority == BacklogPriority.LOW

    def test_search_backlogs(self, db_session, test_project):
        """Test searching backlogs"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate
        
        # Create some backlogs to search
        backlog_data_1 = BacklogCreate(
            title="Searchable Backlog One",
            description="A backlog with searchable content",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        backlog_crud.create(db_session, obj_in=backlog_data_1)
        
        backlog_data_2 = BacklogCreate(
            title="Another Backlog",
            description="Another searchable backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        backlog_crud.create(db_session, obj_in=backlog_data_2)
        
        # Search for backlogs
        auth_backlogs = backlog_crud.search_backlogs(db_session, "Authentication")
        assert len(auth_backlogs) == 1
        assert "Authentication" in auth_backlogs[0].title
        
        # Search for "Database"
        db_backlogs = backlog_crud.search_backlogs(db_session, "Database")
        assert len(db_backlogs) == 1
        assert "Database" in db_backlogs[0].title

    def test_get_root_backlogs(self, db_session, test_project):
        """Test getting root backlogs"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate
        
        # Create some root and child backlogs
        root_backlog_data = BacklogCreate(
            title="Root Backlog",
            description="A root backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        root_backlog = backlog_crud.create(db_session, obj_in=root_backlog_data)
        
        child_backlog_data = BacklogCreate(
            title="Child Backlog",
            description="A child backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            parent_id=root_backlog.backlog_id,
            project_id=test_project.id
        )
        backlog_crud.create(db_session, obj_in=child_backlog_data)
        
        # Get root backlogs
        root_backlogs = backlog_crud.get_root_backlogs(db_session)
        assert len(root_backlogs) == 2

    def test_update_backlog(self, db_session, test_project):
        """Test updating backlog"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate, BacklogUpdate
        
        # Create a backlog first
        backlog_data = BacklogCreate(
            title="Backlog to Update",
            description="A backlog to be updated",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        
        created_backlog = backlog_crud.create(db_session, obj_in=backlog_data)
        
        # Update the backlog
        update_data = BacklogUpdate(
            title="Updated Backlog Title",
            description="Updated description",
            status=BacklogStatus.IN_PROGRESS,
            priority=BacklogPriority.HIGH
        )
        
        updated_backlog = backlog_crud.update_backlog(db_session, created_backlog, update_data)
        assert updated_backlog.title == update_data.title
        assert updated_backlog.description == update_data.description
        assert updated_backlog.status == update_data.status
        assert updated_backlog.priority == update_data.priority

    def test_delete_backlog(self, db_session, test_project):
        """Test deleting backlog"""
        from scrumix.api.crud.backlog import backlog_crud
        from scrumix.api.schemas.backlog import BacklogCreate
        
        # Create a backlog to delete
        backlog_data = BacklogCreate(
            title="Backlog to Delete",
            description="A backlog to be deleted",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=test_project.id
        )
        
        created_backlog = backlog_crud.create(db_session, obj_in=backlog_data)
        
        # Delete the backlog
        deleted = backlog_crud.remove(db_session, id=created_backlog.backlog_id)
        assert deleted
        
        # Verify it's deleted
        backlog = backlog_crud.get(db_session, id=created_backlog.backlog_id)
        assert backlog is None 