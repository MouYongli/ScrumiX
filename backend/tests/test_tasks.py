"""
Task management API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock

from scrumix.api.models.task import TaskStatus
from scrumix.api.models.sprint import Sprint
from scrumix.api.models.project import Project
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
        response = client.get("/api/v1/tasks/?status=to-do", headers=auth_headers)
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
            "status": "todo",
            "sprint_id": test_sprint.sprint_id
        }
        
        response = client.post("/api/v1/tasks/", json=task_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == task_data["title"]
        assert data["description"] == task_data["description"]
        assert data["status"] == task_data["status"]
        assert "task_id" in data

    def test_create_task_invalid_data(self, client, auth_headers):
        """Test task creation with invalid data"""
        task_data = {
            "title": "",  # Empty title
            "description": "A test task",
            "status": "to-do"
            # Missing sprint_id
        }
        
        response = client.post("/api/v1/tasks/", json=task_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_task_unauthorized(self, client):
        """Test task creation without authentication"""
        task_data = {
            "title": "Test Task",
            "description": "A test task",
            "status": "to-do"
        }
        
        response = client.post("/api/v1/tasks/", json=task_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_task_by_id_success(self, client, auth_headers, db_session, test_sprint):
        """Test getting task by ID"""
        from scrumix.api.models.task import Task
        
        # Create a task first
        task = Task(
            title="Test Task for Get",
            description="A test task for getting",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        db_session.add(task)
        db_session.commit()
        
        response = client.get(f"/api/v1/tasks/{task.task_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == task.task_id
        assert data["title"] == task.title
        assert data["description"] == task.description

    def test_get_task_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent task"""
        response = client.get("/api/v1/tasks/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_task_by_id_unauthorized(self, client):
        """Test getting task without authentication"""
        response = client.get("/api/v1/tasks/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_task_success(self, client, auth_headers, db_session, test_sprint):
        """Test successful task update"""
        from scrumix.api.models.task import Task
        
        # Create a task first
        task = Task(
            title="Test Task for Update",
            description="A test task for updating",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        db_session.add(task)
        db_session.commit()
        
        update_data = {
            "title": "Updated Task Title",
            "description": "Updated description",
            "status": "in-progress"
        }
        
        response = client.put(f"/api/v1/tasks/{task.task_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["status"] == update_data["status"]

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

    def test_delete_task_success(self, client, auth_headers, db_session, test_sprint):
        """Test successful task deletion"""
        from scrumix.api.models.task import Task
        
        # Create a task to delete
        task = Task(
            title="Test Task for Deletion",
            description="A test task for deletion",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        db_session.add(task)
        db_session.commit()
        
        response = client.delete(f"/api/v1/tasks/{task.task_id}", headers=auth_headers)
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
        from scrumix.api.schemas.task import TaskCreate
        
        task_data = TaskCreate(
            title="Test Task",
            description="A test task",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        
        created_task = task.create(db=db_session, obj_in=task_data)
        assert created_task.title == task_data.title
        assert created_task.description == task_data.description
        assert created_task.status == task_data.status
        assert created_task.priority == task_data.priority

    def test_get_task_by_id(self, db_session, test_sprint):
        """Test getting task by ID"""
        from scrumix.api.crud.task import task
        from scrumix.api.schemas.task import TaskCreate
        
        # Create a task first
        task_data = TaskCreate(
            title="Test Task for Get",
            description="A test task for getting",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        
        created_task = task.create(db=db_session, obj_in=task_data)
        
        # Get the task
        retrieved_task = task.get(db=db_session, id=created_task.task_id)
        assert retrieved_task is not None
        assert retrieved_task.title == task_data.title

    def test_get_tasks_with_pagination(self, db_session, test_sprint):
        """Test getting tasks with pagination"""
        from scrumix.api.crud.task import task
        from scrumix.api.schemas.task import TaskCreate
        
        # Create some tasks
        for i in range(5):
            task_data = TaskCreate(
                title=f"Test Task {i}",
                description=f"A test task {i}",
                status=TaskStatus.todo,
                priority="medium",
                sprint_id=test_sprint.sprint_id
            )
            task.create(db=db_session, obj_in=task_data)
            
        # Get tasks with pagination
        tasks = task.get_multi(db=db_session, skip=0, limit=3)
        assert len(tasks) == 3
        
        tasks = task.get_multi(db=db_session, skip=3, limit=3)
        assert len(tasks) == 2

    def test_get_tasks_with_status_filter(self, db_session, test_sprint):
        """Test getting tasks with status filter"""
        from scrumix.api.crud.task import task
        from scrumix.api.schemas.task import TaskCreate
        
        # Create some tasks with different statuses
        task_data_todo = TaskCreate(
            title="To-Do Task",
            description="A to-do task",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        task.create(db=db_session, obj_in=task_data_todo)
        
        task_data_in_progress = TaskCreate(
            title="In Progress Task",
            description="An in-progress task",
            status=TaskStatus.in_progress,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        task.create(db=db_session, obj_in=task_data_in_progress)

        # Get to-do tasks
        todo_tasks = task.get_multi(db=db_session, skip=0, limit=100)
        todo_tasks = [t for t in todo_tasks if t.status == TaskStatus.todo]
        assert len(todo_tasks) >= 1
        
        # Get in-progress tasks
        in_progress_tasks = task.get_multi(db=db_session, skip=0, limit=100)
        in_progress_tasks = [t for t in in_progress_tasks if t.status == TaskStatus.in_progress]
        assert len(in_progress_tasks) >= 1

    def test_search_tasks(self, db_session, test_sprint):
        """Test searching tasks"""
        from scrumix.api.crud.task import task
        from scrumix.api.schemas.task import TaskCreate
        
        # Create some tasks to search
        task_data_1 = TaskCreate(
            title="Searchable Task One",
            description="A task with searchable content",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        task.create(db=db_session, obj_in=task_data_1)
        
        task_data_2 = TaskCreate(
            title="Another Task",
            description="Another searchable task",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        task.create(db=db_session, obj_in=task_data_2)
        
        # Search for tasks
        all_tasks = task.get_multi(db=db_session, skip=0, limit=100)
        auth_tasks = [t for t in all_tasks if "Authentication" in t.title]
        assert len(auth_tasks) == 1
        assert "Authentication" in auth_tasks[0].title
        
        # Search for "Database"
        db_tasks = [t for t in all_tasks if "Database" in t.title]
        assert len(db_tasks) == 1
        assert "Database" in db_tasks[0].title

    def test_update_task(self, db_session, test_sprint):
        """Test updating task"""
        from scrumix.api.crud.task import task
        from scrumix.api.schemas.task import TaskCreate, TaskUpdate
        
        # Create a task first
        task_data = TaskCreate(
            title="Task to Update",
            description="A task to be updated",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        
        created_task = task.create(db=db_session, obj_in=task_data)
        
        # Update the task
        update_data = TaskUpdate(
            title="Updated Task Title",
            description="Updated description",
            status=TaskStatus.in_progress,
            priority="high"
        )
        
        updated_task = task.update(db=db_session, db_obj=created_task, obj_in=update_data)
        assert updated_task.title == update_data.title
        assert updated_task.description == update_data.description
        assert updated_task.status == update_data.status
        assert updated_task.priority == update_data.priority

    def test_delete_task(self, db_session, test_sprint):
        """Test deleting task"""
        from scrumix.api.crud.task import task
        from scrumix.api.schemas.task import TaskCreate
        
        # Create a task to delete
        task_data = TaskCreate(
            title="Task to Delete",
            description="A task to be deleted",
            status=TaskStatus.todo,
            priority="medium",
            sprint_id=test_sprint.sprint_id
        )
        
        created_task = task.create(db=db_session, obj_in=task_data)
        
        # Delete the task
        deleted_task = task.remove(db=db_session, id=created_task.task_id)
        assert deleted_task
        
        # Verify it's deleted
        retrieved_task = task.get(db=db_session, id=created_task.task_id)
        assert retrieved_task is None

    def test_get_multi_with_pagination(self, db_session, test_sprint):
        """Test getting multiple tasks with pagination"""
        from scrumix.api.crud.task import task
        from scrumix.api.schemas.task import TaskCreate
        
        # Create some tasks
        for i in range(5):
            task_data = TaskCreate(
                title=f"Task {i}",
                description=f"A task {i}",
                status=TaskStatus.todo,
                priority="medium",
                sprint_id=test_sprint.sprint_id
            )
            task.create(db=db_session, obj_in=task_data)
            
        # Get tasks with pagination
        tasks = task.get_multi(db=db_session, skip=1, limit=2)
        assert len(tasks) == 2
        assert tasks[0].title == "Task 1"
        assert tasks[1].title == "Task 2" 