"""
Meeting API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.meeting import MeetingType
from scrumix.api.schemas.meeting import MeetingCreate, MeetingUpdate


def serialize_datetime(dt):
    """Helper function to serialize datetime objects."""
    return dt.isoformat()


class TestMeetingEndpoints:
    """Test meeting endpoints"""

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
        response = client.get("/api/v1/meetings/?meeting_type=daily_standup", headers=auth_headers)
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
        start_time = datetime.now() + timedelta(hours=1)
        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=start_time,
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )
        
        # Convert to dict and serialize datetime
        data = meeting_data.model_dump()
        data["start_datetime"] = serialize_datetime(data["start_datetime"])
        
        response = client.post("/api/v1/meetings/", json=data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == meeting_data.title
        assert data["description"] == meeting_data.description
        assert data["meeting_type"] == meeting_data.meeting_type
        assert data["duration"] == meeting_data.duration
        assert data["location"] == meeting_data.location
        assert "id" in data

    def test_create_meeting_invalid_data(self, client, auth_headers):
        """Test meeting creation with invalid data"""
        start_time = datetime.now() + timedelta(hours=1)
        data = {
            "title": "",  # Empty title
            "description": "A test meeting",
            "meeting_type": MeetingType.DAILY_STANDUP,
            "start_datetime": serialize_datetime(start_time),
            "duration": 30,
            "sprint_id": 1,
            "project_id": 1
        }
        
        response = client.post("/api/v1/meetings/", json=data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_past_datetime(self, client, auth_headers):
        """Test meeting creation with past datetime"""
        start_time = datetime.now() - timedelta(hours=1)
        data = {
            "title": "Past Meeting",
            "description": "A meeting in the past",
            "meeting_type": MeetingType.DAILY_STANDUP,
            "start_datetime": serialize_datetime(start_time),
            "duration": 30,
            "sprint_id": 1,
            "project_id": 1
        }
        
        response = client.post("/api/v1/meetings/", json=data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_meeting_unauthorized(self, client):
        """Test meeting creation without authentication"""
        start_time = datetime.now() + timedelta(hours=1)
        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=start_time,
            duration=30,
            sprint_id=1,
            project_id=1
        )
        
        # Convert to dict and serialize datetime
        data = meeting_data.model_dump()
        data["start_datetime"] = serialize_datetime(data["start_datetime"])
        
        response = client.post("/api/v1/meetings/", json=data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meeting_by_id_success(self, client, auth_headers, test_meeting):
        """Test getting meeting by ID"""
        response = client.get(f"/api/v1/meetings/{test_meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == test_meeting.title
        assert data["description"] == test_meeting.description
        assert data["meeting_type"] == test_meeting.meeting_type
        assert data["id"] == test_meeting.id

    def test_get_meeting_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent meeting"""
        response = client.get("/api/v1/meetings/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_meeting_by_id_unauthorized(self, client):
        """Test getting meeting without authentication"""
        response = client.get("/api/v1/meetings/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_meeting_success(self, client, auth_headers, test_meeting):
        """Test updating meeting"""
        update_data = MeetingUpdate(
            title="Updated Meeting Title",
            description="Updated description"
        )
        
        # Convert to dict
        data = update_data.model_dump()
        
        response = client.put(f"/api/v1/meetings/{test_meeting.id}", json=data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data.title
        assert data["description"] == update_data.description
        assert data["id"] == test_meeting.id

    def test_update_meeting_not_found(self, client, auth_headers):
        """Test updating non-existent meeting"""
        update_data = MeetingUpdate(
            title="Updated Meeting Title",
            description="Updated description"
        )
        
        response = client.put("/api/v1/meetings/999", json=update_data.model_dump(), headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_meeting_unauthorized(self, client, test_meeting):
        """Test updating meeting without authentication"""
        update_data = MeetingUpdate(
            title="Updated Meeting Title",
            description="Updated description"
        )
        
        response = client.put(f"/api/v1/meetings/{test_meeting.id}", json=update_data.model_dump())
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_meeting_success(self, client, auth_headers, test_meeting):
        """Test deleting meeting"""
        response = client.delete(f"/api/v1/meetings/{test_meeting.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK

    def test_delete_meeting_not_found(self, client, auth_headers):
        """Test deleting non-existent meeting"""
        response = client.delete("/api/v1/meetings/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_meeting_unauthorized(self, client, test_meeting):
        """Test deleting meeting without authentication"""
        response = client.delete(f"/api/v1/meetings/{test_meeting.id}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_meetings_by_type(self, client, auth_headers):
        """Test getting meetings by type"""
        response = client.get("/api/v1/meetings/type/daily_standup", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_meetings_by_type_with_pagination(self, client, auth_headers):
        """Test getting meetings by type with pagination"""
        response = client.get("/api/v1/meetings/type/daily_standup?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_upcoming_meetings(self, client, auth_headers):
        """Test getting upcoming meetings"""
        response = client.get("/api/v1/meetings/upcoming", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_upcoming_meetings_with_days(self, client, auth_headers):
        """Test getting upcoming meetings with days parameter"""
        response = client.get("/api/v1/meetings/upcoming?days=7", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_today_meetings(self, client, auth_headers):
        """Test getting today's meetings"""
        response = client.get("/api/v1/meetings/today", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_ongoing_meetings(self, client, auth_headers):
        """Test getting ongoing meetings"""
        response = client.get("/api/v1/meetings/ongoing", headers=auth_headers)
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
        start_date = datetime.now()
        end_date = datetime.now() + timedelta(days=7)
        
        response = client.get(
            f"/api/v1/meetings/range?start_date={serialize_datetime(start_date)}&end_date={serialize_datetime(end_date)}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_meetings_by_date_range_invalid(self, client, auth_headers):
        """Test getting meetings with invalid date range"""
        end_date = datetime.now()
        start_date = datetime.now() + timedelta(days=7)  # Start after end
        
        response = client.get(
            f"/api/v1/meetings/range?start_date={serialize_datetime(start_date)}&end_date={serialize_datetime(end_date)}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_meeting_statistics(self, client, auth_headers):
        """Test getting meeting statistics"""
        response = client.get("/api/v1/meetings/statistics", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)

    def test_reschedule_meeting_success(self, client, auth_headers, test_meeting):
        """Test rescheduling meeting"""
        start_time = datetime.now() + timedelta(hours=1)
        reschedule_data = MeetingCreate(
            title="Test Meeting for Reschedule",
            description="A test meeting for rescheduling",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=start_time,
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )
        
        # Convert to dict and serialize datetime
        data = reschedule_data.model_dump()
        data["start_datetime"] = serialize_datetime(data["start_datetime"])
        
        response = client.post(f"/api/v1/meetings/{test_meeting.id}/reschedule", json=data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == reschedule_data.title
        assert data["description"] == reschedule_data.description
        assert data["meeting_type"] == reschedule_data.meeting_type
        assert data["duration"] == reschedule_data.duration
        assert data["location"] == reschedule_data.location

    def test_reschedule_meeting_not_found(self, client, auth_headers):
        """Test rescheduling non-existent meeting"""
        start_time = datetime.now() + timedelta(hours=1)
        reschedule_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=start_time,
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )
        
        # Convert to dict and serialize datetime
        data = reschedule_data.model_dump()
        data["start_datetime"] = serialize_datetime(data["start_datetime"])
        
        response = client.post("/api/v1/meetings/999/reschedule", json=data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestMeetingCRUD:
    """Test meeting CRUD operations"""

    def test_create_meeting_success(self, db_session):
        """Test creating meeting"""
        from scrumix.api.crud.meeting import meeting

        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )

        created_meeting = meeting.create(db_session, obj_in=meeting_data)
        assert created_meeting.title == meeting_data.title
        assert created_meeting.description == meeting_data.description
        assert created_meeting.meeting_type == meeting_data.meeting_type

    def test_get_meeting_by_id(self, db_session):
        """Test getting meeting by ID"""
        from scrumix.api.crud.meeting import meeting

        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )

        created_meeting = meeting.create(db_session, obj_in=meeting_data)
        retrieved_meeting = meeting.get(db=db_session, id=created_meeting.id)
        assert retrieved_meeting.title == meeting_data.title
        assert retrieved_meeting.description == meeting_data.description
        assert retrieved_meeting.meeting_type == meeting_data.meeting_type

    def test_get_meetings_with_pagination(self, db_session):
        """Test getting meetings with pagination"""
        from scrumix.api.crud.meeting import meeting

        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )

        meeting.create(db_session, obj_in=meeting_data)
        meetings = meeting.get_multi(db_session, skip=0, limit=10)
        assert isinstance(meetings, list)

    def test_get_meetings_by_type(self, db_session):
        """Test getting meetings by type"""
        from scrumix.api.crud.meeting import meeting

        # Create meetings with different types
        meeting_types = [MeetingType.DAILY_STANDUP, MeetingType.SPRINT_PLANNING, MeetingType.SPRINT_RETROSPECTIVE]
        for meeting_type in meeting_types:
            meeting_data = MeetingCreate(
                title=f"Test {meeting_type} Meeting",
                description=f"A test {meeting_type} meeting",
                meeting_type=meeting_type,
                start_datetime=datetime.now() + timedelta(hours=1),
                duration=30,
                location="Conference Room A",
                sprint_id=1,
                project_id=1
            )
            meeting.create(db_session, obj_in=meeting_data)

        # Get standup meetings
        standup_meetings = meeting.get_by_type(db_session, meeting_type=MeetingType.DAILY_STANDUP, skip=0, limit=10)
        assert isinstance(standup_meetings, list)
        assert len(standup_meetings) > 0
        assert all(m.meeting_type == MeetingType.DAILY_STANDUP for m in standup_meetings)

    def test_search_meetings(self, db_session):
        """Test searching meetings"""
        from scrumix.api.crud.meeting import meeting

        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )

        meeting.create(db_session, obj_in=meeting_data)
        meetings = meeting.search(db_session, search_term="test", skip=0, limit=10)
        assert isinstance(meetings, list)

    def test_get_upcoming_meetings(self, db_session):
        """Test getting upcoming meetings"""
        from scrumix.api.crud.meeting import meeting

        # Create future meetings
        for i in range(3):
            meeting_data = MeetingCreate(
                title=f"Test Meeting {i}",
                description="A test meeting",
                meeting_type=MeetingType.DAILY_STANDUP,
                start_datetime=datetime.now() + timedelta(days=i+1),
                duration=30,
                location="Conference Room A",
                sprint_id=1,
                project_id=1
            )
            meeting.create(db_session, obj_in=meeting_data)

        upcoming_meetings = meeting.get_upcoming(db_session, days=7)
        assert isinstance(upcoming_meetings, list)
        assert len(upcoming_meetings) > 0
        assert all(m.start_datetime > datetime.now() for m in upcoming_meetings)

    def test_get_today_meetings(self, db_session):
        """Test getting today's meetings"""
        from scrumix.api.crud.meeting import meeting

        today = datetime.now().replace(hour=14, minute=0)  # 2 PM today

        meeting_data = MeetingCreate(
            title="Today's Meeting",
            description="A meeting for today",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=today + timedelta(hours=1),  # 3 PM today
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )

        meeting.create(db_session, obj_in=meeting_data)
        today_meetings = meeting.get_today(db_session)
        assert isinstance(today_meetings, list)
        assert len(today_meetings) > 0
        assert all(m.start_datetime.date() == datetime.now().date() for m in today_meetings)

    def test_get_ongoing_meetings(self, db_session):
        """Test getting ongoing meetings"""
        from scrumix.api.crud.meeting import meeting
        from scrumix.api.models.meeting import Meeting

        # Create a meeting that started 15 minutes ago
        ongoing_start = datetime.now() - timedelta(minutes=15)
        db_meeting = Meeting(
            title="Ongoing Meeting",
            description="An ongoing meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=ongoing_start,
            duration=60,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )
        db_session.add(db_meeting)
        db_session.commit()
        db_session.refresh(db_meeting)

        meetings = meeting.get_ongoing(db=db_session)
        assert isinstance(meetings, list)
        assert len(meetings) > 0
        assert meetings[0].title == "Ongoing Meeting"

    def test_get_meetings_by_date_range(self, db_session):
        """Test getting meetings by date range"""
        from scrumix.api.crud.meeting import meeting

        # Create meetings on different days
        for i in range(3):
            meeting_data = MeetingCreate(
                title=f"Test Meeting {i}",
                description="A test meeting",
                meeting_type=MeetingType.DAILY_STANDUP,
                start_datetime=datetime.now() + timedelta(days=i+1),
                duration=30,
                location="Conference Room A",
                sprint_id=1,
                project_id=1
            )
            meeting.create(db_session, obj_in=meeting_data)

        start_date = datetime.now()
        end_date = datetime.now() + timedelta(days=7)

        meetings = meeting.get_by_date_range(db_session, start_date=start_date, end_date=end_date)
        assert isinstance(meetings, list)
        assert len(meetings) > 0
        assert all(start_date <= m.start_datetime <= end_date for m in meetings)

    def test_update_meeting(self, db_session):
        """Test updating meeting"""
        from scrumix.api.crud.meeting import meeting

        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )

        created_meeting = meeting.create(db_session, obj_in=meeting_data)

        update_data = MeetingUpdate(
            title="Updated Meeting Title",
            description="Updated description"
        )

        updated_meeting = meeting.update(db_session, db_obj=created_meeting, obj_in=update_data)
        assert updated_meeting.title == update_data.title
        assert updated_meeting.description == update_data.description
        assert updated_meeting.meeting_type == meeting_data.meeting_type  # Should not be changed

    def test_delete_meeting(self, db_session):
        """Test deleting meeting"""
        from scrumix.api.crud.meeting import meeting

        meeting_data = MeetingCreate(
            title="Test Meeting",
            description="A test meeting",
            meeting_type=MeetingType.DAILY_STANDUP,
            start_datetime=datetime.now() + timedelta(hours=1),
            duration=30,
            location="Conference Room A",
            sprint_id=1,
            project_id=1
        )

        created_meeting = meeting.create(db_session, obj_in=meeting_data)
        meeting_id = created_meeting.id

        meeting.remove(db_session, id=meeting_id)

        # Verify meeting is deleted
        retrieved_meeting = meeting.get(db_session, id=meeting_id)
        assert retrieved_meeting is None

    def test_get_meeting_statistics(self, db_session):
        """Test getting meeting statistics"""
        from scrumix.api.crud.meeting import meeting

        # Create meetings with different types
        meeting_types = [MeetingType.DAILY_STANDUP, MeetingType.SPRINT_PLANNING, MeetingType.SPRINT_RETROSPECTIVE]
        for meeting_type in meeting_types:
            meeting_data = MeetingCreate(
                title=f"Test {meeting_type} Meeting",
                description=f"A test {meeting_type} meeting",
                meeting_type=meeting_type,
                start_datetime=datetime.now() + timedelta(hours=1),
                duration=30,
                location="Conference Room A",
                sprint_id=1,
                project_id=1
            )
            meeting.create(db_session, obj_in=meeting_data)

        stats = meeting.get_statistics(db_session)
        assert isinstance(stats, dict)
        assert "total_meetings" in stats
        assert "meetings_by_type" in stats
        assert "average_duration_minutes" in stats 