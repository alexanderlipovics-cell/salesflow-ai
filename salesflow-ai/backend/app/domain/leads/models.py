# backend/app/domain/leads/models.py

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from app.db.base_class import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)

    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(64), nullable=True, index=True)
    company = Column(String(255), nullable=True)
    source = Column(String(64), nullable=False)

    raw_context = Column(JSONB, nullable=False, default=dict)
    is_confirmed = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

