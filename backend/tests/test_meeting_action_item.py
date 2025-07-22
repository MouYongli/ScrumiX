"""
Meeting Action Items API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.meeting import MeetingType


class TestMeetingActionItemEndpoints:
    """Test meeting action item management endpoints"""

    def test_get_meeting_action_items_success(self, client, auth_headers):
        """Test getting meeting action items list"""
        response = client.get("/api/v1/meeting-action-items/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "actionItems" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["actionItems"], list)

    def test_get_meeting_action_items_unauthorized(self, client):
        """Test getting meeting action items without authentication"""
        response = client.get("/api/v1/meeting-action-items/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meeting_action_items_with_pagination(self, client, auth_headers):
        """Test getting meeting action items with pagination"""
        response = client.get("/api/v1/meeting-action-items/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "actionItems" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_get_meeting_action_items_with_meeting_filter(self, client, auth_headers):
        """Test getting meeting action items with meeting filter"""
        response = client.get("/api/v1/meeting-action-items/?meeting_id=1", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "actionItems" in data
        assert isinstance(data["actionItems"], list)

    def test_get_meeting_action_items_with_search(self, client, auth_headers):
        """Test getting meeting action items with search"""
        response = client.get("/api/v1/meeting-action-items/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "actionItems" in data
        assert isinstance(data["actionItems"], list)

    def test_get_meeting_action_items_with_due_date_filters(self, client, auth_headers):
        """Test getting meeting action items with due date filters"""
        due_before = (datetime.now() + timedelta(days=7)).isoformat()
        due_after = datetime.now().isoformat()
        
        response = client.get(f"/api/v1/meeting-action-items/?due_before={due_before}&due_after={due_after}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "actionItems" in data
        assert isinstance(data["actionItems"], list)

    def test_create_meeting_action_item_success(self, client, auth_headers, db_session):
        """Test successful meeting action item creation"""
        # Create a meeting first
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        # Create a meeting
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        action_item_data = {
            "title": "Test Action Item",
            "description": "A test action item",
            "meeting_id": meeting.id,
            "assigned_to": "test@example.com",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "status": "pending"
        }
        
        response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == action_item_data["title"]
        assert data["description"] == action_item_data["description"]
        assert data["meeting_id"] == action_item_data["meeting_id"]
        assert data["assigned_to"] == action_item_data["assigned_to"]
        assert data["priority"] == action_item_data["priority"]
        assert data["status"] == action_item_data["status"]
        assert "id" in data

    def test_create_meeting_action_item_invalid_data(self, client, auth_headers):
        """Test meeting action item creation with invalid data"""
        action_item_data = {
            "title": "",  # Empty title
            "description": "A test action item",
            "meeting_id": 1,
            "assigned_to": "test@example.com",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "status": "pending"
        }
        
        response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_action_item_nonexistent_meeting(self, client, auth_headers):
        """Test meeting action item creation with non-existent meeting"""
        action_item_data = {
            "title": "Test Action Item",
            "description": "A test action item",
            "meeting_id": 999,  # Non-existent meeting
            "assigned_to": "test@example.com",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "status": "pending"
        }
        
        response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_create_meeting_action_item_unauthorized(self, client):
        """Test meeting action item creation without authentication"""
        action_item_data = {
            "title": "Test Action Item",
            "description": "A test action item",
            "meeting_id": 1,
            "assigned_to": "test@example.com",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "status": "pending"
        }
        
        response = client.post("/api/v1/meeting-action-items/", json=action_item_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meeting_action_item_by_id_success(self, client, auth_headers, db_session):
        """Test getting meeting action item by ID"""
        # Create a meeting and action item first
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        action_item_data = {
            "title": "Test Action Item for Get",
            "description": "A test action item for getting",
            "meeting_id": meeting.id,
            "assigned_to": "test@example.com",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "status": "pending"
        }
        
        create_response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        action_id = create_response.json()["id"]
        
        # Get the meeting action item
        response = client.get(f"/api/v1/meeting-action-items/{action_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == action_id
        assert data["title"] == action_item_data["title"]
        assert data["description"] == action_item_data["description"]

    def test_get_meeting_action_item_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent meeting action item"""
        response = client.get("/api/v1/meeting-action-items/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_action_item_by_id_unauthorized(self, client):
        """Test getting meeting action item without authentication"""
        response = client.get("/api/v1/meeting-action-items/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_meeting_action_item_success(self, client, auth_headers, db_session):
        """Test successful meeting action item update"""
        # Create a meeting and action item first
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        action_item_data = {
            "title": "Test Action Item for Update",
            "description": "A test action item for updating",
            "meeting_id": meeting.id,
            "assigned_to": "test@example.com",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "status": "pending"
        }
        
        create_response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        action_id = create_response.json()["id"]
        
        # Update the meeting action item
        update_data = {
            "title": "Updated Action Item Title",
            "description": "Updated description",
            "status": "completed"
        }
        
        response = client.put(f"/api/v1/meeting-action-items/{action_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["status"] == update_data["status"]

    def test_update_meeting_action_item_not_found(self, client, auth_headers):
        """Test updating non-existent meeting action item"""
        update_data = {
            "title": "Updated Action Item Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/meeting-action-items/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_meeting_action_item_unauthorized(self, client):
        """Test updating meeting action item without authentication"""
        update_data = {
            "title": "Updated Action Item Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/meeting-action-items/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_meeting_action_item_success(self, client, auth_headers, db_session):
        """Test successful meeting action item deletion"""
        # Create a meeting and action item first
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        action_item_data = {
            "title": "Test Action Item for Delete",
            "description": "A test action item for deletion",
            "meeting_id": meeting.id,
            "assigned_to": "test@example.com",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "status": "pending"
        }
        
        create_response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        action_id = create_response.json()["id"]
        
        # Delete the meeting action item
        response = client.delete(f"/api/v1/meeting-action-items/{action_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Meeting action item deleted successfully"

    def test_delete_meeting_action_item_not_found(self, client, auth_headers):
        """Test deleting non-existent meeting action item"""
        response = client.delete("/api/v1/meeting-action-items/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_meeting_action_item_unauthorized(self, client):
        """Test deleting meeting action item without authentication"""
        response = client.delete("/api/v1/meeting-action-items/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_action_items_by_meeting(self, client, auth_headers, db_session):
        """Test getting action items by meeting"""
        # Create a meeting first
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        response = client.get(f"/api/v1/meeting-action-items/meeting/{meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_action_items_by_meeting_with_pagination(self, client, auth_headers, db_session):
        """Test getting action items by meeting with pagination"""
        # Create a meeting first
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        response = client.get(f"/api/v1/meeting-action-items/meeting/{meeting.id}?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_action_items_by_nonexistent_meeting(self, client, auth_headers):
        """Test getting action items by non-existent meeting"""
        response = client.get("/api/v1/meeting-action-items/meeting/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_count_action_items_by_meeting(self, client, auth_headers, db_session):
        """Test counting action items by meeting"""
        # Create a meeting first
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        response = client.get(f"/api/v1/meeting-action-items/meeting/{meeting.id}/count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "meeting_id" in data
        assert "count" in data
        assert data["meeting_id"] == meeting.id

    def test_count_action_items_by_nonexistent_meeting(self, client, auth_headers):
        """Test counting action items by non-existent meeting"""
        response = client.get("/api/v1/meeting-action-items/meeting/999/count", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_delete_all_action_items_by_meeting(self, client, auth_headers, db_session):
        """Test deleting all action items by meeting"""
        # Create a meeting first
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        # Create some action items first
        action_item_data = {
            "title": "Test Action Item",
            "description": "A test action item",
            "meeting_id": meeting.id,
            "assigned_to": "test@example.com",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "priority": "high",
            "status": "pending"
        }
        
        client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        
        # Delete all action items for the meeting
        response = client.delete(f"/api/v1/meeting-action-items/meeting/{meeting.id}/all", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "Deleted" in response.json()["message"]

    def test_delete_all_action_items_by_nonexistent_meeting(self, client, auth_headers):
        """Test deleting all action items by non-existent meeting"""
        response = client.delete("/api/v1/meeting-action-items/meeting/999/all", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_search_meeting_action_items(self, client, auth_headers):
        """Test searching meeting action items"""
        response = client.get("/api/v1/meeting-action-items/search/test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_meeting_action_items_with_meeting_filter(self, client, auth_headers):
        """Test searching meeting action items with meeting filter"""
        response = client.get("/api/v1/meeting-action-items/search/test?meeting_id=1", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_meeting_action_items_with_pagination(self, client, auth_headers):
        """Test searching meeting action items with pagination"""
        response = client.get("/api/v1/meeting-action-items/search/test?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)


class TestMeetingActionItemCRUD:
    """Test meeting action item CRUD operations"""

    def test_create_meeting_action_item_success(self, db_session):
        """Test successful meeting action item creation"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project and meeting first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        action_item_data = MeetingActionItemCreate(
            title="Test Action Item",
            description="A test action item",
            meeting_id=meeting.id,
            assigned_to="test@example.com",
            due_date=datetime.now() + timedelta(days=7),
            priority="high",
            status="pending"
        )
        
        action_item_obj = meeting_action_item.create(db=db_session, obj_in=action_item_data)
        assert action_item_obj.title == action_item_data.title
        assert action_item_obj.description == action_item_data.description
        assert action_item_obj.meeting_id == action_item_data.meeting_id
        assert action_item_obj.assigned_to == action_item_data.assigned_to
        assert action_item_obj.priority == action_item_data.priority
        assert action_item_obj.status == action_item_data.status

    def test_get_meeting_action_item_by_id(self, db_session):
        """Test getting meeting action item by ID"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project and meeting first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        action_item_data = MeetingActionItemCreate(
            title="Test Action Item",
            description="A test action item",
            meeting_id=meeting.id,
            assigned_to="test@example.com",
            due_date=datetime.now() + timedelta(days=7),
            priority="high",
            status="pending"
        )
        
        created_action_item = meeting_action_item.create(db=db_session, obj_in=action_item_data)
        
        retrieved_action_item = meeting_action_item.get(db=db_session, id=created_action_item.id)
        assert retrieved_action_item is not None
        assert retrieved_action_item.title == action_item_data.title
        assert retrieved_action_item.description == action_item_data.description

    def test_get_meeting_action_items_with_pagination(self, db_session):
        """Test getting meeting action items with pagination"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project and meeting first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        # Create multiple meeting action items
        for i in range(5):
            action_item_data = MeetingActionItemCreate(
                title=f"Test Action Item {i}",
                description=f"A test action item {i}",
                meeting_id=meeting.id,
                assigned_to=f"test{i}@example.com",
                due_date=datetime.now() + timedelta(days=i+1),
                priority="high",
                status="pending"
            )
            meeting_action_item.create(db=db_session, obj_in=action_item_data)
        
        action_items, total = meeting_action_item.get_multi_with_pagination(db_session, skip=0, limit=3)
        assert len(action_items) == 3
        assert total == 5

    def test_get_meeting_action_items_by_meeting_id(self, db_session):
        """Test getting meeting action items by meeting ID"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project and meeting first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        # Create meeting action items
        action_item_data = MeetingActionItemCreate(
            title="Test Action Item",
            description="A test action item",
            meeting_id=meeting.id,
            assigned_to="test@example.com",
            due_date=datetime.now() + timedelta(days=7),
            priority="high",
            status="pending"
        )
        meeting_action_item.create(db=db_session, obj_in=action_item_data)
        
        # Get action items by meeting ID
        action_items = meeting_action_item.get_by_meeting_id(db_session, meeting.id, skip=0, limit=10)
        assert len(action_items) == 1
        assert action_items[0].meeting_id == meeting.id

    def test_search_meeting_action_items(self, db_session):
        """Test searching meeting action items"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project and meeting first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        # Create meeting action items with different titles
        action_item_titles = ["Python task", "JavaScript task", "React task", "Vue task"]
        for title in action_item_titles:
            action_item_data = MeetingActionItemCreate(
                title=title,
                description="A test action item",
                meeting_id=meeting.id,
                assigned_to="test@example.com",
                due_date=datetime.now() + timedelta(days=7),
                priority="high",
                status="pending"
            )
            meeting_action_item.create(db=db_session, obj_in=action_item_data)
        
        # Search for action items containing "task"
        action_items = meeting_action_item.search_action_items(db_session, "task", skip=0, limit=10)
        assert len(action_items) == 4

    def test_update_meeting_action_item(self, db_session):
        """Test updating meeting action item"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate, MeetingActionItemUpdate
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project and meeting first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        action_item_data = MeetingActionItemCreate(
            title="Test Action Item",
            description="A test action item",
            meeting_id=meeting.id,
            assigned_to="test@example.com",
            due_date=datetime.now() + timedelta(days=7),
            priority="high",
            status="pending"
        )
        
        created_action_item = meeting_action_item.create(db=db_session, obj_in=action_item_data)
        
        update_data = MeetingActionItemUpdate(
            title="Updated Action Item",
            description="Updated description",
            status="completed"
        )
        
        updated_action_item = meeting_action_item.update(db=db_session, db_obj=created_action_item, obj_in=update_data)
        assert updated_action_item.title == update_data.title
        assert updated_action_item.description == update_data.description
        assert updated_action_item.status == update_data.status

    def test_delete_meeting_action_item(self, db_session):
        """Test deleting meeting action item"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project and meeting first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        action_item_data = MeetingActionItemCreate(
            title="Test Action Item",
            description="A test action item",
            meeting_id=meeting.id,
            assigned_to="test@example.com",
            due_date=datetime.now() + timedelta(days=7),
            priority="high",
            status="pending"
        )
        
        created_action_item = meeting_action_item.create(db=db_session, obj_in=action_item_data)
        action_id = created_action_item.id
        
        meeting_action_item.remove(db=db_session, id=action_id)
        
        # Verify action item is deleted
        retrieved_action_item = meeting_action_item.get(db=db_session, id=action_id)
        assert retrieved_action_item is None

    def test_delete_all_meeting_action_items_by_meeting_id(self, db_session):
        """Test deleting all meeting action items by meeting ID"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate
        from scrumix.api.models.meeting import Meeting
        from scrumix.api.models.project import Project
        
        # Create a project and meeting first
        project = Project(
            name="Test Project",
            description="A test project",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        
        meeting = Meeting(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        db_session.add(meeting)
        db_session.commit()
        
        # Create multiple meeting action items
        for i in range(3):
            action_item_data = MeetingActionItemCreate(
                title=f"Test Action Item {i}",
                description=f"A test action item {i}",
                meeting_id=meeting.id,
                assigned_to=f"test{i}@example.com",
                due_date=datetime.now() + timedelta(days=i+1),
                priority="high",
                status="pending"
            )
            meeting_action_item.create(db=db_session, obj_in=action_item_data)
        
        # Delete all action items for the meeting
        deleted_count = meeting_action_item.delete_all_by_meeting_id(db_session, meeting.id)
        assert deleted_count == 3
        
        # Verify all action items are deleted
        remaining_action_items = meeting_action_item.get_by_meeting_id(db_session, meeting.id, skip=0, limit=10)
        assert len(remaining_action_items) == 0 