"""
Task management API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock

from scrumix.api.models.task import TaskStatus, TaskPriority
from scrumix.api.models.sprint import Sprint
from scrumix.api.models.project import Project
from scrumix.api.schemas.task import TaskCreate, TaskUpdate
from datetime import datetime, timedelta


@pytest.fixture
def test_project(db_session):
    """Create a test project."""
    project = Project(
        name="Test Project for Tasks",
        description="A test project",
        status="active",
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30)
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project

@pytest.fixture
def test_sprint(db_session, test_project):
    """Create a test sprint."""
    sprint = Sprint(
        sprint_name="Test Sprint for Tasks",
        sprint_goal="A test sprint",
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=14),
        project_id=test_project.id
    )
    db_session.add(sprint)
    db_session.commit()
    db_session.refresh(sprint)
    return sprint

class TestTaskEndpoints:
    """Test task management endpoints"""

    def test_get_tasks_success(self, client, auth_headers):
        """Test getting tasks list"""
        response = client.get("/api/v1/tasks/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "tasks" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_get_tasks_unauthorized(self, client):
        """Test getting tasks without authentication"""
        response = client.get("/api/v1/tasks/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_tasks_with_pagination(self, client, auth_headers):
        """Test getting tasks with pagination"""
        response = client.get("/api/v1/tasks/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "tasks" in data

    def test_get_tasks_with_status_filter(self, client, auth_headers):
        """Test getting tasks with status filter"""
        response = client.get("/api/v1/tasks/?status=todo", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "tasks" in data

    def test_get_tasks_with_search(self, client, auth_headers):
        """Test getting tasks with search"""
        response = client.get("/api/v1/tasks/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "tasks" in data

    def test_create_task_success(self, client, auth_headers, test_sprint):
        """Test successful task creation"""
        task_data = {
            "title": "Test Task",
            "description": "A test task",
            "status": TaskStatus.TODO,
            "sprint_id": test_sprint.id,
            "priority": TaskPriority.MEDIUM,
            "story_points": 5
        }
        
        response = client.post("/api/v1/tasks/", json=task_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == task_data["title"]
        assert data["description"] == task_data["description"]
        assert data["status"] == task_data["status"]
        assert data["sprint_id"] == task_data["sprint_id"]
        assert "id" in data

    def test_create_task_invalid_data(self, client, auth_headers):
        """Test task creation with invalid data"""
        task_data = {
            "title": "",  # Empty title
            "description": "A test task",
            "status": TaskStatus.TODO,
            # Missing sprint_id
            "priority": TaskPriority.MEDIUM,
            "story_points": 5
        }
        
        response = client.post("/api/v1/tasks/", json=task_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_task_unauthorized(self, client):
        """Test task creation without authentication"""
        task_data = {
            "title": "Test Task",
            "description": "A test task",
            "status": TaskStatus.TODO,
            "sprint_id": 1, # Assuming a valid sprint_id for unauthorized test
            "priority": TaskPriority.MEDIUM,
            "story_points": 5
        }
        
        response = client.post("/api/v1/tasks/", json=task_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_task_by_id_success(self, client, auth_headers, test_task):
        """Test getting task by ID"""
        response = client.get(f"/api/v1/tasks/{test_task.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == test_task.title
        assert data["description"] == test_task.description
        assert data["status"] == test_task.status
        assert data["id"] == test_task.id

    def test_get_task_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent task"""
        response = client.get("/api/v1/tasks/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_task_by_id_unauthorized(self, client):
        """Test getting task without authentication"""
        response = client.get("/api/v1/tasks/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_task_success(self, client, auth_headers, test_task):
        """Test successful task update"""
        update_data = {
            "title": "Updated Task Title",
            "description": "Updated description"
        }
        
        response = client.put(f"/api/v1/tasks/{test_task.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["id"] == test_task.id

    def test_update_task_not_found(self, client, auth_headers):
        """Test updating non-existent task"""
        update_data = {
            "title": "Updated Task Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/tasks/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_task_unauthorized(self, client):
        """Test updating task without authentication"""
        update_data = {
            "title": "Updated Task Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/tasks/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_task_success(self, client, auth_headers, test_task):
        """Test successful task deletion"""
        response = client.delete(f"/api/v1/tasks/{test_task.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Task deleted successfully"

    def test_delete_task_not_found(self, client, auth_headers):
        """Test deleting non-existent task"""
        response = client.delete("/api/v1/tasks/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_task_unauthorized(self, client):
        """Test deleting task without authentication"""
        response = client.delete("/api/v1/tasks/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestTaskCRUD:
    """Test task CRUD operations"""

    def test_create_task_success(self, db_session, test_sprint):
        """Test successful task creation"""
        from scrumix.api.crud.task import task
        
        task_data = TaskCreate(
            title="Test Task",
            description="A test task",
            status=TaskStatus.TODO,
            sprint_id=test_sprint.id,
            priority=TaskPriority.MEDIUM,
            story_points=5
        )
        
        task_obj = task.create(db_session, obj_in=task_data)
        assert task_obj.title == task_data.title
        assert task_obj.description == task_data.description
        assert task_obj.status == task_data.status
        assert task_obj.sprint_id == task_data.sprint_id

    def test_get_task_by_id(self, db_session, test_sprint):
        """Test getting task by ID"""
        from scrumix.api.crud.task import task
        
        task_data = TaskCreate(
            title="Test Task",
            description="A test task",
            status=TaskStatus.TODO,
            sprint_id=test_sprint.id,
            priority=TaskPriority.MEDIUM,
            story_points=5
        )
        
        created_task = task.create(db_session, obj_in=task_data)
        retrieved_task = task.get_by_id(db_session, task_id=created_task.id)
        assert retrieved_task is not None
        assert retrieved_task.title == task_data.title
        assert retrieved_task.description == task_data.description

    def test_get_tasks_with_pagination(self, db_session, test_sprint):
        """Test getting tasks with pagination"""
        from scrumix.api.crud.task import task
        
        task_data = TaskCreate(
            title="Test Task",
            description="A test task",
            status=TaskStatus.TODO,
            sprint_id=test_sprint.id,
            priority=TaskPriority.MEDIUM,
            story_points=5
        )
        
        task.create(db_session, obj_in=task_data)
        tasks = task.get_multi(db_session, skip=0, limit=10)
        assert isinstance(tasks, list)

    def test_get_tasks_with_status_filter(self, db_session, test_sprint):
        """Test getting tasks with status filter"""
        from scrumix.api.crud.task import task
        
        task_data = TaskCreate(
            title="Test Task",
            description="A test task",
            status=TaskStatus.TODO,
            sprint_id=test_sprint.id,
            priority=TaskPriority.MEDIUM,
            story_points=5
        )
        
        task.create(db_session, obj_in=task_data)
        tasks = task.get_by_status(db_session, status=TaskStatus.TODO)
        assert isinstance(tasks, list)
        assert len(tasks) == 1
        assert tasks[0].status == TaskStatus.TODO

    def test_search_tasks(self, db_session, test_sprint):
        """Test searching tasks"""
        from scrumix.api.crud.task import task
        
        task_data = TaskCreate(
            title="Test Task",
            description="A test task",
            status=TaskStatus.TODO,
            sprint_id=test_sprint.id,
            priority=TaskPriority.MEDIUM,
            story_points=5
        )
        
        task.create(db_session, obj_in=task_data)
        tasks = task.search(db_session, search_term="test", skip=0, limit=10)
        assert isinstance(tasks, list)

    def test_update_task(self, db_session, test_sprint):
        """Test updating task"""
        from scrumix.api.crud.task import task
        
        task_data = TaskCreate(
            title="Test Task",
            description="A test task",
            status=TaskStatus.TODO,
            sprint_id=test_sprint.id,
            priority=TaskPriority.MEDIUM,
            story_points=5
        )
        
        created_task = task.create(db_session, obj_in=task_data)
        
        update_data = TaskUpdate(
            title="Updated Task Title",
            description="Updated description"
        )
        
        updated_task = task.update(db_session, db_obj=created_task, obj_in=update_data)
        assert updated_task.title == update_data.title
        assert updated_task.description == update_data.description

    def test_delete_task(self, db_session, test_sprint):
        """Test deleting task"""
        from scrumix.api.crud.task import task
        
        task_data = TaskCreate(
            title="Test Task",
            description="A test task",
            status=TaskStatus.TODO,
            sprint_id=test_sprint.id,
            priority=TaskPriority.MEDIUM,
            story_points=5
        )
        
        created_task = task.create(db_session, obj_in=task_data)
        task_id = created_task.id
        
        task.remove(db_session, id=task_id)
        
        # Verify task is deleted
        retrieved_task = task.get_by_id(db_session, task_id=task_id)
        assert retrieved_task is None 