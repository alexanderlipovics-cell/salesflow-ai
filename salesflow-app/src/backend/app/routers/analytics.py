"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ANALYTICS ROUTER (Legacy - wird nicht mehr verwendet)                     ║
║  Bitte verwende: app.api.routes.analytics                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Diese Datei existiert nur, um Import-Fehler zu vermeiden, falls alte Dateien
im Deployment noch vorhanden sind. Alle Router sollten aus app.api.routes
importiert werden.
"""

# Importiere den korrekten Router aus api.routes
from ..api.routes.analytics import router

__all__ = ["router"]

