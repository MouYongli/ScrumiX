"""
Project management API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock

from scrumix.api.models.project import ProjectStatus
from datetime import datetime, timedelta


class TestProjectEndpoints:
    """Test project management endpoints"""

    def test_get_projects_success(self, client, auth_headers):
        """Test getting projects list"""
        response = client.get("/api/v1/projects/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_projects_unauthorized(self, client):
        """Test getting projects without authentication"""
        response = client.get("/api/v1/projects/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_projects_with_pagination(self, client, auth_headers):
        """Test getting projects with pagination"""
        response = client.get("/api/v1/projects/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_projects_with_status_filter(self, client, auth_headers):
        """Test getting projects with status filter"""
        response = client.get("/api/v1/projects/?status=active", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_projects_with_invalid_status(self, client, auth_headers):
        """Test getting projects with invalid status"""
        response = client.get("/api/v1/projects/?status=invalid", headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid status" in response.json()["detail"]

    def test_get_projects_with_search(self, client, auth_headers):
        """Test getting projects with search"""
        response = client.get("/api/v1/projects/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_create_project_success(self, client, auth_headers):
        """Test successful project creation"""
        project_data = {
            "name": "Test Project",
            "description": "A test project",
            "status": "active",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["name"] == project_data["name"]
        assert data["description"] == project_data["description"]
        assert data["status"] == project_data["status"]
        assert "id" in data

    def test_create_project_duplicate_name(self, client, auth_headers, db_session):
        """Test project creation with duplicate name"""
        # Create first project
        project_data = {
            "name": "Duplicate Project",
            "description": "First project",
            "status": "active",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        response1 = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert response1.status_code == status.HTTP_201_CREATED
        
        # Try to create second project with same name
        response2 = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert response2.status_code == status.HTTP_400_BAD_REQUEST
        assert "Project name already exists" in response2.json()["detail"]

    def test_create_project_invalid_data(self, client, auth_headers):
        """Test project creation with invalid data"""
        project_data = {
            "name": "",  # Empty name
            "description": "A test project",
            "status": "active",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_project_unauthorized(self, client):
        """Test project creation without authentication"""
        project_data = {
            "name": "Test Project",
            "description": "A test project",
            "status": "active"
        }
        
        response = client.post("/api/v1/projects/", json=project_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_project_by_id_success(self, client, auth_headers, db_session):
        """Test getting project by ID"""
        from scrumix.api.models.project import Project
        
        # Create a project first
        project = Project(
            name="Test Project for Get",
            description="A test project for getting",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        db_session.add(project)
        db_session.commit()
        
        response = client.get(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == project.id
        assert data["name"] == project.name
        assert data["description"] == project.description

    def test_get_project_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent project"""
        response = client.get("/api/v1/projects/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_project_by_id_unauthorized(self, client):
        """Test getting project without authentication"""
        response = client.get("/api/v1/projects/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_project_success(self, client, auth_headers, db_session):
        """Test successful project update"""
        from scrumix.api.models.project import Project
        
        # Create a project first
        project = Project(
            name="Test Project for Update",
            description="A test project for updating",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        db_session.add(project)
        db_session.commit()
        
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description",
            "status": "on-hold"
        }
        
        response = client.put(f"/api/v1/projects/{project.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
        assert data["status"] == update_data["status"]

    def test_update_project_not_found(self, client, auth_headers):
        """Test updating non-existent project"""
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/projects/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_project_unauthorized(self, client):
        """Test updating project without authentication"""
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/projects/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_project_success(self, client, auth_headers, db_session):
        """Test successful project deletion"""
        from scrumix.api.models.project import Project
        
        # Create a project to delete
        project = Project(
            name="Test Project for Deletion",
            description="A test project for deletion",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        db_session.add(project)
        db_session.commit()
        
        response = client.delete(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Project deleted successfully"

    def test_delete_project_not_found(self, client, auth_headers):
        """Test deleting non-existent project"""
        response = client.delete("/api/v1/projects/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_project_unauthorized(self, client):
        """Test deleting project without authentication"""
        response = client.delete("/api/v1/projects/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestProjectCRUD:
    """Test project CRUD operations"""

    def test_create_project_success(self, db_session):
        """Test successful project creation"""
        from scrumix.api.crud.project import project_crud
        from scrumix.api.schemas.project import ProjectCreate
        
        project_data = ProjectCreate(name="Test Project",
            description="A test project",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        
        project = project_crud.create(db_session, obj_in=project_data)
        assert project.name == project_data.name
        assert project.description == project_data.description
        assert project.status == project_data.status

    def test_get_project_by_id(self, db_session):
        """Test getting project by ID"""
        from scrumix.api.crud.project import project_crud
        from scrumix.api.schemas.project import ProjectCreate
        
        # Create a project first
        project_data = ProjectCreate(name="Test Project for Get",
            description="A test project for getting",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        
        created_project = project_crud.create(db_session, obj_in=project_data)
        
        # Get the project
        project = project_crud.get(db_session, id=created_project.id)
        assert project is not None
        assert project.name == project_data.name

    def test_get_project_by_name(self, db_session):
        """Test getting project by name"""
        from scrumix.api.crud.project import project_crud
        from scrumix.api.schemas.project import ProjectCreate
        
        # Create a project first
        project_data = ProjectCreate(name="Test Project for Name Get",
            description="A test project for getting by name",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        
        created_project = project_crud.create(db_session, obj_in=project_data)
        
        # Get the project by name
        project = project_crud.get_by_name(db_session, project_data.name)
        assert project is not None
        assert project.id == created_project.id

    def test_get_projects_with_pagination(self, db_session):
        """Test getting projects with pagination"""
        from scrumix.api.crud.project import project_crud
        from scrumix.api.schemas.project import ProjectCreate
        
        # Create some projects
        for i in range(5):
            project_data = ProjectCreate(
                name=f"Test Project {i}",
                description=f"A test project {i}",
                status=ProjectStatus.ACTIVE,
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=30)
            )
            project_crud.create(db_session, obj_in=project_data)
            
        # Get projects with pagination
        projects = project_crud.get_projects(db_session, skip=0, limit=3)
        assert len(projects) == 3
        
        projects = project_crud.get_projects(db_session, skip=3, limit=3)
        assert len(projects) == 2

    def test_get_projects_with_status_filter(self, db_session):
        """Test getting projects with status filter"""
        from scrumix.api.crud.project import project_crud
        from scrumix.api.schemas.project import ProjectCreate
        
        # Create some projects with different statuses
        project_data_active = ProjectCreate(
            name="Active Project",
            description="An active project",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        project_crud.create(db_session, obj_in=project_data_active)
        
        project_data_planning = ProjectCreate(
            name="Planning Project",
            description="A planning project",
            status=ProjectStatus.PLANNING,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        project_crud.create(db_session, obj_in=project_data_planning)

        # Get active projects
        active_projects = project_crud.get_projects(db_session, status=ProjectStatus.ACTIVE)
        assert len(active_projects) == 1
        assert active_projects[0].status == ProjectStatus.ACTIVE
        
        # Get completed projects
        completed_projects = project_crud.get_projects(db_session, status=ProjectStatus.COMPLETED)
        assert len(completed_projects) == 1
        assert completed_projects[0].status == ProjectStatus.COMPLETED

    def test_search_projects(self, db_session):
        """Test searching projects"""
        from scrumix.api.crud.project import project_crud
        from scrumix.api.schemas.project import ProjectCreate
        
        # Create some projects to search
        project_data_1 = ProjectCreate(
            name="Searchable Project One",
            description="A project with searchable content",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        project_crud.create(db_session, obj_in=project_data_1)
        
        project_data_2 = ProjectCreate(
            name="Another Project",
            description="Another searchable project",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        project_crud.create(db_session, obj_in=project_data_2)
        
        # Search for projects
        frontend_projects = project_crud.search_projects(db_session, "Frontend")
        assert len(frontend_projects) == 1
        assert "Frontend" in frontend_projects[0].name
        
        # Search for "Development"
        dev_projects = project_crud.search_projects(db_session, "Development")
        assert len(dev_projects) == 2

    def test_update_project(self, db_session):
        """Test updating project"""
        from scrumix.api.crud.project import project_crud
        from scrumix.api.schemas.project import ProjectCreate, ProjectUpdate
        
        # Create a project first
        project_data = ProjectCreate(name="Project to Update",
            description="A project to be updated",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        
        created_project = project_crud.create(db_session, obj_in=project_data)
        
        # Update the project
        update_data = ProjectUpdate(
            name="Updated Project Name",
            description="Updated description",
            status=ProjectStatus.COMPLETED
        )
        
        updated_project = project_crud.update_project(db_session, created_project, update_data)
        assert updated_project.name == update_data.name
        assert updated_project.description == update_data.description
        assert updated_project.status == update_data.status

    def test_delete_project(self, db_session):
        """Test deleting project"""
        from scrumix.api.crud.project import project_crud
        from scrumix.api.schemas.project import ProjectCreate
        
        # Create a project to delete
        project_data = ProjectCreate(
            name="Project to Delete",
            description="A project to be deleted",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        
        created_project = project_crud.create(db_session, obj_in=project_data)
        
        # Delete the project
        deleted = project_crud.remove(db_session, id=created_project.id)
        assert deleted
        
        # Verify it's deleted
        project = project_crud.get(db_session, id=created_project.id)
        assert project is None 