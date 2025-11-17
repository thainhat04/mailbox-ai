from sqlalchemy.orm.session import Session
from typing import Generator
from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(url = settings.DATABASE_URL, pool_logging_name= "DATABASE INIT", pool_pre_ping=True, echo= True)
SessionLocal = sessionmaker[Session] (autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  