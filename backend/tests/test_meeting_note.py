"""
Meeting Notes API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.meeting import MeetingType


class TestMeetingNoteEndpoints:
    """Test meeting note management endpoints"""

    def test_get_meeting_notes_success(self, client, auth_headers):
        """Test getting meeting notes list"""
        response = client.get("/api/v1/meeting-notes/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "notes" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["notes"], list)

    def test_get_meeting_notes_unauthorized(self, client):
        """Test getting meeting notes without authentication"""
        response = client.get("/api/v1/meeting-notes/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meeting_notes_with_pagination(self, client, auth_headers):
        """Test getting meeting notes with pagination"""
        response = client.get("/api/v1/meeting-notes/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "notes" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_get_meeting_notes_with_meeting_filter(self, client, auth_headers):
        """Test getting meeting notes with meeting filter"""
        response = client.get("/api/v1/meeting-notes/?meeting_id=1", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "notes" in data
        assert isinstance(data["notes"], list)

    def test_get_meeting_notes_with_search(self, client, auth_headers):
        """Test getting meeting notes with search"""
        response = client.get("/api/v1/meeting-notes/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "notes" in data
        assert isinstance(data["notes"], list)

    def test_get_meeting_notes_parent_only(self, client, auth_headers):
        """Test getting meeting notes with parent only filter"""
        response = client.get("/api/v1/meeting-notes/?parent_only=true", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "notes" in data
        assert isinstance(data["notes"], list)

    def test_create_meeting_note_success(self, client, auth_headers, db_session):
        """Test successful meeting note creation"""
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
        
        note_data = {
            "content": "Test meeting note content",
            "meeting_id": meeting.id,
            "parent_note_id": None
        }
        
        response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["content"] == note_data["content"]
        assert data["meeting_id"] == note_data["meeting_id"]
        assert "id" in data

    def test_create_meeting_note_invalid_data(self, client, auth_headers):
        """Test meeting note creation with invalid data"""
        note_data = {
            "content": "",  # Empty content
            "meeting_id": 1,
            "parent_note_id": None
        }
        
        response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_note_nonexistent_meeting(self, client, auth_headers):
        """Test meeting note creation with non-existent meeting"""
        note_data = {
            "content": "Test meeting note content",
            "meeting_id": 999,  # Non-existent meeting
            "parent_note_id": None
        }
        
        response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_create_meeting_note_nonexistent_parent(self, client, auth_headers, db_session):
        """Test meeting note creation with non-existent parent note"""
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
        
        note_data = {
            "content": "Test meeting note content",
            "meeting_id": meeting.id,
            "parent_note_id": 999  # Non-existent parent note
        }
        
        response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Parent note with ID 999 not found" in response.json()["detail"]

    def test_create_meeting_note_unauthorized(self, client):
        """Test meeting note creation without authentication"""
        note_data = {
            "content": "Test meeting note content",
            "meeting_id": 1,
            "parent_note_id": None
        }
        
        response = client.post("/api/v1/meeting-notes/", json=note_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meeting_note_by_id_success(self, client, auth_headers, db_session):
        """Test getting meeting note by ID"""
        # Create a meeting and note first
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
        
        note_data = {
            "content": "Test meeting note for get",
            "meeting_id": meeting.id,
            "parent_note_id": None
        }
        
        create_response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        note_id = create_response.json()["id"]
        
        # Get the meeting note
        response = client.get(f"/api/v1/meeting-notes/{note_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == note_id
        assert data["content"] == note_data["content"]

    def test_get_meeting_note_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent meeting note"""
        response = client.get("/api/v1/meeting-notes/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_note_by_id_unauthorized(self, client):
        """Test getting meeting note without authentication"""
        response = client.get("/api/v1/meeting-notes/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_meeting_note_success(self, client, auth_headers, db_session):
        """Test successful meeting note update"""
        # Create a meeting and note first
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
        
        note_data = {
            "content": "Test meeting note for update",
            "meeting_id": meeting.id,
            "parent_note_id": None
        }
        
        create_response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        note_id = create_response.json()["id"]
        
        # Update the meeting note
        update_data = {
            "content": "Updated meeting note content"
        }
        
        response = client.put(f"/api/v1/meeting-notes/{note_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["content"] == update_data["content"]

    def test_update_meeting_note_not_found(self, client, auth_headers):
        """Test updating non-existent meeting note"""
        update_data = {
            "content": "Updated meeting note content"
        }
        
        response = client.put("/api/v1/meeting-notes/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_meeting_note_unauthorized(self, client):
        """Test updating meeting note without authentication"""
        update_data = {
            "content": "Updated meeting note content"
        }
        
        response = client.put("/api/v1/meeting-notes/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_meeting_note_success(self, client, auth_headers, db_session):
        """Test successful meeting note deletion"""
        # Create a meeting and note first
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
        
        note_data = {
            "content": "Test meeting note for delete",
            "meeting_id": meeting.id,
            "parent_note_id": None
        }
        
        create_response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        note_id = create_response.json()["id"]
        
        # Delete the meeting note
        response = client.delete(f"/api/v1/meeting-notes/{note_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Meeting note deleted successfully"

    def test_delete_meeting_note_not_found(self, client, auth_headers):
        """Test deleting non-existent meeting note"""
        response = client.delete("/api/v1/meeting-notes/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_meeting_note_unauthorized(self, client):
        """Test deleting meeting note without authentication"""
        response = client.delete("/api/v1/meeting-notes/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_notes_by_meeting(self, client, auth_headers, db_session):
        """Test getting notes by meeting"""
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
        
        response = client.get(f"/api/v1/meeting-notes/meeting/{meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_notes_by_meeting_with_pagination(self, client, auth_headers, db_session):
        """Test getting notes by meeting with pagination"""
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
        
        response = client.get(f"/api/v1/meeting-notes/meeting/{meeting.id}?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_notes_by_meeting_top_level_only(self, client, auth_headers, db_session):
        """Test getting notes by meeting with top level only"""
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
        
        response = client.get(f"/api/v1/meeting-notes/meeting/{meeting.id}?top_level_only=true", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_notes_by_nonexistent_meeting(self, client, auth_headers):
        """Test getting notes by non-existent meeting"""
        response = client.get("/api/v1/meeting-notes/meeting/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_get_notes_tree_by_meeting(self, client, auth_headers, db_session):
        """Test getting notes tree by meeting"""
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
        
        response = client.get(f"/api/v1/meeting-notes/meeting/{meeting.id}/tree", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "notes" in data
        assert "total" in data
        assert "topLevelCount" in data

    def test_get_notes_tree_by_nonexistent_meeting(self, client, auth_headers):
        """Test getting notes tree by non-existent meeting"""
        response = client.get("/api/v1/meeting-notes/meeting/999/tree", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_count_notes_by_meeting(self, client, auth_headers, db_session):
        """Test counting notes by meeting"""
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
        
        response = client.get(f"/api/v1/meeting-notes/meeting/{meeting.id}/count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "meeting_id" in data
        assert "count" in data
        assert data["meeting_id"] == meeting.id

    def test_count_notes_by_nonexistent_meeting(self, client, auth_headers):
        """Test counting notes by non-existent meeting"""
        response = client.get("/api/v1/meeting-notes/meeting/999/count", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_create_note_reply_success(self, client, auth_headers, db_session):
        """Test successful note reply creation"""
        # Create a meeting and note first
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
        
        note_data = {
            "content": "Test meeting note",
            "meeting_id": meeting.id,
            "parent_note_id": None
        }
        
        create_response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        note_id = create_response.json()["id"]
        
        # Create a reply
        reply_content = "This is a reply to the note"
        response = client.post(f"/api/v1/meeting-notes/{note_id}/reply", json={"content": reply_content}, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["content"] == reply_content
        assert data["parent_note_id"] == note_id

    def test_create_note_reply_nonexistent_note(self, client, auth_headers):
        """Test creating reply to non-existent note"""
        reply_content = "This is a reply to the note"
        response = client.post("/api/v1/meeting-notes/999/reply", json={"content": reply_content}, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_note_children(self, client, auth_headers, db_session):
        """Test getting note children"""
        # Create a meeting and note first
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
        
        note_data = {
            "content": "Test meeting note",
            "meeting_id": meeting.id,
            "parent_note_id": None
        }
        
        create_response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        note_id = create_response.json()["id"]
        
        response = client.get(f"/api/v1/meeting-notes/{note_id}/children", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_note_children_nonexistent_note(self, client, auth_headers):
        """Test getting children of non-existent note"""
        response = client.get("/api/v1/meeting-notes/999/children", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_note_thread(self, client, auth_headers, db_session):
        """Test getting note thread"""
        # Create a meeting and note first
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
        
        note_data = {
            "content": "Test meeting note",
            "meeting_id": meeting.id,
            "parent_note_id": None
        }
        
        create_response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        note_id = create_response.json()["id"]
        
        response = client.get(f"/api/v1/meeting-notes/{note_id}/thread", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_note_thread_nonexistent_note(self, client, auth_headers):
        """Test getting thread of non-existent note"""
        response = client.get("/api/v1/meeting-notes/999/thread", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_all_notes_by_meeting(self, client, auth_headers, db_session):
        """Test deleting all notes by meeting"""
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
        
        # Create some notes first
        note_data = {
            "content": "Test meeting note",
            "meeting_id": meeting.id,
            "parent_note_id": None
        }
        
        client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        
        # Delete all notes for the meeting
        response = client.delete(f"/api/v1/meeting-notes/meeting/{meeting.id}/all", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "Deleted" in response.json()["message"]

    def test_delete_all_notes_by_nonexistent_meeting(self, client, auth_headers):
        """Test deleting all notes by non-existent meeting"""
        response = client.delete("/api/v1/meeting-notes/meeting/999/all", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Meeting with ID 999 not found" in response.json()["detail"]

    def test_search_meeting_notes(self, client, auth_headers):
        """Test searching meeting notes"""
        response = client.get("/api/v1/meeting-notes/search/test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_meeting_notes_with_meeting_filter(self, client, auth_headers):
        """Test searching meeting notes with meeting filter"""
        response = client.get("/api/v1/meeting-notes/search/test?meeting_id=1", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_meeting_notes_with_pagination(self, client, auth_headers):
        """Test searching meeting notes with pagination"""
        response = client.get("/api/v1/meeting-notes/search/test?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)


class TestMeetingNoteCRUD:
    """Test meeting note CRUD operations"""

    def test_create_meeting_note_success(self, db_session):
        """Test successful meeting note creation"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteCreate
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
        
        note_data = MeetingNoteCreate(
            content="Test meeting note content",
            meeting_id=meeting.id,
            parent_note_id=None
        )
        
        note_obj = meeting_note.create(db=db_session, obj_in=note_data)
        assert note_obj.content == note_data.content
        assert note_obj.meeting_id == note_data.meeting_id
        assert note_obj.parent_note_id == note_data.parent_note_id

    def test_get_meeting_note_by_id(self, db_session):
        """Test getting meeting note by ID"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteCreate
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
        
        note_data = MeetingNoteCreate(
            content="Test meeting note content",
            meeting_id=meeting.id,
            parent_note_id=None
        )
        
        created_note = meeting_note.create(db=db_session, obj_in=note_data)
        
        retrieved_note = meeting_note.get(db=db_session, id=created_note.id)
        assert retrieved_note is not None
        assert retrieved_note.content == note_data.content
        assert retrieved_note.meeting_id == note_data.meeting_id

    def test_get_meeting_notes_with_pagination(self, db_session):
        """Test getting meeting notes with pagination"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteCreate
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
        
        # Create multiple meeting notes
        for i in range(5):
            note_data = MeetingNoteCreate(
                content=f"Test meeting note {i}",
                meeting_id=meeting.id,
                parent_note_id=None
            )
            meeting_note.create(db=db_session, obj_in=note_data)
        
        notes, total = meeting_note.get_multi_with_pagination(db_session, skip=0, limit=3)
        assert len(notes) == 3
        assert total == 5

    def test_get_meeting_notes_by_meeting_id(self, db_session):
        """Test getting meeting notes by meeting ID"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteCreate
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
        
        # Create meeting notes
        note_data = MeetingNoteCreate(
            content="Test meeting note content",
            meeting_id=meeting.id,
            parent_note_id=None
        )
        meeting_note.create(db=db_session, obj_in=note_data)
        
        # Get notes by meeting ID
        notes = meeting_note.get_by_meeting_id(db_session, meeting.id, skip=0, limit=10)
        assert len(notes) == 1
        assert notes[0].meeting_id == meeting.id

    def test_search_meeting_notes(self, db_session):
        """Test searching meeting notes"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteCreate
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
        
        # Create meeting notes with different content
        note_contents = ["Python discussion", "JavaScript discussion", "React discussion", "Vue discussion"]
        for content in note_contents:
            note_data = MeetingNoteCreate(
                content=content,
                meeting_id=meeting.id,
                parent_note_id=None
            )
            meeting_note.create(db=db_session, obj_in=note_data)
        
        # Search for notes containing "discussion"
        notes = meeting_note.search_notes(db_session, "discussion", skip=0, limit=10)
        assert len(notes) == 4

    def test_update_meeting_note(self, db_session):
        """Test updating meeting note"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteCreate, MeetingNoteUpdate
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
        
        note_data = MeetingNoteCreate(
            content="Test meeting note content",
            meeting_id=meeting.id,
            parent_note_id=None
        )
        
        created_note = meeting_note.create(db=db_session, obj_in=note_data)
        
        update_data = MeetingNoteUpdate(
            content="Updated meeting note content"
        )
        
        updated_note = meeting_note.update(db=db_session, db_obj=created_note, obj_in=update_data)
        assert updated_note.content == update_data.content

    def test_delete_meeting_note(self, db_session):
        """Test deleting meeting note"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteCreate
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
        
        note_data = MeetingNoteCreate(
            content="Test meeting note content",
            meeting_id=meeting.id,
            parent_note_id=None
        )
        
        created_note = meeting_note.create(db=db_session, obj_in=note_data)
        note_id = created_note.id
        
        meeting_note.remove(db=db_session, id=note_id)
        
        # Verify note is deleted
        retrieved_note = meeting_note.get(db=db_session, id=note_id)
        assert retrieved_note is None 