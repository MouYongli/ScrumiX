"""
Meeting action item API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.meeting import MeetingType
from scrumix.api.schemas.meeting_action_item import MeetingActionItemCreate


class TestMeetingActionItemEndpoints:
    """Test meeting action item management endpoints"""

    def test_create_meeting_action_item_success(self, client, auth_headers, test_meeting):
        """Test successful meeting action item creation"""
        action_item_data = {
            "title": "Test action item",
            "meeting_id": test_meeting.id,
            "due_date": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == action_item_data["title"]
        assert data["meeting_id"] == action_item_data["meeting_id"]
        assert "id" in data

    def test_create_meeting_action_item_invalid_data(self, client, auth_headers):
        """Test meeting action item creation with invalid data"""
        action_item_data = {
            "title": "",  # Empty title
            "meeting_id": 1
        }
        
        response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_action_item_nonexistent_meeting(self, client, auth_headers):
        """Test creating action item for non-existent meeting"""
        action_item_data = {
            "title": "Test action item",
            "meeting_id": 999  # Non-existent meeting
        }
        
        response = client.post("/api/v1/meeting-action-items/", json=action_item_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_action_item_by_id_success(self, client, auth_headers, test_meeting_action_item):
        """Test getting meeting action item by ID"""
        response = client.get(f"/api/v1/meeting-action-items/{test_meeting_action_item.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == test_meeting_action_item.title
        assert data["meeting_id"] == test_meeting_action_item.meeting_id
        assert data["id"] == test_meeting_action_item.id

    def test_get_meeting_action_item_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent meeting action item"""
        response = client.get("/api/v1/meeting-action-items/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_action_item_by_id_unauthorized(self, client):
        """Test getting meeting action item without authentication"""
        response = client.get("/api/v1/meeting-action-items/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_meeting_action_item_success(self, client, auth_headers, test_meeting_action_item):
        """Test updating meeting action item"""
        update_data = {
            "title": "Updated action item"
        }
        
        response = client.put(f"/api/v1/meeting-action-items/{test_meeting_action_item.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["id"] == test_meeting_action_item.id

    def test_update_meeting_action_item_not_found(self, client, auth_headers):
        """Test updating non-existent meeting action item"""
        update_data = {
            "title": "Updated action item"
        }
        
        response = client.put("/api/v1/meeting-action-items/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_meeting_action_item_unauthorized(self, client, test_meeting_action_item):
        """Test updating meeting action item without authentication"""
        update_data = {
            "title": "Updated action item"
        }
        
        response = client.put(f"/api/v1/meeting-action-items/{test_meeting_action_item.id}", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_meeting_action_item_success(self, client, auth_headers, test_meeting_action_item):
        """Test deleting meeting action item"""
        response = client.delete(f"/api/v1/meeting-action-items/{test_meeting_action_item.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK

    def test_delete_meeting_action_item_not_found(self, client, auth_headers):
        """Test deleting non-existent meeting action item"""
        response = client.delete("/api/v1/meeting-action-items/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_meeting_action_item_unauthorized(self, client, test_meeting_action_item):
        """Test deleting meeting action item without authentication"""
        response = client.delete(f"/api/v1/meeting-action-items/{test_meeting_action_item.id}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_action_items_by_meeting(self, client, auth_headers, test_meeting):
        """Test getting action items by meeting"""
        response = client.get(f"/api/v1/meeting-action-items/meeting/{test_meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_action_items_by_meeting_with_pagination(self, client, auth_headers, test_meeting):
        """Test getting action items by meeting with pagination"""
        response = client.get(f"/api/v1/meeting-action-items/meeting/{test_meeting.id}?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_count_action_items_by_meeting(self, client, auth_headers, test_meeting):
        """Test counting action items by meeting"""
        response = client.get(f"/api/v1/meeting-action-items/meeting/{test_meeting.id}/count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "count" in data

    def test_delete_all_action_items_by_meeting(self, client, auth_headers, test_meeting):
        """Test deleting all action items by meeting"""
        response = client.delete(f"/api/v1/meeting-action-items/meeting/{test_meeting.id}/all", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK


class TestMeetingActionItemCRUD:
    """Test meeting action item CRUD operations"""

    def test_create_meeting_action_item_success(self, db_session, test_meeting):
        """Test successful meeting action item creation"""
        action_item_data = MeetingActionItemCreate(
            title="Test action item",
            meeting_id=test_meeting.id,
            due_date=datetime.now() + timedelta(days=1)
        )
        
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        action_item = meeting_action_item.create(db_session, obj_in=action_item_data)
        assert action_item.title == action_item_data.title
        assert action_item.meeting_id == action_item_data.meeting_id

    def test_get_meeting_action_item_by_id(self, db_session, test_meeting_action_item):
        """Test getting meeting action item by ID"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        action_item = meeting_action_item.get(db_session, id=test_meeting_action_item.id)
        assert action_item is not None
        assert action_item.id == test_meeting_action_item.id
        assert action_item.title == test_meeting_action_item.title

    def test_get_meeting_action_items_with_pagination(self, db_session, test_meeting):
        """Test getting meeting action items with pagination"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        action_items = meeting_action_item.get_multi(db_session, skip=0, limit=10)
        assert isinstance(action_items, list)

    def test_get_meeting_action_items_by_meeting_id(self, db_session, test_meeting):
        """Test getting action items by meeting ID"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        action_items = meeting_action_item.get_by_meeting_id(db_session, meeting_id=test_meeting.id)
        assert isinstance(action_items, list)

    def test_search_meeting_action_items(self, db_session, test_meeting):
        """Test searching meeting action items"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        action_items = meeting_action_item.search_action_items(db_session, query="test")
        assert isinstance(action_items, list)

    def test_update_meeting_action_item(self, db_session, test_meeting_action_item):
        """Test updating meeting action item"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        from scrumix.api.schemas.meeting_action_item import MeetingActionItemUpdate
        update_data = MeetingActionItemUpdate(title="Updated action item")
        action_item = meeting_action_item.update(db_session, db_obj=test_meeting_action_item, obj_in=update_data)
        assert action_item.title == update_data.title

    def test_delete_meeting_action_item(self, db_session, test_meeting_action_item):
        """Test deleting meeting action item"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        action_item = meeting_action_item.remove(db_session, id=test_meeting_action_item.id)
        assert action_item.id == test_meeting_action_item.id
        assert meeting_action_item.get(db_session, id=test_meeting_action_item.id) is None

    def test_delete_all_meeting_action_items_by_meeting_id(self, db_session, test_meeting):
        """Test deleting all action items by meeting ID"""
        from scrumix.api.crud.meeting_action_item import meeting_action_item
        deleted_count = meeting_action_item.delete_all_by_meeting_id(db_session, meeting_id=test_meeting.id)
        assert isinstance(deleted_count, int) 