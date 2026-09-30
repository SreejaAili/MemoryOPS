from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Boolean
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    service = Column(String, nullable=False, index=True)
    error = Column(String, nullable=False)
    symptoms = Column(Text, nullable=False)
    severity = Column(String, nullable=False, default="medium")
    root_cause = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    post_mortem = Column(Text, nullable=True)
    outcome = Column(String, nullable=False, default="Open")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
    memory_retained = Column(Boolean, nullable=False, default=False)
    ai_recommendation = Column(Text, nullable=True)
