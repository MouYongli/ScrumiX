from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from scrumix.api.db.base import Base
from scrumix.api.core.config import settings

def init_postgres_db():
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal

def get_db():
    db = init_postgres_db()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    Base.metadata.create_all(bind=engine)

def drop_tables():
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    Base.metadata.drop_all(bind=engine)

def init_db():
    drop_tables()
    create_tables()

if __name__ == "__main__":
    drop_tables()
    create_tables()