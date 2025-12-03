"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - VERTICAL ADAPTERS                                        ║
║  Branchen-spezifische Goal-Berechnungslogik                               ║
╚════════════════════════════════════════════════════════════════════════════╝

Unterstützte Verticals:
  → Network Marketing / MLM
  → (geplant) Real Estate
  → (geplant) Coaching
  → (geplant) Finance
  → (geplant) Insurance
  → (geplant) Solar

Sync mit TypeScript:
  → src/services/verticalAdapters/
"""

from typing import Optional

from app.domain.goals import BaseVerticalAdapter, VerticalId
from .network_marketing import network_marketing_adapter


# ═══════════════════════════════════════════════════════════════════════════
# ADAPTER REGISTRY
# ═══════════════════════════════════════════════════════════════════════════

VERTICAL_ADAPTERS: dict[str, BaseVerticalAdapter] = {
    VerticalId.NETWORK_MARKETING.value: network_marketing_adapter,
    # Weitere Adapter hier registrieren:
    # VerticalId.REAL_ESTATE.value: real_estate_adapter,
    # VerticalId.COACHING.value: coaching_adapter,
    # etc.
}


def get_adapter(vertical_id: str) -> Optional[BaseVerticalAdapter]:
    """
    Gibt den Adapter für ein Vertical zurück.
    
    Args:
        vertical_id: ID des Verticals (z.B. "network_marketing")
        
    Returns:
        BaseVerticalAdapter oder None wenn nicht implementiert
    """
    return VERTICAL_ADAPTERS.get(vertical_id)


def list_available_verticals() -> list[dict]:
    """Listet alle verfügbaren Vertical-Adapter."""
    return [
        {
            "id": adapter.vertical_id,
            "label": adapter.get_label(),
        }
        for adapter in VERTICAL_ADAPTERS.values()
    ]


__all__ = [
    "get_adapter",
    "list_available_verticals",
    "VERTICAL_ADAPTERS",
    "network_marketing_adapter",
]

