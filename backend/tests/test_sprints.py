"""
Sprint management API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.sprint import SprintStatus


class TestSprintEndpoints:
    """Test sprint management endpoints"""

    def test_get_sprints_success(self, client, auth_headers):
        """Test getting sprints list"""
        response = client.get("/api/v1/sprints/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_sprints_unauthorized(self, client):
        """Test getting sprints without authentication"""
        response = client.get("/api/v1/sprints/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_sprints_with_pagination(self, client, auth_headers):
        """Test getting sprints with pagination"""
        response = client.get("/api/v1/sprints/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_sprints_with_status_filter(self, client, auth_headers):
        """Test getting sprints with status filter"""
        response = client.get("/api/v1/sprints/?status=planning", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_sprints_with_search(self, client, auth_headers):
        """Test getting sprints with search"""
        response = client.get("/api/v1/sprints/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_create_sprint_success(self, client, auth_headers, test_project):
        """Test successful sprint creation"""
        sprint_data = {
            "sprint_name": "Test Sprint",
            "sprint_goal": "Complete test features",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-15T00:00:00Z",
            "status": "planning",
            "sprint_capacity": 40,
            "project_id": test_project.id
        }
        
        response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["sprint_name"] == sprint_data["sprint_name"]
        assert data["sprint_goal"] == sprint_data["sprint_goal"]
        assert data["status"] == sprint_data["status"]
        assert "id" in data

    def test_create_sprint_invalid_data(self, client, auth_headers):
        """Test sprint creation with invalid data"""
        sprint_data = {
            "name": "",  # Empty name
            "goal": "Complete test features",
            "start_date": "2024-01-01",
            "end_date": "2024-01-15"
        }
        
        response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_sprint_invalid_dates(self, client, auth_headers):
        """Test sprint creation with invalid dates"""
        sprint_data = {
            "name": "Test Sprint",
            "goal": "Complete test features",
            "start_date": "2024-01-15",  # End date before start date
            "end_date": "2024-01-01",
            "status": "planning"
        }
        
        response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_sprint_unauthorized(self, client):
        """Test sprint creation without authentication"""
        sprint_data = {
            "name": "Test Sprint",
            "goal": "Complete test features",
            "start_date": "2024-01-01",
            "end_date": "2024-01-15",
            "status": "planning"
        }
        
        response = client.post("/api/v1/sprints/", json=sprint_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_sprint_by_id_success(self, client, auth_headers, db_session):
        """Test getting sprint by ID"""
        # Create a sprint first
        sprint_data = {
            "name": "Test Sprint for Get",
            "goal": "A test sprint for getting",
            "start_date": "2024-01-01",
            "end_date": "2024-01-15",
            "status": "planning"
        }
        
        create_response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        sprint_id = create_response.json()["id"]
        
        # Get the sprint
        response = client.get(f"/api/v1/sprints/{sprint_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == sprint_id
        assert data["name"] == sprint_data["name"]
        assert data["goal"] == sprint_data["goal"]

    def test_get_sprint_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent sprint"""
        response = client.get("/api/v1/sprints/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_sprint_by_id_unauthorized(self, client):
        """Test getting sprint without authentication"""
        response = client.get("/api/v1/sprints/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_sprint_success(self, client, auth_headers, db_session):
        """Test successful sprint update"""
        # Create a sprint first
        sprint_data = {
            "name": "Test Sprint for Update",
            "goal": "A test sprint for updating",
            "start_date": "2024-01-01",
            "end_date": "2024-01-15",
            "status": "planning"
        }
        
        create_response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        sprint_id = create_response.json()["id"]
        
        # Update the sprint
        update_data = {
            "name": "Updated Sprint Name",
            "goal": "Updated goal",
            "status": "active"
        }
        
        response = client.put(f"/api/v1/sprints/{sprint_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["goal"] == update_data["goal"]
        assert data["status"] == update_data["status"]

    def test_update_sprint_not_found(self, client, auth_headers):
        """Test updating non-existent sprint"""
        update_data = {
            "name": "Updated Sprint Name",
            "goal": "Updated goal"
        }
        
        response = client.put("/api/v1/sprints/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_sprint_unauthorized(self, client):
        """Test updating sprint without authentication"""
        update_data = {
            "name": "Updated Sprint Name",
            "goal": "Updated goal"
        }
        
        response = client.put("/api/v1/sprints/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_sprint_success(self, client, auth_headers, db_session):
        """Test successful sprint deletion"""
        # Create a sprint first
        sprint_data = {
            "name": "Test Sprint for Delete",
            "goal": "A test sprint for deletion",
            "start_date": "2024-01-01",
            "end_date": "2024-01-15",
            "status": "planning"
        }
        
        create_response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        sprint_id = create_response.json()["id"]
        
        # Delete the sprint
        response = client.delete(f"/api/v1/sprints/{sprint_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Sprint deleted successfully"

    def test_delete_sprint_not_found(self, client, auth_headers):
        """Test deleting non-existent sprint"""
        response = client.delete("/api/v1/sprints/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_sprint_unauthorized(self, client):
        """Test deleting sprint without authentication"""
        response = client.delete("/api/v1/sprints/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestSprintCRUD:
    """Test sprint CRUD operations"""

    def test_create_sprint_success(self, db_session):
        """Test successful sprint creation"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate
        
        sprint_data = SprintCreate(name="Test Sprint",
            goal="Complete test features",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=14)).date(),
            status=SprintStatus.PLANNING
        )
        
        sprint = sprint_crud.create_sprint(db_session, sprint_data)
        assert sprint.name == sprint_data.name
        assert sprint.goal == sprint_data.goal
        assert sprint.status == sprint_data.status

    def test_get_sprint_by_id(self, db_session):
        """Test getting sprint by ID"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate
        
        # Create a sprint first
        sprint_data = SprintCreate(name="Test Sprint for Get",
            goal="A test sprint for getting",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=14)).date(),
            status=SprintStatus.PLANNING
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        
        # Get the sprint
        sprint = sprint_crud.get_by_id(db_session, created_sprint.id)
        assert sprint is not None
        assert sprint.name == sprint_data.name

    def test_get_sprints_with_pagination(self, db_session):
        """Test getting sprints with pagination"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate
        
        # Create multiple sprints
        for i in range(5):
            sprint_data = SprintCreate(name=f"Test Sprint {i}",
                goal=f"Test sprint {i} goal",
                start_date=datetime.now().date(),
                end_date=(datetime.now() + timedelta(days=14)).date(),
                status=SprintStatus.PLANNING
            )
            sprint_crud.create_sprint(db_session, sprint_data)
        
        # Get sprints with pagination
        sprints = sprint_crud.get_sprints(db_session, skip=0, limit=3)
        assert len(sprints) == 3
        
        sprints = sprint_crud.get_sprints(db_session, skip=3, limit=3)
        assert len(sprints) == 2

    def test_get_sprints_with_status_filter(self, db_session):
        """Test getting sprints with status filter"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate
        
        # Create sprints with different statuses
        planning_sprint = SprintCreate(name="Planning Sprint",
            goal="Planning sprint goal",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=14)).date(),
            status=SprintStatus.PLANNING
        )
        sprint_crud.create_sprint(db_session, planning_sprint)
        
        active_sprint = SprintCreate(name="Active Sprint",
            goal="Active sprint goal",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=14)).date(),
            status=SprintStatus.ACTIVE
        )
        sprint_crud.create_sprint(db_session, active_sprint)
        
        # Get planning sprints
        planning_sprints = sprint_crud.get_sprints(db_session, status=SprintStatus.PLANNING)
        assert len(planning_sprints) == 1
        assert planning_sprints[0].status == SprintStatus.PLANNING
        
        # Get active sprints
        active_sprints = sprint_crud.get_sprints(db_session, status=SprintStatus.ACTIVE)
        assert len(active_sprints) == 1
        assert active_sprints[0].status == SprintStatus.ACTIVE

    def test_search_sprints(self, db_session):
        """Test searching sprints"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate
        
        # Create sprints with searchable names and goals
        sprint1 = SprintCreate(name="Frontend Development Sprint",
            goal="Complete frontend features",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=14)).date(),
            status=SprintStatus.PLANNING
        )
        sprint_crud.create_sprint(db_session, sprint1)
        
        sprint2 = SprintCreate(name="Backend Integration Sprint",
            goal="Integrate backend services",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=14)).date(),
            status=SprintStatus.PLANNING
        )
        sprint_crud.create_sprint(db_session, sprint2)
        
        # Search for "Frontend"
        frontend_sprints = sprint_crud.search_sprints(db_session, "Frontend")
        assert len(frontend_sprints) == 1
        assert "Frontend" in frontend_sprints[0].name
        
        # Search for "Integration"
        integration_sprints = sprint_crud.search_sprints(db_session, "Integration")
        assert len(integration_sprints) == 1
        assert "Integration" in integration_sprints[0].name

    def test_update_sprint(self, db_session):
        """Test updating sprint"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate, SprintUpdate
        
        # Create a sprint
        sprint_data = SprintCreate(name="Test Sprint for Update",
            goal="A test sprint for updating",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=14)).date(),
            status=SprintStatus.PLANNING
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        
        # Update the sprint
        update_data = SprintUpdate(
            name="Updated Sprint Name",
            goal="Updated goal",
            status=SprintStatus.ACTIVE
        )
        
        updated_sprint = sprint_crud.update_sprint(db_session, created_sprint, update_data)
        assert updated_sprint.name == update_data.name
        assert updated_sprint.goal == update_data.goal
        assert updated_sprint.status == update_data.status

    def test_delete_sprint(self, db_session):
        """Test deleting sprint"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate
        
        # Create a sprint
        sprint_data = SprintCreate(name="Test Sprint for Delete",
            goal="A test sprint for deletion",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=14)).date(),
            status=SprintStatus.PLANNING
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        sprint_id = created_sprint.id
        
        # Delete the sprint
        deleted_sprint = sprint_crud.delete_sprint(db_session, sprint_id)
        assert deleted_sprint.id == sprint_id
        
        # Verify it's deleted
        sprint = sprint_crud.get_by_id(db_session, sprint_id)
        assert sprint is None 