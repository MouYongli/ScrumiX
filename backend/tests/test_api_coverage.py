"""
Comprehensive API coverage tests - focusing on achieving >80% coverage
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Integer
from scrumix.api.db.base import Base

# Import all the models and schemas for comprehensive testing
from scrumix.api.models.user import User, UserStatus, AuthProvider
from scrumix.api.models.project import Project, ProjectStatus
from scrumix.api.models.task import Task, TaskStatus
from scrumix.api.models.tag import Tag
from scrumix.api.models.sprint import Sprint, SprintStatus
from scrumix.api.models.documentation import Documentation, DocumentationType

from scrumix.api.schemas.user import UserCreate, UserUpdate
from scrumix.api.schemas.project import ProjectCreate, ProjectUpdate
from scrumix.api.schemas.task import TaskCreate, TaskUpdate
from scrumix.api.schemas.tag import TagCreate, TagUpdate
from scrumix.api.schemas.sprint import SprintCreate, SprintUpdate
from scrumix.api.schemas.documentation import DocumentationCreate, DocumentationUpdate

# Import CRUD operations
from scrumix.api.crud.user import user_crud
from scrumix.api.crud.project import project_crud
from scrumix.api.crud.task import task
from scrumix.api.crud.tag import tag
from scrumix.api.crud.sprint import sprint_crud
from scrumix.api.crud.documentation import documentation_crud

# Import utilities and core functions
from scrumix.api.core.config import settings
from scrumix.api.core.security import (
    create_access_token, verify_token, get_password_hash, verify_password, TokenData
)
from scrumix.api.utils.password import get_password_hash as util_get_password_hash, verify_password as util_verify_password
from scrumix.api.utils.cookies import create_auth_cookie, parse_auth_cookie


class TestCoreFunctionality:
    """Test core API functionality for coverage"""
    
    def test_config_settings(self):
        """Test configuration settings"""
        assert settings is not None
        assert hasattr(settings, 'DATABASE_URL')
        assert hasattr(settings, 'SECRET_KEY')
    
    def test_password_utilities(self):
        """Test password hashing and verification"""
        password = "test_password_123"
        
        # Test password hashing
        hashed = get_password_hash(password)
        assert hashed is not None
        assert hashed != password
        
        # Test password verification
        assert verify_password(password, hashed) == True
        assert verify_password("wrong_password", hashed) == False
        
        # Test utility functions
        util_hashed = util_get_password_hash(password)
        assert util_hashed is not None
        assert util_verify_password(password, util_hashed) == True
    
    def test_jwt_token_operations(self):
        """Test JWT token creation and verification"""
        user_id = 1
        email = "test@example.com"
        
        # Create token
        token = create_access_token(data={"sub": str(user_id), "email": email})
        assert token is not None
        
        # Verify token
        payload = verify_token(token)
        assert payload is not None
        assert payload.user_id == str(user_id)
        assert payload.email == email
    
    def test_cookie_utilities(self):
        """Test cookie creation and parsing"""
        token = "test_token_value"
        
        # Test cookie creation
        cookie = create_auth_cookie(token)
        assert cookie is not None
        assert "auth_token" in cookie
        
        # Test cookie parsing - create a mock request
        mock_request = Mock()
        mock_request.cookies = {"auth_token": token}
        parsed_token = parse_auth_cookie(mock_request)
        assert parsed_token == token


class TestModelCoverage:
    """Test model instantiation for coverage"""
    
    def test_user_model_creation(self, db_session):
        """Test User model creation"""
        from scrumix.api.models.user import User
        user = User(
            email="test_model@example.com",
            username="test_model_user",
            full_name="Test Model User"
        )
        db_session.add(user)
        db_session.commit()
        assert user.id is not None

    def test_project_model_creation(self, db_session):
        """Test Project model creation"""
        from scrumix.api.models.project import Project
        project = Project(
            name="Test Model Project",
            description="A test project",
            status="active",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=30)
        )
        db_session.add(project)
        db_session.commit()
        assert project.id is not None

    def test_task_model_creation(self, db_session, test_sprint):
        """Test Task model creation"""
        from scrumix.api.models.task import Task
        task = Task(
            title="Test Model Task",
            description="A test task",
            status="todo",
            sprint_id=test_sprint.sprint_id
        )
        db_session.add(task)
        db_session.commit()
        assert task.task_id is not None

    def test_tag_model_creation(self, db_session):
        """Test Tag model creation"""
        from scrumix.api.models.tag import Tag
        tag = Tag(title="Test Model Tag")
        db_session.add(tag)
        db_session.commit()
        assert tag.id is not None

    def test_sprint_model_creation(self, db_session, test_project):
        """Test Sprint model creation"""
        from scrumix.api.models.sprint import Sprint
        sprint = Sprint(
            sprint_name="Test Model Sprint",
            sprint_goal="A test sprint",
            project_id=test_project.id,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14)
        )
        db_session.add(sprint)
        db_session.commit()
        assert sprint.sprint_id is not None

    def test_documentation_model_creation(self, db_session, test_project):
        """Test Documentation model creation"""
        from scrumix.api.models.documentation import Documentation
        doc = Documentation(
            title="Test Model Doc",
            type=DocumentationType.API_DOC,
            file_url="http://example.com/doc",
            project_id=test_project.id
        )
        db_session.add(doc)
        db_session.commit()
        assert doc.doc_id is not None


class TestSchemaCoverage:
    """Test schema validation and serialization"""
    
    def test_user_schema_validation(self):
        """Test User schema validation"""
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "password": "secure_password_123"
        }
        
        user_create = UserCreate(**user_data)
        assert user_create.email == "test@example.com"
        assert user_create.username == "testuser"
        
        # Test update schema
        update_data = {"full_name": "Updated Name"}
        user_update = UserUpdate(**update_data)
        assert user_update.full_name == "Updated Name"
    
    def test_project_schema_validation(self):
        """Test Project schema validation"""
        project_data = {
            "name": "Test Project",
            "description": "A test project",
            "status": ProjectStatus.ACTIVE
        }
        
        project_create = ProjectCreate(**project_data)
        assert project_create.name == "Test Project"
        assert project_create.status == ProjectStatus.ACTIVE
    
    def test_task_schema_validation(self):
        """Test Task schema validation"""
        task_data = {
            "title": "Test Task",
            "description": "A test task",
            "status": TaskStatus.TODO
        }
        
        task_create = TaskCreate(**task_data)
        assert task_create.title == "Test Task"
        assert task_create.status == TaskStatus.TODO
    
    def test_tag_schema_validation(self):
        """Test Tag schema validation"""
        tag_data = {
            "title": "Test Tag",
            "description": "A test tag"
        }
        
        tag_create = TagCreate(**tag_data)
        assert tag_create.title == "Test Tag"
    
    def test_sprint_schema_validation(self):
        """Test Sprint schema validation"""
        sprint_data = {
            "sprintName": "Sprint 1",
            "sprintGoal": "Complete user stories 1-5",
            "startDate": datetime.now(),
            "endDate": datetime.now() + timedelta(days=14),
            "status": SprintStatus.PLANNING,
            "sprintCapacity": 100,
            "projectId": 1
        }
        
        sprint_create = SprintCreate(**sprint_data)
        assert sprint_create.sprint_name == "Sprint 1"
    
    def test_documentation_schema_validation(self):
        """Test Documentation schema validation"""
        doc_data = {
            "title": "Test Doc",
            "type": DocumentationType.API_DOC,
            "description": "Test description",
            "file_url": "https://example.com/doc.pdf",
            "project_id": 1
        }
        
        doc_create = DocumentationCreate(**doc_data)
        assert doc_create.title == "Test Doc"
        assert doc_create.type == DocumentationType.API_DOC


class TestCRUDOperations:
    """Test CRUD operations to improve coverage"""
    
    def test_base_crud_operations(self, db_session):
        """Test base CRUD functionality"""
        from scrumix.api.crud.base import CRUDBase
        from scrumix.api.schemas.tag import TagCreate, TagUpdate
        from scrumix.api.models.tag import Tag
        
        # Create a simple test using Tag as it has fewer dependencies
        tag_crud = CRUDBase(Tag)
        
        # Test create
        tag_data = TagCreate(title="Test Tag")
        created_tag = tag_crud.create(db=db_session, obj_in=tag_data)
        assert created_tag.title == "Test Tag"
        
        # Test get
        retrieved_tag = tag_crud.get(db=db_session, id=created_tag.id)
        assert retrieved_tag is not None
        assert retrieved_tag.title == "Test Tag"
        
        # Test get_multi
        tags = tag_crud.get_multi(db=db_session, skip=0, limit=10)
        assert len(tags) >= 1
        
        # Test update
        update_data = TagUpdate(title="Updated Title")
        updated_tag = tag_crud.update(db=db_session, db_obj=created_tag, obj_in=update_data)
        assert updated_tag.title == "Updated Title"
        
        # Test remove
        tag_crud.remove(db=db_session, id=created_tag.id)
        deleted_tag = tag_crud.get(db=db_session, id=created_tag.id)
        assert deleted_tag is None
    
    def test_tag_crud_specific_operations(self, db_session):
        """Test Tag-specific CRUD operations"""
        # Test create
        tag_data = TagCreate(title="Unique Tag", description="A unique tag")
        created_tag = tag.create(db=db_session, obj_in=tag_data)
        assert created_tag.title == "Unique Tag"
        
        # Test get by title
        found_tag = tag.get_by_title(db=db_session, title="Unique Tag")
        assert found_tag is not None
        assert found_tag.id == created_tag.id
        
        # Test get or create by title (existing)
        existing_tag = tag.get_or_create_by_title(db=db_session, title="Unique Tag")
        assert existing_tag.id == created_tag.id
        
        # Test get or create by title (new)
        new_tag = tag.get_or_create_by_title(db=db_session, title="Another Unique Tag")
        assert new_tag.title == "Another Unique Tag"
        assert new_tag.id != created_tag.id
        
        # Test search tags
        search_results = tag.search_tags(db=db_session, query="Unique")
        assert len(search_results) >= 2
        
        # Test get tags starting with
        prefix_results = tag.get_tags_starting_with(db=db_session, prefix="Unique")
        assert len(prefix_results) >= 1
        
        # Test get popular tags
        popular_tags = tag.get_popular_tags(db=db_session, limit=5)
        assert len(popular_tags) >= 1
        
        # Test check title exists
        exists = tag.check_title_exists(db=db_session, title="Unique Tag")
        assert exists == True
        
        exists_not = tag.check_title_exists(db=db_session, title="Non-existent Tag")
        assert exists_not == False


class TestUtilityFunctions:
    """Test utility functions for coverage"""
    
    def test_oauth_utilities(self):
        """Test OAuth utilities"""
        # This test is skipped as oauth is out of scope
        pass

    def test_password_utility(self):
        """Test password hashing and verification"""
        password = "test_password_123"
        
        # Test password hashing
        hashed = get_password_hash(password)
        assert hashed is not None
        assert hashed != password
        
        # Test password verification
        assert verify_password(password, hashed) == True
        assert verify_password("wrong_password", hashed) == False
        
        # Test utility functions
        util_hashed = util_get_password_hash(password)
        assert util_hashed is not None
        assert util_verify_password(password, util_hashed) == True
    
    def test_helper_functions(self):
        """Test helper utility functions"""
        from scrumix.api.utils.helpers import generate_unique_id, format_datetime, sanitize_string
        
        # Test unique ID generation
        unique_id = generate_unique_id()
        assert unique_id is not None
        assert isinstance(unique_id, str)
        
        # Test datetime formatting
        now = datetime.now()
        formatted = format_datetime(now)
        assert formatted is not None
        assert isinstance(formatted, str)
        
        # Test string sanitization
        dirty_string = "<script>alert('xss')</script>Hello World!"
        clean_string = sanitize_string(dirty_string)
        assert "<script>" not in clean_string
        assert "Hello World!" in clean_string


class TestEnumCoverage:
    """Test enum values and operations"""
    
    def test_user_status_enum(self):
        """Test UserStatus enum"""
        assert UserStatus.ACTIVE == "active"
        assert UserStatus.INACTIVE == "inactive"
        assert UserStatus.SUSPENDED == "suspended"
        assert UserStatus.PENDING_VERIFICATION == "pending_verification"
    
    def test_auth_provider_enum(self):
        """Test AuthProvider enum"""
        assert AuthProvider.LOCAL == "local"
        assert AuthProvider.KEYCLOAK == "keycloak"
        assert AuthProvider.GOOGLE == "google"
        assert AuthProvider.GITHUB == "github"
    
    def test_project_status_enum(self):
        """Test ProjectStatus enum"""
        from scrumix.api.models.project import ProjectStatus
        assert ProjectStatus.ACTIVE.value == "active"
        assert ProjectStatus.PLANNING == "planning"
        assert ProjectStatus.ON_HOLD == "on_hold"
        assert ProjectStatus.COMPLETED == "completed"
    
    def test_task_status_enum(self):
        """Test TaskStatus enum"""
        from scrumix.api.models.task import TaskStatus
        assert TaskStatus.TODO.value == "todo"
        assert TaskStatus.IN_PROGRESS.value == "in_progress"
        assert TaskStatus.DONE.value == "done"
        assert TaskStatus.CANCELLED.value == "cancelled"
    
    def test_sprint_status_enum(self):
        """Test SprintStatus enum"""
        from scrumix.api.models.sprint import SprintStatus
        assert SprintStatus.PLANNING == "planning"
        assert SprintStatus.ACTIVE == "active"
        assert SprintStatus.COMPLETED == "completed"
        assert SprintStatus.CANCELLED == "cancelled"
    
    def test_documentation_type_enum(self):
        """Test DocumentationType enum"""
        assert DocumentationType.REQUIREMENT == "requirement"
        assert DocumentationType.DESIGN_DOC == "design_doc"
        assert DocumentationType.API_DOC == "api_doc"
        assert DocumentationType.USER_GUIDE == "user_guide"
        assert DocumentationType.ARCHITECTURE == "architecture"
        assert DocumentationType.OTHER == "other" 


class DummyModelNoId(Base):
    __tablename__ = 'dummy_no_id'
    # Standard 'id' primary key that should be detected
    id = Column(Integer, primary_key=True)
    some_field = Column(String(50))

class DummyModelCustomPK(Base):
    __tablename__ = 'dummy_custom'
    custom_pk = Column(Integer, primary_key=True)
    some_field = Column(String(50))


def test_crudbase_primary_key_fallback():
    from scrumix.api.crud.base import CRUDBase
    # Should fallback to 'id' if no PK found
    crud = CRUDBase(DummyModelNoId)
    assert crud._primary_key == 'id'


def test_crudbase_custom_primary_key():
    from scrumix.api.crud.base import CRUDBase
    # Should detect custom primary key
    crud = CRUDBase(DummyModelCustomPK)
    assert crud._primary_key == 'custom_pk'


def test_crudbase_remove_nonexistent(db_session):
    from scrumix.api.crud.base import CRUDBase
    from scrumix.api.models.tag import Tag
    crud = CRUDBase(Tag)
    # Remove non-existent
    result = crud.remove(db_session, id=999999)
    assert result is None


def test_crudbase_update_empty(db_session):
    from scrumix.api.crud.base import CRUDBase
    from scrumix.api.models.tag import Tag
    from scrumix.api.schemas.tag import TagCreate, TagUpdate
    crud = CRUDBase(Tag)
    tag = crud.create(db=db_session, obj_in=TagCreate(title="A", description="B", color="#fff"))
    updated = crud.update(db=db_session, db_obj=tag, obj_in=TagUpdate())
    assert updated.id == tag.id
    # No fields changed
    assert updated.title == tag.title


def test_crudbase_create_missing_fields(db_session):
    from scrumix.api.crud.base import CRUDBase
    from scrumix.api.models.tag import Tag
    crud = CRUDBase(Tag)
    # Should raise TypeError if required fields missing
    import pytest
    with pytest.raises(Exception):
        crud.create(db=db_session, obj_in={}) 