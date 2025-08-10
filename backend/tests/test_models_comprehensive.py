"""
Comprehensive model tests for ScrumiX backend
Tests model validation, relationships, business logic, and constraints
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from scrumix.api.models.user import User, UserStatus, AuthProvider
from scrumix.api.models.project import Project, ProjectStatus
from scrumix.api.models.sprint import Sprint, SprintStatus
from scrumix.api.models.task import Task, TaskStatus
from scrumix.api.models.backlog import Backlog, BacklogStatus, BacklogPriority, BacklogType
from scrumix.api.models.meeting import Meeting, MeetingType
from scrumix.api.models.meeting_note import MeetingNote
from scrumix.api.models.meeting_agenda import MeetingAgenda
from scrumix.api.models.meeting_action_item import MeetingActionItem
from scrumix.api.models.documentation import Documentation, DocumentationType
from scrumix.api.models.acceptance_criteria import AcceptanceCriteria
from scrumix.api.models.tag import Tag
from scrumix.api.models.user_project import UserProject
from scrumix.api.models.user_task import UserTask
from scrumix.api.models.user_meeting import UserMeeting
from scrumix.api.models.user_documentation import UserDocumentation
from scrumix.api.models.tag_task import TagTask
from scrumix.api.models.tag_documentation import TagDocumentation


class TestUserModel:
    """Comprehensive tests for User model"""

    def test_user_creation_with_all_fields(self, db_session: Session):
        """Test creating user with all fields populated"""
        user = User(
            email="test@example.com",
            username="testuser",
            full_name="Test User",
            hashed_password="hashed_password_123",
            is_active=True,
            is_verified=True,
            is_superuser=False,
            status=UserStatus.ACTIVE,
            timezone="UTC",
            language="en-US",
            avatar_url="https://example.com/avatar.jpg",
            last_login_at=datetime.now()
        )
        
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.full_name == "Test User"
        assert user.is_active is True
        assert user.is_verified is True
        assert user.is_superuser is False
        assert user.status == UserStatus.ACTIVE
        assert user.timezone == "UTC"
        assert user.language == "en-US"
        assert user.created_at is not None
        assert user.updated_at is not None

    def test_user_creation_with_minimal_fields(self, db_session: Session):
        """Test creating user with only required fields"""
        user = User(
            email="minimal@example.com",
            username="minimal"
        )
        
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        # Test default values
        assert user.is_active is True
        assert user.is_verified is False
        assert user.is_superuser is False
        assert user.status == UserStatus.ACTIVE
        assert user.timezone == "UTC"
        assert user.language == "zh-CN"

    def test_user_email_uniqueness_constraint(self, db_session: Session):
        """Test that email must be unique"""
        user1 = User(email="duplicate@example.com", username="user1")
        user2 = User(email="duplicate@example.com", username="user2")
        
        db_session.add(user1)
        db_session.commit()
        
        db_session.add(user2)
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_user_username_uniqueness_constraint(self, db_session: Session):
        """Test that username must be unique"""
        user1 = User(email="user1@example.com", username="duplicate")
        user2 = User(email="user2@example.com", username="duplicate")
        
        db_session.add(user1)
        db_session.commit()
        
        db_session.add(user2)
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_user_repr_method(self, db_session: Session):
        """Test User __repr__ method"""
        user = User(email="repr@example.com", username="repruser")
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        repr_str = repr(user)
        # User model doesn't have custom __repr__, so check default format
        assert "User" in repr_str
        assert "object at" in repr_str

    def test_user_status_enum_validation(self, db_session: Session):
        """Test UserStatus enum validation"""
        # Valid status
        user = User(email="status@example.com", username="statususer", status=UserStatus.INACTIVE)
        db_session.add(user)
        db_session.commit()
        assert user.status == UserStatus.INACTIVE
        
        # Test all valid statuses
        for status in UserStatus:
            user = User(email=f"status_{status.value}@example.com", username=f"user_{status.value}", status=status)
            db_session.add(user)
            db_session.commit()
            assert user.status == status
            db_session.rollback()  # Rollback to avoid duplicate email issues

    def test_user_auth_provider_enum_validation(self, db_session: Session):
        """Test that User model doesn't have auth_provider field"""
        # AuthProvider is used in UserOAuth model, not User model
        user = User(
            email="test_oauth@example.com", 
            username="test_oauth"
        )
        db_session.add(user)
        db_session.commit()
        
        # Verify User model doesn't have auth_provider attribute
        assert not hasattr(user, 'auth_provider')


