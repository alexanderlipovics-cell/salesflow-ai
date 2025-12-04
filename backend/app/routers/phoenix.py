"""
Phoenix/Phönix Router - Außendienst-Assistent
Hilft bei der Zeitüberbrückung zwischen Terminen
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

router = APIRouter(prefix="/api/phoenix", tags=["phoenix", "field-service"])
logger = logging.getLogger(__name__)


# --- MODELS ---

class SpotModel(BaseModel):
    """Spot/Location Model"""
    id: Optional[str] = None
    name: str
    type: str = "cafe"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[int] = None
    rating: Optional[float] = None
    notes: Optional[str] = None


class SuggestionModel(BaseModel):
    """Activity Suggestion Model"""
    activity: str
    duration: int
    type: str


# --- DEMO DATA ---

_demo_spots = [
    {"id": "1", "name": "Café Central", "type": "cafe", "distance": 250, "rating": 4.5, "notes": "Guter Kaffee, WLAN"},
    {"id": "2", "name": "Starbucks", "type": "cafe", "distance": 400, "rating": 4.0, "notes": "Überall verfügbar"},
    {"id": "3", "name": "WeWork", "type": "coworking", "distance": 800, "rating": 4.3, "notes": "Day Pass möglich"},
    {"id": "4", "name": "Stadtpark", "type": "park", "distance": 1200, "rating": 4.8, "notes": "Gut für Calls im Freien"},
    {"id": "5", "name": "Bibliothek", "type": "library", "distance": 600, "rating": 4.2, "notes": "Ruhig zum Arbeiten"},
]


# --- ENDPOINTS ---

@router.get("/spots")
async def get_spots(
    location: Optional[str] = Query(None, description="Standort-Beschreibung"),
    latitude: Optional[float] = Query(None, description="Breitengrad"),
    longitude: Optional[float] = Query(None, description="Längengrad"),
    radius: int = Query(5000, ge=100, le=50000, description="Suchradius in Metern"),
    type: Optional[str] = Query(None, description="Spot-Typ: cafe, coworking, park, library, other")
):
    """
    Findet Spots in der Nähe für produktive Zeitüberbrückung.
    """
    spots = _demo_spots.copy()
    
    # Filter by type
    if type:
        spots = [s for s in spots if s.get("type") == type]
    
    # Filter by radius (demo: just filter by distance)
    spots = [s for s in spots if s.get("distance", 0) <= radius]
    
    return {
        "spots": spots,
        "count": len(spots),
        "location": location or "Aktueller Standort",
        "radius": radius
    }


@router.get("/spots/{spot_id}")
async def get_spot(spot_id: str):
    """Get single spot details."""
    spot = next((s for s in _demo_spots if s["id"] == spot_id), None)
    if not spot:
        raise HTTPException(status_code=404, detail="Spot nicht gefunden")
    return spot


@router.post("/spots")
async def save_spot(spot: SpotModel):
    """Save a new favorite spot."""
    new_spot = spot.model_dump()
    new_spot["id"] = f"spot_{len(_demo_spots) + 1}"
    _demo_spots.append(new_spot)
    
    return {
        "success": True,
        "spot": new_spot,
        "message": "Spot gespeichert"
    }


@router.get("/suggestions")
async def get_suggestions(
    time_minutes: int = Query(30, ge=5, le=480, description="Verfügbare Zeit in Minuten"),
    location: Optional[str] = Query(None, description="Aktueller Standort")
):
    """
    Gibt Aktivitätsvorschläge basierend auf verfügbarer Zeit.
    """
    suggestions = []
    
    if time_minutes >= 5:
        suggestions.append({
            "activity": "LinkedIn-Beiträge checken und kommentieren",
            "duration": 5,
            "type": "networking",
            "priority": "medium"
        })
    
    if time_minutes >= 10:
        suggestions.append({
            "activity": "Quick Follow-up WhatsApp an warme Leads",
            "duration": 10,
            "type": "sales",
            "priority": "high"
        })
    
    if time_minutes >= 15:
        suggestions.append({
            "activity": "E-Mails beantworten",
            "duration": 15,
            "type": "admin",
            "priority": "medium"
        })
    
    if time_minutes >= 20:
        suggestions.append({
            "activity": "Kaffee + Lead-Notizen durchgehen",
            "duration": 20,
            "type": "productive",
            "priority": "high"
        })
    
    if time_minutes >= 30:
        suggestions.append({
            "activity": "Präsentation für nächsten Termin vorbereiten",
            "duration": 30,
            "type": "prep",
            "priority": "high"
        })
        suggestions.append({
            "activity": "Kurzer Spaziergang zur Entspannung",
            "duration": 15,
            "type": "wellness",
            "priority": "low"
        })
    
    if time_minutes >= 45:
        suggestions.append({
            "activity": "Cold Calls machen (ruhiger Ort empfohlen)",
            "duration": 45,
            "type": "sales",
            "priority": "high"
        })
    
    if time_minutes >= 60:
        suggestions.append({
            "activity": "Deep Work: Angebote schreiben",
            "duration": 60,
            "type": "productive",
            "priority": "high"
        })
    
    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_order.get(x.get("priority", "medium"), 1))
    
    return {
        "suggestions": suggestions[:5],  # Top 5 suggestions
        "available_time": time_minutes,
        "location": location,
        "count": len(suggestions)
    }


@router.get("/nearby-leads")
async def get_nearby_leads(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radius_km: int = Query(10, ge=1, le=100)
):
    """
    Findet Leads in der Nähe für spontane Besuche.
    """
    # Demo data
    return {
        "leads": [
            {"id": "1", "name": "Max Mustermann", "company": "TechCorp", "distance_km": 2.5, "status": "warm"},
            {"id": "2", "name": "Anna Schmidt", "company": "FinanceAG", "distance_km": 4.8, "status": "hot"},
            {"id": "3", "name": "Peter Weber", "company": "StartupXY", "distance_km": 7.2, "status": "cold"},
        ],
        "radius_km": radius_km,
        "count": 3
    }


@router.post("/log-activity")
async def log_activity(data: dict):
    """
    Loggt eine Aktivität während der Wartezeit.
    """
    return {
        "success": True,
        "logged": {
            "activity": data.get("activity", "Unbekannt"),
            "duration": data.get("duration", 0),
            "spot_id": data.get("spot_id"),
            "timestamp": "2025-12-04T10:30:00Z"
        },
        "message": "Aktivität geloggt"
    }

