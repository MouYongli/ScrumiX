from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

class TagDocumentation(Base):
    __tablename__ = "tag_documentation"
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)
    doc_id = Column(Integer, ForeignKey("documentations.doc_id"), primary_key=True)

    # Relationships
    tag = relationship("Tag", back_populates="tag_documentations", overlaps="documentations,tags")
    documentation = relationship("Documentation", back_populates="tag_documentations", overlaps="documentations,tags") 