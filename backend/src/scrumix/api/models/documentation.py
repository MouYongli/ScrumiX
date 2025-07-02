"""
Documentation-related database models
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Text
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
    content = Column(Text, nullable=False)
    
    # System timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # TODO: Add relationships to other entities when implemented
    # project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    # author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # project = relationship("Project", back_populates="documentation")
    # author = relationship("User", back_populates="authored_documentation") 