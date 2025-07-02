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
    content: str

class DocumentationCreate(DocumentationBase):
    """Create documentation schema"""
    model_config = ConfigDict(populate_by_name=True)

class DocumentationUpdate(BaseModel):
    """Update documentation schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    title: Optional[str] = None
    type: Optional[DocumentationType] = None
    description: Optional[str] = None
    content: Optional[str] = None

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
    
    # Calculated fields for frontend display
    contentPreview: Optional[str] = None  # First 200 characters of content
    wordCount: Optional[int] = None  # Word count of content
    
    @classmethod
    def from_db_model(cls, documentation: "Documentation", 
                     include_full_content: bool = True) -> "DocumentationResponse":
        """Create response object from database model"""
        content = documentation.content if include_full_content else ""
        content_preview = None
        word_count = None
        
        if documentation.content:
            # Create preview (first 200 characters)
            content_preview = (documentation.content[:200] + "...") if len(documentation.content) > 200 else documentation.content
            # Calculate word count
            word_count = len(documentation.content.split())
        
        return cls(
            id=documentation.doc_id,
            title=documentation.title,
            type=documentation.type,
            description=documentation.description,
            content=content,
            createdAt=documentation.created_at,
            updatedAt=documentation.updated_at,
            contentPreview=content_preview,
            wordCount=word_count
        ) 