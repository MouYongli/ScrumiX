"""
Meeting agenda API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.meeting import MeetingType
from scrumix.api.schemas.meeting_agenda import MeetingAgendaCreate


class TestMeetingAgendaEndpoints:
    """Test meeting agenda management endpoints"""

    def test_create_meeting_agenda_success(self, client, auth_headers, test_meeting):
        """Test successful meeting agenda creation"""
        agenda_data = {
            "title": "Test agenda item",
            "meeting_id": test_meeting.id
        }
        
        response = client.post("/api/v1/meeting-agendas/", json=agenda_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == agenda_data["title"]
        assert data["meeting_id"] == agenda_data["meeting_id"]
        assert "id" in data

    def test_create_meeting_agenda_invalid_data(self, client, auth_headers):
        """Test meeting agenda creation with invalid data"""
        agenda_data = {
            "title": "",  # Empty title
            "meeting_id": 1
        }
        
        response = client.post("/api/v1/meeting-agendas/", json=agenda_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_agenda_nonexistent_meeting(self, client, auth_headers):
        """Test creating agenda for non-existent meeting"""
        agenda_data = {
            "title": "Test agenda item",
            "meeting_id": 999  # Non-existent meeting
        }
        
        response = client.post("/api/v1/meeting-agendas/", json=agenda_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_agenda_by_id_success(self, client, auth_headers, test_meeting_agenda):
        """Test getting meeting agenda by ID"""
        response = client.get(f"/api/v1/meeting-agendas/{test_meeting_agenda.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == test_meeting_agenda.title
        assert data["meeting_id"] == test_meeting_agenda.meeting_id
        assert data["id"] == test_meeting_agenda.id

    def test_get_meeting_agenda_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent meeting agenda"""
        response = client.get("/api/v1/meeting-agendas/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_agenda_by_id_unauthorized(self, client):
        """Test getting meeting agenda without authentication"""
        response = client.get("/api/v1/meeting-agendas/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_meeting_agenda_success(self, client, auth_headers, test_meeting_agenda):
        """Test updating meeting agenda"""
        update_data = {
            "title": "Updated agenda item"
        }
        
        response = client.put(f"/api/v1/meeting-agendas/{test_meeting_agenda.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["id"] == test_meeting_agenda.id

    def test_update_meeting_agenda_not_found(self, client, auth_headers):
        """Test updating non-existent meeting agenda"""
        update_data = {
            "title": "Updated agenda item"
        }
        
        response = client.put("/api/v1/meeting-agendas/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_meeting_agenda_unauthorized(self, client, test_meeting_agenda):
        """Test updating meeting agenda without authentication"""
        update_data = {
            "title": "Updated agenda item"
        }
        
        response = client.put(f"/api/v1/meeting-agendas/{test_meeting_agenda.id}", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_meeting_agenda_success(self, client, auth_headers, test_meeting_agenda):
        """Test deleting meeting agenda"""
        response = client.delete(f"/api/v1/meeting-agendas/{test_meeting_agenda.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK

    def test_delete_meeting_agenda_not_found(self, client, auth_headers):
        """Test deleting non-existent meeting agenda"""
        response = client.delete("/api/v1/meeting-agendas/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_meeting_agenda_unauthorized(self, client, test_meeting_agenda):
        """Test deleting meeting agenda without authentication"""
        response = client.delete(f"/api/v1/meeting-agendas/{test_meeting_agenda.id}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_agenda_by_meeting(self, client, auth_headers, test_meeting):
        """Test getting agenda by meeting"""
        response = client.get(f"/api/v1/meeting-agendas/meeting/{test_meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_agenda_by_meeting_with_pagination(self, client, auth_headers, test_meeting):
        """Test getting agenda by meeting with pagination"""
        response = client.get(f"/api/v1/meeting-agendas/meeting/{test_meeting.id}?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_count_agenda_by_meeting(self, client, auth_headers, test_meeting):
        """Test counting agenda by meeting"""
        response = client.get(f"/api/v1/meeting-agendas/meeting/{test_meeting.id}/count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "count" in data

    def test_bulk_create_agenda_items_success(self, client, auth_headers, test_meeting):
        """Test bulk creating agenda items"""
        agenda_titles = ["Agenda Item 1", "Agenda Item 2"]
        
        response = client.post(f"/api/v1/meeting-agendas/meeting/{test_meeting.id}/bulk", json=agenda_titles, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    def test_bulk_create_agenda_items_empty_list(self, client, auth_headers, test_meeting):
        """Test bulk creating agenda items with empty list"""
        agenda_titles = []
        
        response = client.post(f"/api/v1/meeting-agendas/meeting/{test_meeting.id}/bulk", json=agenda_titles, headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_all_agenda_by_meeting(self, client, auth_headers, test_meeting):
        """Test deleting all agenda by meeting"""
        response = client.delete(f"/api/v1/meeting-agendas/meeting/{test_meeting.id}/all", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK


class TestMeetingAgendaCRUD:
    """Test meeting agenda CRUD operations"""

    def test_create_meeting_agenda_success(self, db_session, test_meeting):
        """Test successful meeting agenda creation"""
        agenda_data = MeetingAgendaCreate(
            title="Test agenda item",
            meeting_id=test_meeting.id
        )
        
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        agenda = meeting_agenda.create(db_session, obj_in=agenda_data)
        assert agenda.title == agenda_data.title
        assert agenda.meeting_id == agenda_data.meeting_id

    def test_get_meeting_agenda_by_id(self, db_session, test_meeting_agenda):
        """Test getting meeting agenda by ID"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        agenda = meeting_agenda.get(db_session, id=test_meeting_agenda.id)
        assert agenda is not None
        assert agenda.id == test_meeting_agenda.id
        assert agenda.title == test_meeting_agenda.title

    def test_get_meeting_agendas_with_pagination(self, db_session, test_meeting):
        """Test getting meeting agendas with pagination"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        agendas = meeting_agenda.get_multi(db_session, skip=0, limit=10)
        assert isinstance(agendas, list)

    def test_get_meeting_agendas_by_meeting_id(self, db_session, test_meeting):
        """Test getting agendas by meeting ID"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        agendas = meeting_agenda.get_by_meeting_id(db_session, meeting_id=test_meeting.id)
        assert isinstance(agendas, list)

    def test_search_meeting_agendas(self, db_session, test_meeting):
        """Test searching meeting agendas"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        agendas = meeting_agenda.search_agenda_items(db_session, query="test")
        assert isinstance(agendas, list)

    def test_update_meeting_agenda(self, db_session, test_meeting_agenda):
        """Test updating meeting agenda"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        from scrumix.api.schemas.meeting_agenda import MeetingAgendaUpdate
        update_data = MeetingAgendaUpdate(title="Updated agenda item")
        agenda = meeting_agenda.update(db_session, db_obj=test_meeting_agenda, obj_in=update_data)
        assert agenda.title == update_data.title

    def test_delete_meeting_agenda(self, db_session, test_meeting_agenda):
        """Test deleting meeting agenda"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        agenda = meeting_agenda.remove(db_session, id=test_meeting_agenda.id)
        assert agenda.id == test_meeting_agenda.id
        assert meeting_agenda.get(db_session, id=test_meeting_agenda.id) is None

    def test_delete_all_meeting_agendas_by_meeting_id(self, db_session, test_meeting):
        """Test deleting all agendas by meeting ID"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        deleted_count = meeting_agenda.delete_all_by_meeting_id(db_session, meeting_id=test_meeting.id)
        assert isinstance(deleted_count, int) 