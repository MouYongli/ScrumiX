"""
User-Project association model with Scrum roles
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from enum import Enum
from sqlalchemy.orm import relationship

from scrumix.api.db.base import Base

class ScrumRole(str, Enum):
    """Scrum roles enumeration"""
    SCRUM_MASTER = "scrum_master"
    PRODUCT_OWNER = "product_owner"
    DEVELOPER = "developer"

class UserProject(Base):
    """Association table for User-Project many-to-many relationship with Scrum roles"""
    __tablename__ = "user_project"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    role = Column(SQLEnum(ScrumRole), nullable=False, default=ScrumRole.DEVELOPER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="user_projects", overlaps="projects,users")
    project = relationship("Project", back_populates="user_projects", overlaps="projects,users")

    def __repr__(self):
        return f"<UserProject(user_id={self.user_id}, project_id={self.project_id}, role='{self.role.value}')>"