# CRUD base class
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.inspection import inspect
from ..db.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        """
        CRUD base class with default CRUD operations
        * `model`: SQLAlchemy model class
        """
        self.model = model
        # Automatically detect the primary key column name
        self._primary_key = self._get_primary_key_name()

    def _get_primary_key_name(self) -> str:
        """Get the primary key column name for the model"""
        mapper = inspect(self.model)
        primary_key_columns = mapper.primary_key
        if primary_key_columns:
            return primary_key_columns[0].name
        return 'id'  # fallback to 'id'

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        primary_key_attr = getattr(self.model, self._primary_key)
        return db.query(self.model).filter(primary_key_attr == id).first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: Union[CreateSchemaType, Dict[str, Any]]) -> ModelType:
        if isinstance(obj_in, dict):
            obj_in_data = obj_in
        else:
            obj_in_data = obj_in.model_dump(by_alias=True)
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True, by_alias=True)
        for field in update_data:
            if field in obj_data and update_data[field] is not None:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> ModelType:
        primary_key_attr = getattr(self.model, self._primary_key)
        obj = db.query(self.model).filter(primary_key_attr == id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj 