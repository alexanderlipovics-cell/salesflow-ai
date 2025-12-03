"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CUSTOMER RETENTION API                                                    ║
║  Kundenbindung & Upselling für Bestandskunden                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET  /retention/customers - Alle Kunden im Retention-Programm
- GET  /retention/due-today - Heute fällige Check-ins
- POST /retention/generate-message - KI-generierte Nachricht
- GET  /retention/offer - Aktuelles Monatsangebot
- POST /retention/offer - Neues Angebot erstellen
- POST /retention/mark-contacted - Kontakt als erledigt markieren
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...config.prompts.chief_customer_retention import (
    build_retention_prompt,
    get_retention_touchpoint,
    get_next_retention_date,
    RETENTION_TOUCHPOINTS,
)

router = APIRouter(
    prefix="/retention",
    tags=["customer-retention"],
)


# =============================================================================
# SCHEMAS
# =============================================================================

class MonthlyOffer(BaseModel):
    """Monatliches Upselling-Angebot"""
    title: str = Field(..., description="Titel des Angebots")
    description: str = Field(..., description="Beschreibung")
    benefit: str = Field(..., description="Rabatt/Vorteil")
    valid_until: str = Field(..., description="Gültig bis (ISO-Datum)")
    target: str = Field(default="Alle Bestandskunden", description="Zielgruppe")
    cta: str = Field(default="Jetzt sichern!", description="Call-to-Action")
    product_id: Optional[str] = Field(None, description="Verknüpftes Produkt")


class RetentionCustomer(BaseModel):
    """Kunde im Retention-Programm"""
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    product_name: str
    purchase_date: str
    days_since_purchase: int
    disc_style: Optional[str]
    next_touchpoint: Optional[Dict]
    is_due: bool
    last_retention_contact: Optional[str]


class GenerateMessageRequest(BaseModel):
    """Request für Nachrichtengenerierung"""
    customer_id: str
    include_offer: bool = Field(default=True)
    channel: str = Field(default="whatsapp")


class GenerateMessageResponse(BaseModel):
    """Generierte Retention-Nachricht"""
    message_short: str
    message_full: str
    subject_line: Optional[str]
    tone: str
    cta_type: str
    follow_up_in_days: int
    touchpoint_info: Dict
    offer_included: bool


