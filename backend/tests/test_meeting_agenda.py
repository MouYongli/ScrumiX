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

    def test_create_agenda_with_order_endpoint(self, client, auth_headers, test_meeting):
        """Test creating agenda item with order via API endpoint"""
        agenda_data = {
            "title": "Test agenda with order",
            "meeting_id": test_meeting.id,
            "order": 3
        }
        
        response = client.post("/api/v1/meeting-agendas/", json=agenda_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == agenda_data["title"]
        assert data["orderIndex"] == 3

    def test_reorder_agenda_items_endpoint(self, client, auth_headers, test_meeting):
        """Test reordering agenda items via API endpoint"""
        # Create three agenda items
        agenda_data = [
            {"title": "First item", "meeting_id": test_meeting.id},
            {"title": "Second item", "meeting_id": test_meeting.id},
            {"title": "Third item", "meeting_id": test_meeting.id}
        ]
        
        agenda_ids = []
        for data in agenda_data:
            response = client.post("/api/v1/meeting-agendas/", json=data, headers=auth_headers)
            assert response.status_code == status.HTTP_201_CREATED
            agenda_ids.append(response.json()["agendaId"])
        
        # Reorder: [3rd, 1st, 2nd]
        reorder_data = {
            "agenda_ids": [agenda_ids[2], agenda_ids[0], agenda_ids[1]]
        }
        
        response = client.post("/api/v1/meeting-agendas/reorder", json=reorder_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        reordered_items = response.json()
        assert len(reordered_items) == 3
        assert reordered_items[0]["agendaId"] == agenda_ids[2]
        assert reordered_items[0]["orderIndex"] == 1
        assert reordered_items[1]["agendaId"] == agenda_ids[0]
        assert reordered_items[1]["orderIndex"] == 2
        assert reordered_items[2]["agendaId"] == agenda_ids[1]
        assert reordered_items[2]["orderIndex"] == 3

    def test_update_agenda_order_endpoint(self, client, auth_headers, test_meeting_agenda):
        """Test updating agenda order via API endpoint"""
        response = client.put(
            f"/api/v1/meeting-agendas/{test_meeting_agenda.id}/order?new_order=5", 
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["orderIndex"] == 5
        assert data["agendaId"] == test_meeting_agenda.id

    def test_agenda_items_ordered_in_response(self, client, auth_headers, test_meeting):
        """Test that agenda items are returned in order"""
        # Create agenda items with specific orders
        agenda_data = [
            {"title": "Third item", "meeting_id": test_meeting.id, "order_index": 3},
            {"title": "First item", "meeting_id": test_meeting.id, "order_index": 1},
            {"title": "Second item", "meeting_id": test_meeting.id, "order_index": 2}
        ]
        
        for data in agenda_data:
            response = client.post("/api/v1/meeting-agendas/", json=data, headers=auth_headers)
            assert response.status_code == status.HTTP_201_CREATED
        
        # Get agenda items by meeting
        response = client.get(f"/api/v1/meeting-agendas/meeting/{test_meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        agenda_items = response.json()
        assert len(agenda_items) == 3
        
        # Verify they are returned in order
        assert agenda_items[0]["title"] == "First item"
        assert agenda_items[0]["orderIndex"] == 1
        assert agenda_items[1]["title"] == "Second item"
        assert agenda_items[1]["orderIndex"] == 2
        assert agenda_items[2]["title"] == "Third item"
        assert agenda_items[2]["orderIndex"] == 3


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

    def test_create_agenda_with_order(self, db_session, test_meeting):
        """Test creating agenda item with specific order"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        agenda_data = MeetingAgendaCreate(
            title="Test agenda with order",
            meeting_id=test_meeting.id,
            order_index=5
        )
        
        agenda = meeting_agenda.create(db_session, obj_in=agenda_data)
        assert agenda.title == agenda_data.title
        assert agenda.order_index == 5

    def test_create_agenda_auto_order(self, db_session, test_meeting):
        """Test creating agenda item with automatic order assignment"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        
        # Create first item
        agenda_data1 = MeetingAgendaCreate(
            title="First agenda item",
            meeting_id=test_meeting.id
        )
        agenda1 = meeting_agenda.create(db_session, obj_in=agenda_data1)
        assert agenda1.order_index == 1
        
        # Create second item
        agenda_data2 = MeetingAgendaCreate(
            title="Second agenda item",
            meeting_id=test_meeting.id
        )
        agenda2 = meeting_agenda.create(db_session, obj_in=agenda_data2)
        assert agenda2.order_index == 2

    def test_reorder_agenda_items(self, db_session, test_meeting):
        """Test reordering agenda items"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        
        # Create multiple agenda items
        agenda1 = meeting_agenda.create(db_session, obj_in=MeetingAgendaCreate(
            title="First item", meeting_id=test_meeting.id
        ))
        agenda2 = meeting_agenda.create(db_session, obj_in=MeetingAgendaCreate(
            title="Second item", meeting_id=test_meeting.id
        ))
        agenda3 = meeting_agenda.create(db_session, obj_in=MeetingAgendaCreate(
            title="Third item", meeting_id=test_meeting.id
        ))
        
        # Reorder: [3, 1, 2]
        reordered = meeting_agenda.reorder_agenda_items(
            db_session, agenda_ids=[agenda3.id, agenda1.id, agenda2.id]
        )
        
        assert len(reordered) == 3
        assert reordered[0].id == agenda3.id and reordered[0].order_index == 1
        assert reordered[1].id == agenda1.id and reordered[1].order_index == 2
        assert reordered[2].id == agenda2.id and reordered[2].order_index == 3

    def test_update_agenda_order(self, db_session, test_meeting):
        """Test updating order of a specific agenda item"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        
        # Create multiple agenda items
        agenda1 = meeting_agenda.create(db_session, obj_in=MeetingAgendaCreate(
            title="First item", meeting_id=test_meeting.id
        ))
        agenda2 = meeting_agenda.create(db_session, obj_in=MeetingAgendaCreate(
            title="Second item", meeting_id=test_meeting.id
        ))
        agenda3 = meeting_agenda.create(db_session, obj_in=MeetingAgendaCreate(
            title="Third item", meeting_id=test_meeting.id
        ))
        
        # Move first item to position 3
        updated_agenda = meeting_agenda.update_order(
            db_session, agenda_id=agenda1.id, new_order=3
        )
        
        assert updated_agenda.order_index == 3
        
        # Verify other items were adjusted
        db_session.refresh(agenda2)
        db_session.refresh(agenda3)
        assert agenda2.order_index == 1  # Should move up
        assert agenda3.order_index == 2  # Should move up

    def test_get_next_order_for_meeting(self, db_session, test_meeting):
        """Test getting next order number for meeting"""
        from scrumix.api.crud.meeting_agenda import meeting_agenda
        
        # Should start with order 1 for empty meeting
        next_order = meeting_agenda.get_next_order_for_meeting(db_session, meeting_id=test_meeting.id)
        assert next_order == 1
        
        # Create an agenda item
        meeting_agenda.create(db_session, obj_in=MeetingAgendaCreate(
            title="First item", meeting_id=test_meeting.id
        ))
        
        # Next order should be 2
        next_order = meeting_agenda.get_next_order_for_meeting(db_session, meeting_id=test_meeting.id)
        assert next_order == 2 