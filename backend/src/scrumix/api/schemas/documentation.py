"""
Documentation-related Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from scrumix.api.models.documentation import Documentation, DocumentationType

class UserDocumentationResponse(BaseModel):
    """User documentation association response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    user_id: int
    role: str
    user: dict  # Will contain user information

class DocumentationBase(BaseModel):
    """Documentation base information"""
    title: str
    type: DocumentationType
    description: Optional[str] = None
    file_url: Optional[str] = None
    project_id: int

    @field_validator('title')
    @classmethod
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title must not be empty')
        return v

class DocumentationCreate(DocumentationBase):
    """Create documentation schema"""
    model_config = ConfigDict(populate_by_name=True)
    author_ids: Optional[List[int]] = Field(None, description="List of user IDs to assign as authors")

class DocumentationUpdate(BaseModel):
    """Update documentation schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    title: Optional[str] = None
    type: Optional[DocumentationType] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    author_ids: Optional[List[int]] = Field(None, description="List of user IDs to assign as authors")

class DocumentationInDB(DocumentationBase):
    """Documentation information in database"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime

class DocumentationResponse(BaseModel):
    """Documentation response schema for frontend"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    title: str
    type: DocumentationType
    description: Optional[str] = None
    file_url: Optional[str] = None
    project_id: int
    created_at: datetime
    updated_at: datetime
    authors: List[dict] = Field(default_factory=list, description="List of authors")
    
    @classmethod
    def from_db_model(cls, documentation: "Documentation") -> "DocumentationResponse":
        """Create response object from database model"""
        # Get authors from the many-to-many relationship
        authors = []
        if hasattr(documentation, 'users') and documentation.users:
            for user in documentation.users:
                # Get the role for this user
                user_doc = next((ud for ud in documentation.user_documentations if ud.user_id == user.id), None)
                role = user_doc.role.value if user_doc else "viewer"
                authors.append({
                    "id": user.id,
                    "full_name": user.full_name or user.username or user.email,
                    "email": user.email,
                    "role": role
                })
        
        return cls(
            id=documentation.id,
            title=documentation.title,
            type=documentation.type,
            description=documentation.description,
            file_url=documentation.file_url,
            project_id=documentation.project_id,
            created_at=documentation.created_at,
            updated_at=documentation.updated_at,
            authors=authors
        ) 