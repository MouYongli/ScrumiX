"""
Meeting Agenda API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.meeting import MeetingType


class TestMeetingAgendaEndpoints:
    """Test meeting agenda management endpoints"""

    def test_get_meeting_agendas_success(self, client, auth_headers):
        """Test getting meeting agendas list"""
        response = client.get("/api/v1/meeting-agenda/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "agendaItems" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["agendaItems"], list)

    def test_get_meeting_agendas_unauthorized(self, client):
        """Test getting meeting agendas without authentication"""
        response = client.get("/api/v1/meeting-agenda/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meeting_agendas_with_pagination(self, client, auth_headers):
        """Test getting meeting agendas with pagination"""
        response = client.get("/api/v1/meeting-agenda/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "agendaItems" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_get_meeting_agendas_with_meeting_filter(self, client, auth_headers):
        """Test getting meeting agendas with meeting filter"""
        response = client.get("/api/v1/meeting-agenda/?meeting_id=1", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "agendaItems" in data
        assert isinstance(data["agendaItems"], list)

    def test_get_meeting_agendas_with_search(self, client, auth_headers):
        """Test getting meeting agendas with search"""
        response = client.get("/api/v1/meeting-agenda/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "agendaItems" in data
        assert isinstance(data["agendaItems"], list)

    def test_create_meeting_agenda_success(self, client, auth_headers, db_session):
        """Test successful meeting agenda creation"""
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
        
        agenda_data = {
            "title": "Test Agenda Item",
            "description": "A test agenda item",
            "meeting_id": meeting.id,
            "duration": 15,
            "order": 1
        }
        
        response = client.post("/api/v1/meeting-agenda/", json=agenda_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == agenda_data["title"]
        assert data["description"] == agenda_data["description"]
        assert data["meeting_id"] == agenda_data["meeting_id"]
        assert data["duration"] == agenda_data["duration"]
        assert data["order"] == agenda_data["order"]
        assert "id" in data

    def test_create_meeting_agenda_invalid_data(self, client, auth_headers):
        """Test meeting agenda creation with invalid data"""
        agenda_data = {
            "title": "",  # Empty title
            "description": "A test agenda item",
            "meeting_id": 1,
            "duration": 15,
            "order": 1
        }
        
        response = client.post("/api/v1/meeting-agenda/", json=agenda_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_agenda_nonexistent_meeting(self, client, auth_headers):
        """Test meeting agenda creation with non-existent meeting"""
        agenda_data = {
            "title": "Test Agenda Item",
            "description": "A test agenda item",
            "meeting_id": 999,  # Non-existent meeting
            "duration": 15,
            "order": 1
        }
        
        response = client.post("/api/v1/meeting-agenda/", json=agenda_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_create_meeting_agenda_unauthorized(self, client):
        """Test meeting agenda creation without authentication"""
        agenda_data = {
            "title": "Test Agenda Item",
            "description": "A test agenda item",
            "meeting_id": 1,
            "duration": 15,
            "order": 1
        }
        
        response = client.post("/api/v1/meeting-agenda/", json=agenda_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meeting_agenda_by_id_success(self, client, auth_headers, db_session):
        """Test getting meeting agenda by ID"""
        # Create a meeting and agenda item first
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
        
        agenda_data = {
            "title": "Test Agenda Item for Get",
            "description": "A test agenda item for getting",
            "meeting_id": meeting.id,
            "duration": 15,
            "order": 1
        }
        
        create_response = client.post("/api/v1/meeting-agenda/", json=agenda_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        agenda_id = create_response.json()["id"]
        
        # Get the meeting agenda
        response = client.get(f"/api/v1/meeting-agenda/{agenda_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == agenda_id
        assert data["title"] == agenda_data["title"]
        assert data["description"] == agenda_data["description"]

    def test_get_meeting_agenda_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent meeting agenda"""
        response = client.get("/api/v1/meeting-agenda/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_agenda_by_id_unauthorized(self, client):
        """Test getting meeting agenda without authentication"""
        response = client.get("/api/v1/meeting-agenda/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_meeting_agenda_success(self, client, auth_headers, db_session):
        """Test successful meeting agenda update"""
        # Create a meeting and agenda item first
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
        
        agenda_data = {
            "title": "Test Agenda Item for Update",
            "description": "A test agenda item for updating",
            "meeting_id": meeting.id,
            "duration": 15,
            "order": 1
        }
        
        create_response = client.post("/api/v1/meeting-agenda/", json=agenda_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        agenda_id = create_response.json()["id"]
        
        # Update the meeting agenda
        update_data = {
            "title": "Updated Agenda Item Title",
            "description": "Updated description",
            "duration": 20
        }
        
        response = client.put(f"/api/v1/meeting-agenda/{agenda_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["duration"] == update_data["duration"]

    def test_update_meeting_agenda_not_found(self, client, auth_headers):
        """Test updating non-existent meeting agenda"""
        update_data = {
            "title": "Updated Agenda Item Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/meeting-agenda/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_meeting_agenda_unauthorized(self, client):
        """Test updating meeting agenda without authentication"""
        update_data = {
            "title": "Updated Agenda Item Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/meeting-agenda/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_meeting_agenda_success(self, client, auth_headers, db_session):
        """Test successful meeting agenda deletion"""
        # Create a meeting and agenda item first
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
        
        agenda_data = {
            "title": "Test Agenda Item for Delete",
            "description": "A test agenda item for deletion",
            "meeting_id": meeting.id,
            "duration": 15,
            "order": 1
        }
        
        create_response = client.post("/api/v1/meeting-agenda/", json=agenda_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        agenda_id = create_response.json()["id"]
        
        # Delete the meeting agenda
        response = client.delete(f"/api/v1/meeting-agenda/{agenda_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Meeting agenda item deleted successfully"

    def test_delete_meeting_agenda_not_found(self, client, auth_headers):
        """Test deleting non-existent meeting agenda"""
        response = client.delete("/api/v1/meeting-agenda/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_meeting_agenda_unauthorized(self, client):
        """Test deleting meeting agenda without authentication"""
        response = client.delete("/api/v1/meeting-agenda/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_agenda_by_meeting(self, client, auth_headers, db_session):
        """Test getting agenda by meeting"""
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
        
        response = client.get(f"/api/v1/meeting-agenda/meeting/{meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_agenda_by_meeting_with_pagination(self, client, auth_headers, db_session):
        """Test getting agenda by meeting with pagination"""
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
        
        response = client.get(f"/api/v1/meeting-agenda/meeting/{meeting.id}?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_agenda_by_nonexistent_meeting(self, client, auth_headers):
        """Test getting agenda by non-existent meeting"""
        response = client.get("/api/v1/meeting-agenda/meeting/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_count_agenda_by_meeting(self, client, auth_headers, db_session):
        """Test counting agenda by meeting"""
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
        
        response = client.get(f"/api/v1/meeting-agenda/meeting/{meeting.id}/count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "meeting_id" in data
        assert "count" in data
        assert data["meeting_id"] == meeting.id

    def test_count_agenda_by_nonexistent_meeting(self, client, auth_headers):
        """Test counting agenda by non-existent meeting"""
        response = client.get("/api/v1/meeting-agenda/meeting/999/count", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_bulk_create_agenda_items_success(self, client, auth_headers, db_session):
        """Test successful bulk creation of agenda items"""
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
        
        agenda_titles = ["Agenda Item 1", "Agenda Item 2", "Agenda Item 3"]
        
        response = client.post(f"/api/v1/meeting-agenda/meeting/{meeting.id}/bulk", json=agenda_titles, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        assert data[0]["title"] == "Agenda Item 1"
        assert data[1]["title"] == "Agenda Item 2"
        assert data[2]["title"] == "Agenda Item 3"

    def test_bulk_create_agenda_items_empty_list(self, client, auth_headers, db_session):
        """Test bulk creation with empty agenda list"""
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
        
        response = client.post(f"/api/v1/meeting-agenda/meeting/{meeting.id}/bulk", json=[], headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "At least one agenda title is required" in response.json()["detail"]

    def test_bulk_create_agenda_items_nonexistent_meeting(self, client, auth_headers):
        """Test bulk creation with non-existent meeting"""
        agenda_titles = ["Agenda Item 1", "Agenda Item 2"]
        
        response = client.post("/api/v1/meeting-agenda/meeting/999/bulk", json=agenda_titles, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_delete_all_agenda_by_meeting(self, client, auth_headers, db_session):
        """Test deleting all agenda by meeting"""
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
        
        # Create some agenda items first
        agenda_data = {
            "title": "Test Agenda Item",
            "description": "A test agenda item",
            "meeting_id": meeting.id,
            "duration": 15,
            "order": 1
        }
        
        client.post("/api/v1/meeting-agenda/", json=agenda_data, headers=auth_headers)
        
        # Delete all agenda items for the meeting
        response = client.delete(f"/api/v1/meeting-agenda/meeting/{meeting.id}/all", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "Deleted" in response.json()["message"]

    def test_delete_all_agenda_by_nonexistent_meeting(self, client, auth_headers):
        """Test deleting all agenda by non-existent meeting"""
        response = client.delete("/api/v1/meeting-agenda/meeting/999/all", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_search_meeting_agendas(self, client, auth_headers):
        """Test searching meeting agendas"""
        response = client.get("/api/v1/meeting-agenda/search/test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_meeting_agendas_with_meeting_filter(self, client, auth_headers):
        """Test searching meeting agendas with meeting filter"""
        response = client.get("/api/v1/meeting-agenda/search/test?meeting_id=1", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_meeting_agendas_with_pagination(self, client, auth_headers):
        """Test searching meeting agendas with pagination"""
        response = client.get("/api/v1/meeting-agenda/search/test?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)


class TestMeetingAgendaCRUD:
    """Test meeting agenda CRUD operations"""

    def test_create_meeting_agenda_success(self, db_session):
        """Test successful meeting agenda creation"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate
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
        
        agenda_data = MeetingAgendaCreate(
            title="Test Agenda Item",
            description="A test agenda item",
            meeting_id=meeting.id,
            duration=15,
            order=1
        )
        
        agenda_obj = meeting_agenda.create(db=db_session, obj_in=agenda_data)
        assert agenda_obj.title == agenda_data.title
        assert agenda_obj.description == agenda_data.description
        assert agenda_obj.meeting_id == agenda_data.meeting_id
        assert agenda_obj.duration == agenda_data.duration
        assert agenda_obj.order == agenda_data.order

    def test_get_meeting_agenda_by_id(self, db_session):
        """Test getting meeting agenda by ID"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate
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
        
        agenda_data = MeetingAgendaCreate(
            title="Test Agenda Item",
            description="A test agenda item",
            meeting_id=meeting.id,
            duration=15,
            order=1
        )
        
        created_agenda = meeting_agenda.create(db=db_session, obj_in=agenda_data)
        
        retrieved_agenda = meeting_agenda.get(db=db_session, id=created_agenda.id)
        assert retrieved_agenda is not None
        assert retrieved_agenda.title == agenda_data.title
        assert retrieved_agenda.description == agenda_data.description

    def test_get_meeting_agendas_with_pagination(self, db_session):
        """Test getting meeting agendas with pagination"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate
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
        
        # Create multiple meeting agendas
        for i in range(5):
            agenda_data = MeetingAgendaCreate(
                title=f"Test Agenda Item {i}",
                description=f"A test agenda item {i}",
                meeting_id=meeting.id,
                duration=15,
                order=i+1
            )
            meeting_agenda.create(db=db_session, obj_in=agenda_data)
        
        agenda_items, total = meeting_agenda.get_multi_with_pagination(db_session, skip=0, limit=3)
        assert len(agenda_items) == 3
        assert total == 5

    def test_get_meeting_agendas_by_meeting_id(self, db_session):
        """Test getting meeting agendas by meeting ID"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate
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
        
        # Create meeting agendas
        agenda_data = MeetingAgendaCreate(
            title="Test Agenda Item",
            description="A test agenda item",
            meeting_id=meeting.id,
            duration=15,
            order=1
        )
        meeting_agenda.create(db=db_session, obj_in=agenda_data)
        
        # Get agendas by meeting ID
        agenda_items = meeting_agenda.get_by_meeting_id(db_session, meeting.id, skip=0, limit=10)
        assert len(agenda_items) == 1
        assert agenda_items[0].meeting_id == meeting.id

    def test_search_meeting_agendas(self, db_session):
        """Test searching meeting agendas"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate
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
        
        # Create meeting agendas with different titles
        agenda_titles = ["Python discussion", "JavaScript discussion", "React discussion", "Vue discussion"]
        for title in agenda_titles:
            agenda_data = MeetingAgendaCreate(
                title=title,
                description="A test agenda item",
                meeting_id=meeting.id,
                duration=15,
                order=1
            )
            meeting_agenda.create(db=db_session, obj_in=agenda_data)
        
        # Search for agendas containing "discussion"
        agenda_items = meeting_agenda.search_agenda_items(db_session, "discussion", skip=0, limit=10)
        assert len(agenda_items) == 4

    def test_update_meeting_agenda(self, db_session):
        """Test updating meeting agenda"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate, MeetingAgendaUpdate
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
        
        agenda_data = MeetingAgendaCreate(
            title="Test Agenda Item",
            description="A test agenda item",
            meeting_id=meeting.id,
            duration=15,
            order=1
        )
        
        created_agenda = meeting_agenda.create(db=db_session, obj_in=agenda_data)
        
        update_data = MeetingAgendaUpdate(
            title="Updated Agenda Item",
            description="Updated description",
            duration=20
        )
        
        updated_agenda = meeting_agenda.update(db=db_session, db_obj=created_agenda, obj_in=update_data)
        assert updated_agenda.title == update_data.title
        assert updated_agenda.description == update_data.description
        assert updated_agenda.duration == update_data.duration

    def test_delete_meeting_agenda(self, db_session):
        """Test deleting meeting agenda"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate
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
        
        agenda_data = MeetingAgendaCreate(
            title="Test Agenda Item",
            description="A test agenda item",
            meeting_id=meeting.id,
            duration=15,
            order=1
        )
        
        created_agenda = meeting_agenda.create(db=db_session, obj_in=agenda_data)
        agenda_id = created_agenda.id
        
        meeting_agenda.remove(db=db_session, id=agenda_id)
        
        # Verify agenda is deleted
        retrieved_agenda = meeting_agenda.get(db=db_session, id=agenda_id)
        assert retrieved_agenda is None

    def test_delete_all_meeting_agendas_by_meeting_id(self, db_session):
        """Test deleting all meeting agendas by meeting ID"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate
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
        
        # Create multiple meeting agendas
        for i in range(3):
            agenda_data = MeetingAgendaCreate(
                title=f"Test Agenda Item {i}",
                description=f"A test agenda item {i}",
                meeting_id=meeting.id,
                duration=15,
                order=i+1
            )
            meeting_agenda.create(db=db_session, obj_in=agenda_data)
        
        # Delete all agendas for the meeting
        deleted_count = meeting_agenda.delete_all_by_meeting_id(db_session, meeting.id)
        assert deleted_count == 3
        
        # Verify all agendas are deleted
        remaining_agendas = meeting_agenda.get_by_meeting_id(db_session, meeting.id, skip=0, limit=10)
        assert len(remaining_agendas) == 0 