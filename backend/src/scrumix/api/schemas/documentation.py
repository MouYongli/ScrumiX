"""
Documentation-related Pydantic schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from scrumix.api.models.documentation import DocumentationType

class DocumentationBase(BaseModel):
    """Documentation base information"""
    title: str
    type: DocumentationType = DocumentationType.OTHER
    description: Optional[str] = None
    file_url: str

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
    
    doc_id: int
    created_at: datetime
    updated_at: datetime

class DocumentationResponse(DocumentationBase):
    """Documentation response schema for frontend"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int  # Maps to doc_id for frontend consistency
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    # Additional fields for frontend display
    fileUrl: str = Field(alias="file_url")  # Aliased for frontend consistency
    
    @classmethod
    def from_db_model(cls, documentation: "Documentation") -> "DocumentationResponse":
        """Create response object from database model"""
        return cls(
            id=documentation.doc_id,
            title=documentation.title,
            type=documentation.type,
            description=documentation.description,
            file_url=documentation.file_url,
            createdAt=documentation.created_at,
            updatedAt=documentation.updated_at,
            fileUrl=documentation.file_url
        ) 