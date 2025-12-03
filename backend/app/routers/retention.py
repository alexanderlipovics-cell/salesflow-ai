"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CUSTOMER RETENTION API                                                    ║
║  API für Kundenbindung und Follow-up-Management                           ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/retention", tags=["retention"])


# =============================================================================
# MODELS
# =============================================================================

class TouchpointInfo(BaseModel):
    """Info zu einem Touchpoint."""
    label: str
    emoji: str
    message_goal: str


class NextTouchpoint(BaseModel):
    """Nächster geplanter Touchpoint."""
    touchpoint: str
    days_until: int
    info: TouchpointInfo


class RetentionCustomer(BaseModel):
    """Ein Kunde im Retention-System."""
    id: str
    name: str
    product_name: str
    days_since_purchase: int
    disc_style: Optional[str] = None
    next_touchpoint: Optional[NextTouchpoint] = None
    is_due: bool = False


class RetentionStats(BaseModel):
    """Retention-Statistiken."""
    total_customers: int
    due_today: int
    due_this_week: int
    current_offer_active: bool


class MonthlyOffer(BaseModel):
    """Monats-Angebot für Bestandskunden."""
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    benefit: str
    valid_until: str
    target: str = "Alle Bestandskunden"
    cta: str = "Jetzt sichern!"


class GenerateMessageRequest(BaseModel):
    """Request zum Generieren einer Nachricht."""
    customer_id: str
    include_offer: bool = False


class GenerateMessageResponse(BaseModel):
    """Generierte Nachricht."""
    message_short: str
    message_full: str
    touchpoint: str
    disc_adapted: bool


# =============================================================================
# IN-MEMORY STORE (Demo-Daten)
# =============================================================================

_retention_customers: List[dict] = [
    {
        "id": "cust_001",
        "name": "Max Mustermann",
        "product_name": "Zinzino Balance Oil",
        "days_since_purchase": 3,
        "disc_style": "D",
        "next_touchpoint": {
            "touchpoint": "day_3",
            "days_until": 0,
            "info": {
                "label": "3 Tage Check-in",
                "emoji": "📦",
                "message_goal": "Produktankunft bestätigen",
            },
        },
        "is_due": True,
    },
    {
        "id": "cust_002",
        "name": "Anna Schmidt",
        "product_name": "Zinzino BalanceTest",
        "days_since_purchase": 7,
        "disc_style": "I",
        "next_touchpoint": {
            "touchpoint": "week_1",
            "days_until": 0,
            "info": {
                "label": "1 Woche Check-in",
                "emoji": "💡",
                "message_goal": "Erste Erfahrungen abfragen",
            },
        },
        "is_due": True,
    },
    {
        "id": "cust_003",
        "name": "Thomas Weber",
        "product_name": "Zinzino Viva+",
        "days_since_purchase": 21,
        "disc_style": "S",
        "next_touchpoint": {
            "touchpoint": "week_3",
            "days_until": 0,
            "info": {
                "label": "3 Wochen Check-in",
                "emoji": "📊",
                "message_goal": "Fortschritte besprechen",
            },
        },
        "is_due": True,
    },
]

_current_offer: Optional[dict] = None


# =============================================================================
# TOUCHPOINT TEMPLATES
# =============================================================================

