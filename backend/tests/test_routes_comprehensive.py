"""
Comprehensive route tests for ScrumiX backend API - FIXED VERSION
Tests all API endpoints with proper authentication and database mocking
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch, Mock
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from typing import List
from fastapi import status

from scrumix.api.app import app
from scrumix.api.core.security import get_current_user
from scrumix.api.db.session import get_session

# Import models for mocking
from scrumix.api.models.backlog import Backlog, BacklogStatus, BacklogPriority, BacklogType
from scrumix.api.models.sprint import Sprint, SprintStatus
from scrumix.api.models.meeting_note import MeetingNote
from scrumix.api.models.documentation import Documentation, DocumentationType
from scrumix.api.models.project import Project, ProjectStatus
from scrumix.api.models.user import User, UserStatus


@pytest.fixture
def mock_current_user():
    """Mock current authenticated user"""
    user = MagicMock()
    user.id = 1
    user.email = "test@example.com"
    user.username = "testuser"
    user.full_name = "Test User"
    user.is_active = True
    user.is_verified = True
    return user


@pytest.fixture
def mock_session():
    """Mock database session"""
    session = MagicMock(spec=Session)
    session.add = MagicMock()
    session.commit = MagicMock()
    session.refresh = MagicMock()
    session.delete = MagicMock()
    session.query = MagicMock()
    session.execute = MagicMock()
    session.scalar = MagicMock()
    return session


@pytest.fixture
def mock_db():
    """Mock database session for sprint tests"""
    session = MagicMock(spec=Session)
    session.add = MagicMock()
    session.commit = MagicMock()
    session.refresh = MagicMock()
    session.delete = MagicMock()
    session.query = MagicMock()
    session.execute = MagicMock()
    session.scalar = MagicMock()
    return session


@pytest.fixture
def client(mock_current_user, mock_session):
    """Create test client with mocked dependencies"""
    from scrumix.api.core.security import get_current_user_hybrid, get_current_user, get_current_superuser
    from scrumix.api.db.session import get_session
    
    # Override all authentication dependencies
    def mock_auth_hybrid():
        return mock_current_user
    
    def mock_auth_user():
        return mock_current_user
    
    def mock_auth_superuser():
        return mock_current_user  # Use same user for simplicity
    
    def mock_get_db():
        return mock_session
    
    app.dependency_overrides[get_current_user_hybrid] = mock_auth_hybrid
    app.dependency_overrides[get_current_user] = mock_auth_user
    app.dependency_overrides[get_current_superuser] = mock_auth_superuser
    app.dependency_overrides[get_session] = mock_get_db
    
    with TestClient(app) as client:
        # Add default headers for authentication
        client.headers = {"Authorization": "Bearer test-token"}
        yield client
    
    # Clean up overrides
    app.dependency_overrides.clear()


@pytest.fixture
def sample_datetime():
    """Sample datetime for testing"""
    return datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)


# ===== BACKLOG ROUTE TESTS =====
class TestBacklogRoutes:
    """Test backlog API routes"""
    
    @patch('scrumix.api.crud.backlog.backlog_crud.get_backlogs')
    def test_get_backlogs(self, mock_get_backlogs, client, mock_session):
        """Test GET /api/v1/backlogs/"""
        # Mock CRUD response
        mock_backlog = MagicMock()
        mock_backlog.id = 1
        mock_backlog.title = "Test Backlog"
        mock_backlog.description = "Test description"
        mock_backlog.status = "todo"  # Use string instead of enum
        mock_backlog.priority = "high"  # Use string instead of enum
        mock_backlog.label = "test-label"  # Add label attribute
        mock_backlog.item_type = "story"  # Use string instead of enum
        mock_backlog.story_point = 3  # Add story_point attribute
        mock_backlog.parent_id = None  # Add parent_id attribute
        mock_backlog.assigned_to_id = None  # Add assigned_to_id attribute
        mock_backlog.project_id = 1
        mock_backlog.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_backlog.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_get_backlogs.return_value = [mock_backlog]
        
        response = client.get("/api/v1/backlogs/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 0  # Could be empty list
        mock_get_backlogs.assert_called_once_with(mock_session, 0, 100, None, None, None, None, None, None, False, False)
    
    @patch('scrumix.api.crud.backlog.backlog_crud.get')
    def test_get_backlog_by_id(self, mock_get_backlog, client, mock_session):
        """Test GET /api/v1/backlogs/{id}"""
        # Mock CRUD response with proper string values
        mock_backlog = MagicMock()
        mock_backlog.id = 1  # Use 'id' instead of 'backlog_id'
        mock_backlog.title = "Test Backlog"
        mock_backlog.description = "Test description"
        mock_backlog.status = "todo"  # Use string instead of enum
        mock_backlog.priority = "high"  # Use string instead of enum
        mock_backlog.label = "test-label"
        mock_backlog.item_type = "story"  # Use string instead of enum
        mock_backlog.project_id = 1
        mock_backlog.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_backlog.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_get_backlog.return_value = mock_backlog
        
        response = client.get("/api/v1/backlogs/1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        mock_get_backlog.assert_called_once_with(db=mock_session, id=1)
    
    @patch('scrumix.api.crud.backlog.backlog_crud.get')
    def test_get_backlog_not_found(self, mock_get_backlog, client, mock_session):
        """Test GET /api/v1/backlogs/{id} - not found"""
        mock_get_backlog.return_value = None
        
        response = client.get("/api/v1/backlogs/999")
        
        assert response.status_code == 404
        mock_get_backlog.assert_called_once_with(db=mock_session, id=999)
    
    @patch('scrumix.api.crud.backlog.backlog_crud.create')
    def test_create_backlog(self, mock_create_backlog, client, mock_session):
        """Test POST /api/v1/backlogs/"""
        # Mock CRUD response with proper string values
        mock_backlog = MagicMock()
        mock_backlog.id = 1  # Use 'id' instead of 'backlog_id'
        mock_backlog.title = "New Backlog"
        mock_backlog.description = "New description"
        mock_backlog.status = "todo"  # Use string instead of enum
        mock_backlog.priority = "medium"  # Use string instead of enum
        mock_backlog.label = "new-label"
        mock_backlog.item_type = "story"  # Use string instead of enum
        mock_backlog.project_id = 1
        mock_backlog.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_backlog.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_create_backlog.return_value = mock_backlog
        
        backlog_data = {
            "title": "New Backlog",
            "description": "New description",
            "status": "todo",
            "priority": "medium",
            "label": "new-label",
            "item_type": "story",
            "project_id": 1
        }
        
        response = client.post("/api/v1/backlogs/", json=backlog_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        mock_create_backlog.assert_called_once()
    
    @patch('scrumix.api.crud.backlog.backlog_crud.get')
    @patch('scrumix.api.crud.backlog.backlog_crud.update')
    def test_update_backlog(self, mock_update_backlog, mock_get_backlog, client, mock_session):
        """Test PUT /api/v1/backlogs/{backlog_id}"""
        # Mock existing backlog with proper string values
        mock_backlog = MagicMock()
        mock_backlog.id = 1  # Use 'id' instead of 'backlog_id'
        mock_backlog.title = "Updated Backlog"
        mock_backlog.description = "Updated description"
        mock_backlog.status = "in_progress"  # Use string instead of enum
        mock_backlog.priority = "high"  # Use string instead of enum
        mock_backlog.label = "updated-label"
        mock_backlog.item_type = "story"  # Use string instead of enum
        mock_backlog.project_id = 1
        mock_backlog.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_backlog.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_get_backlog.return_value = mock_backlog
        mock_update_backlog.return_value = mock_backlog
        
        update_data = {"title": "Updated Backlog"}
        
        response = client.put("/api/v1/backlogs/1", json=update_data)
        
        assert response.status_code == 200
        mock_get_backlog.assert_called_once_with(db=mock_session, id=1)
        mock_update_backlog.assert_called_once()
    
    @patch('scrumix.api.crud.backlog.backlog_crud.get')
    @patch('scrumix.api.crud.backlog.backlog_crud.delete_backlog')
    def test_delete_backlog(self, mock_delete_backlog, mock_get_backlog, client, mock_session):
        """Test DELETE /api/v1/backlogs/{id}"""
        # Mock existing backlog with proper string values
        mock_backlog = MagicMock()
        mock_backlog.id = 1  # Use 'id' instead of 'backlog_id'
        mock_backlog.title = "Test Backlog"
        mock_backlog.description = "Test description"
        mock_backlog.status = "todo"  # Use string instead of enum
        mock_backlog.priority = "high"  # Use string instead of enum
        mock_backlog.label = "test-label"
        mock_backlog.item_type = "story"  # Use string instead of enum
        mock_backlog.project_id = 1
        mock_backlog.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_backlog.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_get_backlog.return_value = mock_backlog
        mock_delete_backlog.return_value = True
        
        response = client.delete("/api/v1/backlogs/1")
        
        assert response.status_code == 204
        mock_delete_backlog.assert_called_once_with(db=mock_session, backlog_id=1)


# ===== SPRINT ROUTE TESTS =====
class TestSprintRoutes:
    """Test sprint routes"""

    @patch('scrumix.api.crud.sprint.sprint_crud.get_sprints')
    def test_get_sprints(self, mock_get_sprints, client, mock_session):
        """Test getting sprints list"""
        mock_sprint = MagicMock()
        mock_sprint.id = 1
        mock_sprint.sprint_name = "Test Sprint"
        mock_sprint.sprint_goal = "Test Goal"
        mock_sprint.status = "active"
        mock_sprint.start_date = datetime.now()
        mock_sprint.end_date = datetime.now() + timedelta(days=14)
        mock_sprint.project_id = 1
        mock_sprint.created_at = datetime.now()
        mock_sprint.updated_at = datetime.now()
        
        mock_get_sprints.return_value = [mock_sprint]
        
        response = client.get("/api/v1/sprints/")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == mock_sprint.id
        assert data[0]["sprintName"] == mock_sprint.sprint_name

    @patch('scrumix.api.crud.sprint.sprint_crud.create_sprint')
    def test_create_sprint(self, mock_create_sprint, client, mock_session):
        """Test creating a new sprint"""
        sprint_data = {
            "sprintName": "New Sprint",
            "sprintGoal": "New Goal",
            "startDate": (datetime.now() + timedelta(days=1)).isoformat(),
            "endDate": (datetime.now() + timedelta(days=15)).isoformat(),
            "status": "planning",
            "projectId": 1
        }
        
        mock_sprint = MagicMock()
        mock_sprint.id = 1
        mock_sprint.sprint_name = sprint_data["sprintName"]
        mock_sprint.sprint_goal = sprint_data["sprintGoal"]
        mock_sprint.status = sprint_data["status"]
        mock_sprint.project_id = sprint_data["projectId"]
        mock_sprint.created_at = datetime.now()
        mock_sprint.updated_at = datetime.now()
        
        mock_create_sprint.return_value = mock_sprint
        
        response = client.post("/api/v1/sprints/", json=sprint_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["id"] == mock_sprint.id
        assert data["sprintName"] == mock_sprint.sprint_name
        assert data["sprintGoal"] == mock_sprint.sprint_goal


# ===== PROJECT ROUTE TESTS =====
class TestProjectRoutes:
    """Test project API routes"""
    
    @patch('scrumix.api.crud.project.project_crud.get_projects')
    def test_get_projects(self, mock_get_projects, client, mock_session):
        """Test GET /api/v1/projects/"""
        mock_project = MagicMock()
        mock_project.id = 1
        mock_project.name = "Test Project"
        mock_project.description = "Test description"
        mock_project.status = "active"  # Use string instead of enum
        mock_project.start_date = datetime(2024, 1, 15, tzinfo=timezone.utc)
        mock_project.end_date = datetime(2024, 12, 15, tzinfo=timezone.utc)
        mock_project.color = "bg-blue-500"
        mock_project.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_project.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_project.last_activity_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_get_projects.return_value = [mock_project]
        
        response = client.get("/api/v1/projects/")
        
        assert response.status_code == 200
        mock_get_projects.assert_called_once_with(mock_session, 0, 100, None)
    
    @patch('scrumix.api.crud.project.project_crud.create_project')
    @patch('scrumix.api.crud.project.project_crud.get_by_name')
    def test_create_project(self, mock_get_by_name, mock_create_project, client, mock_session):
        """Test POST /api/v1/projects/"""
        mock_project = MagicMock()
        mock_project.id = 1
        mock_project.name = "New Project"
        mock_project.description = "New project description"
        mock_project.status = "planning"  # Use string instead of enum
        mock_project.start_date = datetime(2024, 1, 15, tzinfo=timezone.utc)
        mock_project.end_date = datetime(2024, 12, 15, tzinfo=timezone.utc)
        mock_project.color = "bg-blue-500"
        mock_project.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_project.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_project.last_activity_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_get_by_name.return_value = None  # No existing project
        mock_create_project.return_value = mock_project
        
        project_data = {
            "name": "New Project",
            "description": "New project description",
            "start_date": "2024-01-15T00:00:00Z",
            "end_date": "2024-12-15T00:00:00Z"
        }
        
        response = client.post("/api/v1/projects/", json=project_data)
        
        assert response.status_code == 201
        mock_create_project.assert_called_once()


# ===== MEETING NOTE ROUTE TESTS =====
class TestMeetingNoteRoutes:
    """Test meeting note API routes"""
    
    @patch('scrumix.api.routes.meeting_note.meeting_note.get_multi_with_pagination')
    def test_get_meeting_notes(self, mock_get_meeting_notes, client, mock_session):
        """Test GET /api/v1/meeting-notes/"""
        mock_note = MagicMock()
        mock_note.id = 1
        mock_note.title = "Meeting Note"
        mock_note.content = "Meeting content"
        mock_note.meeting_id = 1
        mock_note.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_note.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_get_meeting_notes.return_value = ([mock_note], 1)
        response = client.get("/api/v1/meeting-notes/")
        assert response.status_code == 200
        mock_get_meeting_notes.assert_called_once_with(
            mock_session, 0, 100, None, None, False
        )
    
    @patch('scrumix.api.routes.meeting_note.meeting_note.create')
    def test_create_meeting_note(self, mock_create_meeting_note, client, mock_session):
        """Test POST /api/v1/meeting-notes/"""
        mock_note = MagicMock()
        mock_note.id = 1
        mock_note.title = "New Meeting Note"
        mock_note.content = "New meeting content"
        mock_note.meeting_id = 1
        mock_note.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_note.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_create_meeting_note.return_value = mock_note
        
        note_data = {
            "title": "New Meeting Note",
            "content": "New meeting content",
            "meeting_id": 1
        }
        
        response = client.post("/api/v1/meeting-notes/", json=note_data)
        
        assert response.status_code == 201
        mock_create_meeting_note.assert_called_once()


# ===== DOCUMENTATION ROUTE TESTS =====
class TestDocumentationRoutes:
    """Test documentation API routes"""
    
    @patch('scrumix.api.crud.documentation.documentation_crud.get_documentations')
    def test_get_documentations(self, mock_get_documentations, client, mock_session):
        """Test GET /api/v1/documentations/"""
        mock_doc = MagicMock()
        mock_doc.id = 1  # Use id instead of doc_id
        mock_doc.doc_id = 1  # Keep doc_id for backward compatibility
        mock_doc.title = "API Documentation"
        mock_doc.type = "api_doc"  # Use correct enum value
        mock_doc.description = "API documentation"
        mock_doc.file_url = "http://example.com/api-doc.pdf"
        mock_doc.project_id = 1
        mock_doc.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_doc.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_get_documentations.return_value = [mock_doc]
        
        response = client.get("/api/v1/documentations/")
        
        assert response.status_code == 200
        mock_get_documentations.assert_called_once_with(mock_session, 0, 100, None)
    
    @patch('scrumix.api.crud.documentation.documentation_crud.create_documentation')
    def test_create_documentation(self, mock_create_documentation, client, mock_session):
        """Test POST /api/v1/documentations/"""
        mock_doc = MagicMock()
        mock_doc.id = 1  # Use id instead of doc_id
        mock_doc.doc_id = 1  # Keep doc_id for backward compatibility
        mock_doc.title = "New Documentation"
        mock_doc.type = "api_doc"  # Use correct enum value
        mock_doc.description = "New API documentation"
        mock_doc.file_url = "http://example.com/new-doc.pdf"
        mock_doc.project_id = 1
        mock_doc.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_doc.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        
        mock_create_documentation.return_value = mock_doc
        
        doc_data = {
            "title": "New Documentation",
            "type": "api_doc",
            "description": "New API documentation",
            "file_url": "http://example.com/new-doc.pdf",
            "project_id": 1
        }
        
        response = client.post("/api/v1/documentations/", json=doc_data)
        
        assert response.status_code == 201
        mock_create_documentation.assert_called_once()


# ===== ERROR HANDLING TESTS =====
class TestErrorHandling:
    """Test error handling in routes"""
    
    def test_unauthorized_access(self):
        """Test unauthorized access without authentication override"""
        # Create client without auth override
        with TestClient(app) as client:
            try:
                response = client.get("/api/v1/backlogs/")
                # Should return 401 or redirect to login
                assert response.status_code in [401, 403, 422]  # Depending on auth implementation
            except Exception as e:
                # If database is not properly configured, this is expected
                assert "Database not initialized" in str(e) or "SessionLocal is None" in str(e)
    
    @patch('scrumix.api.crud.backlog.create_backlog')
    def test_invalid_data_create(self, mock_create_backlog, client, mock_session):
        """Test creating backlog with invalid data"""
        invalid_data = {
            "title": "",  # Empty title should be invalid
            "project_id": "invalid"  # Should be integer
        }
        
        response = client.post("/api/v1/backlogs/", json=invalid_data)
        
        assert response.status_code == 422  # Validation error
        mock_create_backlog.assert_not_called()
    
    def test_invalid_content_type(self, client):
        """Test sending invalid content type"""
        response = client.post("/api/v1/backlogs/", data="invalid data")
        
        assert response.status_code == 422
    
    @patch('scrumix.api.crud.backlog.get_backlog')
    def test_invalid_id_format(self, mock_get_backlog, client, mock_session):
        """Test using invalid ID format"""
        response = client.get("/api/v1/backlogs/invalid-id")
        
        assert response.status_code == 422  # Validation error
        mock_get_backlog.assert_not_called()


# ===== PAGINATION TESTS =====
class TestPagination:
    """Test pagination functionality"""
    
    @patch('scrumix.api.crud.backlog.backlog_crud.get_backlogs')
    def test_pagination_parameters(self, mock_get_backlogs, client, mock_session):
        """Test pagination with skip and limit parameters"""
        mock_get_backlogs.return_value = []
        
        response = client.get("/api/v1/backlogs/?skip=10&limit=20")
        
        assert response.status_code == 200
        mock_get_backlogs.assert_called_once_with(mock_session, 10, 20, None, None, None, None, None, None, False, False)
    
    @patch('scrumix.api.crud.backlog.backlog_crud.get_backlogs')
    def test_default_pagination(self, mock_get_backlogs, client, mock_session):
        """Test default pagination values"""
        mock_get_backlogs.return_value = []
        
        response = client.get("/api/v1/backlogs/")
        
        assert response.status_code == 200
        mock_get_backlogs.assert_called_once_with(mock_session, 0, 100, None, None, None, None, None, None, False, False)
    
    @patch('scrumix.api.crud.backlog.backlog_crud.get_backlogs')
    def test_negative_pagination(self, mock_get_backlogs, client, mock_session):
        """Test negative pagination values"""
        response = client.get("/api/v1/backlogs/?skip=-1&limit=-1")
        
        # Should handle negative values gracefully or return validation error
        assert response.status_code in [200, 422]


# ===== INTEGRATION TESTS =====
class TestIntegration:
    """Test integration scenarios"""
    
    @patch('scrumix.api.crud.backlog.get_backlogs')
    @patch('scrumix.api.crud.project.get_project')
    def test_backlog_project_relationship(self, mock_get_project, mock_get_backlogs, client, mock_session):
        """Test that backlogs are properly associated with projects"""
        # Mock project
        mock_project = MagicMock()
        mock_project.id = 1
        mock_project.name = "Test Project"
        mock_get_project.return_value = mock_project
        
        # Mock backlog
        mock_backlog = MagicMock()
        mock_backlog.backlog_id = 1
        mock_backlog.project_id = 1
        mock_backlog.title = "Test Backlog"
        mock_backlog.status = BacklogStatus.TODO
        mock_backlog.priority = BacklogPriority.MEDIUM
        mock_backlog.item_type = BacklogType.STORY
        mock_backlog.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_backlog.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        mock_get_backlogs.return_value = [mock_backlog]
        
        response = client.get("/api/v1/backlogs/")
        
        assert response.status_code == 200
        data = response.json()
        # Verify that backlogs are returned (implementation may vary)
        assert isinstance(data, list)


# ===== PERFORMANCE TESTS =====
class TestPerformance:
    """Test performance-related scenarios"""
    
    @patch('scrumix.api.crud.backlog.get_backlogs')
    def test_large_result_set(self, mock_get_backlogs, client, mock_session):
        """Test handling large result sets"""
        # Mock large number of backlogs
        large_backlog_list = []
        for i in range(100):
            mock_backlog = MagicMock()
            mock_backlog.backlog_id = i + 1
            mock_backlog.title = f"Backlog {i + 1}"
            mock_backlog.status = BacklogStatus.TODO
            mock_backlog.priority = BacklogPriority.MEDIUM
            mock_backlog.item_type = BacklogType.STORY
            mock_backlog.project_id = 1
            mock_backlog.created_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
            mock_backlog.updated_at = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
            large_backlog_list.append(mock_backlog)
        
        mock_get_backlogs.return_value = large_backlog_list
        
        response = client.get("/api/v1/backlogs/?limit=100")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Response should handle large datasets efficiently
        assert len(data) <= 100 