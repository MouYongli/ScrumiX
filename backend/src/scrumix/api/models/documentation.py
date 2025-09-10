"""
Documentation-related database models
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from pgvector.sqlalchemy import Vector
from typing import Optional
from scrumix.api.db.base import Base

class DocumentationType(str, Enum):
    """Documentation type enumeration"""
    SPRINT_REVIEW = "sprint_review"
    SPRINT_RETROSPECTIVE = "sprint_retrospective"
    REQUIREMENT = "requirement"
    DESIGN_ARCHITECTURE = "design_architecture"
    MEETING_REPORT = "meeting_report"
    USER_GUIDE = "user_guide"
    OTHER = "other"

class Documentation(Base):
    """Documentation model for storing documentation information."""
    
    __tablename__ = "documentations"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(500), nullable=False, index=True)
    type = Column(SQLEnum(DocumentationType), nullable=False, default=DocumentationType.OTHER)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True, comment="Document content in markdown format")
    file_url = Column(String(1000), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    
    # Vector embeddings for semantic search - separate embeddings for each field
    title_embedding = Column(Vector(1536), nullable=True, comment="Embedding for title")
    description_embedding = Column(Vector(1536), nullable=True, comment="Embedding for description")
    content_embedding = Column(Vector(1536), nullable=True, comment="Embedding for content")
    embedding_updated_at = Column(DateTime(timezone=True), nullable=True, comment="Last time embeddings were generated")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="documentations")
    tag_documentations = relationship("TagDocumentation", back_populates="documentation", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="tag_documentation", back_populates="documentations", overlaps="tag_documentations")
    user_documentations = relationship("UserDocumentation", back_populates="documentation", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_documentation", back_populates="documentations", overlaps="user_documentations")
    
    @property
    def doc_id(self) -> int:
        """Backward compatibility property for tests"""
        return self.id
    
    def __repr__(self):
        return f"<Documentation(id={self.id}, title='{self.title}', type='{self.type.value}')>"
    
    def get_title_content(self) -> str:
        """Get content for title embedding"""
        return f"{self.title}\nType: {self.type.value}"
    
    def get_description_content(self) -> Optional[str]:
        """Get content for description embedding"""
        return self.description if self.description else None
    
    def get_content_text(self) -> Optional[str]:
        """Get content for content embedding"""
        return self.content if self.content else None
    
    def needs_embedding_update(self) -> bool:
        """Check if embeddings need to be updated based on content changes"""
        if not self.embedding_updated_at:
            return True
        
        # Check if content was updated after last embedding update
        if self.updated_at > self.embedding_updated_at:
            return True
        
        return False
    
    def get_searchable_content(self) -> str:
        """Generate combined text for backward compatibility (used for combined search)"""
        content_parts = []
        
        # Add title (always present)
        content_parts.append(self.title)
        
        # Add type for context
        content_parts.append(f"Type: {self.type.value}")
        
        # Add description if present
        if self.description:
            content_parts.append(self.description)
        
        # Add content if present (this is the main document content)
        if self.content:
            content_parts.append(self.content)
        
        return "\n".join(content_parts)