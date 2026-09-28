import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# For SQLite, check_same_thread needs to be False for multithreaded applications
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Ensure data directory exists if local SQLite database path is used
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
)

# Automatic lightweight migration for existing SQLite databases
def run_migrations():
    try:
        with engine.connect() as conn:
            # Check columns in incidents table
            result = conn.execute(text("PRAGMA table_info(incidents)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "ai_recommendation" not in columns:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN ai_recommendation TEXT"))
                conn.commit()
    except Exception as e:
        print(f"Migration check info: {e}")

run_migrations()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_health() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"Database health check failed: {e}")
        return False
