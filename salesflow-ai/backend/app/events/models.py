# backend/app/events/models.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from app.db.base_class import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    type = Column(String(64), nullable=False, index=True)
    payload = Column(JSONB, nullable=False, default=dict)
    source = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="pending", index=True)
    correlation_id = Column(PGUUID(as_uuid=True), nullable=True)
    causation_id = Column(PGUUID(as_uuid=True), nullable=True)
    request_id = Column(String(64), nullable=True)
    meta = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)


class EventCreate(BaseModel):
    tenant_id: uuid.UUID
    type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    source: str
    correlation_id: Optional[uuid.UUID] = None
    causation_id: Optional[uuid.UUID] = None
    request_id: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class EventRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    type: str
    payload: Dict[str, Any]
    source: str
    status: str
    correlation_id: Optional[uuid.UUID] = None
    causation_id: Optional[uuid.UUID] = None
    request_id: Optional[str] = None
    meta: Dict[str, Any]
    created_at: datetime
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

