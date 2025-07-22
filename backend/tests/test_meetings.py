"""
Meetings API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.meeting import MeetingType


class TestMeetingEndpoints:
    """Test meeting management endpoints"""

    def test_get_meetings_success(self, client, auth_headers):
        """Test getting meetings list"""
        response = client.get("/api/v1/meetings/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "meetings" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["meetings"], list)

    def test_get_meetings_unauthorized(self, client):
        """Test getting meetings without authentication"""
        response = client.get("/api/v1/meetings/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meetings_with_pagination(self, client, auth_headers):
        """Test getting meetings with pagination"""
        response = client.get("/api/v1/meetings/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "meetings" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_get_meetings_with_type_filter(self, client, auth_headers):
        """Test getting meetings with type filter"""
        response = client.get("/api/v1/meetings/?meeting_type=standup", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "meetings" in data
        assert isinstance(data["meetings"], list)

    def test_get_meetings_with_search(self, client, auth_headers):
        """Test getting meetings with search"""
        response = client.get("/api/v1/meetings/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "meetings" in data
        assert isinstance(data["meetings"], list)

    def test_get_meetings_upcoming_only(self, client, auth_headers):
        """Test getting upcoming meetings only"""
        response = client.get("/api/v1/meetings/?upcoming_only=true", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "meetings" in data
        assert isinstance(data["meetings"], list)

    def test_create_meeting_success(self, client, auth_headers):
        """Test successful meeting creation"""
        meeting_data = {
            "title": "Test Meeting",
            "description": "A test meeting",
            "meeting_type": "daily-standup",
            "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duration": 30,
            "location": "Conference Room A"
        }
        
        response = client.post("/api/v1/meetings/", json=meeting_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == meeting_data["title"]
        assert data["description"] == meeting_data["description"]
        assert data["meeting_type"] == meeting_data["meeting_type"]
        assert data["duration"] == meeting_data["duration"]
        assert data["location"] == meeting_data["location"]
        assert "id" in data

    def test_create_meeting_invalid_data(self, client, auth_headers):
        """Test meeting creation with invalid data"""
        meeting_data = {
            "title": "",  # Empty title
            "description": "A test meeting",
            "meeting_type": "daily-standup",
            "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duration": 30
        }
        
        response = client.post("/api/v1/meetings/", json=meeting_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_past_datetime(self, client, auth_headers):
        """Test meeting creation with past datetime"""
        meeting_data = {
            "title": "Past Meeting",
            "description": "A meeting in the past",
            "meeting_type": "daily-standup",
            "start_datetime": (datetime.now() - timedelta(hours=1)).isoformat(),
            "duration": 30
        }
        
        response = client.post("/api/v1/meetings/", json=meeting_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_unauthorized(self, client):
        """Test meeting creation without authentication"""
        meeting_data = {
            "title": "Test Meeting",
            "description": "A test meeting",
            "meeting_type": "daily-standup",
            "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duration": 30
        }
        
        response = client.post("/api/v1/meetings/", json=meeting_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meeting_by_id_success(self, client, auth_headers, db_session):
        """Test getting meeting by ID"""
        # Create a meeting first
        meeting_data = {
            "title": "Test Meeting for Get",
            "description": "A test meeting for getting",
            "meeting_type": "daily-standup",
            "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duration": 30,
            "location": "Conference Room A"
        }
        
        create_response = client.post("/api/v1/meetings/", json=meeting_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        meeting_id = create_response.json()["id"]
        
        # Get the meeting
        response = client.get(f"/api/v1/meetings/{meeting_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == meeting_id
        assert data["title"] == meeting_data["title"]
        assert data["description"] == meeting_data["description"]

    def test_get_meeting_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent meeting"""
        response = client.get("/api/v1/meetings/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_by_id_unauthorized(self, client):
        """Test getting meeting without authentication"""
        response = client.get("/api/v1/meetings/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_meeting_success(self, client, auth_headers, db_session):
        """Test successful meeting update"""
        # Create a meeting first
        meeting_data = {
            "title": "Test Meeting for Update",
            "description": "A test meeting for updating",
            "meeting_type": "daily-standup",
            "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duration": 30,
            "location": "Conference Room A"
        }
        
        create_response = client.post("/api/v1/meetings/", json=meeting_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        meeting_id = create_response.json()["id"]
        
        # Update the meeting
        update_data = {
            "title": "Updated Meeting Title",
            "description": "Updated description",
            "duration": 60,
            "location": "Conference Room B"
        }
        
        response = client.put(f"/api/v1/meetings/{meeting_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["duration"] == update_data["duration"]
        assert data["location"] == update_data["location"]

    def test_update_meeting_not_found(self, client, auth_headers):
        """Test updating non-existent meeting"""
        update_data = {
            "title": "Updated Meeting Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/meetings/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_meeting_unauthorized(self, client):
        """Test updating meeting without authentication"""
        update_data = {
            "title": "Updated Meeting Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/meetings/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_meeting_success(self, client, auth_headers, db_session):
        """Test successful meeting deletion"""
        # Create a meeting first
        meeting_data = {
            "title": "Test Meeting for Delete",
            "description": "A test meeting for deletion",
            "meeting_type": "daily-standup",
            "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duration": 30,
            "location": "Conference Room A"
        }
        
        create_response = client.post("/api/v1/meetings/", json=meeting_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        meeting_id = create_response.json()["id"]
        
        # Delete the meeting
        response = client.delete(f"/api/v1/meetings/{meeting_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Meeting deleted successfully"

    def test_delete_meeting_not_found(self, client, auth_headers):
        """Test deleting non-existent meeting"""
        response = client.delete("/api/v1/meetings/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_meeting_unauthorized(self, client):
        """Test deleting meeting without authentication"""
        response = client.delete("/api/v1/meetings/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meetings_by_type(self, client, auth_headers):
        """Test getting meetings by type"""
        response = client.get("/api/v1/meetings/type/standup", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_meetings_by_type_with_pagination(self, client, auth_headers):
        """Test getting meetings by type with pagination"""
        response = client.get("/api/v1/meetings/type/standup?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_upcoming_meetings(self, client, auth_headers):
        """Test getting upcoming meetings"""
        response = client.get("/api/v1/meetings/upcoming/list", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_upcoming_meetings_with_days(self, client, auth_headers):
        """Test getting upcoming meetings with days parameter"""
        response = client.get("/api/v1/meetings/upcoming/list?days_ahead=14", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_today_meetings(self, client, auth_headers):
        """Test getting today's meetings"""
        response = client.get("/api/v1/meetings/today/list", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_ongoing_meetings(self, client, auth_headers):
        """Test getting ongoing meetings"""
        response = client.get("/api/v1/meetings/ongoing/list", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_meetings(self, client, auth_headers):
        """Test searching meetings"""
        response = client.get("/api/v1/meetings/search/test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_meetings_with_pagination(self, client, auth_headers):
        """Test searching meetings with pagination"""
        response = client.get("/api/v1/meetings/search/test?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_meetings_by_date_range_success(self, client, auth_headers):
        """Test getting meetings by date range"""
        start_date = datetime.now().isoformat()
        end_date = (datetime.now() + timedelta(days=7)).isoformat()
        
        response = client.get(f"/api/v1/meetings/date-range/list?start_date={start_date}&end_date={end_date}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_meetings_by_date_range_invalid(self, client, auth_headers):
        """Test getting meetings by invalid date range"""
        start_date = (datetime.now() + timedelta(days=7)).isoformat()
        end_date = datetime.now().isoformat()
        
        response = client.get(f"/api/v1/meetings/date-range/list?start_date={start_date}&end_date={end_date}", headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Start date must be before end date" in response.json()["detail"]

    def test_get_meeting_statistics(self, client, auth_headers):
        """Test getting meeting statistics"""
        response = client.get("/api/v1/meetings/statistics/overview", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "statistics" in data
        assert "message" in data

    def test_reschedule_meeting_success(self, client, auth_headers, db_session):
        """Test successful meeting reschedule"""
        # Create a meeting first
        meeting_data = {
            "title": "Test Meeting for Reschedule",
            "description": "A test meeting for rescheduling",
            "meeting_type": "daily-standup",
            "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duration": 30,
            "location": "Conference Room A"
        }
        
        create_response = client.post("/api/v1/meetings/", json=meeting_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        meeting_id = create_response.json()["id"]
        
        # Reschedule the meeting
        new_start_datetime = (datetime.now() + timedelta(hours=2)).isoformat()
        new_duration = 45
        
        response = client.patch(
            f"/api/v1/meetings/{meeting_id}/reschedule?new_start_datetime={new_start_datetime}&new_duration={new_duration}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["duration"] == new_duration

    def test_reschedule_meeting_not_found(self, client, auth_headers):
        """Test rescheduling non-existent meeting"""
        new_start_datetime = (datetime.now() + timedelta(hours=2)).isoformat()
        
        response = client.patch(
            f"/api/v1/meetings/999/reschedule?new_start_datetime={new_start_datetime}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestMeetingCRUD:
    """Test meeting CRUD operations"""

    def test_create_meeting_success(self, db_session):
        """Test successful meeting creation"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        
        meeting_obj = meeting.create(db=db_session, obj_in=meeting_data)
        assert meeting_obj.title == meeting_data.title
        assert meeting_obj.description == meeting_data.description
        assert meeting_obj.meeting_type == meeting_data.meeting_type
        assert meeting_obj.duration == meeting_data.duration

    def test_get_meeting_by_id(self, db_session):
        """Test getting meeting by ID"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        
        created_meeting = meeting.create(db=db_session, obj_in=meeting_data)
        
        retrieved_meeting = meeting.get(db=db_session, id=created_meeting.id)
        assert retrieved_meeting is not None
        assert retrieved_meeting.title == meeting_data.title
        assert retrieved_meeting.description == meeting_data.description

    def test_get_meetings_with_pagination(self, db_session):
        """Test getting meetings with pagination"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        # Create multiple meetings
        for i in range(5):
            meeting_data = MeetingCreate(
                title=f"Test Meeting {i}",
                description=f"A test meeting {i}",
                meeting_type=MeetingType.daily_standup,
                start_datetime=datetime.now() + timedelta(hours=i+1),
                duration=30,
                location="Conference Room A"
            )
            meeting.create(db=db_session, obj_in=meeting_data)
        
        meetings, total = meeting.get_multi_with_pagination(db_session, skip=0, limit=3)
        assert len(meetings) == 3
        assert total == 5

    def test_get_meetings_by_type(self, db_session):
        """Test getting meetings by type"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        # Create meetings with different types
        meeting_types = [MeetingType.daily_standup, MeetingType.sprint_planning, MeetingType.sprint_retrospective]
        for meeting_type in meeting_types:
            meeting_data = MeetingCreate(
                title=f"Test Meeting {meeting_type}",
                description="A test meeting",
                meeting_type=meeting_type,
                start_datetime=datetime.now() + timedelta(hours=1),
                duration=30,
                location="Conference Room A"
            )
            meeting.create(db=db_session, obj_in=meeting_data)
        
        # Get standup meetings
        standup_meetings = meeting.get_by_type(db_session, MeetingType.daily_standup, skip=0, limit=10)
        assert len(standup_meetings) == 1
        assert standup_meetings[0].meeting_type == MeetingType.daily_standup

    def test_search_meetings(self, db_session):
        """Test searching meetings"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        # Create meetings with different descriptions
        meeting_descriptions = ["Python meeting", "JavaScript meeting", "React meeting", "Vue meeting"]
        for description in meeting_descriptions:
            meeting_data = MeetingCreate(
                title="Test Meeting",
                description=description,
                meeting_type=MeetingType.daily_standup,
                start_datetime=datetime.now() + timedelta(hours=1),
                duration=30,
                location="Conference Room A"
            )
            meeting.create(db=db_session, obj_in=meeting_data)
        
        # Search for meetings containing "meeting"
        meetings = meeting.search_meetings(db_session, "meeting", skip=0, limit=10)
        assert len(meetings) == 4

    def test_get_upcoming_meetings(self, db_session):
        """Test getting upcoming meetings"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        # Create meetings at different times
        for i in range(3):
            meeting_data = MeetingCreate(
                title=f"Test Meeting {i}",
                description="A test meeting",
                meeting_type=MeetingType.daily_standup,
                start_datetime=datetime.now() + timedelta(hours=i+1),
                duration=30,
                location="Conference Room A"
            )
            meeting.create(db=db_session, obj_in=meeting_data)
        
        # Get upcoming meetings
        upcoming_meetings = meeting.get_upcoming_meetings(db_session, days_ahead=7, limit=10)
        assert len(upcoming_meetings) == 3

    def test_get_today_meetings(self, db_session):
        """Test getting today's meetings"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        # Create a meeting for today
        today = datetime.now().replace(hour=14, minute=0, second=0, microsecond=0)
        meeting_data = MeetingCreate(
            title="Today's Meeting",
            description="A meeting for today",
            meeting_type=MeetingType.daily_standup,
            start_datetime=today,
            duration=30,
            location="Conference Room A"
        )
        meeting.create(db=db_session, obj_in=meeting_data)
        
        # Get today's meetings
        today_meetings = meeting.get_today_meetings(db_session)
        assert len(today_meetings) == 1

    def test_get_ongoing_meetings(self, db_session):
        """Test getting ongoing meetings"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        # Create an ongoing meeting (started 15 minutes ago, duration 60 minutes)
        ongoing_start = datetime.now() - timedelta(minutes=15)
        meeting_data = MeetingCreate(
            title="Ongoing Meeting",
            description="An ongoing meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=ongoing_start,
            duration=60,
            location="Conference Room A"
        )
        meeting.create(db=db_session, obj_in=meeting_data)
        
        # Get ongoing meetings
        ongoing_meetings = meeting.get_ongoing_meetings(db_session)
        assert len(ongoing_meetings) == 1

    def test_get_meetings_by_date_range(self, db_session):
        """Test getting meetings by date range"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        # Create meetings at different dates
        for i in range(3):
            meeting_data = MeetingCreate(
                title=f"Test Meeting {i}",
                description="A test meeting",
                meeting_type=MeetingType.daily_standup,
                start_datetime=datetime.now() + timedelta(days=i+1),
                duration=30,
                location="Conference Room A"
            )
            meeting.create(db=db_session, obj_in=meeting_data)
        
        # Get meetings in date range
        start_date = datetime.now()
        end_date = datetime.now() + timedelta(days=4)
        range_meetings = meeting.get_meetings_by_date_range(db_session, start_date, end_date, skip=0, limit=10)
        assert len(range_meetings) == 3

    def test_update_meeting(self, db_session):
        """Test updating meeting"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate, MeetingUpdate
        
        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        
        created_meeting = meeting.create(db=db_session, obj_in=meeting_data)
        
        update_data = MeetingUpdate(
            title="Updated Meeting",
            description="Updated description",
            duration=60,
            location="Conference Room B"
        )
        
        updated_meeting = meeting.update(db=db_session, db_obj=created_meeting, obj_in=update_data)
        assert updated_meeting.title == update_data.title
        assert updated_meeting.description == update_data.description
        assert updated_meeting.duration == update_data.duration
        assert updated_meeting.location == update_data.location

    def test_delete_meeting(self, db_session):
        """Test deleting meeting"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.daily_standup,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A"
        )
        
        created_meeting = meeting.create(db=db_session, obj_in=meeting_data)
        meeting_id = created_meeting.id
        
        meeting.remove(db=db_session, id=meeting_id)
        
        # Verify meeting is deleted
        retrieved_meeting = meeting.get(db=db_session, id=meeting_id)
        assert retrieved_meeting is None

    def test_get_meeting_statistics(self, db_session):
        """Test getting meeting statistics"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.schemas.meeting import MeetingCreate
        
        # Create meetings with different types
        meeting_types = [MeetingType.daily_standup, MeetingType.sprint_planning, MeetingType.sprint_retrospective]
        for meeting_type in meeting_types:
            meeting_data = MeetingCreate(
                title=f"Test Meeting {meeting_type}",
                description="A test meeting",
                meeting_type=meeting_type,
                start_datetime=datetime.now() + timedelta(hours=1),
                duration=30,
                location="Conference Room A"
            )
            meeting.create(db=db_session, obj_in=meeting_data)
        
        # Get statistics
        stats = meeting.get_meeting_statistics(db_session)
        assert isinstance(stats, dict) 