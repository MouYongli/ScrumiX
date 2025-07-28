"""
Tags API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock

from scrumix.api.models.tag import Tag


class TestTagEndpoints:
    """Test tag management endpoints"""

    def test_get_tags_success(self, client, auth_headers):
        """Test getting tags list"""
        response = client.get("/api/v1/tags/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "tags" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["tags"], list)

    def test_get_tags_unauthorized(self, client):
        """Test getting tags without authentication"""
        response = client.get("/api/v1/tags/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_tags_with_pagination(self, client, auth_headers):
        """Test getting tags with pagination"""
        response = client.get("/api/v1/tags/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "tags" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_get_tags_with_search(self, client, auth_headers):
        """Test getting tags with search"""
        response = client.get("/api/v1/tags/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "tags" in data
        assert isinstance(data["tags"], list)

    def test_create_tag_success(self, client, auth_headers):
        """Test successful tag creation"""
        tag_data = {
            "title": "Test Tag",
            "description": "A test tag"
        }
        
        response = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == tag_data["title"]
        assert data["description"] == tag_data["description"]
        assert "id" in data

    def test_create_tag_duplicate_title(self, client, auth_headers, db_session):
        """Test tag creation with duplicate title"""
        # Create first tag
        tag_data = {
            "title": "Duplicate Tag",
            "description": "First tag"
        }
        
        response1 = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert response1.status_code == status.HTTP_201_CREATED
        
        # Try to create second tag with same title
        response2 = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert response2.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response2.json()["detail"]

    def test_create_tag_invalid_data(self, client, auth_headers):
        """Test tag creation with invalid data"""
        tag_data = {
            "title": "",  # Empty title
            "description": "A test tag"
        }
        
        response = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_tag_unauthorized(self, client):
        """Test tag creation without authentication"""
        tag_data = {
            "title": "Test Tag",
            "description": "A test tag"
        }
        
        response = client.post("/api/v1/tags/", json=tag_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_tag_by_id_success(self, client, auth_headers, db_session):
        """Test getting tag by ID"""
        # Create a tag first
        tag_data = {
            "title": "Test Tag for Get",
            "description": "A test tag for getting"
        }
        
        create_response = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        tag_id = create_response.json()["id"]
        
        # Get the tag
        response = client.get(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == tag_id
        assert data["title"] == tag_data["title"]
        assert data["description"] == tag_data["description"]

    def test_get_tag_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent tag"""
        response = client.get("/api/v1/tags/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_tag_by_id_unauthorized(self, client):
        """Test getting tag without authentication"""
        response = client.get("/api/v1/tags/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_tag_success(self, client, auth_headers, db_session):
        """Test successful tag update"""
        # Create a tag first
        tag_data = {
            "title": "Test Tag for Update",
            "description": "A test tag for updating"
        }
        
        create_response = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        tag_id = create_response.json()["id"]
        
        # Update the tag
        update_data = {
            "title": "Updated Tag Title",
            "description": "Updated description"
        }
        
        response = client.put(f"/api/v1/tags/{tag_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]

    def test_update_tag_not_found(self, client, auth_headers):
        """Test updating non-existent tag"""
        update_data = {
            "title": "Updated Tag Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/tags/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_tag_unauthorized(self, client):
        """Test updating tag without authentication"""
        update_data = {
            "title": "Updated Tag Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/tags/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_tag_success(self, client, auth_headers, db_session):
        """Test successful tag deletion"""
        # Create a tag first
        tag_data = {
            "title": "Test Tag for Delete",
            "description": "A test tag for deletion"
        }
        
        create_response = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        tag_id = create_response.json()["id"]
        
        # Delete the tag
        response = client.delete(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Tag deleted successfully"

    def test_delete_tag_not_found(self, client, auth_headers):
        """Test deleting non-existent tag"""
        response = client.delete("/api/v1/tags/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_tag_unauthorized(self, client):
        """Test deleting tag without authentication"""
        response = client.delete("/api/v1/tags/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_tag_by_title_success(self, client, auth_headers, db_session):
        """Test getting tag by title"""
        # Create a tag first
        tag_data = {
            "title": "Test Tag Title",
            "description": "A test tag"
        }
        
        create_response = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        # Get the tag by title
        response = client.get("/api/v1/tags/title/Test Tag Title", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == tag_data["title"]
        assert data["description"] == tag_data["description"]

    def test_get_tag_by_title_not_found(self, client, auth_headers):
        """Test getting tag by non-existent title"""
        response = client.get("/api/v1/tags/title/NonExistentTag", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_or_create_tag_existing(self, client, auth_headers, db_session):
        """Test get or create with existing tag"""
        # Create a tag first
        tag_data = {
            "title": "Existing Tag",
            "description": "An existing tag"
        }
        
        create_response = client.post("/api/v1/tags/", json=tag_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        # Try to get or create the same tag
        response = client.post("/api/v1/tags/get-or-create", json=tag_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == tag_data["title"]

    def test_get_or_create_tag_new(self, client, auth_headers):
        """Test get or create with new tag"""
        tag_data = {
            "title": "New Tag",
            "description": "A new tag"
        }
        
        response = client.post("/api/v1/tags/get-or-create", json=tag_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == tag_data["title"]
        assert data["description"] == tag_data["description"]

    def test_search_tags_success(self, client, auth_headers):
        """Test searching tags"""
        response = client.get("/api/v1/tags/search/test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_tags_with_pagination(self, client, auth_headers):
        """Test searching tags with pagination"""
        response = client.get("/api/v1/tags/search/test?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_autocomplete_tags_success(self, client, auth_headers):
        """Test tag autocomplete"""
        response = client.get("/api/v1/tags/autocomplete/test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_autocomplete_tags_with_limit(self, client, auth_headers):
        """Test tag autocomplete with limit"""
        response = client.get("/api/v1/tags/autocomplete/test?limit=5", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_popular_tags_success(self, client, auth_headers):
        """Test getting popular tags"""
        response = client.get("/api/v1/tags/popular/list", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_popular_tags_with_limit(self, client, auth_headers):
        """Test getting popular tags with limit"""
        response = client.get("/api/v1/tags/popular/list?limit=5", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)


class TestTagCRUD:
    """Test tag CRUD operations"""

    def test_create_tag_success(self, db_session):
        """Test successful tag creation"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        tag_data = TagCreate(
            title="Test Tag",
            description="A test tag"
        )
        
        tag_obj = tag.create(db=db_session, obj_in=tag_data)
        assert tag_obj.title == tag_data.title
        assert tag_obj.description == tag_data.description

    def test_create_tag_duplicate_title(self, db_session):
        """Test tag creation with duplicate title"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        tag_data = TagCreate(
            title="Duplicate Tag",
            description="A test tag"
        )
        
        # Create first tag
        tag.create(db=db_session, obj_in=tag_data)
        
        # Try to create second tag with same title
        with pytest.raises(Exception):  # Should raise an exception
            tag.create(db=db_session, obj_in=tag_data)

    def test_get_tag_by_id(self, db_session):
        """Test getting tag by ID"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        tag_data = TagCreate(
            title="Test Tag",
            description="A test tag"
        )
        
        created_tag = tag.create(db=db_session, obj_in=tag_data)
        
        retrieved_tag = tag.get(db=db_session, id=created_tag.id)
        assert retrieved_tag is not None
        assert retrieved_tag.title == tag_data.title
        assert retrieved_tag.description == tag_data.description

    def test_get_tag_by_title(self, db_session):
        """Test getting tag by title"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        tag_data = TagCreate(
            title="Test Tag Title",
            description="A test tag",
        )
        
        created_tag = tag.create(db=db_session, obj_in=tag_data)
        
        retrieved_tag = tag.get_by_title(db_session, tag_data.title)
        assert retrieved_tag is not None
        assert retrieved_tag.title == tag_data.title
        assert retrieved_tag.id == created_tag.id

    def test_get_tags_with_pagination(self, db_session):
        """Test getting tags with pagination"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        # Create multiple tags
        for i in range(5):
            tag_data = TagCreate(
                title=f"Test Tag {i}",
                description=f"A test tag {i}",
            )
            tag.create(db=db_session, obj_in=tag_data)
        
        tags, total = tag.get_multi_with_pagination(db_session, skip=0, limit=3)
        assert len(tags) == 3
        assert total == 5

    def test_search_tags(self, db_session):
        """Test searching tags"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        # Create tags with different titles
        tag_titles = ["Python Tag", "JavaScript Tag", "React Tag", "Vue Tag"]
        for title in tag_titles:
            tag_data = TagCreate(
                title=title,
                description="A test tag"
            )
            tag.create(db=db_session, obj_in=tag_data)
        
        # Search for tags containing "Tag"
        tags = tag.search_tags(db_session, "Tag", skip=0, limit=10)
        assert len(tags) == 4

    def test_get_tags_starting_with(self, db_session):
        """Test getting tags starting with prefix"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        # Create tags with different prefixes
        tag_titles = ["Python Tag", "JavaScript Tag", "React Tag", "Vue Tag"]
        for title in tag_titles:
            tag_data = TagCreate(
                title=title,
                description="A test tag"
            )
            tag.create(db=db_session, obj_in=tag_data)
        
        # Get tags starting with "P"
        tags = tag.get_tags_starting_with(db_session, "P", limit=10)
        assert len(tags) == 1
        assert tags[0].title == "Python Tag"

    def test_update_tag(self, db_session):
        """Test updating tag"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate, TagUpdate
        
        tag_data = TagCreate(
            title="Test Tag",
            description="A test tag",
        )
        
        created_tag = tag.create(db=db_session, obj_in=tag_data)
        
        update_data = TagUpdate(
            title="Updated Tag",
            description="Updated description",

        )
        
        updated_tag = tag.update(db=db_session, db_obj=created_tag, obj_in=update_data)
        assert updated_tag.title == update_data.title
        assert updated_tag.description == update_data.description

    def test_delete_tag(self, db_session):
        """Test deleting tag"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        tag_data = TagCreate(
            title="Test Tag",
            description="A test tag",
        )
        
        created_tag = tag.create(db=db_session, obj_in=tag_data)
        tag_id = created_tag.id
        
        tag.remove(db=db_session, id=tag_id)
        
        # Verify tag is deleted
        retrieved_tag = tag.get(db=db_session, id=tag_id)
        assert retrieved_tag is None

    def test_check_title_exists(self, db_session):
        """Test checking if tag title exists"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        tag_data = TagCreate(
            title="Test Tag",
            description="A test tag",
        )
        
        tag.create(db=db_session, obj_in=tag_data)
        
        # Check if title exists
        assert tag.check_title_exists(db_session, "Test Tag") is True
        assert tag.check_title_exists(db_session, "NonExistent Tag") is False

    def test_get_or_create_by_title(self, db_session):
        """Test get or create by title"""
        from scrumix.api.crud.tag import tag
        from scrumix.api.schemas.tag import TagCreate
        
        tag_data = TagCreate(
            title="Test Tag",
            description="A test tag",
        )
        
        # Create tag
        created_tag = tag.get_or_create_by_title(db_session, tag_data.title)
        assert created_tag.title == tag_data.title
        
        # Try to get or create the same tag
        retrieved_tag = tag.get_or_create_by_title(db_session, tag_data.title)
        assert retrieved_tag.id == created_tag.id
        assert retrieved_tag.title == created_tag.title 