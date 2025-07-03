"""
Documentation-related database models
"""
from sqlalchemy import Column, Integer, String, DateTime, relationship, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.base import Base

class DocumentationType(str, Enum):
    """Documentation type enumeration"""
    REQUIREMENTS = "requirements"
    DESIGN = "design"
    API = "api"
    USER_GUIDE = "user-guide"
    TECHNICAL = "technical"
    MEETING_NOTES = "meeting-notes"
    SPECIFICATION = "specification"
    TUTORIAL = "tutorial"
    FAQ = "faq"
    OTHER = "other"

class Documentation(Base):
    """Documentation main table"""
    __tablename__ = "documentations"

    doc_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    type = Column(SQLEnum(DocumentationType), default=DocumentationType.OTHER, nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=False, comment="URL to access the documentation file")
    
    # System timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Foreign keys to user, project, and sprint
    doc_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
   
    # Relationships 
    doc_creator = relationship("User", backref="created_documentation")
    user_documentations = relationship("UserDocumentation", back_populates="documentation", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_documentation", back_populates="documentations")
    tag_documentations = relationship("TagDocumentation", back_populates="documentation", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="tag_documentation", back_populates="documentations")