TOUCHPOINT_MESSAGES = {
    "day_3": {
        "D": "Hey {name}! 🎯 Kurze Frage: Ist dein {product} gut angekommen? Alles klar soweit?",
        "I": "Hey {name}! 🎉 Wie aufregend - ist dein {product} schon da? Bin gespannt auf deine ersten Eindrücke!",
        "S": "Hallo {name} 😊 Ich wollte kurz nachfragen, ob dein {product} gut bei dir angekommen ist. Hast du Fragen?",
        "C": "Guten Tag {name}, ich möchte sicherstellen, dass Ihre Bestellung ({product}) korrekt angekommen ist. Bitte melden Sie sich bei Fragen.",
    },
    "week_1": {
        "D": "Hey {name}! 💪 Wie läuft's mit {product}? Schon erste Effekte gespürt?",
        "I": "Hey {name}! 🌟 Eine Woche drin - wie findest du {product} bisher? Erzähl mal!",
        "S": "Hallo {name} 🙏 Wie geht es dir nach der ersten Woche mit {product}? Ich bin hier wenn du Fragen hast.",
        "C": "Guten Tag {name}, nach einer Woche mit {product} würde ich gerne Ihre ersten Erfahrungen dokumentieren.",
    },
    "week_3": {
        "D": "Hey {name}! 📊 3 Wochen {product} - merkst du schon Unterschiede? Zeit für ein kurzes Update?",
        "I": "Hey {name}! 🚀 Wow, schon 3 Wochen! Wie fühlst du dich? Teile gerne deine Story!",
        "S": "Hallo {name} 💙 Nach 3 Wochen wollte ich mal hören, wie es dir mit {product} geht. Alles gut?",
        "C": "Guten Tag {name}, nach 3 Wochen ist ein guter Zeitpunkt für eine Zwischenbilanz mit {product}.",
    },
}


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/stats", response_model=RetentionStats)
async def get_retention_stats(
) -> RetentionStats:
    """
    Holt Retention-Statistiken.
    
    Returns:
        RetentionStats mit Übersicht
    """
    due_today = sum(1 for c in _retention_customers if c.get("is_due", False))
    due_this_week = sum(
        1 for c in _retention_customers 
        if c.get("next_touchpoint", {}).get("days_until", 999) <= 7
    )
    
    return RetentionStats(
        total_customers=len(_retention_customers),
        due_today=due_today,
        due_this_week=due_this_week,
        current_offer_active=_current_offer is not None,
    )


@router.get("/due-today", response_model=List[RetentionCustomer])
async def get_due_today(
    limit: int = 10,
) -> List[RetentionCustomer]:
    """
    Holt heute fällige Kunden.
    
    Args:
        limit: Maximale Anzahl
        
    Returns:
        Liste von RetentionCustomer
    """
    due_customers = [
        RetentionCustomer(**c) 
        for c in _retention_customers 
        if c.get("is_due", False)
    ]
    return due_customers[:limit]


@router.get("/customers", response_model=List[RetentionCustomer])
async def get_all_customers(
    limit: int = 50,
    offset: int = 0,
) -> List[RetentionCustomer]:
    """
    Holt alle Kunden im Retention-System.
    
    Args:
        limit: Maximale Anzahl
        offset: Offset für Paginierung
        
    Returns:
        Liste von RetentionCustomer
    """
    return [
        RetentionCustomer(**c) 
        for c in _retention_customers[offset:offset + limit]
    ]


@router.get("/offer", response_model=Optional[MonthlyOffer])
async def get_current_offer(
) -> Optional[MonthlyOffer]:
    """
    Holt das aktuelle Monatsangebot.
    
    Returns:
        MonthlyOffer oder None
    """
    if _current_offer:
        return MonthlyOffer(**_current_offer)
    return None


@router.post("/offer", response_model=MonthlyOffer)
async def create_offer(
    offer: MonthlyOffer,
) -> MonthlyOffer:
    """
    Erstellt ein neues Monatsangebot.
    
    Args:
        offer: Das zu erstellende Angebot
        
    Returns:
        Das erstellte MonthlyOffer
    """
    global _current_offer
    
    if _current_offer:
        raise HTTPException(
            status_code=400,
            detail="Es existiert bereits ein aktives Angebot. Nur ein Angebot pro Monat möglich.",
        )
    
    _current_offer = {
        "id": str(uuid4()),
        "title": offer.title,
        "description": offer.description,
        "benefit": offer.benefit,
        "valid_until": offer.valid_until,
        "target": offer.target,
        "cta": offer.cta,
    }
    
    logger.info(f"New offer created: {offer.title}")
    
    return MonthlyOffer(**_current_offer)


@router.delete("/offer")
async def delete_offer(
) -> dict:
    """
    Löscht das aktuelle Angebot.
    
    Returns:
        Bestätigung
    """
    global _current_offer
    _current_offer = None
    
    return {"success": True, "message": "Angebot gelöscht"}


