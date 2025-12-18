# backend/app/models/consent.py

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import INET
from app.db.base_class import Base





class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    consent_data = Column(JSON, nullable=False)  # {"analytics": true, "marketing": false, ...}
    consent_hash = Column(String(64), nullable=False)
    consent_version = Column(String(16), nullable=False)
    ip_address = Column(INET, nullable=False)
    user_agent = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)





class CookieCategory(Base):
    __tablename__ = "cookie_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(32), nullable=False, unique=True)  # "analytics", "marketing", ...
    description = Column(Text, nullable=False)
    required = Column(Boolean, default=False)  # true = strictly necessary
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
