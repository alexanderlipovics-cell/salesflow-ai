"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CUSTOMER RETENTION & UPSELLING PROMPT                                     ║
║  Kundenbindungsprogramm für gewonnene Kunden                               ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Automatische Check-ins nach Kauf
- Personalisierte Nachrichten basierend auf DISC
- Upselling mit aktuellen Angeboten
- Empfehlungsanfragen
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

# =============================================================================
# RETENTION SCHEDULE (Wann kontaktieren)
# =============================================================================

RETENTION_TOUCHPOINTS = {
    "day_3": {
        "label": "3 Tage nach Kauf",
        "purpose": "onboarding_check",
        "message_goal": "Sicherstellen dass alles angekommen ist / funktioniert",
        "emoji": "📦",
    },
    "week_1": {
        "label": "1 Woche nach Kauf",
        "purpose": "usage_check",
        "message_goal": "Erste Erfahrungen abfragen, Tipps geben",
        "emoji": "💡",
    },
    "week_3": {
        "label": "3 Wochen nach Kauf",
        "purpose": "results_check",
        "message_goal": "Erste Ergebnisse besprechen, Testimonial anfragen",
        "emoji": "📊",
    },
    "month_2": {
        "label": "2 Monate nach Kauf",
        "purpose": "referral_ask",
        "message_goal": "Empfehlungen anfragen, Community einladen",
        "emoji": "🤝",
    },
    "month_3": {
        "label": "3 Monate nach Kauf",
        "purpose": "upsell_opportunity",
        "message_goal": "Ergänzendes Produkt/Upgrade anbieten",
        "emoji": "🚀",
    },
    "month_6": {
        "label": "6 Monate nach Kauf",
        "purpose": "loyalty_check",
        "message_goal": "Langzeit-Check, VIP-Status, Jubiläum",
        "emoji": "🏆",
    },
    "year_1": {
        "label": "1 Jahr nach Kauf",
        "purpose": "anniversary",
        "message_goal": "Jubiläum feiern, Erfolge reflektieren",
        "emoji": "🎂",
    },
}

# =============================================================================
# UPSELL TEMPLATES BY DISC
# =============================================================================

UPSELL_APPROACH_BY_DISC = {
    "D": {
        "style": "Direkt und ergebnisorientiert",
        "opening": "Kurz und knapp:",
        "focus": "ROI, Zeitersparnis, Wettbewerbsvorteil",
        "cta": "Interesse? Hier sind die Details:",
        "avoid": "Lange Erklärungen, Small Talk",
    },
    "I": {
        "style": "Enthusiastisch und persönlich",
        "opening": "Hey! Ich hab was Cooles für dich:",
        "focus": "Exklusivität, Community, Spaß, Anerkennung",
        "cta": "Willst du dabei sein? 🎉",
        "avoid": "Zu viele Zahlen, trockene Fakten",
    },
    "S": {
        "style": "Warmherzig und unterstützend",
        "opening": "Ich dachte an dich, weil...",
        "focus": "Sicherheit, bewährte Ergebnisse, kein Risiko",
        "cta": "Kein Druck - überleg es dir in Ruhe",
        "avoid": "Dringlichkeit, aggressive Taktiken",
    },
    "G": {
        "style": "Sachlich und detailliert",
        "opening": "Basierend auf deiner Nutzung:",
        "focus": "Daten, Vergleiche, logische Begründung",
        "cta": "Die Details findest du hier:",
        "avoid": "Übertreibungen, vage Versprechen",
    },
}

# =============================================================================
# MAIN PROMPT
# =============================================================================

CUSTOMER_RETENTION_PROMPT = """
Du bist ein Customer Success Experte für {company_name}.

# DEIN AUFTRAG

Erstelle eine personalisierte Check-in Nachricht für einen Bestandskunden.

# KUNDENINFORMATIONEN

- **Name:** {customer_name}
- **Gekauftes Produkt:** {product_name}
- **Kaufdatum:** {purchase_date}
- **Tage seit Kauf:** {days_since_purchase}
- **DISC-Stil:** {disc_style} ({disc_description})
- **Letzte Interaktion:** {last_interaction}
- **Bisherige Käufe:** {purchase_history}

# TOUCHPOINT-TYP

- **Phase:** {touchpoint_phase}
- **Ziel:** {touchpoint_goal}

# AKTUELLES ANGEBOT (falls vorhanden)

{current_offer}

# REGELN

1. **Persönlich sein** - Nutze den Namen, beziehe dich auf das gekaufte Produkt
2. **DISC beachten** - Passe Ton und Länge an den Persönlichkeitstyp an
3. **Nicht verkäuferisch** - Echtes Interesse zeigen, nicht pushy sein
4. **Mehrwert bieten** - Tipp, Erinnerung, oder hilfreiche Info
5. **Wenn Angebot** - Natürlich einbauen, nicht erzwungen

# DISC-SPEZIFISCHE ANPASSUNG

{disc_approach}

# AUSGABEFORMAT (JSON)

{{
    "message_short": "Kurze WhatsApp-Nachricht (max 160 Zeichen)",
    "message_full": "Vollständige Nachricht mit Anrede",
    "subject_line": "Betreffzeile für E-Mail (falls E-Mail)",
    "tone": "Beschreibung des Tons",
    "cta_type": "none|soft_ask|testimonial_request|upsell|referral",
    "follow_up_in_days": Zahl,
    "personalization_notes": "Warum diese Nachricht so formuliert wurde"
}}
"""

# =============================================================================
# OFFER MANAGEMENT
# =============================================================================

