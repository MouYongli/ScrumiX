from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base

class UserProject(Base):
    __tablename__ = "user_project"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), primary_key=True)
    role = Column(String(100), nullable=False)
    added_by = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="user_projects", overlaps="projects,users")
    project = relationship("Project", back_populates="user_projects", overlaps="projects,users") 