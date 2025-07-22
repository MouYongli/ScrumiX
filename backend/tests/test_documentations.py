"""
Documentations API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.documentation import DocumentationType


class TestDocumentationEndpoints:
    """Test documentation management endpoints"""

    def test_get_documentations_success(self, client, auth_headers):
        """Test getting documentations list"""
        response = client.get("/api/v1/documentations/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_documentations_unauthorized(self, client):
        """Test getting documentations without authentication"""
        response = client.get("/api/v1/documentations/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_documentations_with_pagination(self, client, auth_headers):
        """Test getting documentations with pagination"""
        response = client.get("/api/v1/documentations/?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_documentations_with_type_filter(self, client, auth_headers):
        """Test getting documentations with type filter"""
        response = client.get("/api/v1/documentations/?doc_type=user_guide", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_documentations_with_search(self, client, auth_headers):
        """Test getting documentations with search"""
        response = client.get("/api/v1/documentations/?search=test", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_create_documentation_success(self, client, auth_headers):
        """Test successful documentation creation"""
        documentation_data = {
            "title": "Test Documentation",
            "description": "A test documentation",
            "doc_type": "user_guide",
            "content": "This is the content of the documentation",
            "file_url": "https://example.com/doc.pdf",
            "version": "1.0"
        }
        
        response = client.post("/api/v1/documentations/", json=documentation_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == documentation_data["title"]
        assert data["description"] == documentation_data["description"]
        assert data["doc_type"] == documentation_data["doc_type"]
        assert data["content"] == documentation_data["content"]
        assert data["file_url"] == documentation_data["file_url"]
        assert data["version"] == documentation_data["version"]
        assert "id" in data

    def test_create_documentation_invalid_data(self, client, auth_headers):
        """Test documentation creation with invalid data"""
        documentation_data = {
            "title": "",  # Empty title
            "description": "A test documentation",
            "doc_type": "user_guide",
            "content": "This is the content"
        }
        
        response = client.post("/api/v1/documentations/", json=documentation_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_documentation_invalid_type(self, client, auth_headers):
        """Test documentation creation with invalid type"""
        documentation_data = {
            "title": "Test Documentation",
            "description": "A test documentation",
            "doc_type": "invalid_type",
            "content": "This is the content"
        }
        
        response = client.post("/api/v1/documentations/", json=documentation_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_documentation_unauthorized(self, client):
        """Test documentation creation without authentication"""
        documentation_data = {
            "title": "Test Documentation",
            "description": "A test documentation",
            "doc_type": "user_guide",
            "content": "This is the content"
        }
        
        response = client.post("/api/v1/documentations/", json=documentation_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_documentation_by_id_success(self, client, auth_headers, db_session):
        """Test getting documentation by ID"""
        # Create a documentation first
        documentation_data = {
            "title": "Test Documentation for Get",
            "description": "A test documentation for getting",
            "doc_type": "user_guide",
            "content": "This is the content of the documentation",
            "file_url": "https://example.com/doc.pdf",
            "version": "1.0"
        }
        
        create_response = client.post("/api/v1/documentations/", json=documentation_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_200_OK
        
        doc_id = create_response.json()["id"]
        
        # Get the documentation
        response = client.get(f"/api/v1/documentations/{doc_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == doc_id
        assert data["title"] == documentation_data["title"]
        assert data["description"] == documentation_data["description"]

    def test_get_documentation_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent documentation"""
        response = client.get("/api/v1/documentations/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_documentation_by_id_unauthorized(self, client):
        """Test getting documentation without authentication"""
        response = client.get("/api/v1/documentations/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_documentation_success(self, client, auth_headers, db_session):
        """Test successful documentation update"""
        # Create a documentation first
        documentation_data = {
            "title": "Test Documentation for Update",
            "description": "A test documentation for updating",
            "doc_type": "user_guide",
            "content": "This is the content of the documentation",
            "file_url": "https://example.com/doc.pdf",
            "version": "1.0"
        }
        
        create_response = client.post("/api/v1/documentations/", json=documentation_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_200_OK
        
        doc_id = create_response.json()["id"]
        
        # Update the documentation
        update_data = {
            "title": "Updated Documentation Title",
            "description": "Updated description",
            "content": "Updated content",
            "version": "2.0"
        }
        
        response = client.put(f"/api/v1/documentations/{doc_id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["content"] == update_data["content"]
        assert data["version"] == update_data["version"]

    def test_update_documentation_not_found(self, client, auth_headers):
        """Test updating non-existent documentation"""
        update_data = {
            "title": "Updated Documentation Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/documentations/999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_documentation_unauthorized(self, client):
        """Test updating documentation without authentication"""
        update_data = {
            "title": "Updated Documentation Title",
            "description": "Updated description"
        }
        
        response = client.put("/api/v1/documentations/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_documentation_success(self, client, auth_headers, db_session):
        """Test successful documentation deletion"""
        # Create a documentation first
        documentation_data = {
            "title": "Test Documentation for Delete",
            "description": "A test documentation for deletion",
            "doc_type": "user_guide",
            "content": "This is the content of the documentation",
            "file_url": "https://example.com/doc.pdf",
            "version": "1.0"
        }
        
        create_response = client.post("/api/v1/documentations/", json=documentation_data, headers=auth_headers)
        assert create_response.status_code == status.HTTP_200_OK
        
        doc_id = create_response.json()["id"]
        
        # Delete the documentation
        response = client.delete(f"/api/v1/documentations/{doc_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Documentation deleted successfully"

    def test_delete_documentation_not_found(self, client, auth_headers):
        """Test deleting non-existent documentation"""
        response = client.delete("/api/v1/documentations/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_documentation_unauthorized(self, client):
        """Test deleting documentation without authentication"""
        response = client.delete("/api/v1/documentations/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_documentations_by_type(self, client, auth_headers):
        """Test getting documentations by type"""
        response = client.get("/api/v1/documentations/type/user_guide", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_documentations_by_type_with_pagination(self, client, auth_headers):
        """Test getting documentations by type with pagination"""
        response = client.get("/api/v1/documentations/type/user_guide?skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_documentation_by_file_url(self, client, auth_headers):
        """Test searching documentation by file URL"""
        response = client.get("/api/v1/documentations/search/file-url?search_term=pdf", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_search_documentation_by_file_url_with_pagination(self, client, auth_headers):
        """Test searching documentation by file URL with pagination"""
        response = client.get("/api/v1/documentations/search/file-url?search_term=pdf&skip=0&limit=10", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_recent_documentations(self, client, auth_headers):
        """Test getting recent documentations"""
        response = client.get("/api/v1/documentations/recent/updates", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_recent_documentations_with_days(self, client, auth_headers):
        """Test getting recent documentations with days parameter"""
        response = client.get("/api/v1/documentations/recent/updates?days=14", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_recent_documentations_with_limit(self, client, auth_headers):
        """Test getting recent documentations with limit"""
        response = client.get("/api/v1/documentations/recent/updates?limit=5", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_get_documentation_statistics(self, client, auth_headers):
        """Test getting documentation statistics"""
        response = client.get("/api/v1/documentations/statistics/overview", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, dict)


class TestDocumentationCRUD:
    """Test documentation CRUD operations"""

    def test_create_documentation_success(self, db_session):
        """Test successful documentation creation"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        documentation_data = DocumentationCreate(
            title="Test Documentation",
            description="A test documentation",
            doc_type=DocumentationType.USER_GUIDE,
            content="This is the content of the documentation",
            file_url="https://example.com/doc.pdf",
            version="1.0"
        )
        
        documentation_obj = documentation_crud.create_documentation(db_session, documentation_data)
        assert documentation_obj.title == documentation_data.title
        assert documentation_obj.description == documentation_data.description
        assert documentation_obj.doc_type == documentation_data.doc_type
        assert documentation_obj.content == documentation_data.content

    def test_get_documentation_by_id(self, db_session):
        """Test getting documentation by ID"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        documentation_data = DocumentationCreate(
            title="Test Documentation",
            description="A test documentation",
            doc_type=DocumentationType.USER_GUIDE,
            content="This is the content of the documentation",
            file_url="https://example.com/doc.pdf",
            version="1.0"
        )
        
        created_documentation = documentation_crud.create_documentation(db_session, documentation_data)
        
        retrieved_documentation = documentation_crud.get_by_id(db_session, created_documentation.id)
        assert retrieved_documentation is not None
        assert retrieved_documentation.title == documentation_data.title
        assert retrieved_documentation.description == documentation_data.description

    def test_get_documentations_with_pagination(self, db_session):
        """Test getting documentations with pagination"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        # Create multiple documentations
        for i in range(5):
            documentation_data = DocumentationCreate(
                title=f"Test Documentation {i}",
                description=f"A test documentation {i}",
                doc_type=DocumentationType.USER_GUIDE,
                content=f"This is the content of documentation {i}",
                file_url=f"https://example.com/doc{i}.pdf",
                version="1.0"
            )
            documentation_crud.create_documentation(db_session, documentation_data)
        
        documentations = documentation_crud.get_documentations(db_session, skip=0, limit=3)
        assert len(documentations) == 3

    def test_get_documentations_by_type(self, db_session):
        """Test getting documentations by type"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        # Create documentations with different types
        doc_types = [DocumentationType.USER_GUIDE, DocumentationType.API, DocumentationType.TUTORIAL]
        for doc_type in doc_types:
            documentation_data = DocumentationCreate(
                title=f"Test Documentation {doc_type}",
                description="A test documentation",
                doc_type=doc_type,
                content="This is the content of the documentation",
                file_url="https://example.com/doc.pdf",
                version="1.0"
            )
            documentation_crud.create_documentation(db_session, documentation_data)
        
        # Get user guide documentations
        user_guide_docs = documentation_crud.get_documentations_by_type(db_session, DocumentationType.USER_GUIDE, skip=0, limit=10)
        assert len(user_guide_docs) == 1
        assert user_guide_docs[0].doc_type == DocumentationType.USER_GUIDE

    def test_search_documentations(self, db_session):
        """Test searching documentations"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        # Create documentations with different titles
        doc_titles = ["Python Guide", "JavaScript Guide", "React Guide", "Vue Guide"]
        for title in doc_titles:
            documentation_data = DocumentationCreate(
                title=title,
                description="A test documentation",
                doc_type=DocumentationType.USER_GUIDE,
                content="This is the content of the documentation",
                file_url="https://example.com/doc.pdf",
                version="1.0"
            )
            documentation_crud.create_documentation(db_session, documentation_data)
        
        # Search for documentations containing "Guide"
        docs = documentation_crud.search_documentations(db_session, "Guide", skip=0, limit=10)
        assert len(docs) == 4

    def test_search_by_file_url(self, db_session):
        """Test searching documentations by file URL"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        # Create documentations with different file URLs
        file_urls = ["https://example.com/doc1.pdf", "https://example.com/doc2.pdf", "https://example.com/guide.md"]
        for file_url in file_urls:
            documentation_data = DocumentationCreate(
                title="Test Documentation",
                description="A test documentation",
                doc_type=DocumentationType.USER_GUIDE,
                content="This is the content of the documentation",
                file_url=file_url,
                version="1.0"
            )
            documentation_crud.create_documentation(db_session, documentation_data)
        
        # Search for documentations with PDF files
        pdf_docs = documentation_crud.search_by_file_url(db_session, "pdf", skip=0, limit=10)
        assert len(pdf_docs) == 2

    def test_get_recent_documentations(self, db_session):
        """Test getting recent documentations"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        # Create documentations
        for i in range(3):
            documentation_data = DocumentationCreate(
                title=f"Test Documentation {i}",
                description="A test documentation",
                doc_type=DocumentationType.USER_GUIDE,
                content="This is the content of the documentation",
                file_url="https://example.com/doc.pdf",
                version="1.0"
            )
            documentation_crud.create_documentation(db_session, documentation_data)
        
        # Get recent documentations
        recent_docs = documentation_crud.get_recent_documentations(db_session, days=7, limit=10)
        assert len(recent_docs) == 3

    def test_update_documentation(self, db_session):
        """Test updating documentation"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate, DocumentationUpdate
        
        documentation_data = DocumentationCreate(
            title="Test Documentation",
            description="A test documentation",
            doc_type=DocumentationType.USER_GUIDE,
            content="This is the content of the documentation",
            file_url="https://example.com/doc.pdf",
            version="1.0"
        )
        
        created_documentation = documentation_crud.create_documentation(db_session, documentation_data)
        
        update_data = DocumentationUpdate(
            title="Updated Documentation",
            description="Updated description",
            content="Updated content",
            version="2.0"
        )
        
        updated_documentation = documentation_crud.update_documentation(db_session, created_documentation.id, update_data)
        assert updated_documentation.title == update_data.title
        assert updated_documentation.description == update_data.description
        assert updated_documentation.content == update_data.content
        assert updated_documentation.version == update_data.version

    def test_delete_documentation(self, db_session):
        """Test deleting documentation"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        documentation_data = DocumentationCreate(
            title="Test Documentation",
            description="A test documentation",
            doc_type=DocumentationType.USER_GUIDE,
            content="This is the content of the documentation",
            file_url="https://example.com/doc.pdf",
            version="1.0"
        )
        
        created_documentation = documentation_crud.create_documentation(db_session, documentation_data)
        doc_id = created_documentation.id
        
        success = documentation_crud.delete_documentation(db_session, doc_id)
        assert success is True
        
        # Verify documentation is deleted
        retrieved_documentation = documentation_crud.get_by_id(db_session, doc_id)
        assert retrieved_documentation is None

    def test_get_documentation_statistics(self, db_session):
        """Test getting documentation statistics"""
        from scrumix.api.crud.documentation import documentation_crud
        from scrumix.api.schemas.documentation import DocumentationCreate
        
        # Create documentations with different types
        doc_types = [DocumentationType.USER_GUIDE, DocumentationType.API, DocumentationType.TUTORIAL]
        for doc_type in doc_types:
            documentation_data = DocumentationCreate(
                title=f"Test Documentation {doc_type}",
                description="A test documentation",
                doc_type=doc_type,
                content="This is the content of the documentation",
                file_url="https://example.com/doc.pdf",
                version="1.0"
            )
            documentation_crud.create_documentation(db_session, documentation_data)
        
        # Get statistics
        stats = documentation_crud.get_documentation_statistics(db_session)
        assert isinstance(stats, dict) 