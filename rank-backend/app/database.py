import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Default to a local SQLite database for development if no Postgres string is present
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/xtremecircuitrank")

# Fallback adjustment if using SQLite locally for rapid prototyping
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency utility to safely inject and close database sessions in API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()