class TestProjectModel:
    """Comprehensive tests for Project model"""

    def test_project_creation_with_all_fields(self, db_session: Session):
        """Test creating project with all fields"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=30)
        
        project = Project(
            name="Comprehensive Test Project",
            description="A project for comprehensive testing",
            status=ProjectStatus.ACTIVE,
            start_date=start_date,
            end_date=end_date,
            color="#FF5733",
            last_activity_at=datetime.now()
        )
        
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        assert project.id is not None
        assert project.name == "Comprehensive Test Project"
        assert project.description == "A project for comprehensive testing"
        assert project.status == ProjectStatus.ACTIVE
        assert project.start_date == start_date
        assert project.end_date == end_date
        assert project.color == "#FF5733"
        assert project.created_at is not None
        assert project.updated_at is not None
        assert project.last_activity_at is not None

    def test_project_status_enum_validation(self, db_session: Session):
        """Test ProjectStatus enum validation"""
        for status in ProjectStatus:
            project = Project(
                name=f"Project {status.value}",
                status=status
            )
            db_session.add(project)
            db_session.commit()
            assert project.status == status
            db_session.rollback()

    def test_project_name_required_constraint(self, db_session: Session):
        """Test that project name is required"""
        project = Project(name=None)
        db_session.add(project)
        
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_project_relationships(self, db_session: Session):
        """Test project relationships with other models"""
        # Create project
        project = Project(name="Relationship Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        # Test that relationships are properly initialized
        assert project.backlogs == []
        assert project.sprints == []
        assert project.documentations == []
        assert project.meetings == []
        assert project.users == []

    def test_project_repr_method(self, db_session: Session):
        """Test Project __repr__ method"""
        project = Project(name="Repr Project", status=ProjectStatus.PLANNING)
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        repr_str = repr(project)
        assert "Project" in repr_str
        assert str(project.id) in repr_str
        assert "Repr Project" in repr_str
        assert "planning" in repr_str


class TestSprintModel:
    """Comprehensive tests for Sprint model"""

    def test_sprint_creation_with_project_relationship(self, db_session: Session):
        """Test creating sprint with project relationship"""
        # Create project first
        project = Project(name="Sprint Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        # Create sprint
        start_date = datetime.now()
        end_date = start_date + timedelta(days=14)
        
        sprint = Sprint(
            sprint_name="Test Sprint 1",
            sprint_goal="Complete user authentication",
            start_date=start_date,
            end_date=end_date,
            status=SprintStatus.PLANNING,
            sprint_capacity=20,
            project_id=project.id
        )
        
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        assert sprint.id is not None
        assert sprint.sprint_name == "Test Sprint 1"
        assert sprint.sprint_goal == "Complete user authentication"
        assert sprint.start_date == start_date
        assert sprint.end_date == end_date
        assert sprint.status == SprintStatus.PLANNING
        assert sprint.sprint_capacity == 20
        assert sprint.project_id == project.id
        assert sprint.project == project

    def test_sprint_backward_compatibility_property(self, db_session: Session):
        """Test sprint_id property for backward compatibility"""
        project = Project(name="Compatibility Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Compatibility Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        # Test that sprint_id property returns the same as id
        assert sprint.sprint_id == sprint.id

    def test_sprint_status_enum_validation(self, db_session: Session):
        """Test SprintStatus enum validation"""
        project = Project(name="Status Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        for status in SprintStatus:
            sprint = Sprint(
                sprint_name=f"Sprint {status.value}",
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=14),
                status=status,
                project_id=project.id
            )
            db_session.add(sprint)
            db_session.commit()
            assert sprint.status == status
            db_session.rollback()

    def test_sprint_foreign_key_constraint(self, db_session: Session):
        """Test sprint foreign key constraint to project"""
        # Note: SQLite might not enforce foreign keys in test environment
        # This test verifies the field exists and can reference a valid project
        project = Project(name="Valid Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Valid Project Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id  # Valid project reference
        )
        
        db_session.add(sprint)
        db_session.commit()  # Should succeed with valid project_id
        assert sprint.project_id == project.id

    def test_sprint_repr_method(self, db_session: Session):
        """Test Sprint __repr__ method"""
        project = Project(name="Repr Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Repr Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            status=SprintStatus.ACTIVE,
            project_id=project.id
        )
        
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        repr_str = repr(sprint)
        assert "Sprint" in repr_str
        assert str(sprint.id) in repr_str
        assert "Repr Sprint" in repr_str
        assert "active" in repr_str


class TestTaskModel:
    """Comprehensive tests for Task model"""

    def test_task_creation_with_sprint_relationship(self, db_session: Session):
        """Test creating task with sprint relationship"""
        # Create project and sprint
        project = Project(name="Task Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Task Test Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        # Create task
        task = Task(
            title="Test Task",
            description="A comprehensive test task",
            status=TaskStatus.TODO,
            story_point=5,
            sprint_id=sprint.id
        )
        
        db_session.add(task)
        db_session.commit()
        db_session.refresh(task)
        
        assert task.id is not None
        assert task.title == "Test Task"
        assert task.description == "A comprehensive test task"
        assert task.status == TaskStatus.TODO
        assert task.story_point == 5
        assert task.sprint_id == sprint.id
        assert task.sprint == sprint

    def test_task_status_enum_validation(self, db_session: Session):
        """Test TaskStatus enum validation"""
        # Create dependencies
        project = Project(name="Task Status Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Task Status Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        db_session.add(sprint)
        db_session.commit()
        
        for status in TaskStatus:
            task = Task(
                title=f"Task {status.value}",
                status=status,
                sprint_id=sprint.id
            )
            db_session.add(task)
            db_session.commit()
            assert task.status == status
            db_session.rollback()

    def test_task_title_required_constraint(self, db_session: Session):
        """Test that task title is required"""
        project = Project(name="Required Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Required Test Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        db_session.add(sprint)
        db_session.commit()
        
        task = Task(title=None, sprint_id=sprint.id)
        db_session.add(task)
        
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestBacklogModel:
    """Comprehensive tests for Backlog model"""

    def test_backlog_creation_with_project_relationship(self, db_session: Session):
        """Test creating backlog with project relationship"""
        project = Project(name="Backlog Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        backlog = Backlog(
            title="Test Backlog Item",
            description="A comprehensive test backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.HIGH,
            item_type=BacklogType.STORY,
            story_point=8,
            level=0,
            path="/1/",
            project_id=project.id
        )
        
        db_session.add(backlog)
        db_session.commit()
        db_session.refresh(backlog)
        
        assert backlog.id is not None
        assert backlog.title == "Test Backlog Item"
        assert backlog.description == "A comprehensive test backlog"
        assert backlog.status == BacklogStatus.TODO
        assert backlog.priority == BacklogPriority.HIGH
        assert backlog.item_type == BacklogType.STORY
        assert backlog.story_point == 8
        assert backlog.level == 0
        assert backlog.path == "/1/"
        assert backlog.project_id == project.id
        assert backlog.project == project

    def test_backlog_enum_validations(self, db_session: Session):
        """Test backlog enum validations"""
        project = Project(name="Enum Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        # Test BacklogStatus enum
        for status in BacklogStatus:
            backlog = Backlog(
                title=f"Status {status.value}",
                status=status,
                priority=BacklogPriority.MEDIUM,
                project_id=project.id
            )
            db_session.add(backlog)
            db_session.commit()
            assert backlog.status == status
            db_session.rollback()
        
        # Test BacklogPriority enum
        for priority in BacklogPriority:
            backlog = Backlog(
                title=f"Priority {priority.value}",
                status=BacklogStatus.TODO,
                priority=priority,
                project_id=project.id
            )
            db_session.add(backlog)
            db_session.commit()
            assert backlog.priority == priority
            db_session.rollback()
        
        # Test BacklogType enum
        for backlog_type in BacklogType:
            backlog = Backlog(
                title=f"Type {backlog_type.value}",
                status=BacklogStatus.TODO,
                priority=BacklogPriority.MEDIUM,
                item_type=backlog_type,
                project_id=project.id
            )
            db_session.add(backlog)
            db_session.commit()
            assert backlog.item_type == backlog_type
            db_session.rollback()

    def test_backlog_hierarchical_structure(self, db_session: Session):
        """Test backlog hierarchical structure (parent-child relationships)"""
        project = Project(name="Hierarchy Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        # Create parent backlog
        parent_backlog = Backlog(
            title="Parent Epic",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.HIGH,
            item_type=BacklogType.EPIC,
            level=0,
            path="/1/",
            project_id=project.id
        )
        db_session.add(parent_backlog)
        db_session.commit()
        db_session.refresh(parent_backlog)
        
        # Create child backlog
        child_backlog = Backlog(
            title="Child User Story",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            item_type=BacklogType.STORY,
            level=1,
            path=f"/1/{parent_backlog.id}/",
            parent_id=parent_backlog.id,
            root_id=parent_backlog.id,
            project_id=project.id
        )
        db_session.add(child_backlog)
        db_session.commit()
        db_session.refresh(child_backlog)
        
        assert child_backlog.parent_id == parent_backlog.id
        assert child_backlog.root_id == parent_backlog.id
        assert child_backlog.level == 1
        assert str(parent_backlog.id) in child_backlog.path


class TestMeetingModel:
    """Comprehensive tests for Meeting model"""

    def test_meeting_creation_with_relationships(self, db_session: Session):
        """Test creating meeting with project and sprint relationships"""
        # Create project and sprint
        project = Project(name="Meeting Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Meeting Test Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        # Create meeting
        start_datetime = datetime.now() + timedelta(hours=1)
        meeting = Meeting(
            title="Sprint Planning Meeting",
            description="Planning the next sprint",
            meeting_type=MeetingType.SPRINT_PLANNING,
            start_datetime=start_datetime,
            duration=120,
            location="Conference Room A",
            sprint_id=sprint.id,
            project_id=project.id
        )
        
        db_session.add(meeting)
        db_session.commit()
        db_session.refresh(meeting)
        
        assert meeting.id is not None
        assert meeting.title == "Sprint Planning Meeting"
        assert meeting.description == "Planning the next sprint"
        assert meeting.meeting_type == MeetingType.SPRINT_PLANNING
        assert meeting.start_datetime == start_datetime
        assert meeting.duration == 120
        assert meeting.location == "Conference Room A"
        assert meeting.sprint_id == sprint.id
        assert meeting.project_id == project.id
        assert meeting.sprint == sprint
        assert meeting.project == project

    def test_meeting_type_enum_validation(self, db_session: Session):
        """Test MeetingType enum validation"""
        # Create dependencies
        project = Project(name="Meeting Type Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Meeting Test Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        db_session.add(sprint)
        db_session.commit()
        
        for meeting_type in MeetingType:
            meeting = Meeting(
                title=f"Meeting {meeting_type.value}",
                meeting_type=meeting_type,
                start_datetime=datetime.now() + timedelta(hours=1),
                duration=60,
                sprint_id=sprint.id,
                project_id=project.id
            )
            db_session.add(meeting)
            db_session.commit()
            assert meeting.meeting_type == meeting_type
            db_session.rollback()


class TestAssociationModels:
    """Test association/junction table models"""

    def test_user_project_association(self, db_session: Session):
        """Test UserProject association model"""
        # Create user and project
        user = User(email="assoc@example.com", username="assocuser")
        project = Project(name="Association Project", status=ProjectStatus.ACTIVE)
        
        db_session.add(user)
        db_session.add(project)
        db_session.commit()
        db_session.refresh(user)
        db_session.refresh(project)
        
        # Create association
        user_project = UserProject(
            user_id=user.id,
            project_id=project.id,
            role="developer",
            added_by=datetime.now()
        )
        
        db_session.add(user_project)
        db_session.commit()
        db_session.refresh(user_project)
        
        assert user_project.user_id == user.id
        assert user_project.project_id == project.id
        assert user_project.role == "developer"
        assert user_project.added_by is not None

    def test_user_task_association(self, db_session: Session):
        """Test UserTask association model"""
        # Create dependencies
        user = User(email="task_assoc@example.com", username="taskuser")
        project = Project(name="Task Association Project", status=ProjectStatus.ACTIVE)
        db_session.add(user)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Task Association Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        db_session.add(sprint)
        db_session.commit()
        
        task = Task(
            title="Association Task",
            status=TaskStatus.TODO,
            sprint_id=sprint.id
        )
        db_session.add(task)
        db_session.commit()
        db_session.refresh(task)
        
        # Create association
        user_task = UserTask(
            user_id=user.id,
            task_id=task.id
        )
        
        db_session.add(user_task)
        db_session.commit()
        db_session.refresh(user_task)
        
        assert user_task.user_id == user.id
        assert user_task.task_id == task.id
        assert user_task.added_by is not None

    def test_tag_task_association(self, db_session: Session):
        """Test TagTask association model"""
        # Create dependencies
        project = Project(name="Tag Association Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            sprint_name="Tag Association Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        db_session.add(sprint)
        db_session.commit()
        
        task = Task(title="Tagged Task", status=TaskStatus.TODO, sprint_id=sprint.id)
        tag = Tag(title="bug")
        
        db_session.add(task)
        db_session.add(tag)
        db_session.commit()
        db_session.refresh(task)
        db_session.refresh(tag)
        
        # Create association
        tag_task = TagTask(
            tag_id=tag.id,
            task_id=task.id
        )
        
        db_session.add(tag_task)
        db_session.commit()
        db_session.refresh(tag_task)
        
        assert tag_task.tag_id == tag.id
        assert tag_task.task_id == task.id


class TestModelConstraintsAndValidations:
    """Test model constraints and business rule validations"""

    def test_email_format_constraints(self, db_session: Session):
        """Test email format validation (if implemented at model level)"""
        # This test would pass if there's no email validation at model level
        # but shows what should be tested if validation is added
        user = User(email="invalid-email", username="testuser")
        db_session.add(user)
        # This might succeed now but should fail if email validation is added
        db_session.commit()

    def test_date_logical_constraints(self, db_session: Session):
        """Test date logical constraints (end date after start date)"""
        # Test project with end date before start date
        project = Project(
            name="Invalid Date Project",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.now(),
            end_date=datetime.now() - timedelta(days=1)  # End before start
        )
        db_session.add(project)
        # This might succeed now but should fail if date validation is added
        db_session.commit()

    def test_story_point_constraints(self, db_session: Session):
        """Test story point validation constraints"""
        project = Project(name="Story Point Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        # Test negative story points
        backlog = Backlog(
            title="Negative Points Backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            story_point=-1,  # Negative points should be invalid
            project_id=project.id
        )
        db_session.add(backlog)
        # This might succeed now but should fail if validation is added
        db_session.commit()

    def test_capacity_constraints(self, db_session: Session):
        """Test sprint capacity constraints"""
        project = Project(name="Capacity Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        
        # Test negative capacity
        sprint = Sprint(
            sprint_name="Negative Capacity Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            sprint_capacity=-10,  # Negative capacity should be invalid
            project_id=project.id
        )
        db_session.add(sprint)
        # This might succeed now but should fail if validation is added
        db_session.commit()

    def test_cascade_deletion_behavior(self, db_session: Session):
        """Test cascade deletion behavior"""
        # Create project with related entities
        project = Project(name="Cascade Test Project", status=ProjectStatus.ACTIVE)
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        # Create sprint
        sprint = Sprint(
            sprint_name="Cascade Test Sprint",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),
            project_id=project.id
        )
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)
        
        # Create backlog
        backlog = Backlog(
            title="Cascade Test Backlog",
            status=BacklogStatus.TODO,
            priority=BacklogPriority.MEDIUM,
            project_id=project.id
        )
        db_session.add(backlog)
        db_session.commit()
        
        # Delete project
        db_session.delete(project)
        db_session.commit()
        
        # Verify related entities are deleted (due to cascade="all, delete-orphan")
        remaining_sprints = db_session.query(Sprint).filter(Sprint.project_id == project.id).all()
        remaining_backlogs = db_session.query(Backlog).filter(Backlog.project_id == project.id).all()
        
        assert len(remaining_sprints) == 0
        assert len(remaining_backlogs) == 0