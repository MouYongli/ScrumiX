"""
Comprehensive route tests for full CRUD operations
"""
import pytest
from fastapi import status
from scrumix.api.models.backlog import BacklogPriority, BacklogStatus


class TestBacklogRoutesComprehensive:
    """Comprehensive tests for backlog endpoints"""

    def test_get_backlogs_list(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/ - list backlogs"""
        response = client.get("/api/v1/backlogs/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            # Check first item has required fields
            assert "id" in data[0]
            assert "title" in data[0]
            assert "status" in data[0]

    def test_get_backlogs_with_pagination(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/ with pagination parameters"""
        response = client.get("/api/v1/backlogs/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10

    def test_get_backlogs_with_status_filter(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/ with status filter"""
        response = client.get("/api/v1/backlogs/?status=in_progress", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_with_priority_filter(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/ with priority filter"""
        response = client.get("/api/v1/backlogs/?priority=high", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_with_search(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/ with search parameter"""
        response = client.get("/api/v1/backlogs/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_root_only(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/ with root_only filter"""
        response = client.get("/api/v1/backlogs/?root_only=true", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_single_backlog(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/{id} - get single backlog"""
        backlog_id = test_backlog.backlog_id
        response = client.get(f"/api/v1/backlogs/{backlog_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == backlog_id
        assert data["title"] == test_backlog.title
        assert data["status"] == test_backlog.status.value

    def test_get_single_backlog_not_found(self, client, auth_headers):
        """Test GET /backlogs/{id} with non-existent ID"""
        response = client.get("/api/v1/backlogs/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_backlog(self, client, auth_headers, test_backlog):
        """Test PUT /backlogs/{id} - update backlog"""
        backlog_id = test_backlog.backlog_id
        update_data = {
            "title": "Updated Backlog Title",
            "description": "Updated description",
            "status": BacklogStatus.IN_PROGRESS,
            "priority": BacklogPriority.HIGH,
            "story_point": 5
        }
        
        response = client.put(f"/api/v1/backlogs/{backlog_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["status"] == update_data["status"]
        assert data["priority"] == update_data["priority"]
        assert data["story_point"] == update_data["story_point"]

    def test_update_backlog_partial(self, client, auth_headers, test_backlog):
        """Test PUT /backlogs/{id} with partial data"""
        backlog_id = test_backlog.backlog_id
        update_data = {
            "title": "Partially Updated Title"
        }
        
        response = client.put(f"/api/v1/backlogs/{backlog_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]

    def test_update_backlog_not_found(self, client, auth_headers):
        """Test PUT /backlogs/{id} with non-existent ID"""
        update_data = {"title": "Updated Title"}
        response = client.put("/api/v1/backlogs/99999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_backlog(self, client, auth_headers, test_backlog):
        """Test DELETE /backlogs/{id} - delete backlog"""
        backlog_id = test_backlog.backlog_id
        
        response = client.delete(f"/api/v1/backlogs/{backlog_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_backlog_not_found(self, client, auth_headers):
        """Test DELETE /backlogs/{id} with non-existent ID"""
        response = client.delete("/api/v1/backlogs/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_backlog_children(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/{id}/children - get child backlogs"""
        backlog_id = test_backlog.backlog_id
        response = client.get(f"/api/v1/backlogs/{backlog_id}/children", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_by_status(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/status/{status} - filter by status"""
        response = client.get("/api/v1/backlogs/status/in_progress", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_backlogs_by_priority(self, client, auth_headers, test_backlog):
        """Test GET /backlogs/priority/{priority} - filter by priority"""
        response = client.get("/api/v1/backlogs/priority/high", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)


class TestProjectRoutesComprehensive:
    """Comprehensive tests for project endpoints"""

    def test_get_projects_list(self, client, auth_headers, test_project):
        """Test GET /projects/ - list projects"""
        response = client.get("/api/v1/projects/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_single_project(self, client, auth_headers, test_project):
        """Test GET /projects/{id} - get single project"""
        project_id = test_project.id
        response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == test_project.name

    def test_update_project(self, client, auth_headers, test_project):
        """Test PUT /projects/{id} - update project"""
        project_id = test_project.id
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description"
        }
        
        response = client.put(f"/api/v1/projects/{project_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]

    def test_delete_project(self, client, auth_headers, test_project):
        """Test DELETE /projects/{id} - delete project"""
        project_id = test_project.id
        
        response = client.delete(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK


class TestSprintRoutesComprehensive:
    """Comprehensive tests for sprint endpoints"""

    def test_get_sprints_list(self, client, auth_headers, test_sprint):
        """Test GET /sprints/ - list sprints"""
        response = client.get("/api/v1/sprints/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_single_sprint(self, client, auth_headers, test_sprint):
        """Test getting a single sprint"""
        sprint_id = test_sprint.id
        response = client.get(f"/api/v1/sprints/{sprint_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == sprint_id
        assert data["sprintName"] == test_sprint.sprint_name

    def test_update_sprint(self, client, auth_headers, test_sprint):
        """Test updating a sprint"""
        sprint_id = test_sprint.id
        update_data = {
            "sprintName": "Updated Sprint",
            "sprintGoal": "Updated goal"
        }
        
        response = client.put(f"/api/v1/sprints/{sprint_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["sprintName"] == update_data["sprintName"]
        assert data["sprintGoal"] == update_data["sprintGoal"]

    def test_delete_sprint(self, client, auth_headers, test_sprint):
        """Test deleting a sprint"""
        sprint_id = test_sprint.id
        
        response = client.delete(f"/api/v1/sprints/{sprint_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestTaskRoutesComprehensive:
    """Comprehensive tests for task endpoints"""

    def test_get_tasks_list(self, client, auth_headers, test_task):
        """Test GET /tasks/ - list tasks"""
        response = client.get("/api/v1/tasks/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)
        assert "tasks" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["tasks"], list)

    def test_get_single_task(self, client, auth_headers, test_task):
        """Test GET /tasks/{id} - get single task"""
        task_id = test_task.task_id
        response = client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == task_id
        assert data["title"] == test_task.title

    def test_update_task(self, client, auth_headers, test_task):
        """Test PUT /tasks/{id} - update task"""
        task_id = test_task.task_id
        update_data = {
            "title": "Updated Task Title",
            "description": "Updated description",
            "status": BacklogStatus.IN_PROGRESS
        }
        
        response = client.put(f"/api/v1/tasks/{task_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["status"] == update_data["status"]

    def test_delete_task(self, client, auth_headers, test_task):
        """Test DELETE /tasks/{id} - delete task"""
        task_id = test_task.task_id
        
        response = client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK 