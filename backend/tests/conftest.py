"""
Pytest configuration and fixtures for ScrumiX backend tests
"""
import pytest
import asyncio
import os
from typing import Generator, Dict, Any
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Force test environment settings
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["ENVIRONMENT"] = "testing"

from scrumix.api.app import app
from scrumix.api.db.base import Base
# Import all models to ensure they are registered
from scrumix.api.models import (
    user, project, backlog, sprint, task, meeting, meeting_note, 
    meeting_agenda, meeting_action_item, documentation, acceptance_criteria, tag
)
# Import association models
from scrumix.api.models.user_project import UserProject
from scrumix.api.models.user_task import UserTask
from scrumix.api.models.user_meeting import UserMeeting
from scrumix.api.models.user_documentation import UserDocumentation
from scrumix.api.models.tag_documentation import TagDocumentation
from scrumix.api.models.tag_task import TagTask
from scrumix.api.db.database import get_db
from scrumix.api.core.config import settings
from scrumix.api.models.user import User, UserStatus
from scrumix.api.utils.password import get_password_hash
from datetime import datetime, timedelta


# Test database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a fresh database session for each test"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with overridden database dependency"""
    app.dependency_overrides[get_db] = lambda: db_session
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data() -> Dict[str, Any]:
    """Test user data"""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "full_name": "Test User",
        "password": "testpassword123",
        "is_active": True,
        "is_verified": True,
        "is_superuser": False,
        "status": UserStatus.ACTIVE
    }


@pytest.fixture
def test_user(db_session: Session, test_user_data: Dict[str, Any]) -> User:
    """Create a test user in the database"""
    user = User(
        email=test_user_data["email"],
        username=test_user_data["username"],
        full_name=test_user_data["full_name"],
        hashed_password=get_password_hash(test_user_data["password"]),
        is_active=test_user_data["is_active"],
        is_verified=test_user_data["is_verified"],
        is_superuser=test_user_data["is_superuser"],
        status=test_user_data["status"]
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_superuser_data() -> Dict[str, Any]:
    """Test superuser data"""
    return {
        "email": "admin@example.com",
        "username": "admin",
        "full_name": "Admin User",
        "password": "adminpassword123",
        "is_active": True,
        "is_verified": True,
        "is_superuser": True,
        "status": UserStatus.ACTIVE
    }


@pytest.fixture
def test_superuser(db_session: Session, test_superuser_data: Dict[str, Any]) -> User:
    """Create a test superuser in the database"""
    user = User(
        email=test_superuser_data["email"],
        username=test_superuser_data["username"],
        full_name=test_superuser_data["full_name"],
        hashed_password=get_password_hash(test_superuser_data["password"]),
        is_active=test_superuser_data["is_active"],
        is_verified=test_superuser_data["is_verified"],
        is_superuser=test_superuser_data["is_superuser"],
        status=test_superuser_data["status"]
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mock_current_user(test_user: User) -> Mock:
    """Mock current user dependency"""
    mock_user = Mock()
    mock_user.id = test_user.id
    mock_user.email = test_user.email
    mock_user.username = test_user.username
    mock_user.full_name = test_user.full_name
    mock_user.is_active = test_user.is_active
    mock_user.is_verified = test_user.is_verified
    mock_user.is_superuser = test_user.is_superuser
    mock_user.status = test_user.status
    return mock_user


@pytest.fixture
def mock_current_superuser(test_superuser: User) -> Mock:
    """Mock current superuser dependency"""
    mock_user = Mock()
    mock_user.id = test_superuser.id
    mock_user.email = test_superuser.email
    mock_user.username = test_superuser.username
    mock_user.full_name = test_superuser.full_name
    mock_user.is_active = test_superuser.is_active
    mock_user.is_verified = test_superuser.is_verified
    mock_user.is_superuser = test_superuser.is_superuser
    mock_user.status = test_superuser.status
    return mock_user


@pytest.fixture
def auth_headers(test_user: User) -> Dict[str, str]:
    """Create authentication headers for testing"""
    from scrumix.api.core.security import create_access_token
    access_token = create_access_token(data={"sub": str(test_user.id), "email": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def superuser_auth_headers(test_superuser: User) -> Dict[str, str]:
    """Create authentication headers for superuser testing"""
    from scrumix.api.core.security import create_access_token
    access_token = create_access_token(data={"sub": str(test_superuser.id), "email": test_superuser.email})
    return {"Authorization": f"Bearer {access_token}"} 

@pytest.fixture
def test_project(db_session):
    """Create a test project with all required fields."""
    from scrumix.api.models.project import Project, ProjectStatus
    project = Project(
        name="Test Project",
        description="A test project",
        status=ProjectStatus.ACTIVE,
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30)
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project

@pytest.fixture
def test_sprint(db_session, test_project):
    """Create a test sprint with all required fields."""
    from scrumix.api.models.sprint import Sprint, SprintStatus
    sprint = Sprint(
        sprint_name="Test Sprint",
        sprint_goal="A test sprint goal",
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=14),
        status=SprintStatus.PLANNING,
        sprint_capacity=40,
        project_id=test_project.id
    )
    db_session.add(sprint)
    db_session.commit()
    db_session.refresh(sprint)
    return sprint

@pytest.fixture
def test_backlog(db_session, test_project):
    """Create a test backlog item with all required fields."""
    from scrumix.api.models.backlog import Backlog, BacklogStatus, BacklogPriority
    backlog = Backlog(
        title="Test Backlog Item",
        description="A test backlog item",
        status=BacklogStatus.TODO,
        priority=BacklogPriority.MEDIUM,
        story_point=3,
        project_id=test_project.id
    )
    db_session.add(backlog)
    db_session.commit()
    db_session.refresh(backlog)
    return backlog

@pytest.fixture
def test_task(db_session, test_sprint):
    """Create a test task with all required fields."""
    from scrumix.api.models.task import Task, TaskStatus
    task = Task(
        title="Test Task",
        description="A test task",
        status=TaskStatus.todo,
        sprint_id=test_sprint.sprint_id
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task

@pytest.fixture
def test_meeting(db_session, test_project, test_sprint):
    """Create a test meeting with all required fields."""
    from scrumix.api.models.meeting import Meeting, MeetingType
    meeting = Meeting(
        description="A test meeting",
        meeting_type=MeetingType.STANDUP,
        start_datetime=datetime.now() + timedelta(hours=1),
        duration=60,
        location="Conference Room A",
        sprint_id=test_sprint.sprint_id,
        project_id=test_project.id
    )
    db_session.add(meeting)
    db_session.commit()
    db_session.refresh(meeting)
    return meeting

@pytest.fixture
def test_documentation(db_session, test_project):
    """Create a test documentation with all required fields."""
    from scrumix.api.models.documentation import Documentation, DocumentationType
    doc = Documentation(
        title="Test Documentation",
        description="Test content",
        type=DocumentationType.GUIDE,
        file_url="https://example.com/docs/test.pdf",
        project_id=test_project.id
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    return doc

@pytest.fixture
def test_tag(db_session):
    """Create a test tag."""
    from scrumix.api.models.tag import Tag
    tag = Tag(
        title="Test Tag"
    )
    db_session.add(tag)
    db_session.commit()
    db_session.refresh(tag)
    return tag 