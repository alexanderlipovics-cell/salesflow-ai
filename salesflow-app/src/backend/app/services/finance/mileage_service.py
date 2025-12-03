# backend/app/services/finance/mileage_service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MILEAGE SERVICE                                                            ║
║  Fahrtenbuch-Verwaltung                                                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Funktionen:
- Fahrten erfassen
- Kilometerpauschale berechnen
- Fahrtenbuch-Export
- Jahresübersicht

HINWEIS: Das Fahrtenbuch muss zeitnah und vollständig geführt werden!
"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime
from dataclasses import dataclass
from uuid import UUID

from supabase import Client


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class MileageEntry:
    """Fahrtenbuch-Eintrag"""
    date: date
    start_location: str
    end_location: str
    distance_km: float
    purpose: str
    purpose_category: Optional[str] = None  # 'client_visit', 'event', 'training', 'team_meeting', 'other'
    lead_id: Optional[UUID] = None
    vehicle_type: str = "car"  # 'car', 'motorcycle', 'bike', 'public'
    license_plate: Optional[str] = None
    is_round_trip: bool = False


@dataclass
class MileageSummary:
    """Fahrtenbuch-Zusammenfassung"""
    period_start: date
    period_end: date
    total_km: float
    total_amount: float
    trips_count: int
    by_purpose: Dict[str, Dict[str, Any]]  # {purpose: {km, amount, count}}
    rate_per_km: float


# =============================================================================
# SERVICE CLASS
# =============================================================================

