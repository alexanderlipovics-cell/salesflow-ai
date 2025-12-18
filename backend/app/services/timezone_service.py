# file: app/services/timezone_service.py
"""
Timezone Service - Intelligente Zeitberechnung

Features:
- Timezone-aware Zeitberechnung
- "Beste Kontaktzeit" Heuristik (18:00 lokal)
- DACH-optimiert (Default: Europe/Vienna)
"""

from __future__ import annotations

from datetime import datetime, timedelta, time
from typing import Optional, Protocol

try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
except ImportError:
    # Python < 3.9 fallback
    from backports.zoneinfo import ZoneInfo, ZoneInfoNotFoundError  # type: ignore


class TimezoneServiceProtocol(Protocol):
    """Protocol für Timezone Services"""
    
    def now_in_tz(self, tz_name: Optional[str]) -> datetime:
        ...

    def next_best_contact_time(
        self,
        tz_name: Optional[str],
        base: Optional[datetime] = None,
    ) -> datetime:
        ...


class DefaultTimezoneService:
    """
    Einfache Implementierung von TimezoneService.
    
    - Standard-TZ: Europe/Vienna (DACH-optimiert)
    - next_best_contact_time: 18:00 lokale Zeit (Networker arbeiten abends)
    """

    def __init__(self, default_tz: str = "Europe/Vienna") -> None:
        self.default_tz = default_tz

    def _resolve_tz(self, tz_name: Optional[str]) -> ZoneInfo:
        """Löst Timezone-Namen auf, mit Fallback auf Default."""
        name = tz_name or self.default_tz
        try:
            return ZoneInfo(name)
        except ZoneInfoNotFoundError:
            return ZoneInfo(self.default_tz)

    def now_in_tz(self, tz_name: Optional[str]) -> datetime:
        """Gibt aktuelle Zeit in der angegebenen Timezone zurück."""
        tz = self._resolve_tz(tz_name)
        return datetime.now(tz=tz)

    def next_best_contact_time(
        self,
        tz_name: Optional[str],
        base: Optional[datetime] = None,
    ) -> datetime:
        """
        Berechnet die nächste "beste" Kontaktzeit.
        
        Heuristik für Network Marketing:
        - Abends um 18:00 ist optimal (Leute sind nach der Arbeit erreichbar)
        - Falls 18:00 heute schon vorbei → morgen 18:00
        
        Args:
            tz_name: Timezone des Leads
            base: Basis-Zeitpunkt (default: jetzt)
            
        Returns:
            Datetime der empfohlenen Kontaktzeit
        """
        tz = self._resolve_tz(tz_name)
        base_dt = (base or datetime.now(tz=tz)).astimezone(tz)

        # Heuristik: 18:00 lokale Zeit ist optimal für Networker
        target_today = datetime.combine(
            base_dt.date(), 
            time(hour=18, minute=0, second=0), 
            tzinfo=tz
        )

        if target_today > base_dt:
            return target_today

        # Sonst: morgen 18:00
        return target_today + timedelta(days=1)
    
    def next_morning_time(
        self,
        tz_name: Optional[str],
        base: Optional[datetime] = None,
        hour: int = 9,
    ) -> datetime:
        """
        Nächster Morgen um eine bestimmte Uhrzeit.
        
        Nützlich für "Snooze bis morgen früh".
        """
        tz = self._resolve_tz(tz_name)
        base_dt = (base or datetime.now(tz=tz)).astimezone(tz)
        
        target_today = datetime.combine(
            base_dt.date(),
            time(hour=hour, minute=0, second=0),
            tzinfo=tz
        )
        
        if target_today > base_dt:
            return target_today
        
        return target_today + timedelta(days=1)
    
    def next_weekday_time(
        self,
        tz_name: Optional[str],
        target_weekday: int,  # 0 = Montag, 6 = Sonntag
        hour: int = 18,
    ) -> datetime:
        """
        Nächster bestimmter Wochentag um eine bestimmte Uhrzeit.
        
        Nützlich für "Snooze bis nächsten Montag".
        """
        tz = self._resolve_tz(tz_name)
        now = datetime.now(tz=tz)
        
        days_ahead = target_weekday - now.weekday()
        if days_ahead <= 0:  # Ziel-Tag ist heute oder war diese Woche
            days_ahead += 7
        
        target_date = now.date() + timedelta(days=days_ahead)
        return datetime.combine(
            target_date,
            time(hour=hour, minute=0, second=0),
            tzinfo=tz
        )


# Singleton Instance
_timezone_service: Optional[DefaultTimezoneService] = None


def get_timezone_service() -> DefaultTimezoneService:
    """Gibt die Timezone Service Instanz zurück."""
    global _timezone_service
    if _timezone_service is None:
        _timezone_service = DefaultTimezoneService()
    return _timezone_service


__all__ = [
    "TimezoneServiceProtocol",
    "DefaultTimezoneService",
    "get_timezone_service",
]

