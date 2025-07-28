"""
Documentation-related Pydantic schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from scrumix.api.models.documentation import Documentation, DocumentationType

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

class DocumentationUpdate(BaseModel):
    """Update documentation schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    title: Optional[str] = None
    type: Optional[DocumentationType] = None
    description: Optional[str] = None
    file_url: Optional[str] = None

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
    
    @classmethod
    def from_db_model(cls, documentation: "Documentation") -> "DocumentationResponse":
        """Create response object from database model"""
        return cls(
            id=documentation.id,
            title=documentation.title,
            type=documentation.type,
            description=documentation.description,
            file_url=documentation.file_url,
            project_id=documentation.project_id,
            created_at=documentation.created_at,
            updated_at=documentation.updated_at
        ) 