"""
Acceptance Criteria API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock

from scrumix.api.models.backlog import Backlog


class TestAcceptanceCriteriaEndpoints:
    """Test acceptance criteria management endpoints"""

    def test_get_acceptance_criteria_success(self, client, auth_headers):
        """Test getting acceptance criteria list"""
        response = client.get("/api/v1/acceptance-criteria/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "acceptanceCriteria" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["acceptanceCriteria"], list)

    def test_get_acceptance_criteria_unauthorized(self, client):
        """Test getting acceptance criteria without authentication"""
        response = client.get("/api/v1/acceptance-criteria/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_acceptance_criteria_with_pagination(self, client, auth_headers):
        """Test getting acceptance criteria with pagination"""
        response = client.get("/api/v1/acceptance-criteria/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "acceptanceCriteria" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_get_acceptance_criteria_with_backlog_filter(self, client, auth_headers):
        """Test getting acceptance criteria with backlog filter"""
        response = client.get("/api/v1/acceptance-criteria/?backlog_id=1", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "acceptanceCriteria" in data
        assert isinstance(data["acceptanceCriteria"], list)

    def test_get_acceptance_criteria_with_search(self, client, auth_headers):
        """Test getting acceptance criteria with search"""
        response = client.get("/api/v1/acceptance-criteria/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "acceptanceCriteria" in data
        assert isinstance(data["acceptanceCriteria"], list)

    def test_create_acceptance_criteria_success(self, client, auth_headers, db_session):
        """Test successful acceptance criteria creation"""
        # Create a backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        # Create a backlog
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        criteria_data = {
            "title": "Test Acceptance Criteria",
            "description": "A test acceptance criteria",
            "backlog_id": backlog.id,
            "is_met": False
        }
        
        response = client.post("/api/v1/acceptance-criteria/", json=criteria_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == criteria_data["title"]
        assert data["description"] == criteria_data["description"]
        assert data["backlog_id"] == criteria_data["backlog_id"]
        assert data["is_met"] == criteria_data["is_met"]
        assert "id" in data

    def test_create_acceptance_criteria_invalid_data(self, client, auth_headers):
        """Test acceptance criteria creation with invalid data"""
        criteria_data = {
            "title": "",  # Empty title
            "description": "A test acceptance criteria",
            "backlog_id": 1,
            "is_met": False
        }
        
        response = client.post("/api/v1/acceptance-criteria/", json=criteria_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_acceptance_criteria_nonexistent_backlog(self, client, auth_headers):
        """Test acceptance criteria creation with non-existent backlog"""
        criteria_data = {
            "title": "Test Acceptance Criteria",
            "description": "A test acceptance criteria",
            "backlog_id": 999,  # Non-existent backlog
            "is_met": False
        }
        
        response = client.post("/api/v1/acceptance-criteria/", json=criteria_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Backlog with ID 999 not found" in response.json()["detail"]

    def test_create_acceptance_criteria_unauthorized(self, client):
        """Test acceptance criteria creation without authentication"""
        criteria_data = {
            "title": "Test Acceptance Criteria",
            "description": "A test acceptance criteria",
            "backlog_id": 1,
            "is_met": False
        }
        
        response = client.post("/api/v1/acceptance-criteria/", json=criteria_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_acceptance_criteria_by_id_success(self, client, auth_headers, db_session):
        """Test getting acceptance criteria by ID"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create acceptance criteria
        criteria_data = {
            "title": "Test Acceptance Criteria for Get",
            "description": "A test acceptance criteria for getting",
            "backlog_id": backlog.id,
            "is_met": False
        }
        
        create_response = client.post("/api/v1/acceptance-criteria/", json=criteria_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        criteria_id = create_response.json()["id"]
        
        # Get the acceptance criteria
        response = client.get(f"/api/v1/acceptance-criteria/{criteria_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == criteria_id
        assert data["title"] == criteria_data["title"]
        assert data["description"] == criteria_data["description"]

    def test_get_acceptance_criteria_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent acceptance criteria"""
        response = client.get("/api/v1/acceptance-criteria/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_acceptance_criteria_by_id_unauthorized(self, client):
        """Test getting acceptance criteria without authentication"""
        response = client.get("/api/v1/acceptance-criteria/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_acceptance_criteria_success(self, client, auth_headers, db_session):
        """Test successful acceptance criteria update"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create acceptance criteria
        criteria_data = {
            "title": "Test Acceptance Criteria for Update",
            "description": "A test acceptance criteria for updating",
            "backlog_id": backlog.id,
            "is_met": False
        }
        
        create_response = client.post("/api/v1/acceptance-criteria/", json=criteria_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        criteria_id = create_response.json()["id"]
        
        # Update the acceptance criteria
        update_data = {
            "title": "Updated Acceptance Criteria Title",
            "description": "Updated description",
            "is_met": True
        }
        
        response = client.put(f"/api/v1/acceptance-criteria/{criteria_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["is_met"] == update_data["is_met"]

    def test_update_acceptance_criteria_not_found(self, client, auth_headers):
        """Test updating non-existent acceptance criteria"""
        update_data = {
            "title": "Updated Acceptance Criteria Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/acceptance-criteria/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_acceptance_criteria_unauthorized(self, client):
        """Test updating acceptance criteria without authentication"""
        update_data = {
            "title": "Updated Acceptance Criteria Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/acceptance-criteria/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_acceptance_criteria_success(self, client, auth_headers, db_session):
        """Test successful acceptance criteria deletion"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create acceptance criteria
        criteria_data = {
            "title": "Test Acceptance Criteria for Delete",
            "description": "A test acceptance criteria for deletion",
            "backlog_id": backlog.id,
            "is_met": False
        }
        
        create_response = client.post("/api/v1/acceptance-criteria/", json=criteria_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        criteria_id = create_response.json()["id"]
        
        # Delete the acceptance criteria
        response = client.delete(f"/api/v1/acceptance-criteria/{criteria_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Acceptance criteria deleted successfully"

    def test_delete_acceptance_criteria_not_found(self, client, auth_headers):
        """Test deleting non-existent acceptance criteria"""
        response = client.delete("/api/v1/acceptance-criteria/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_acceptance_criteria_unauthorized(self, client):
        """Test deleting acceptance criteria without authentication"""
        response = client.delete("/api/v1/acceptance-criteria/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_criteria_by_backlog(self, client, auth_headers, db_session):
        """Test getting acceptance criteria by backlog"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        response = client.get(f"/api/v1/acceptance-criteria/backlog/{backlog.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_criteria_by_backlog_with_pagination(self, client, auth_headers, db_session):
        """Test getting acceptance criteria by backlog with pagination"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        response = client.get(f"/api/v1/acceptance-criteria/backlog/{backlog.id}?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_criteria_by_nonexistent_backlog(self, client, auth_headers):
        """Test getting acceptance criteria by non-existent backlog"""
        response = client.get("/api/v1/acceptance-criteria/backlog/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Backlog with ID 999 not found" in response.json()["detail"]

    def test_count_criteria_by_backlog(self, client, auth_headers, db_session):
        """Test counting acceptance criteria by backlog"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        response = client.get(f"/api/v1/acceptance-criteria/backlog/{backlog.id}/count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "backlog_id" in data
        assert "count" in data
        assert data["backlog_id"] == backlog.id

    def test_count_criteria_by_nonexistent_backlog(self, client, auth_headers):
        """Test counting acceptance criteria by non-existent backlog"""
        response = client.get("/api/v1/acceptance-criteria/backlog/999/count", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Backlog with ID 999 not found" in response.json()["detail"]

    def test_bulk_create_criteria_success(self, client, auth_headers, db_session):
        """Test successful bulk creation of acceptance criteria"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        criteria_titles = ["Criteria 1", "Criteria 2", "Criteria 3"]
        
        response = client.post(f"/api/v1/acceptance-criteria/backlog/{backlog.id}/bulk", json=criteria_titles, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        assert data[0]["title"] == "Criteria 1"
        assert data[1]["title"] == "Criteria 2"
        assert data[2]["title"] == "Criteria 3"

    def test_bulk_create_criteria_empty_list(self, client, auth_headers, db_session):
        """Test bulk creation with empty criteria list"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        response = client.post(f"/api/v1/acceptance-criteria/backlog/{backlog.id}/bulk", json=[], headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "At least one criteria title is required" in response.json()["detail"]

    def test_bulk_create_criteria_nonexistent_backlog(self, client, auth_headers):
        """Test bulk creation with non-existent backlog"""
        criteria_titles = ["Criteria 1", "Criteria 2"]
        
        response = client.post("/api/v1/acceptance-criteria/backlog/999/bulk", json=criteria_titles, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Backlog with ID 999 not found" in response.json()["detail"]

    def test_delete_all_criteria_by_backlog(self, client, auth_headers, db_session):
        """Test deleting all acceptance criteria by backlog"""
        # Create a project and backlog first
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create some acceptance criteria first
        criteria_data = {
            "title": "Test Acceptance Criteria",
            "description": "A test acceptance criteria",
            "backlog_id": backlog.id,
            "is_met": False
        }
        
        client.post("/api/v1/acceptance-criteria/", json=criteria_data, headers=auth_headers)
        
        # Delete all criteria for the backlog
        response = client.delete(f"/api/v1/acceptance-criteria/backlog/{backlog.id}/all", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "Deleted" in response.json()["message"]

    def test_delete_all_criteria_by_nonexistent_backlog(self, client, auth_headers):
        """Test deleting all acceptance criteria by non-existent backlog"""
        response = client.delete("/api/v1/acceptance-criteria/backlog/999/all", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Backlog with ID 999 not found" in response.json()["detail"]

    def test_search_acceptance_criteria(self, client, auth_headers):
        """Test searching acceptance criteria"""
        response = client.get("/api/v1/acceptance-criteria/search/test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_acceptance_criteria_with_backlog_filter(self, client, auth_headers):
        """Test searching acceptance criteria with backlog filter"""
        response = client.get("/api/v1/acceptance-criteria/search/test?backlog_id=1", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_acceptance_criteria_with_pagination(self, client, auth_headers):
        """Test searching acceptance criteria with pagination"""
        response = client.get("/api/v1/acceptance-criteria/search/test?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)


class TestAcceptanceCriteriaCRUD:
    """Test acceptance criteria CRUD operations"""

    def test_create_acceptance_criteria_success(self, db_session):
        """Test successful acceptance criteria creation"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        criteria_data = AcceptanceCriteriaCreate(
            title="Test Acceptance Criteria",
            description="A test acceptance criteria",
            backlog_id=backlog.id,
            is_met=False
        )
        
        criteria_obj = acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        assert criteria_obj.title == criteria_data.title
        assert criteria_obj.description == criteria_data.description
        assert criteria_obj.backlog_id == criteria_data.backlog_id
        assert criteria_obj.is_met == criteria_data.is_met

    def test_get_acceptance_criteria_by_id(self, db_session):
        """Test getting acceptance criteria by ID"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        criteria_data = AcceptanceCriteriaCreate(
            title="Test Acceptance Criteria",
            description="A test acceptance criteria",
            backlog_id=backlog.id,
            is_met=False
        )
        
        created_criteria = acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        
        retrieved_criteria = acceptance_criteria.get(db=db_session, id=created_criteria.id)
        assert retrieved_criteria is not None
        assert retrieved_criteria.title == criteria_data.title
        assert retrieved_criteria.description == criteria_data.description

    def test_get_acceptance_criteria_with_pagination(self, db_session):
        """Test getting acceptance criteria with pagination"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create multiple acceptance criteria
        for i in range(5):
            criteria_data = AcceptanceCriteriaCreate(
                title=f"Test Acceptance Criteria {i}",
                description=f"A test acceptance criteria {i}",
                backlog_id=backlog.id,
                is_met=False
            )
            acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        
        criteria, total = acceptance_criteria.get_multi_with_pagination(db_session, skip=0, limit=3)
        assert len(criteria) == 3
        assert total == 5

    def test_get_acceptance_criteria_by_backlog_id(self, db_session):
        """Test getting acceptance criteria by backlog ID"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create acceptance criteria
        criteria_data = AcceptanceCriteriaCreate(
            title="Test Acceptance Criteria",
            description="A test acceptance criteria",
            backlog_id=backlog.id,
            is_met=False
        )
        acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        
        # Get criteria by backlog ID
        criteria = acceptance_criteria.get_by_backlog_id(db_session, backlog.id, skip=0, limit=10)
        assert len(criteria) == 1
        assert criteria[0].backlog_id == backlog.id

    def test_count_acceptance_criteria_by_backlog_id(self, db_session):
        """Test counting acceptance criteria by backlog ID"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create multiple acceptance criteria
        for i in range(3):
            criteria_data = AcceptanceCriteriaCreate(
                title=f"Test Acceptance Criteria {i}",
                description=f"A test acceptance criteria {i}",
                backlog_id=backlog.id,
                is_met=False
            )
            acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        
        # Count criteria by backlog ID
        count = acceptance_criteria.count_by_backlog_id(db_session, backlog.id)
        assert count == 3

    def test_bulk_create_acceptance_criteria(self, db_session):
        """Test bulk creation of acceptance criteria"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Bulk create criteria
        criteria_titles = ["Criteria 1", "Criteria 2", "Criteria 3"]
        created_criteria = acceptance_criteria.bulk_create_for_backlog(db_session, backlog.id, criteria_titles)
        
        assert len(created_criteria) == 3
        assert created_criteria[0].title == "Criteria 1"
        assert created_criteria[1].title == "Criteria 2"
        assert created_criteria[2].title == "Criteria 3"

    def test_search_acceptance_criteria(self, db_session):
        """Test searching acceptance criteria"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create acceptance criteria with different titles
        criteria_titles = ["User can login", "User can logout", "User can register", "User can reset password"]
        for title in criteria_titles:
            criteria_data = AcceptanceCriteriaCreate(
                title=title,
                description="A test acceptance criteria",
                backlog_id=backlog.id,
                is_met=False
            )
            acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        
        # Search for criteria containing "User"
        criteria = acceptance_criteria.search_criteria(db_session, "User", skip=0, limit=10)
        assert len(criteria) == 4

    def test_update_acceptance_criteria(self, db_session):
        """Test updating acceptance criteria"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate, AcceptanceCriteriaUpdate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        criteria_data = AcceptanceCriteriaCreate(
            title="Test Acceptance Criteria",
            description="A test acceptance criteria",
            backlog_id=backlog.id,
            is_met=False
        )
        
        created_criteria = acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        
        update_data = AcceptanceCriteriaUpdate(
            title="Updated Acceptance Criteria",
            description="Updated description",
            is_met=True
        )
        
        updated_criteria = acceptance_criteria.update(db=db_session, db_obj=created_criteria, obj_in=update_data)
        assert updated_criteria.title == update_data.title
        assert updated_criteria.description == update_data.description
        assert updated_criteria.is_met == update_data.is_met

    def test_delete_acceptance_criteria(self, db_session):
        """Test deleting acceptance criteria"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        criteria_data = AcceptanceCriteriaCreate(
            title="Test Acceptance Criteria",
            description="A test acceptance criteria",
            backlog_id=backlog.id,
            is_met=False
        )
        
        created_criteria = acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        criteria_id = created_criteria.id
        
        acceptance_criteria.remove(db=db_session, id=criteria_id)
        
        # Verify criteria is deleted
        retrieved_criteria = acceptance_criteria.get(db=db_session, id=criteria_id)
        assert retrieved_criteria is None

    def test_delete_all_acceptance_criteria_by_backlog_id(self, db_session):
        """Test deleting all acceptance criteria by backlog ID"""
        from scrumix.api.crud.acceptance_criteria import acceptance_criteria
        from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaCreate
        from scrumix.api.models.backlog import Backlog
        from scrumix.api.models.project import Project
        
        # Create a project and backlog first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        backlog = Backlog(
            title="Test Backlog",
            description="A test backlog",
            project_id=project.id,
            priority="high",
            status="todo"
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Create multiple acceptance criteria
        for i in range(3):
            criteria_data = AcceptanceCriteriaCreate(
                title=f"Test Acceptance Criteria {i}",
                description=f"A test acceptance criteria {i}",
                backlog_id=backlog.id,
                is_met=False
            )
            acceptance_criteria.create(db=db_session, obj_in=criteria_data)
        
        # Delete all criteria for the backlog
        deleted_count = acceptance_criteria.delete_all_by_backlog_id(db_session, backlog.id)
        assert deleted_count == 3
        
        # Verify all criteria are deleted
        remaining_criteria = acceptance_criteria.get_by_backlog_id(db_session, backlog.id, skip=0, limit=10)
        assert len(remaining_criteria) == 0 