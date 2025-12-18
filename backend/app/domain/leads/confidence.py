# backend/app/domain/leads/confidence.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class FieldConfidence:
    value: Optional[str]
    score: float


@dataclass(frozen=True)
class LeadConfidenceVector:
    email: FieldConfidence
    phone: FieldConfidence
    full_name: FieldConfidence
    company: FieldConfidence

    @property
    def overall(self) -> float:
        scores = [self.email.score, self.phone.score, self.full_name.score, self.company.score]
        return sum(scores) / len(scores)

    def as_dict(self) -> Dict[str, float]:
        return {
            "email": self.email.score,
            "phone": self.phone.score,
            "full_name": self.full_name.score,
            "company": self.company.score,
            "overall": self.overall,
        }

    def needs_review(self, threshold: float = 0.8) -> bool:
        return any(
            f.score < threshold
            for f in [self.email, self.phone, self.full_name, self.company]
        )

