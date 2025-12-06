# models/deployment/deployment_run.py

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class DeploymentRun(Base):
    __tablename__ = "deployment_runs"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(64), nullable=False, index=True)
    strategy = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False)  # success/failed
    risk_level = Column(String(16), nullable=False)
    risk_score = Column(Integer, nullable=False)

    analysis = Column(JSONB, nullable=True)  # komplette Risk-Analyse
    results = Column(JSONB, nullable=True)   # z.B. Canary-Step-Details, final result

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    finished_at = Column(DateTime(timezone=True), nullable=True)