class RetentionStats(BaseModel):
    """Retention-Statistiken"""
    total_customers: int
    due_today: int
    due_this_week: int
    contacted_this_month: int
    current_offer_active: bool


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/customers", response_model=List[RetentionCustomer])
async def get_retention_customers(
    status: str = Query("customer", description="Lead-Status filter"),
    due_only: bool = Query(False, description="Nur fällige anzeigen"),
    limit: int = Query(50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt alle Kunden im Retention-Programm.
    
    Filtert nach Status 'customer' (gewonnene Kunden).
    """
    # Query Kunden mit Status 'customer'
    query = db.table("contacts").select(
        "id, name, email, phone, status, created_at, notes, "
        "purchased_product, purchase_date"
    ).eq("user_id", current_user.id).eq("status", status)
    
    result = query.limit(limit).execute()
    
    customers = []
    today = datetime.now().date()
    
    for c in result.data or []:
        # Berechne Tage seit Kauf
        purchase_date = c.get("purchase_date") or c.get("created_at")
        if purchase_date:
            try:
                pd = datetime.fromisoformat(purchase_date.replace('Z', '+00:00')).date()
                days_since = (today - pd).days
            except:
                days_since = 30
        else:
            days_since = 30
        
        # Hole nächsten Touchpoint
        next_tp = get_next_retention_date(purchase_date) if purchase_date else None
        
        # Ist fällig?
        is_due = False
        if next_tp and next_tp.get("days_until", 999) <= 0:
            is_due = True
        
        # Filter wenn nur fällige
        if due_only and not is_due:
            continue
        
        # Hole DISC-Profil (falls vorhanden)
        disc_result = db.table("lead_personality_profiles").select(
            "dominant_style"
        ).eq("lead_id", c["id"]).single().execute()
        
        disc_style = disc_result.data.get("dominant_style") if disc_result.data else None
        
        customers.append(RetentionCustomer(
            id=c["id"],
            name=c["name"],
            email=c.get("email"),
            phone=c.get("phone"),
            product_name=c.get("purchased_product", "Unbekannt"),
            purchase_date=purchase_date or "",
            days_since_purchase=days_since,
            disc_style=disc_style,
            next_touchpoint=next_tp,
            is_due=is_due,
            last_retention_contact=None,  # TODO: Aus retention_contacts Tabelle
        ))
    
    # Sortiere: Fällige zuerst
    customers.sort(key=lambda x: (not x.is_due, x.days_since_purchase))
    
    return customers


@router.get("/due-today", response_model=List[RetentionCustomer])
async def get_due_today(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Holt alle heute fälligen Retention-Kontakte."""
    return await get_retention_customers(
        status="customer",
        due_only=True,
        limit=50,
        current_user=current_user,
        db=db,
    )


@router.get("/stats", response_model=RetentionStats)
async def get_retention_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Holt Retention-Statistiken."""
    
    # Zähle Kunden
    customers_result = db.table("contacts").select(
        "id", count="exact"
    ).eq("user_id", current_user.id).eq("status", "customer").execute()
    
    total = customers_result.count or 0
    
    # Hole alle für Due-Berechnung
    all_customers = await get_retention_customers(
        status="customer",
        due_only=False,
        limit=200,
        current_user=current_user,
        db=db,
    )
    
    due_today = sum(1 for c in all_customers if c.is_due)
    due_week = sum(1 for c in all_customers if c.next_touchpoint and c.next_touchpoint.get("days_until", 999) <= 7)
    
    # Prüfe aktuelles Angebot
    offer_result = db.table("monthly_offers").select("id").eq(
        "user_id", current_user.id
    ).gte("valid_until", date.today().isoformat()).limit(1).execute()
    
    has_offer = len(offer_result.data or []) > 0
    
    return RetentionStats(
        total_customers=total,
        due_today=due_today,
        due_this_week=due_week,
        contacted_this_month=0,  # TODO: Aus retention_contacts
        current_offer_active=has_offer,
    )


@router.post("/generate-message", response_model=GenerateMessageResponse)
async def generate_retention_message(
    request: GenerateMessageRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Generiert eine personalisierte Retention-Nachricht.
    
    Nutzt DISC-Profil und aktuelles Angebot für Personalisierung.
    """
    # Hole Kundendetails
    customer_result = db.table("contacts").select("*").eq(
        "id", request.customer_id
    ).single().execute()
    
    if not customer_result.data:
        raise HTTPException(404, "Kunde nicht gefunden")
    
    customer = customer_result.data
    
    # Hole DISC-Profil
    disc_result = db.table("lead_personality_profiles").select(
        "dominant_style, confidence"
    ).eq("lead_id", request.customer_id).single().execute()
    
    disc_style = disc_result.data.get("dominant_style", "S") if disc_result.data else "S"
    
    # Hole aktuelles Angebot
    current_offer = None
    if request.include_offer:
        offer_result = db.table("monthly_offers").select("*").eq(
            "user_id", current_user.id
        ).gte("valid_until", date.today().isoformat()).order(
            "created_at", desc=True
        ).limit(1).execute()
        
        if offer_result.data:
            offer = offer_result.data[0]
            current_offer = {
                "title": offer.get("title"),
                "description": offer.get("description"),
                "benefit": offer.get("benefit"),
                "valid_until": offer.get("valid_until"),
                "target": offer.get("target"),
                "cta": offer.get("cta"),
            }
    
    # Berechne Touchpoint
    purchase_date = customer.get("purchase_date") or customer.get("created_at")
    touchpoint_info = get_next_retention_date(purchase_date) if purchase_date else None
    
    if not touchpoint_info:
        touchpoint_info = {
            "touchpoint": "general",
            "info": {"label": "Allgemeiner Check-in", "message_goal": "In Kontakt bleiben"},
        }
    
    # Generiere Nachricht (Template-basiert für jetzt)
    # TODO: AI-Integration für personalisierte Nachrichten
    
    messages = _generate_template_message(
        customer_name=customer.get("name", ""),
        product_name=customer.get("purchased_product", "Produkt"),
        disc_style=disc_style,
        touchpoint=touchpoint_info.get("touchpoint", "general"),
        offer=current_offer,
    )
    
    return GenerateMessageResponse(
        message_short=messages["short"],
        message_full=messages["full"],
        subject_line=messages.get("subject"),
        tone=messages["tone"],
        cta_type="upsell" if current_offer else "soft_ask",
        follow_up_in_days=messages.get("follow_up_days", 14),
        touchpoint_info=touchpoint_info.get("info", {}),
        offer_included=current_offer is not None,
    )


@router.get("/offer", response_model=Optional[MonthlyOffer])
async def get_current_offer(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Holt das aktuelle Monatsangebot."""
    
    result = db.table("monthly_offers").select("*").eq(
        "user_id", current_user.id
    ).gte("valid_until", date.today().isoformat()).order(
        "created_at", desc=True
    ).limit(1).execute()
    
    if not result.data:
        return None
    
    offer = result.data[0]
    return MonthlyOffer(
        title=offer.get("title", ""),
        description=offer.get("description", ""),
        benefit=offer.get("benefit", ""),
        valid_until=offer.get("valid_until", ""),
        target=offer.get("target", "Alle Bestandskunden"),
        cta=offer.get("cta", ""),
        product_id=offer.get("product_id"),
    )


@router.post("/offer", response_model=MonthlyOffer)
async def create_monthly_offer(
    offer: MonthlyOffer,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Erstellt ein neues Monatsangebot.
    
    Nur ein aktives Angebot pro Monat erlaubt.
    """
    # Prüfe ob bereits ein Angebot diesen Monat existiert
    this_month = date.today().replace(day=1)
    next_month = (this_month + timedelta(days=32)).replace(day=1)
    
    existing = db.table("monthly_offers").select("id").eq(
        "user_id", current_user.id
    ).gte("created_at", this_month.isoformat()).lt(
        "created_at", next_month.isoformat()
    ).execute()
    
    if existing.data:
        raise HTTPException(
            400, 
            "Du hast diesen Monat bereits ein Angebot erstellt. "
            "Nur ein Angebot pro Monat möglich."
        )
    
    # Erstelle Angebot
    result = db.table("monthly_offers").insert({
        "user_id": current_user.id,
        "title": offer.title,
        "description": offer.description,
        "benefit": offer.benefit,
        "valid_until": offer.valid_until,
        "target": offer.target,
        "cta": offer.cta,
        "product_id": offer.product_id,
    }).execute()
    
    if not result.data:
        raise HTTPException(500, "Angebot konnte nicht erstellt werden")
    
    return offer


@router.post("/mark-contacted/{customer_id}")
async def mark_customer_contacted(
    customer_id: str,
    notes: str = Query(None, description="Notizen zum Kontakt"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Markiert einen Retention-Kontakt als erledigt."""
    
    # Speichere Kontakt
    db.table("retention_contacts").insert({
        "user_id": current_user.id,
        "customer_id": customer_id,
        "contacted_at": datetime.now().isoformat(),
        "notes": notes,
    }).execute()
    
    return {"success": True, "message": "Kontakt gespeichert"}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _generate_template_message(
    customer_name: str,
    product_name: str,
    disc_style: str,
    touchpoint: str,
    offer: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Generiert Template-basierte Nachrichten."""
    
    # DISC-basierte Anrede
    greetings = {
        "D": f"Hi {customer_name}!",
        "I": f"Hey {customer_name}! 🎉",
        "S": f"Hallo {customer_name} 😊",
        "G": f"Guten Tag {customer_name},",
    }
    greeting = greetings.get(disc_style.upper(), greetings["S"])
    
    # Touchpoint-basierte Nachricht
    touchpoint_messages = {
        "day_3": {
            "short": f"Alles angekommen? Fragen zu {product_name}?",
            "full": f"{greeting}\n\nIch wollte kurz nachfragen, ob alles gut angekommen ist und du mit {product_name} zurechtkommst?\n\nBei Fragen bin ich jederzeit für dich da! 💪",
            "tone": "unterstützend",
            "follow_up_days": 4,
        },
        "week_1": {
            "short": f"Wie läuft's mit {product_name}? Tipps?",
            "full": f"{greeting}\n\nEine Woche ist rum! Wie sind deine ersten Erfahrungen mit {product_name}?\n\nIch hätte da noch ein paar Tipps, die vielen helfen. Interesse?",
            "tone": "hilfreich",
            "follow_up_days": 14,
        },
        "week_3": {
            "short": f"Erste Ergebnisse mit {product_name}?",
            "full": f"{greeting}\n\n3 Wochen mit {product_name} - merkst du schon was?\n\nIch würde mich mega freuen, von deinen Erfahrungen zu hören! 🙌",
            "tone": "interessiert",
            "follow_up_days": 14,
        },
        "month_2": {
            "short": "Kennst du jemanden, dem das auch helfen würde?",
            "full": f"{greeting}\n\nDu bist jetzt 2 Monate dabei - ich hoffe, es läuft gut für dich!\n\nKennst du vielleicht jemanden, dem {product_name} auch helfen könnte? Ich würde mich über eine Empfehlung freuen 🤝",
            "tone": "vertrauensvoll",
            "follow_up_days": 30,
        },
        "month_3": {
            "short": "Upgrade-Möglichkeit für dich!",
            "full": f"{greeting}\n\n3 Monate mit {product_name} - du bist ein echter Pro!\n\nIch habe da was, das dich interessieren könnte...",
            "tone": "begeistert",
            "follow_up_days": 30,
        },
    }
    
    base = touchpoint_messages.get(touchpoint, {
        "short": f"Wie geht's dir mit {product_name}?",
        "full": f"{greeting}\n\nIch wollte mal nachfragen, wie es dir mit {product_name} geht?\n\nHast du Fragen oder Feedback?",
        "tone": "freundlich",
        "follow_up_days": 14,
    })
    
    # Füge Angebot hinzu wenn vorhanden
    if offer:
        offer_text = f"\n\n🎁 **Aktuell für dich:**\n{offer['title']}\n{offer['benefit']}\n\n{offer['cta']}"
        base["full"] += offer_text
        base["short"] += f" + {offer['benefit']}"
    
    base["subject"] = f"Kurz nachgefragt zu {product_name}"
    
    return base

