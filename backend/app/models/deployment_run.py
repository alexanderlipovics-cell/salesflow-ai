# backend/app/models/deployment_run.py

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base_class import Base  # <- eure zentrale Base nutzen

class DeploymentRun(Base):
    __tablename__ = "deployment_runs"

    id = Column(Integer, primary_key=True, index=True)

    version = Column(String(64), nullable=False, index=True)
    strategy = Column(String(32), nullable=False)  # canary / blue-green / rolling
    status = Column(String(32), nullable=False)    # pending / running / success / failed

    risk_level = Column(String(16), nullable=False)  # low / medium / high
    risk_score = Column(Integer, nullable=False)

    # vollständige Analyse + Ergebnisse
    analysis = Column(JSONB, nullable=True)  # z.B. Output von analyze_deployment_risks
    results = Column(JSONB, nullable=True)   # z.B. Canary-Step-Details, final result

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    finished_at = Column(DateTime(timezone=True), nullable=True)