MONTHLY_OFFER_TEMPLATE = """
# AKTUELLES MONATSANGEBOT

**Titel:** {offer_title}
**Gültig bis:** {valid_until}
**Beschreibung:** {offer_description}
**Rabatt/Vorteil:** {offer_benefit}
**Für wen geeignet:** {target_customers}
**CTA:** {offer_cta}
"""

NO_OFFER_TEMPLATE = """
# AKTUELLES ANGEBOT

Kein spezielles Angebot diesen Monat. Fokus auf Beziehungspflege.
"""


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_retention_touchpoint(days_since_purchase: int) -> Optional[Dict]:
    """Bestimmt den passenden Touchpoint basierend auf Tagen seit Kauf."""
    
    if days_since_purchase <= 4:
        return RETENTION_TOUCHPOINTS["day_3"]
    elif days_since_purchase <= 10:
        return RETENTION_TOUCHPOINTS["week_1"]
    elif days_since_purchase <= 25:
        return RETENTION_TOUCHPOINTS["week_3"]
    elif days_since_purchase <= 70:
        return RETENTION_TOUCHPOINTS["month_2"]
    elif days_since_purchase <= 100:
        return RETENTION_TOUCHPOINTS["month_3"]
    elif days_since_purchase <= 200:
        return RETENTION_TOUCHPOINTS["month_6"]
    elif days_since_purchase >= 350:
        return RETENTION_TOUCHPOINTS["year_1"]
    else:
        return None


def get_disc_approach(disc_style: str) -> str:
    """Holt die DISC-spezifische Ansprache."""
    approach = UPSELL_APPROACH_BY_DISC.get(disc_style.upper(), UPSELL_APPROACH_BY_DISC["S"])
    return f"""
**Stil:** {approach['style']}
**Eröffnung:** {approach['opening']}
**Fokus auf:** {approach['focus']}
**Call-to-Action:** {approach['cta']}
**Vermeide:** {approach['avoid']}
"""


def build_retention_prompt(
    customer_name: str,
    product_name: str,
    purchase_date: str,
    company_name: str = "AURA",
    disc_style: str = "S",
    last_interaction: str = "Keine",
    purchase_history: str = "Erstkauf",
    current_offer: Optional[Dict] = None,
) -> str:
    """Baut den vollständigen Retention-Prompt."""
    
    # Berechne Tage seit Kauf
    try:
        purchase_dt = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
        days_since = (datetime.now(purchase_dt.tzinfo or None) - purchase_dt).days
    except:
        days_since = 30  # Fallback
    
    # Hole Touchpoint
    touchpoint = get_retention_touchpoint(days_since)
    if not touchpoint:
        touchpoint = {
            "label": "Regulärer Check-in",
            "purpose": "relationship_maintenance",
            "message_goal": "In Kontakt bleiben, Mehrwert bieten",
        }
    
    # DISC Beschreibung
    disc_descriptions = {
        "D": "Dominant - direkt, entscheidungsfreudig, ergebnisorientiert",
        "I": "Initiativ - enthusiastisch, sozial, optimistisch",
        "S": "Stetig - geduldig, loyal, teamorientiert",
        "G": "Gewissenhaft - analytisch, präzise, qualitätsbewusst",
    }
    
    # Offer-Text
    if current_offer:
        offer_text = MONTHLY_OFFER_TEMPLATE.format(
            offer_title=current_offer.get("title", ""),
            valid_until=current_offer.get("valid_until", ""),
            offer_description=current_offer.get("description", ""),
            offer_benefit=current_offer.get("benefit", ""),
            target_customers=current_offer.get("target", "Alle Bestandskunden"),
            offer_cta=current_offer.get("cta", ""),
        )
    else:
        offer_text = NO_OFFER_TEMPLATE
    
    return CUSTOMER_RETENTION_PROMPT.format(
        company_name=company_name,
        customer_name=customer_name,
        product_name=product_name,
        purchase_date=purchase_date,
        days_since_purchase=days_since,
        disc_style=disc_style.upper(),
        disc_description=disc_descriptions.get(disc_style.upper(), disc_descriptions["S"]),
        last_interaction=last_interaction,
        purchase_history=purchase_history,
        touchpoint_phase=touchpoint["label"],
        touchpoint_goal=touchpoint["message_goal"],
        current_offer=offer_text,
        disc_approach=get_disc_approach(disc_style),
    )


def get_next_retention_date(purchase_date: str) -> Optional[Dict]:
    """Berechnet das nächste Retention-Datum."""
    
    try:
        purchase_dt = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
    except:
        return None
    
    touchpoint_days = {
        "day_3": 3,
        "week_1": 7,
        "week_3": 21,
        "month_2": 60,
        "month_3": 90,
        "month_6": 180,
        "year_1": 365,
    }
    
    now = datetime.now()
    days_since = (now - purchase_dt).days
    
    for key, days in touchpoint_days.items():
        if days > days_since:
            next_date = purchase_dt + timedelta(days=days)
            return {
                "touchpoint": key,
                "date": next_date.isoformat(),
                "days_until": (next_date - now).days,
                "info": RETENTION_TOUCHPOINTS[key],
            }
    
    return None


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "CUSTOMER_RETENTION_PROMPT",
    "RETENTION_TOUCHPOINTS",
    "UPSELL_APPROACH_BY_DISC",
    "MONTHLY_OFFER_TEMPLATE",
    "get_retention_touchpoint",
    "get_disc_approach",
    "build_retention_prompt",
    "get_next_retention_date",
]

