# backend/app/services/phoenix/service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🔥 PHOENIX SERVICE                                                         ║
║  Außendienst-Reaktivierungs-System mit GPS Intelligence                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- GPS-basierte Lead-Suche
- Proximity Alerts
- Territory Management
- Smart Reactivation
- Field Visit Tracking
"""

import math
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from uuid import UUID
from dataclasses import dataclass, field

from supabase import Client


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class NearbyLead:
    """Lead in der Nähe"""
    lead_id: str
    name: str
    status: str
    phone: Optional[str]
    address: Optional[str]
    city: Optional[str]
    distance_meters: int
    days_since_contact: int
    last_contact_at: Optional[datetime]
    priority_score: int
    suggested_action: str
    suggested_message: Optional[str] = None
    
    @property
    def distance_km(self) -> float:
        return round(self.distance_meters / 1000, 1)
    
    @property
    def travel_time_minutes(self) -> int:
        """Geschätzte Fahrzeit (50 km/h Durchschnitt in Stadt)"""
        return max(1, int(self.distance_meters / 833))  # ~50km/h


@dataclass
class PhoenixSuggestion:
    """Phoenix Vorschlag für Außendienst"""
    id: str
    lead_id: str
    lead_name: str
    trigger_type: str
    reason: str
    distance_meters: Optional[int]
    suggested_action: str
    suggested_message: Optional[str]
    priority: int
    valid_until: Optional[datetime]


@dataclass
class ProximityAlert:
    """Proximity Alert für nahen Lead"""
    id: str
    lead_id: str
    lead_name: str
    alert_type: str
    title: str
    message: str
    distance_meters: int
    priority: str
    appointment_id: Optional[str] = None
    appointment_title: Optional[str] = None


@dataclass
class FieldSession:
    """Aktive Außendienst-Session"""
    id: str
    session_type: str
    started_at: datetime
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    leads_suggested: int
    leads_visited: int
    leads_contacted: int
    leads_reactivated: int
    settings: Dict[str, Any]


@dataclass
class TerritorySummary:
    """Territory-Zusammenfassung"""
    id: str
    name: str
    lead_count: int
    active_leads: int
    cold_leads: int
    reactivation_candidates: int
    last_sweep_at: Optional[datetime]


# =============================================================================
# PHOENIX SERVICE
# =============================================================================

class PhoenixService:
    """
    🔥 Phoenix Service für Außendienst-Intelligence
    
    Hauptfunktionen:
    - find_nearby_leads() - Leads in der Nähe finden
    - get_appointment_opportunities() - Leads nahe heutigem Termin
    - start_field_session() - Außendienst-Session starten
    - get_reactivation_candidates() - Reaktivierungs-Kandidaten
    - create_proximity_alerts() - Alerts für nahe Leads
    """
    
    # XP Rewards
    XP_FIELD_VISIT = 15
    XP_REACTIVATION_SUCCESS = 25
    XP_PROXIMITY_CONTACT = 10
    XP_TERRITORY_SWEEP = 50
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # NEARBY LEADS
    # =========================================================================
    
    def find_nearby_leads(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
        radius_meters: int = 5000,
        min_days_since_contact: int = 14,
        limit: int = 20,
        include_cold: bool = False,
    ) -> List[NearbyLead]:
        """
        Findet Leads in der Nähe einer Position.
        
        Use Cases:
        - "Bin zu früh beim Termin"
        - "Hab noch Zeit, wen kann ich besuchen?"
        - Territory Sweep
        """
        
        try:
            # Nutze DB-Funktion für Geo-Query
            result = self.db.rpc("find_leads_near_location", {
                "p_user_id": user_id,
                "p_latitude": latitude,
                "p_longitude": longitude,
                "p_radius_meters": radius_meters,
                "p_min_days_since_contact": min_days_since_contact,
                "p_limit": limit,
            }).execute()
            
            leads = []
            for row in result.data or []:
                # Suggested Action basierend auf Status
                action = self._suggest_action(
                    status=row.get("lead_status"),
                    days_since_contact=row.get("days_since_contact", 0),
                    distance=row.get("distance_meters", 0),
                )
                
                leads.append(NearbyLead(
                    lead_id=row["lead_id"],
                    name=row.get("lead_name", "Unbekannt"),
                    status=row.get("lead_status", "unknown"),
                    phone=row.get("lead_phone"),
                    address=row.get("lead_address"),
                    city=None,
                    distance_meters=row.get("distance_meters", 0),
                    days_since_contact=row.get("days_since_contact", 0),
                    last_contact_at=row.get("last_contact_at"),
                    priority_score=row.get("priority_score", 0),
                    suggested_action=action,
                    suggested_message=self._generate_spontaneous_message(
                        name=row.get("lead_name"),
                        days_since_contact=row.get("days_since_contact", 0),
                    ),
                ))
            
            # Filter cold leads if not wanted
            if not include_cold:
                leads = [l for l in leads if l.status != "cold"]
            
            return leads
            
        except Exception as e:
            print(f"Phoenix find_nearby_leads error: {e}")
            return self._fallback_nearby_leads(user_id, latitude, longitude, radius_meters, limit)
    
    def _fallback_nearby_leads(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
        radius_meters: int,
        limit: int,
    ) -> List[NearbyLead]:
        """Fallback wenn RPC nicht funktioniert"""
        
        # Berechne Bounding Box für grobe Filterung
        # 1 Grad ≈ 111km, also radius_meters / 111000 Grad
        lat_delta = radius_meters / 111000
        lon_delta = radius_meters / (111000 * math.cos(math.radians(latitude)))
        
        result = self.db.table("leads").select(
            "id, first_name, last_name, status, phone, address, latitude, longitude, last_contact_at"
        ).eq(
            "user_id", user_id
        ).not_.is_("latitude", "null").gte(
            "latitude", latitude - lat_delta
        ).lte(
            "latitude", latitude + lat_delta
        ).gte(
            "longitude", longitude - lon_delta
        ).lte(
            "longitude", longitude + lon_delta
        ).limit(limit * 2).execute()
        
        leads = []
        for row in result.data or []:
            distance = self._haversine_distance(
                latitude, longitude,
                float(row["latitude"]), float(row["longitude"])
            )
            
            if distance <= radius_meters:
                days_since = self._days_since(row.get("last_contact_at"))
                
                leads.append(NearbyLead(
                    lead_id=row["id"],
                    name=f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Unbekannt",
                    status=row.get("status", "unknown"),
                    phone=row.get("phone"),
                    address=row.get("address"),
                    city=None,
                    distance_meters=int(distance),
                    days_since_contact=days_since,
                    last_contact_at=row.get("last_contact_at"),
                    priority_score=50,
                    suggested_action="visit",
                ))
        
        # Sort by distance
        leads.sort(key=lambda x: x.distance_meters)
        return leads[:limit]
    
    # =========================================================================
    # APPOINTMENT OPPORTUNITIES
    # =========================================================================
    
    def get_appointment_opportunities(
        self,
        user_id: str,
        radius_meters: int = 3000,
        min_days_since_contact: int = 14,
    ) -> List[Dict[str, Any]]:
        """
        Findet Leads in der Nähe von heutigen Terminen.
        
        Perfect für: "Du hast um 14 Uhr einen Termin bei X.
        In der Nähe ist Y, den du seit 45 Tagen nicht kontaktiert hast."
        """
        
        try:
            result = self.db.rpc("get_nearby_appointment_leads", {
                "p_user_id": user_id,
                "p_radius_meters": radius_meters,
                "p_min_days_since_contact": min_days_since_contact,
            }).execute()
            
            # Group by appointment
            appointments = {}
            for row in result.data or []:
                apt_id = row["appointment_id"]
                if apt_id not in appointments:
                    appointments[apt_id] = {
                        "appointment_id": apt_id,
                        "appointment_title": row.get("appointment_title"),
                        "appointment_time": row.get("appointment_time"),
                        "appointment_address": row.get("appointment_address"),
                        "buffer_minutes": row.get("buffer_minutes", 30),
                        "nearby_leads": [],
                    }
                
                appointments[apt_id]["nearby_leads"].append({
                    "lead_id": row["lead_id"],
                    "lead_name": row.get("lead_name"),
                    "lead_status": row.get("lead_status"),
                    "lead_phone": row.get("lead_phone"),
                    "distance_meters": row.get("distance_meters"),
                    "days_since_contact": row.get("days_since_contact"),
                })
            
            return list(appointments.values())
            
        except Exception as e:
            print(f"Phoenix appointment opportunities error: {e}")
            return []
    
    # =========================================================================
    # FIELD SESSIONS
    # =========================================================================
    
    def start_field_session(
        self,
        user_id: str,
        session_type: str,
        latitude: float,
        longitude: float,
        settings: Dict[str, Any] = None,
    ) -> FieldSession:
        """
        Startet eine Außendienst-Session.
        
        Session Types:
        - 'field_day': Normaler Außendienst-Tag
        - 'territory_sweep': Gebiet systematisch abarbeiten
        - 'appointment_buffer': Zwischen Terminen
        - 'reactivation_blitz': Fokus auf Reaktivierung
        """
        
        settings = settings or {
            "max_radius_km": 5,
            "min_days_since_contact": 30,
            "include_cold_leads": False,
            "auto_suggest": True,
        }
        
        result = self.db.table("phoenix_sessions").insert({
            "user_id": user_id,
            "session_type": session_type,
            "start_latitude": latitude,
            "start_longitude": longitude,
            "current_latitude": latitude,
            "current_longitude": longitude,
            "last_location_update": datetime.utcnow().isoformat(),
            "settings": settings,
            "is_active": True,
        }).execute()
        
        if not result.data:
            raise Exception("Session konnte nicht gestartet werden")
        
        session_data = result.data[0]
        
        return FieldSession(
            id=session_data["id"],
            session_type=session_type,
            started_at=datetime.fromisoformat(session_data["started_at"].replace("Z", "+00:00")),
            current_latitude=latitude,
            current_longitude=longitude,
            leads_suggested=0,
            leads_visited=0,
            leads_contacted=0,
            leads_reactivated=0,
            settings=settings,
        )
    
    def update_session_location(
        self,
        session_id: str,
        user_id: str,
        latitude: float,
        longitude: float,
    ) -> List[NearbyLead]:
        """
        Aktualisiert Position und gibt neue Vorschläge.
        """
        
        # Update location
        self.db.table("phoenix_sessions").update({
            "current_latitude": latitude,
            "current_longitude": longitude,
            "last_location_update": datetime.utcnow().isoformat(),
        }).eq("id", session_id).eq("user_id", user_id).execute()
        
        # Get session settings
        session = self.db.table("phoenix_sessions").select(
            "settings"
        ).eq("id", session_id).single().execute()
        
        settings = session.data.get("settings", {}) if session.data else {}
        
        # Find nearby leads
        return self.find_nearby_leads(
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            radius_meters=settings.get("max_radius_km", 5) * 1000,
            min_days_since_contact=settings.get("min_days_since_contact", 30),
            include_cold=settings.get("include_cold_leads", False),
        )
    
    def end_field_session(
        self,
        session_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Beendet eine Session und gibt Zusammenfassung.
        """
        
        # Get session stats
        session = self.db.table("phoenix_sessions").select("*").eq(
            "id", session_id
        ).eq("user_id", user_id).single().execute()
        
        if not session.data:
            raise Exception("Session nicht gefunden")
        
        # Update to ended
        self.db.table("phoenix_sessions").update({
            "ended_at": datetime.utcnow().isoformat(),
            "is_active": False,
        }).eq("id", session_id).execute()
        
        data = session.data
        
        # Calculate XP
        xp_earned = (
            data.get("leads_visited", 0) * self.XP_FIELD_VISIT +
            data.get("leads_reactivated", 0) * self.XP_REACTIVATION_SUCCESS
        )
        
        if data.get("session_type") == "territory_sweep":
            xp_earned += self.XP_TERRITORY_SWEEP
        
        # Award XP
        self._award_xp(user_id, xp_earned, f"phoenix_session_{data.get('session_type')}")
        
        return {
            "session_id": session_id,
            "session_type": data.get("session_type"),
            "duration_minutes": self._calculate_duration(data.get("started_at")),
            "leads_suggested": data.get("leads_suggested", 0),
            "leads_visited": data.get("leads_visited", 0),
            "leads_contacted": data.get("leads_contacted", 0),
            "leads_reactivated": data.get("leads_reactivated", 0),
            "distance_km": data.get("distance_traveled_km", 0),
            "xp_earned": xp_earned,
        }
    
    # =========================================================================
    # FIELD VISITS
    # =========================================================================
    
    def log_field_visit(
        self,
        user_id: str,
        lead_id: str,
        latitude: float,
        longitude: float,
        visit_type: str,
        outcome: str,
        notes: Optional[str] = None,
        next_action_type: Optional[str] = None,
        next_action_date: Optional[date] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Protokolliert einen Außendienst-Besuch.
        """
        
        result = self.db.table("field_visits").insert({
            "user_id": user_id,
            "lead_id": lead_id,
            "latitude": latitude,
            "longitude": longitude,
            "visit_type": visit_type,
            "outcome": outcome,
            "notes": notes,
            "source": "phoenix_suggestion" if session_id else "manual",
            "next_action_type": next_action_type,
            "next_action_date": next_action_date.isoformat() if next_action_date else None,
        }).execute()
        
        # Update session stats if in session
        if session_id:
            self.db.table("phoenix_sessions").update({
                "leads_visited": self.db.table("phoenix_sessions").select("leads_visited").eq("id", session_id).single().execute().data.get("leads_visited", 0) + 1,
            }).eq("id", session_id).execute()
            
            if outcome == "successful":
                self.db.table("phoenix_sessions").update({
                    "leads_reactivated": self.db.table("phoenix_sessions").select("leads_reactivated").eq("id", session_id).single().execute().data.get("leads_reactivated", 0) + 1,
                }).eq("id", session_id).execute()
        
        # Award XP
        xp = self.XP_FIELD_VISIT
        if outcome == "successful":
            xp += self.XP_REACTIVATION_SUCCESS
        
        self._award_xp(user_id, xp, "field_visit")
        
        return {
            "visit_id": result.data[0]["id"] if result.data else None,
            "xp_earned": xp,
        }
    
    # =========================================================================
    # REACTIVATION CANDIDATES
    # =========================================================================
    
    def get_reactivation_candidates(
        self,
        user_id: str,
        territory_id: Optional[str] = None,
        min_days_inactive: int = 60,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Holt Reaktivierungs-Kandidaten.
        """
        
        try:
            result = self.db.rpc("get_territory_reactivation_candidates", {
                "p_user_id": user_id,
                "p_territory_id": territory_id,
                "p_min_days_inactive": min_days_inactive,
                "p_limit": limit,
            }).execute()
            
            return result.data or []
            
        except Exception as e:
            print(f"Phoenix reactivation candidates error: {e}")
            return []
    
    # =========================================================================
    # PROXIMITY ALERTS
    # =========================================================================
    
    def create_proximity_alerts(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
        radius_meters: int = 2000,
        triggered_by: str = "location_update",
    ) -> List[ProximityAlert]:
        """
        Erstellt Proximity Alerts für nahe Leads.
        """
        
        # Find nearby leads
        nearby = self.find_nearby_leads(
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            min_days_since_contact=30,
            limit=5,
        )
        
        alerts = []
        for lead in nearby:
            # Check if alert already exists
            existing = self.db.table("phoenix_alerts").select("id").eq(
                "user_id", user_id
            ).eq("lead_id", lead.lead_id).eq(
                "status", "pending"
            ).execute()
            
            if existing.data:
                continue  # Skip if alert exists
            
            # Determine alert type and priority
            if lead.days_since_contact > 90:
                alert_type = "nearby_old_customer"
                priority = "high"
                title = f"🔥 {lead.name} seit {lead.days_since_contact} Tagen nicht kontaktiert!"
            elif lead.status == "hot":
                alert_type = "nearby_cold_lead"
                priority = "urgent"
                title = f"🎯 Hot Lead {lead.name} nur {lead.distance_km}km entfernt!"
            else:
                alert_type = "reactivation_opportunity"
                priority = "medium"
                title = f"📍 {lead.name} in der Nähe"
            
            message = f"{lead.distance_km}km entfernt • Letzter Kontakt vor {lead.days_since_contact} Tagen"
            if lead.address:
                message += f" • {lead.address}"
            
            # Create alert
            result = self.db.table("phoenix_alerts").insert({
                "user_id": user_id,
                "lead_id": lead.lead_id,
                "alert_type": alert_type,
                "triggered_by": triggered_by,
                "user_latitude": latitude,
                "user_longitude": longitude,
                "lead_latitude": None,  # Would need lead's lat/lon
                "lead_longitude": None,
                "distance_meters": lead.distance_meters,
                "title": title,
                "message": message,
                "priority": priority,
                "expires_at": (datetime.utcnow() + timedelta(hours=4)).isoformat(),
            }).execute()
            
            if result.data:
                alerts.append(ProximityAlert(
                    id=result.data[0]["id"],
                    lead_id=lead.lead_id,
                    lead_name=lead.name,
                    alert_type=alert_type,
                    title=title,
                    message=message,
                    distance_meters=lead.distance_meters,
                    priority=priority,
                ))
        
        return alerts
    
    def get_pending_alerts(
        self,
        user_id: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Holt offene Alerts.
        """
        
        result = self.db.table("phoenix_alerts").select(
            "*, leads(first_name, last_name, phone, address)"
        ).eq(
            "user_id", user_id
        ).eq(
            "status", "pending"
        ).gt(
            "expires_at", datetime.utcnow().isoformat()
        ).order(
            "priority", desc=True
        ).order("created_at").limit(limit).execute()
        
        return result.data or []
    
    def respond_to_alert(
        self,
        alert_id: str,
        user_id: str,
        action: str,  # 'acted', 'dismissed'
        action_taken: Optional[str] = None,
        action_outcome: Optional[str] = None,
    ):
        """
        Reagiert auf einen Alert.
        """
        
        self.db.table("phoenix_alerts").update({
            "status": action,
            "action_taken": action_taken,
            "action_outcome": action_outcome,
            "acted_at": datetime.utcnow().isoformat() if action == "acted" else None,
        }).eq("id", alert_id).eq("user_id", user_id).execute()
        
        if action == "acted":
            self._award_xp(user_id, self.XP_PROXIMITY_CONTACT, "proximity_alert_acted")
    
    # =========================================================================
    # TERRITORIES
    # =========================================================================
    
    def get_territories(self, user_id: str) -> List[TerritorySummary]:
        """
        Holt User Territories mit Stats.
        """
        
        result = self.db.table("user_territories").select("*").eq(
            "user_id", user_id
        ).eq("is_active", True).execute()
        
        territories = []
        for t in result.data or []:
            territories.append(TerritorySummary(
                id=t["id"],
                name=t["name"],
                lead_count=t.get("lead_count", 0),
                active_leads=t.get("active_lead_count", 0),
                cold_leads=0,  # Would calculate
                reactivation_candidates=0,  # Would calculate
                last_sweep_at=t.get("last_sweep_at"),
            ))
        
        return territories
    
    def create_territory(
        self,
        user_id: str,
        name: str,
        center_latitude: float,
        center_longitude: float,
        radius_km: float,
        postal_codes: Optional[List[str]] = None,
    ) -> str:
        """
        Erstellt ein neues Territory.
        """
        
        # Calculate bounding box
        lat_delta = radius_km / 111
        lon_delta = radius_km / (111 * math.cos(math.radians(center_latitude)))
        
        result = self.db.table("user_territories").insert({
            "user_id": user_id,
            "name": name,
            "center_latitude": center_latitude,
            "center_longitude": center_longitude,
            "radius_km": radius_km,
            "min_latitude": center_latitude - lat_delta,
            "max_latitude": center_latitude + lat_delta,
            "min_longitude": center_longitude - lon_delta,
            "max_longitude": center_longitude + lon_delta,
            "postal_codes": postal_codes or [],
        }).execute()
        
        return result.data[0]["id"] if result.data else None
    
    # =========================================================================
    # "BIN ZU FRÜH" FEATURE
    # =========================================================================
    
    def im_early_for_meeting(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
        minutes_available: int = 30,
        appointment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        🔥 Hauptfeature: "Ich bin zu früh beim Termin!"
        
        Gibt kontextsensitive Vorschläge:
        - Leads in der Nähe zum Besuchen
        - Anrufe die man machen kann
        - Reaktivierungen
        """
        
        # Berechne realistischen Radius basierend auf verfügbarer Zeit
        # ~3 Minuten pro km in der Stadt
        max_radius_meters = min(minutes_available * 333, 5000)  # Max 5km
        
        # Finde Leads in der Nähe
        nearby_leads = self.find_nearby_leads(
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            radius_meters=max_radius_meters,
            min_days_since_contact=7,
            limit=10,
        )
        
        # Kategorisiere nach Aktionstyp
        visit_candidates = []
        call_candidates = []
        
        for lead in nearby_leads:
            travel_time = lead.travel_time_minutes
            time_for_visit = travel_time * 2 + 10  # Hin, Zurück, kurzes Gespräch
            
            if time_for_visit <= minutes_available:
                visit_candidates.append(lead)
            elif lead.phone:
                call_candidates.append(lead)
        
        # Erstelle Suggestions
        suggestions = []
        
        # Top Visit Candidate
        if visit_candidates:
            top = visit_candidates[0]
            suggestions.append({
                "type": "visit",
                "lead_id": top.lead_id,
                "lead_name": top.name,
                "title": f"🚶 {top.name} besuchen ({top.distance_km}km)",
                "description": f"Seit {top.days_since_contact} Tagen nicht kontaktiert. ~{top.travel_time_minutes} Min hin.",
                "priority": "high",
                "suggested_message": top.suggested_message,
            })
        
        # Top Call Candidates
        for lead in call_candidates[:3]:
            suggestions.append({
                "type": "call",
                "lead_id": lead.lead_id,
                "lead_name": lead.name,
                "title": f"📞 {lead.name} anrufen",
                "description": f"Seit {lead.days_since_contact} Tagen nicht kontaktiert. Nur {lead.distance_km}km entfernt.",
                "priority": "medium",
                "phone": lead.phone,
                "suggested_message": self._generate_call_opener(lead.name, lead.days_since_contact),
            })
        
        return {
            "minutes_available": minutes_available,
            "location": {"latitude": latitude, "longitude": longitude},
            "search_radius_km": max_radius_meters / 1000,
            "total_leads_found": len(nearby_leads),
            "visit_candidates": len(visit_candidates),
            "call_candidates": len(call_candidates),
            "suggestions": suggestions,
            "message": self._generate_early_message(
                minutes_available, len(visit_candidates), len(call_candidates)
            ),
        }
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _haversine_distance(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float,
    ) -> float:
        """Berechnet Distanz in Metern"""
        R = 6371000  # Earth radius in meters
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = math.sin(delta_phi/2)**2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda/2)**2
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def _days_since(self, dt_str: Optional[str]) -> int:
        """Berechnet Tage seit Datum"""
        if not dt_str:
            return 999
        try:
            dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            return (datetime.now(dt.tzinfo) - dt).days
        except:
            return 999
    
    def _calculate_duration(self, started_at_str: str) -> int:
        """Berechnet Dauer in Minuten"""
        try:
            started = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
            return int((datetime.now(started.tzinfo) - started).total_seconds() / 60)
        except:
            return 0
    
    def _suggest_action(
        self,
        status: str,
        days_since_contact: int,
        distance: int,
    ) -> str:
        """Schlägt Aktion vor basierend auf Kontext"""
        
        if distance < 500 and days_since_contact > 30:
            return "visit"
        elif status == "hot":
            return "visit"
        elif days_since_contact > 90:
            return "reactivation_visit"
        elif distance < 1000:
            return "drive_by"
        else:
            return "call"
    
    def _generate_spontaneous_message(
        self,
        name: str,
        days_since_contact: int,
    ) -> str:
        """Generiert Spontan-Kontakt Nachricht"""
        
        name = name.split()[0] if name else "du"
        
        if days_since_contact > 90:
            return f"Hey {name}! Ich war gerade in der Nähe und hab an dich gedacht. Hättest du kurz Zeit für einen Kaffee? ☕"
        elif days_since_contact > 30:
            return f"Hey {name}! 👋 Bin zufällig gerade in der Ecke. Hast du 5 Minuten? Wollte eh mal wieder vorbeischauen!"
        else:
            return f"Hey {name}! Bin gerade in deiner Nähe - sollen wir kurz quatschen?"
    
    def _generate_call_opener(
        self,
        name: str,
        days_since_contact: int,
    ) -> str:
        """Generiert Anruf-Opener"""
        
        name = name.split()[0] if name else ""
        
        if days_since_contact > 60:
            return f"Hey {name}, hier ist [Name]! Ich weiß, ist schon ewig her - wie geht's dir?"
        else:
            return f"Hey {name}! Kurz bei dir gemeldet - hast du 2 Minuten?"
    
    def _generate_early_message(
        self,
        minutes: int,
        visit_count: int,
        call_count: int,
    ) -> str:
        """Generiert "Bin zu früh" Nachricht"""
        
        if visit_count > 0:
            return f"🔥 Du hast {minutes} Minuten Zeit! {visit_count} Lead(s) in Besuchs-Reichweite, {call_count} zum Anrufen."
        elif call_count > 0:
            return f"📞 {minutes} Minuten Zeit? {call_count} Lead(s) die du schnell anrufen könntest!"
        else:
            return f"⏱️ {minutes} Minuten Puffer. Keine Leads in direkter Nähe gefunden."
    
    def _award_xp(self, user_id: str, amount: int, reason: str):
        """Vergibt XP"""
        try:
            self.db.table("xp_events").insert({
                "user_id": user_id,
                "amount": amount,
                "reason": reason,
                "source": "phoenix",
            }).execute()
        except Exception as e:
            print(f"Phoenix XP award error: {e}")


# =============================================================================
# FACTORY
# =============================================================================

def get_phoenix_service(db: Client) -> PhoenixService:
    """Factory für PhoenixService"""
    return PhoenixService(db)

