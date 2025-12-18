# backend/app/domain/leads/extraction.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.leads.confidence import FieldConfidence, LeadConfidenceVector
from app.domain.leads.validation import LeadInput
from app.domain.shared.types import TenantId
from app.domain.ai_orchestrator.service import DomainAIService
from app.ai.scenarios import ScenarioId

logger = structlog.get_logger()


@dataclass(frozen=True)
class LeadExtractionResult:
    lead_input: LeadInput
    confidence: LeadConfidenceVector
    raw: Dict[str, Any]


class LeadExtractionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.ai = DomainAIService(db)

    async def extract_from_unstructured(
        self,
        tenant_id: TenantId,
        source_type: str,
        content: Dict[str, Any],
        request_id: str | None,
    ) -> LeadExtractionResult:
        log = logger.bind(tenant_id=str(tenant_id), source_type=source_type, request_id=request_id)

        response_json = await self.ai.run_json(
            tenant_id=tenant_id,
            scenario_id=ScenarioId.LEAD_EXTRACTION_GENERIC,
            variables={"source_type": source_type, "content": content},
            request_id=request_id,
        )

        email_fc = FieldConfidence(
            value=response_json.get("email", {}).get("value"),
            score=float(response_json.get("email", {}).get("confidence", 0.0)),
        )
        phone_fc = FieldConfidence(
            value=response_json.get("phone", {}).get("value"),
            score=float(response_json.get("phone", {}).get("confidence", 0.0)),
        )
        full_name_fc = FieldConfidence(
            value=response_json.get("full_name", {}).get("value"),
            score=float(response_json.get("full_name", {}).get("confidence", 0.0)),
        )
        company_fc = FieldConfidence(
            value=response_json.get("company", {}).get("value"),
            score=float(response_json.get("company", {}).get("confidence", 0.0)),
        )

        vector = LeadConfidenceVector(
            email=email_fc,
            phone=phone_fc,
            full_name=full_name_fc,
            company=company_fc,
        )

        lead_input = LeadInput(
            full_name=full_name_fc.value,
            email=email_fc.value,
            phone=phone_fc.value,
            company=company_fc.value,
            source=source_type,
        )

        log.info("Lead extracted", confidence=vector.as_dict())
        return LeadExtractionResult(lead_input=lead_input, confidence=vector, raw=response_json)

