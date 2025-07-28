"""
Meeting note API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.meeting import MeetingType
from scrumix.api.schemas.meeting_note import MeetingNoteCreate


class TestMeetingNoteEndpoints:
    """Test meeting note management endpoints"""

    def test_create_meeting_note_success(self, client, auth_headers, test_meeting):
        """Test successful meeting note creation"""
        note_data = {
            "content": "Test note content",
            "meeting_id": test_meeting.id,
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
            "meeting_id": 1
        }
        
        response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_note_nonexistent_meeting(self, client, auth_headers):
        """Test creating note for non-existent meeting"""
        note_data = {
            "content": "Test note content",
            "meeting_id": 999  # Non-existent meeting
        }
        
        response = client.post("/api/v1/meeting-notes/", json=note_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_note_by_id_success(self, client, auth_headers, test_meeting_note):
        """Test getting meeting note by ID"""
        response = client.get(f"/api/v1/meeting-notes/{test_meeting_note.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["content"] == test_meeting_note.content
        assert data["meeting_id"] == test_meeting_note.meeting_id
        assert data["id"] == test_meeting_note.id

    def test_get_meeting_note_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent meeting note"""
        response = client.get("/api/v1/meeting-notes/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_note_by_id_unauthorized(self, client):
        """Test getting meeting note without authentication"""
        response = client.get("/api/v1/meeting-notes/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_meeting_note_success(self, client, auth_headers, test_meeting_note):
        """Test updating meeting note"""
        update_data = {
            "content": "Updated note content"
        }
        
        response = client.put(f"/api/v1/meeting-notes/{test_meeting_note.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["content"] == update_data["content"]
        assert data["id"] == test_meeting_note.id

    def test_update_meeting_note_not_found(self, client, auth_headers):
        """Test updating non-existent meeting note"""
        update_data = {
            "content": "Updated note content"
        }
        
        response = client.put("/api/v1/meeting-notes/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_meeting_note_unauthorized(self, client, test_meeting_note):
        """Test updating meeting note without authentication"""
        update_data = {
            "content": "Updated note content"
        }
        
        response = client.put(f"/api/v1/meeting-notes/{test_meeting_note.id}", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_meeting_note_success(self, client, auth_headers, test_meeting_note):
        """Test deleting meeting note"""
        response = client.delete(f"/api/v1/meeting-notes/{test_meeting_note.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK

    def test_delete_meeting_note_not_found(self, client, auth_headers):
        """Test deleting non-existent meeting note"""
        response = client.delete("/api/v1/meeting-notes/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_meeting_note_unauthorized(self, client, test_meeting_note):
        """Test deleting meeting note without authentication"""
        response = client.delete(f"/api/v1/meeting-notes/{test_meeting_note.id}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_notes_by_meeting(self, client, auth_headers, test_meeting):
        """Test getting notes by meeting"""
        response = client.get(f"/api/v1/meeting-notes/meeting/{test_meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_notes_by_meeting_with_pagination(self, client, auth_headers, test_meeting):
        """Test getting notes by meeting with pagination"""
        response = client.get(f"/api/v1/meeting-notes/meeting/{test_meeting.id}?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_notes_by_meeting_top_level_only(self, client, auth_headers, test_meeting):
        """Test getting top-level notes by meeting"""
        response = client.get(f"/api/v1/meeting-notes/meeting/{test_meeting.id}?top_level_only=true", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_notes_tree_by_meeting(self, client, auth_headers, test_meeting):
        """Test getting notes tree by meeting"""
        response = client.get(f"/api/v1/meeting-notes/meeting/{test_meeting.id}/tree", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "notes" in data
        assert "total" in data
        assert "topLevelCount" in data

    def test_count_notes_by_meeting(self, client, auth_headers, test_meeting):
        """Test counting notes by meeting"""
        response = client.get(f"/api/v1/meeting-notes/meeting/{test_meeting.id}/count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "count" in data

    def test_create_note_reply_success(self, client, auth_headers, test_meeting_note):
        """Test creating reply to a note"""
        reply_content = "Reply note content"
        
        response = client.post(f"/api/v1/meeting-notes/{test_meeting_note.id}/reply?content={reply_content}", headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["content"] == reply_content
        assert data["parent_note_id"] == test_meeting_note.id

    def test_create_note_reply_nonexistent_note(self, client, auth_headers):
        """Test creating reply to non-existent note"""
        reply_content = "Reply note content"
        
        response = client.post(f"/api/v1/meeting-notes/999/reply?content={reply_content}", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_note_children(self, client, auth_headers, test_meeting_note):
        """Test getting note children"""
        response = client.get(f"/api/v1/meeting-notes/{test_meeting_note.id}/children", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_note_thread(self, client, auth_headers, test_meeting_note):
        """Test getting note thread"""
        response = client.get(f"/api/v1/meeting-notes/{test_meeting_note.id}/thread", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_delete_all_notes_by_meeting(self, client, auth_headers, test_meeting):
        """Test deleting all notes by meeting"""
        response = client.delete(f"/api/v1/meeting-notes/meeting/{test_meeting.id}/all", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK


class TestMeetingNoteCRUD:
    """Test meeting note CRUD operations"""

    def test_create_meeting_note_success(self, db_session, test_meeting, test_user):
        """Test successful meeting note creation"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteCreate
        
        # Create the note using the schema
        note_data = MeetingNoteCreate(
            content="Test note content",
            meeting_id=test_meeting.id,
            user_id=test_user.id
        )
        note = meeting_note.create(db_session, obj_in=note_data)
        assert note.content == note_data.content
        assert note.meeting_id == note_data.meeting_id

    def test_get_meeting_note_by_id(self, db_session, test_meeting_note):
        """Test getting meeting note by ID"""
        from scrumix.api.crud.meeting_note import meeting_note
        note = meeting_note.get(db_session, id=test_meeting_note.id)
        assert note is not None
        assert note.id == test_meeting_note.id
        assert note.content == test_meeting_note.content

    def test_get_meeting_notes_with_pagination(self, db_session, test_meeting):
        """Test getting meeting notes with pagination"""
        from scrumix.api.crud.meeting_note import meeting_note
        notes = meeting_note.get_multi(db_session, skip=0, limit=10)
        assert isinstance(notes, list)

    def test_get_meeting_notes_by_meeting_id(self, db_session, test_meeting):
        """Test getting notes by meeting ID"""
        from scrumix.api.crud.meeting_note import meeting_note
        notes = meeting_note.get_by_meeting_id(db_session, meeting_id=test_meeting.id)
        assert isinstance(notes, list)

    def test_search_meeting_notes(self, db_session, test_meeting):
        """Test searching meeting notes"""
        from scrumix.api.crud.meeting_note import meeting_note
        notes = meeting_note.search_notes(db_session, query="test")
        assert isinstance(notes, list)

    def test_update_meeting_note(self, db_session, test_meeting_note):
        """Test updating meeting note"""
        from scrumix.api.crud.meeting_note import meeting_note
        from scrumix.api.schemas.meeting_note import MeetingNoteUpdate
        update_data = MeetingNoteUpdate(content="Updated note content")
        note = meeting_note.update(db_session, db_obj=test_meeting_note, obj_in=update_data)
        assert note.content == update_data.content

    def test_delete_meeting_note(self, db_session, test_meeting_note):
        """Test deleting meeting note"""
        from scrumix.api.crud.meeting_note import meeting_note
        note = meeting_note.remove(db_session, id=test_meeting_note.id)
        assert note.id == test_meeting_note.id
        assert meeting_note.get(db_session, id=test_meeting_note.id) is None 