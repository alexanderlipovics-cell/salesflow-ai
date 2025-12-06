"""
User model for SalesFlow AI Backend.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.orm import Mapped
from sqlalchemy.sql import func

from ..db.base import Base


class User(Base):
    """User model with authentication fields."""

    __tablename__ = "users"

    id: Mapped[str] = Column(String(255), primary_key=True, index=True)
    email: Mapped[str] = Column(String(255), unique=True, index=True, nullable=False)
    first_name: Mapped[Optional[str]] = Column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = Column(String(100), nullable=True)
    hashed_password: Mapped[str] = Column(String(255), nullable=False)
    is_active: Mapped[bool] = Column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = Column(Boolean, default=False, nullable=False)
    role: Mapped[str] = Column(String(50), default="user", nullable=False)
    created_at: Mapped[datetime] = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Optional fields for profile
    company: Mapped[Optional[str]] = Column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = Column(String(50), nullable=True)
    avatar_url: Mapped[Optional[str]] = Column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
