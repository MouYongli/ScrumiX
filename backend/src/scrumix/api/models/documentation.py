"""
Documentation-related database models
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
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