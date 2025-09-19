"""
User-Project association model with Scrum roles and ownership
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Boolean, UniqueConstraint, CheckConstraint
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
    """Association table for User-Project many-to-many relationship with Scrum roles and ownership"""
    __tablename__ = "user_project"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    role = Column(SQLEnum(ScrumRole), nullable=False, default=ScrumRole.DEVELOPER)
    is_owner = Column(Boolean, nullable=False, default=False, index=True, comment="Project ownership/admin rights")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Table constraints
    __table_args__ = (
        # Ensure user-project combination is unique
        UniqueConstraint('user_id', 'project_id', name='uq_user_project'),
    )

    # Relationships
    user = relationship("User", back_populates="user_projects", overlaps="projects,users")
    project = relationship("Project", back_populates="user_projects", overlaps="projects,users")

    def __repr__(self):
        return f"<UserProject(user_id={self.user_id}, project_id={self.project_id}, role='{self.role.value}', is_owner={self.is_owner})>"