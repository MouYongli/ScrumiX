"""
Test cases for sprint-related functionality
"""
import pytest
from datetime import datetime, timedelta
from fastapi import status
from sqlalchemy.orm import Session

from scrumix.api.models.sprint import SprintStatus
from scrumix.api.models.project import Project


class TestSprintEndpoints:
    """Test sprint API endpoints"""
    
    def test_get_sprints_success(self, client, auth_headers):
        """Test successful sprint retrieval"""
        response = client.get("/api/v1/sprints/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)
    
    def test_get_sprints_unauthorized(self, client):
        """Test sprint retrieval without authentication"""
        response = client.get("/api/v1/sprints/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_sprints_with_pagination(self, client, auth_headers):
        """Test sprint retrieval with pagination"""
        response = client.get("/api/v1/sprints/?skip=0&limit=5", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)
    
    def test_get_sprints_with_status_filter(self, client, auth_headers):
        """Test sprint retrieval with status filter"""
        response = client.get("/api/v1/sprints/?status=planning", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)
    
    def test_get_sprints_with_search(self, client, auth_headers):
        """Test sprint retrieval with search"""
        response = client.get("/api/v1/sprints/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)
    
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
        assert data["sprint_name"] == "Test Sprint"
        assert data["sprint_goal"] == "Complete test features"
    
    def test_create_sprint_invalid_data(self, client, auth_headers):
        """Test sprint creation with invalid data"""
        sprint_data = {
            "sprint_name": "",  # Invalid empty name
            "project_id": 1
        }

        response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_create_sprint_invalid_dates(self, client, auth_headers):
        """Test sprint creation with invalid dates"""
        sprint_data = {
            "sprint_name": "Test Sprint",
            "sprint_goal": "Complete test features",
            "start_date": "2024-01-15T00:00:00Z",  # End date before start date
            "end_date": "2024-01-01T00:00:00Z",
            "status": SprintStatus.PLANNING,
            "project_id": 1
        }

        response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_create_sprint_unauthorized(self, client):
        """Test sprint creation without authentication"""
        sprint_data = {
            "sprint_name": "Test Sprint",
            "project_id": 1
        }

        response = client.post("/api/v1/sprints/", json=sprint_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_sprint_by_id_success(self, client, auth_headers, db_session):
        """Test getting sprint by ID"""
        # Create a sprint first
        sprint_data = {
            "sprint_name": "Test Sprint for Get",
            "sprint_goal": "A test sprint for getting",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-15T00:00:00Z",
            "status": SprintStatus.PLANNING,
            "project_id": 1
        }

        create_response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        created_sprint = create_response.json()
        
        # Get the sprint by ID
        sprint_id = created_sprint["id"]
        response = client.get(f"/api/v1/sprints/{sprint_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["sprint_name"] == "Test Sprint for Get"
    
    def test_get_sprint_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent sprint by ID"""
        response = client.get("/api/v1/sprints/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_sprint_by_id_unauthorized(self, client):
        """Test getting sprint by ID without authentication"""
        response = client.get("/api/v1/sprints/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_sprint_success(self, client, auth_headers, db_session):
        """Test successful sprint update"""
        # Create a sprint first
        sprint_data = {
            "sprint_name": "Test Sprint for Update",
            "sprint_goal": "A test sprint for updating",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-15T00:00:00Z",
            "status": SprintStatus.PLANNING,
            "project_id": 1
        }

        create_response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        created_sprint = create_response.json()
        
        # Update the sprint
        sprint_id = created_sprint["id"]
        update_data = {
            "sprint_name": "Updated Sprint Name",
            "sprint_goal": "Updated goal"
        }

        response = client.put(f"/api/v1/sprints/{sprint_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["sprint_name"] == "Updated Sprint Name"
        assert data["sprint_goal"] == "Updated goal"
    
    def test_update_sprint_not_found(self, client, auth_headers):
        """Test updating non-existent sprint"""
        update_data = {
            "sprint_name": "Updated Sprint Name",
            "sprint_goal": "Updated goal"
        }

        response = client.put("/api/v1/sprints/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_sprint_unauthorized(self, client):
        """Test updating sprint without authentication"""
        update_data = {
            "sprint_name": "Updated Sprint Name"
        }

        response = client.put("/api/v1/sprints/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_sprint_success(self, client, auth_headers, db_session):
        """Test successful sprint deletion"""
        # Create a sprint first
        sprint_data = {
            "sprint_name": "Test Sprint for Delete",
            "sprint_goal": "A test sprint for deletion",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-15T00:00:00Z",
            "status": SprintStatus.PLANNING,
            "project_id": 1
        }

        create_response = client.post("/api/v1/sprints/", json=sprint_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        created_sprint = create_response.json()
        
        # Delete the sprint
        sprint_id = created_sprint["id"]
        response = client.delete(f"/api/v1/sprints/{sprint_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify sprint is deleted
        get_response = client.get(f"/api/v1/sprints/{sprint_id}", headers=auth_headers)
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
    
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

        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Complete user stories 1-5",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            project_id=1
        )
        
        sprint = sprint_crud.create_sprint(db_session, sprint_data)
        assert sprint.sprint_name == "Sprint 1"
        assert sprint.sprint_goal == "Complete user stories 1-5"
        assert sprint.status == SprintStatus.PLANNING
    
    def test_get_sprint_by_id(self, db_session):
        """Test getting sprint by ID"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate

        # Create a sprint first
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Goal 1",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            project_id=1
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        
        # Get the sprint by ID
        sprint = sprint_crud.get_by_id(db_session, created_sprint.id)
        assert sprint is not None
        assert sprint.sprint_name == "Sprint 1"
    
    def test_get_sprints_with_pagination(self, db_session):
        """Test getting sprints with pagination"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate

        # Create multiple sprints
        for i in range(5):
            sprint_data = SprintCreate(
                sprint_name=f"Sprint {i}",
                sprint_goal=f"Goal {i}",
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=14),
                status=SprintStatus.PLANNING,
                project_id=1
            )
            sprint_crud.create_sprint(db_session, sprint_data)
        
        # Test pagination
        sprints = sprint_crud.get_sprints(db_session, skip=0, limit=3)
        assert len(sprints) == 3
        
        sprints = sprint_crud.get_sprints(db_session, skip=3, limit=3)
        assert len(sprints) == 2  # Only 2 more sprints
    
    def test_get_sprints_with_status_filter(self, db_session):
        """Test getting sprints with status filter"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate

        # Create sprints with different statuses
        planning_sprint = SprintCreate(
            sprint_name="Planning Sprint",
            sprint_goal="Plan the next release",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            project_id=1
        )
        sprint_crud.create_sprint(db_session, planning_sprint)
        
        active_sprint = SprintCreate(
            sprint_name="Active Sprint",
            sprint_goal="Work on active stories",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.ACTIVE,
            project_id=1
        )
        sprint_crud.create_sprint(db_session, active_sprint)
        
        # Test status filter
        planning_sprints = sprint_crud.get_sprints(db_session, status=SprintStatus.PLANNING)
        assert len(planning_sprints) >= 1
        assert all(sprint.status == SprintStatus.PLANNING for sprint in planning_sprints)
    
    def test_search_sprints(self, db_session):
        """Test searching sprints"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate

        # Create sprints with searchable names and goals
        sprint1 = SprintCreate(
            sprint_name="Frontend Development Sprint",
            sprint_goal="Complete frontend features",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            project_id=1
        )
        sprint_crud.create_sprint(db_session, sprint1)
        
        sprint2 = SprintCreate(
            sprint_name="Sprint 2",
            sprint_goal="Goal 2",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            project_id=1
        )
        sprint_crud.create_sprint(db_session, sprint2)
        
        # Test search
        frontend_sprints = sprint_crud.search_sprints(db_session, "frontend")
        assert len(frontend_sprints) >= 1
        assert any("frontend" in sprint.sprint_name.lower() or "frontend" in sprint.sprint_goal.lower() 
                  for sprint in frontend_sprints)
    
    def test_update_sprint(self, db_session):
        """Test updating sprint"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate, SprintUpdate

        # Create a sprint
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Goal 1",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            project_id=1
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        
        # Update the sprint
        update_data = SprintUpdate(
            sprint_name="Updated Sprint Name",
            sprint_goal="Updated goal"
        )
        
        updated_sprint = sprint_crud.update_sprint(db_session, created_sprint.id, update_data)
        assert updated_sprint.sprint_name == "Updated Sprint Name"
        assert updated_sprint.sprint_goal == "Updated goal"
    
    def test_delete_sprint(self, db_session):
        """Test deleting sprint"""
        from scrumix.api.crud.sprint import sprint_crud
        from scrumix.api.schemas.sprint import SprintCreate

        # Create a sprint
        sprint_data = SprintCreate(
            sprint_name="Sprint 1",
            sprint_goal="Goal 1",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.PLANNING,
            project_id=1
        )
        
        created_sprint = sprint_crud.create_sprint(db_session, sprint_data)
        sprint_id = created_sprint.id
        
        # Delete the sprint
        sprint_crud.delete_sprint(db_session, sprint_id)
        
        # Verify sprint is deleted
        deleted_sprint = sprint_crud.get_by_id(db_session, sprint_id)
        assert deleted_sprint is None 