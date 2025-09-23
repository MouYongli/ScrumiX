"""
User-Documentation association model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from enum import Enum
from sqlalchemy.orm import relationship

from scrumix.api.db.base import Base

class UserDocumentationRole(str, Enum):
    """User role in documentation enumeration"""
    AUTHOR = "author"
    EDITOR = "editor"
    VIEWER = "viewer"

class UserDocumentation(Base):
    """Association table for User-Documentation many-to-many relationship"""
    __tablename__ = "user_documentation"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    documentation_id = Column(Integer, ForeignKey("documentations.id"), nullable=False)
    role = Column(SQLEnum(UserDocumentationRole), nullable=False, default=UserDocumentationRole.VIEWER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="user_documentations", overlaps="documentations,users")
    documentation = relationship("Documentation", back_populates="user_documentations", overlaps="documentations,users")

    def __repr__(self):
        return f"<UserDocumentation(user_id={self.user_id}, documentation_id={self.documentation_id}, role='{self.role.value}')>"