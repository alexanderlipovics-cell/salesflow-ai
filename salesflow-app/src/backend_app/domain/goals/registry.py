"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - VERTICAL ADAPTER REGISTRY                                ║
║  Zentrale Verwaltung aller Vertical Adapters                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Die Registry ermöglicht:
- Dynamisches Laden von Adapters nach vertical_id
- Einfaches Hinzufügen neuer Verticals
- Type-safe Access zu allen Adapters
"""

from typing import Dict, Type, Optional
from .vertical_adapter import BaseVerticalAdapter, VerticalPlanAdapter
from .types import VerticalId

from .adapters import (
    MLMAdapter,
    RealEstateAdapter,
    FinanceAdapter,
    CoachingAdapter,
)


class VerticalAdapterRegistry:
    """
    Registry für Vertical Adapters.
    
    Verwendung:
    ```python
    registry = VerticalAdapterRegistry()
    
    # Adapter holen
    adapter = registry.get("network_marketing")
    
    # Alle verfügbaren Verticals
    verticals = registry.list_verticals()
    
    # Prüfen ob Vertical existiert
    if registry.has("real_estate"):
        ...
    ```
    """
    
    _adapters: Dict[str, BaseVerticalAdapter]
    
    def __init__(self):
        """Initialisiert die Registry mit allen bekannten Adapters."""
        self._adapters = {}
        self._register_defaults()
    
    def _register_defaults(self) -> None:
        """Registriert alle Standard-Adapters."""
        self.register(MLMAdapter())
        self.register(RealEstateAdapter())
        self.register(FinanceAdapter())
        self.register(CoachingAdapter())
    
    def register(self, adapter: BaseVerticalAdapter) -> None:
        """
        Registriert einen neuen Adapter.
        
        Args:
            adapter: Der zu registrierende Adapter
        """
        self._adapters[adapter.vertical_id] = adapter
    
    def get(self, vertical_id: str | VerticalId) -> BaseVerticalAdapter:
        """
        Holt einen Adapter nach vertical_id.
        
        Args:
            vertical_id: ID des Verticals (string oder Enum)
            
        Returns:
            Der entsprechende Adapter
            
        Raises:
            KeyError: Wenn kein Adapter für diese ID existiert
        """
        if isinstance(vertical_id, VerticalId):
            vertical_id = vertical_id.value
        
        if vertical_id not in self._adapters:
            raise KeyError(
                f"Kein Adapter für Vertical '{vertical_id}' registriert. "
                f"Verfügbar: {list(self._adapters.keys())}"
            )
        
        return self._adapters[vertical_id]
    
    def get_or_default(
        self, 
        vertical_id: str | VerticalId,
        default_id: str = "network_marketing"
    ) -> BaseVerticalAdapter:
        """
        Holt einen Adapter, oder einen Default falls nicht gefunden.
        
        Args:
            vertical_id: Gewünschte Vertical ID
            default_id: Fallback Vertical ID
            
        Returns:
            Adapter für vertical_id oder default_id
        """
        try:
            return self.get(vertical_id)
        except KeyError:
            return self.get(default_id)
    
    def has(self, vertical_id: str | VerticalId) -> bool:
        """
        Prüft ob ein Vertical registriert ist.
        
        Args:
            vertical_id: ID des Verticals
            
        Returns:
            True wenn registriert, sonst False
        """
        if isinstance(vertical_id, VerticalId):
            vertical_id = vertical_id.value
        return vertical_id in self._adapters
    
    def list_verticals(self) -> list[dict]:
        """
        Listet alle verfügbaren Verticals.
        
        Returns:
            Liste mit ID und Label jedes Verticals
        """
        return [
            {
                "id": adapter.vertical_id,
                "label": adapter.get_label(),
            }
            for adapter in self._adapters.values()
        ]
    
    def all_adapters(self) -> list[BaseVerticalAdapter]:
        """
        Gibt alle registrierten Adapters zurück.
        
        Returns:
            Liste aller Adapter-Instanzen
        """
        return list(self._adapters.values())


# ═══════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════

# Globale Registry-Instanz für einfachen Zugriff
_registry: Optional[VerticalAdapterRegistry] = None


def get_registry() -> VerticalAdapterRegistry:
    """
    Holt die globale Registry-Instanz (Singleton).
    
    Returns:
        Die VerticalAdapterRegistry Instanz
    """
    global _registry
    if _registry is None:
        _registry = VerticalAdapterRegistry()
    return _registry


def get_adapter(vertical_id: str | VerticalId) -> BaseVerticalAdapter:
    """
    Convenience-Funktion: Holt einen Adapter direkt.
    
    Args:
        vertical_id: ID des Verticals
        
    Returns:
        Der entsprechende Adapter
    """
    return get_registry().get(vertical_id)


# ═══════════════════════════════════════════════════════════════════════════
# TYPE ALIASES für einfachere Verwendung
# ═══════════════════════════════════════════════════════════════════════════

AdapterType = Type[BaseVerticalAdapter]

