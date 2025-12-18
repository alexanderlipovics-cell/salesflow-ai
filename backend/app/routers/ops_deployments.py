# backend/app/routers/ops_deployments.py

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.deployment_run import DeploymentRun
from ai_deployment.orchestrator import AIDeploymentOrchestrator

router = APIRouter(
    prefix="/ops/deployments",
    tags=["ops-deployments"],
    dependencies=[Depends(get_current_active_user)],  # nur eingeloggte (Admins) dürfen das
)

# ---------- Pydantic Schemas ----------

class DeploymentAnalysisRequest(BaseModel):
    version: str
    strategy: Optional[str] = "canary"  # Wunsch-Strategie, optional

class DeploymentAnalysisResponse(BaseModel):
    version: str
    risk_level: str
    risk_score: int
    recommended_strategy: str
    analysis: Dict[str, Any]

class DeploymentRunRequest(BaseModel):
    version: str
    strategy: Optional[str] = "canary"
    dry_run: bool = True  # standardmäßig erst mal nur simulieren

class DeploymentRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    
    id: int
    version: str
    strategy: str
    status: str
    risk_level: str
    risk_score: int
    analysis: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    created_at: datetime
    finished_at: Optional[datetime] = None

class DeploymentRunList(BaseModel):
    items: List[DeploymentRunOut]
    total: int

# ---------- Helper ----------

def recommend_strategy(analysis: Dict[str, Any]) -> str:
    """
    Simple Heuristik:
    - high risk -> canary
    - DB-Änderungen -> blue-green bevorzugen
    - sonst rolling/canary
    """
    risk_level = analysis.get("risk_level", "medium")
    changes = analysis.get("breaking_changes", []) or []
    perf = analysis.get("performance_impact", {}) or {}

    # DB-heavy -> blue-green
    db_impact = str(perf.get("db_impact", "medium")).lower()
    has_db_note = any("database" in str(c).lower() for c in changes)

    if risk_level == "high":
        if has_db_note or db_impact == "high":
            return "blue-green"
        return "canary"

    if has_db_note or db_impact == "high":
        return "blue-green"

    if risk_level == "medium":
        return "canary"

    return "rolling"

# ---------- Endpoints ----------

@router.post("/analyze", response_model=DeploymentAnalysisResponse)
async def analyze_deployment(
    payload: DeploymentAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Nur Risiko & Empfehlung berechnen – ohne realen Deploy.
    Nutzt AIDeploymentOrchestrator.analyze_deployment_risks.
    """
    orchestrator = AIDeploymentOrchestrator(dry_run=True)
    analysis = await orchestrator.analyze_deployment_risks(payload.version)

    recommended = recommend_strategy(analysis)

    return DeploymentAnalysisResponse(
        version=payload.version,
        risk_level=analysis["risk_level"],
        risk_score=analysis["risk_score"],
        recommended_strategy=recommended,
        analysis=analysis,
    )

@router.post("/run", response_model=DeploymentRunOut, status_code=status.HTTP_202_ACCEPTED)
async def run_deployment(
    payload: DeploymentRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Startet ein AI-gesteuertes Deployment (oder Dry-Run).
    - macht zuerst Risiko-Analyse
    - legt DeploymentRun in DB an
    - führt smart_deploy aus (inline – für MVP)
    - aktualisiert DeploymentRun mit Ergebnis
    """

    orchestrator = AIDeploymentOrchestrator(dry_run=payload.dry_run)

    # 1) Analyse
    analysis = await orchestrator.analyze_deployment_risks(payload.version)
    risk_level = analysis["risk_level"]
    risk_score = analysis["risk_score"]

    # 2) Strategie wählen (falls nicht explizit anders gewünscht)
    strategy = payload.strategy or recommend_strategy(analysis)

    # 3) Run-Entity anlegen
    run = DeploymentRun(
        version=payload.version,
        strategy=strategy,
        status="running",
        risk_level=risk_level,
        risk_score=risk_score,
        analysis=analysis,
        created_at=datetime.utcnow(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # 4) Deployment ausführen
    try:
        result = await orchestrator.smart_deploy(version=payload.version, strategy=strategy)
        run.status = result.get("status", "success")
        run.results = result
        run.finished_at = datetime.utcnow()
    except Exception as e:
        run.status = "failed"
        run.finished_at = datetime.utcnow()
        # Minimal Info im results-Feld speichern
        run.results = {
            "error": str(e),
            "strategy": strategy,
            "version": payload.version,
        }

    db.add(run)
    db.commit()
    db.refresh(run)

    return DeploymentRunOut.model_validate(run)

@router.get("", response_model=DeploymentRunList)
def list_deployments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Liste der letzten Deployment-Runs, sortiert nach Startzeit.
    Perfekt für ein kleines Ops-Dashboard.
    """
    q = db.query(DeploymentRun).order_by(DeploymentRun.created_at.desc())
    total = q.count()
    runs = q.offset(offset).limit(limit).all()

    return DeploymentRunList(
        items=[DeploymentRunOut.from_orm(r) for r in runs],
        total=total,
    )

@router.get("/{run_id}", response_model=DeploymentRunOut)
def get_deployment_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Detail eines Deployment-Runs – inkl. kompletter Analyse + Ergebnisse.
    """
    run = db.query(DeploymentRun).filter(DeploymentRun.id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment run not found",
        )
    return DeploymentRunOut.model_validate(run)
