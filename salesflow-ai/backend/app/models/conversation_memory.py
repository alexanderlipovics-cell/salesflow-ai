# backend/app/models/conversation_memory.py

from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.base_class import Base

class ConversationMemory(Base):
    __tablename__ = "conversation_memory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    lead_id = Column(String(64), index=True, nullable=True)
    conversation_id = Column(String(64), index=True, nullable=True)
    content = Column(String, nullable=False)
    extra_metadata = Column(JSON, nullable=True)
    embedding = Column(Vector(1536), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
