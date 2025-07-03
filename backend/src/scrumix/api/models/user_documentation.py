from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

class UserDocumentation(Base):
    __tablename__ = "user_documentation"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    doc_id = Column(Integer, ForeignKey("documentations.doc_id"), primary_key=True)

    # Relationships
    user = relationship("User", back_populates="user_documentations")
    documentation = relationship("Documentation", back_populates="user_documentations") 