@router.post("/generate-message", response_model=GenerateMessageResponse)
async def generate_message(
    request: GenerateMessageRequest,
) -> GenerateMessageResponse:
    """
    Generiert eine personalisierte Nachricht für einen Kunden.
    
    Args:
        request: GenerateMessageRequest mit customer_id
        
    Returns:
        GenerateMessageResponse mit Nachricht
    """
    # Finde Kunden
    customer = next(
        (c for c in _retention_customers if c["id"] == request.customer_id),
        None,
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    touchpoint = customer.get("next_touchpoint", {}).get("touchpoint", "week_1")
    disc_style = customer.get("disc_style", "S")
    name = customer.get("name", "")
    product = customer.get("product_name", "")
    
    # Template holen
    templates = TOUCHPOINT_MESSAGES.get(touchpoint, TOUCHPOINT_MESSAGES["week_1"])
    template = templates.get(disc_style, templates["S"])
    
    # Nachricht generieren
    message = template.format(name=name.split()[0], product=product)
    
    # Angebot anhängen wenn gewünscht
    full_message = message
    if request.include_offer and _current_offer:
        full_message += f"\n\n🎁 Übrigens: {_current_offer['title']} - {_current_offer['benefit']}! {_current_offer['cta']}"
    
    return GenerateMessageResponse(
        message_short=message,
        message_full=full_message,
        touchpoint=touchpoint,
        disc_adapted=True,
    )


@router.post("/mark-contacted/{customer_id}")
async def mark_contacted(
    customer_id: str,
) -> dict:
    """
    Markiert einen Kunden als kontaktiert.
    
    Args:
        customer_id: ID des Kunden
        
    Returns:
        Bestätigung
    """
    # Finde und update Kunden
    for customer in _retention_customers:
        if customer["id"] == customer_id:
            customer["is_due"] = False
            # Nächsten Touchpoint berechnen (vereinfacht)
            current_tp = customer.get("next_touchpoint", {}).get("touchpoint", "day_3")
            next_touchpoints = {
                "day_3": ("week_1", 4),
                "week_1": ("week_3", 14),
                "week_3": ("month_2", 39),
                "month_2": ("month_3", 30),
                "month_3": ("month_6", 90),
                "month_6": ("year_1", 180),
            }
            if current_tp in next_touchpoints:
                next_tp, days = next_touchpoints[current_tp]
                customer["next_touchpoint"] = {
                    "touchpoint": next_tp,
                    "days_until": days,
                    "info": {
                        "label": f"Nächster Check-in",
                        "emoji": "📅",
                        "message_goal": "Follow-up",
                    },
                }
            
            logger.info(f"Customer {customer_id} marked as contacted")
            
            return {
                "success": True,
                "message": f"Kunde als kontaktiert markiert",
                "next_touchpoint": customer.get("next_touchpoint"),
            }
    
    raise HTTPException(status_code=404, detail="Kunde nicht gefunden")


@router.get("/timeline/{customer_id}")
async def get_customer_timeline(
    customer_id: str,
) -> dict:
    """
    Holt die Timeline eines Kunden.
    
    Args:
        customer_id: ID des Kunden
        
    Returns:
        Timeline mit Touchpoints
    """
    customer = next(
        (c for c in _retention_customers if c["id"] == customer_id),
        None,
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Demo-Timeline
    timeline = [
        {
            "touchpoint": "purchase",
            "date": (datetime.now() - timedelta(days=customer["days_since_purchase"])).isoformat(),
            "status": "completed",
            "notes": "Kauf abgeschlossen",
        },
        {
            "touchpoint": "day_3",
            "date": (datetime.now() - timedelta(days=max(0, customer["days_since_purchase"] - 3))).isoformat(),
            "status": "completed" if customer["days_since_purchase"] > 3 else "pending",
            "notes": "Lieferung bestätigen",
        },
    ]
    
    return {
        "customer_id": customer_id,
        "customer_name": customer["name"],
        "timeline": timeline,
    }