class MileageService:
    """
    Mileage Service für Fahrtenbuch-Verwaltung.
    
    TIPP: Fahrten zeitnah erfassen! Am besten direkt nach der Fahrt.
    """
    
    # Standard-Kilometerpauschalen
    DEFAULT_RATES = {
        "AT": 0.42,  # Österreich: 0,42 €/km
        "DE": 0.30,  # Deutschland: 0,30 €/km (ab 2024: erste 20km, danach 0,38€)
        "CH": 0.70,  # Schweiz: ~0,70 CHF/km
    }
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # ENTRIES
    # =========================================================================
    
    async def add_entry(
        self,
        user_id: str,
        entry: MileageEntry,
        rate_per_km: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Fügt einen Fahrtenbuch-Eintrag hinzu"""
        
        # Rate aus Profil holen oder Default verwenden
        if rate_per_km is None:
            profile = await self._get_tax_profile(user_id)
            rate_per_km = float(profile.get("mileage_rate", 0.42)) if profile else 0.42
        
        # Bei Hin- und Rückfahrt: Distanz verdoppeln
        actual_km = entry.distance_km * 2 if entry.is_round_trip else entry.distance_km
        
        insert_data = {
            "user_id": user_id,
            "date": entry.date.isoformat(),
            "start_location": entry.start_location,
            "end_location": entry.end_location,
            "distance_km": actual_km,
            "purpose": entry.purpose,
            "purpose_category": entry.purpose_category,
            "rate_per_km": rate_per_km,
            "vehicle_type": entry.vehicle_type,
            "license_plate": entry.license_plate,
            "is_round_trip": entry.is_round_trip,
        }
        
        if entry.lead_id:
            insert_data["lead_id"] = str(entry.lead_id)
        
        result = self.db.table("finance_mileage_log").insert(insert_data).execute()
        
        if not result.data:
            raise Exception("Fahrt konnte nicht eingetragen werden")
        
        return result.data[0]
    
    async def get_entries(
        self,
        user_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        purpose_category: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Holt Fahrtenbuch-Einträge"""
        
        query = self.db.table("finance_mileage_log").select("*")
        query = query.eq("user_id", user_id)
        
        if from_date:
            query = query.gte("date", from_date.isoformat())
        
        if to_date:
            query = query.lte("date", to_date.isoformat())
        
        if purpose_category:
            query = query.eq("purpose_category", purpose_category)
        
        query = query.order("date", desc=True)
        query = query.limit(limit).offset(offset)
        
        result = query.execute()
        return result.data or []
    
    async def update_entry(
        self,
        user_id: str,
        entry_id: str,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Aktualisiert einen Fahrtenbuch-Eintrag"""
        
        # Verhindere Änderung von user_id
        updates.pop("user_id", None)
        
        result = self.db.table("finance_mileage_log").update(updates).eq(
            "id", entry_id
        ).eq("user_id", user_id).execute()
        
        if not result.data:
            raise Exception("Eintrag nicht gefunden oder keine Berechtigung")
        
        return result.data[0]
    
    async def delete_entry(
        self,
        user_id: str,
        entry_id: str,
    ) -> bool:
        """Löscht einen Fahrtenbuch-Eintrag"""
        
        result = self.db.table("finance_mileage_log").delete().eq(
            "id", entry_id
        ).eq("user_id", user_id).execute()
        
        return bool(result.data)
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    async def get_summary(
        self,
        user_id: str,
        year: int,
    ) -> MileageSummary:
        """Holt Fahrtenbuch-Zusammenfassung für ein Jahr"""
        
        from_date = date(year, 1, 1)
        to_date = date(year, 12, 31)
        
        # Hole alle Einträge
        entries = await self.get_entries(
            user_id=user_id,
            from_date=from_date,
            to_date=to_date,
            limit=1000,
        )
        
        if not entries:
            return MileageSummary(
                period_start=from_date,
                period_end=to_date,
                total_km=0,
                total_amount=0,
                trips_count=0,
                by_purpose={},
                rate_per_km=0.42,
            )
        
        # Aggregiere
        total_km = 0
        total_amount = 0
        by_purpose: Dict[str, Dict[str, Any]] = {}
        rate = 0.42
        
        for entry in entries:
            km = float(entry.get("distance_km", 0))
            amount = float(entry.get("total_amount", 0))
            purpose = entry.get("purpose_category", "other") or "other"
            rate = float(entry.get("rate_per_km", 0.42))
            
            total_km += km
            total_amount += amount
            
            if purpose not in by_purpose:
                by_purpose[purpose] = {"km": 0, "amount": 0, "count": 0}
            
            by_purpose[purpose]["km"] += km
            by_purpose[purpose]["amount"] += amount
            by_purpose[purpose]["count"] += 1
        
        return MileageSummary(
            period_start=from_date,
            period_end=to_date,
            total_km=total_km,
            total_amount=total_amount,
            trips_count=len(entries),
            by_purpose=by_purpose,
            rate_per_km=rate,
        )
    
    # =========================================================================
    # QUICK ADD (für Lead-Besuche)
    # =========================================================================
    
    async def add_from_lead_visit(
        self,
        user_id: str,
        lead_id: str,
        from_location: str,
        distance_km: float,
        visit_purpose: str = "Kundentermin",
        is_round_trip: bool = True,
    ) -> Dict[str, Any]:
        """
        Schnelles Hinzufügen einer Fahrt zu einem Lead-Besuch.
        
        Verknüpft die Fahrt automatisch mit dem Lead.
        """
        
        # Hole Lead-Details für Zielort
        lead_result = self.db.table("leads").select(
            "first_name, last_name"
        ).eq("id", lead_id).single().execute()
        
        lead_name = "Kunde"
        if lead_result.data:
            lead_name = f"{lead_result.data.get('first_name', '')} {lead_result.data.get('last_name', '')}".strip()
        
        entry = MileageEntry(
            date=date.today(),
            start_location=from_location,
            end_location=f"Termin bei {lead_name}",
            distance_km=distance_km,
            purpose=f"{visit_purpose} - {lead_name}",
            purpose_category="client_visit",
            lead_id=UUID(lead_id),
            is_round_trip=is_round_trip,
        )
        
        return await self.add_entry(user_id, entry)
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    async def _get_tax_profile(self, user_id: str) -> Optional[Dict]:
        """Holt Steuerprofil für Kilometerpauschale"""
        
        result = self.db.table("finance_tax_profiles").select("*").eq(
            "user_id", user_id
        ).single().execute()
        
        return result.data if result.data else None
    
    def get_purpose_categories(self) -> List[Dict[str, str]]:
        """Gibt verfügbare Zweck-Kategorien zurück"""
        
        return [
            {"id": "client_visit", "label": "Kundenbesuch", "icon": "👤"},
            {"id": "event", "label": "Event/Veranstaltung", "icon": "🎪"},
            {"id": "training", "label": "Schulung/Weiterbildung", "icon": "📚"},
            {"id": "team_meeting", "label": "Team-Meeting", "icon": "👥"},
            {"id": "other", "label": "Sonstiges", "icon": "🚗"},
        ]


# =============================================================================
# FACTORY
# =============================================================================

_service_instance: Optional[MileageService] = None


def get_mileage_service(db: Client) -> MileageService:
    """Factory für MileageService"""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = MileageService(db)
    
    return _service_instance

