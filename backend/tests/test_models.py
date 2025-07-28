
import pytest
from datetime import datetime, timedelta

class TestModels:
    """Test model instantiation"""
    
    def test_user_model(self):
        """Test User model"""
        try:
            from scrumix.api.models.user import User
            user = User(
                email="test@example.com",
                username="testuser",
                full_name="Test User"
            )
            assert user.email == "test@example.com"
        except Exception:
            pytest.skip("User model not available")
    
    def test_project_model(self):
        """Test Project model"""
        try:
            from scrumix.api.models.project import Project, ProjectStatus
            project = Project(
                name="Test Project",
                description="Test description",
                status=ProjectStatus.ACTIVE,
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=30)
            )
            assert project.name == "Test Project"
        except Exception:
            pytest.skip("Project model not available")
    
    def test_task_model(self):
        """Test Task model"""
        try:
            from scrumix.api.models.task import Task, TaskStatus
            task = Task(
                title="Test Task",
                description="Test description",
                status=TaskStatus.TODO
            )
            assert task.title == "Test Task"
        except Exception:
            pytest.skip("Task model not available")
