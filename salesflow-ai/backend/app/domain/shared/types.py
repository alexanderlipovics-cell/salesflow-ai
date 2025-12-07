# backend/app/domain/shared/types.py

from __future__ import annotations
import uuid
from dataclasses import dataclass
from typing import Optional


TenantId = uuid.UUID
UserId = uuid.UUID


@dataclass(frozen=True)
class RequestContext:
    tenant_id: TenantId
    user_id: Optional[UserId]
    request_id: Optional[str] = None

