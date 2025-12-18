# backend/app/domain/leads/validation.py

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class LeadInput(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=64)
    company: Optional[str] = Field(None, max_length=255)
    source: str = Field(..., max_length=64)

    class Config:
        str_strip_whitespace = True

