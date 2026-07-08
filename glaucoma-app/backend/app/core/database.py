import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default to local SQLite database so the application runs with zero configuration
# If MySQL config is provided, it uses it.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./glaucoma.db")

# For SQLite, we need to allow multithreaded connection sharing
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
