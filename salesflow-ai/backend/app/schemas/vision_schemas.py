"""
Vision Schemas - Strukturierte Daten aus Screenshots

Für die "Magic Screenshot-to-Lead" Pipeline.
GPT-4o Vision analysiert Screenshots und gibt strukturierte Daten zurück.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from enum import Enum


class DetectedPlatform(str, Enum):
    """Erkannte Social Media Plattformen"""
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    WHATSAPP = "whatsapp"
    TWITTER = "twitter"
    XING = "xing"
    UNKNOWN = "unknown"


class LeadIntent(str, Enum):
    """Geschätzte Lead-Intention"""
    BUSINESS = "business"      # Will Business aufbauen
    PRODUCT = "product"        # Nur Produktinteresse
    BOTH = "both"              # Beides möglich
    UNCLEAR = "unclear"        # Nicht erkennbar


class LeadFromImageSchema(BaseModel):
    """
    Die strukturierte Wahrheit, die wir aus dem Screenshot extrahieren.
    
    GPT-4o Vision füllt diese Felder basierend auf der Bildanalyse.
    """
    
    # Plattform-Erkennung
    platform: DetectedPlatform = Field(
        ..., 
        description="Die erkannte Social Media Plattform basierend auf UI-Design."
    )
    
    # Identifikation
    username_handle: Optional[str] = Field(
        None, 
        description="Der @Handle, z.B. @alex_marketing_pro"
    )
    display_name: Optional[str] = Field(
        None, 
        description="Der echte Name, z.B. 'Alex Müller'"
    )
    
    # Bio/Profil Analyse
    bio_text_raw: Optional[str] = Field(
        None, 
        description="Der komplette Text der Bio/Info-Sektion."
    )
    detected_keywords: List[str] = Field(
        default_factory=list, 
        description="5-7 wichtige Keywords aus der Bio (z.B. 'Fitness', 'Coach', 'Mama', 'Entrepreneur')."
    )
    
    # Kontakt-Infos
    website_link: Optional[str] = Field(
        None, 
        description="Ein Link in der Bio, falls vorhanden."
    )
    email_detected: Optional[str] = Field(
        None, 
        description="Eine Email-Adresse, falls sichtbar."
    )
    phone_detected: Optional[str] = Field(
        None, 
        description="Eine Telefonnummer, falls sichtbar."
    )
    location: Optional[str] = Field(
        None, 
        description="Standort, falls angegeben (z.B. 'München, Deutschland')."
    )
    
    # Social Proof
    follower_count_estimate: Optional[str] = Field(
        None, 
        description="Grobschätzung der Followerzahl falls sichtbar (z.B. '10k-50k')."
    )
    following_count: Optional[str] = Field(
        None, 
        description="Anzahl der gefolgten Accounts."
    )
    post_count: Optional[str] = Field(
        None, 
        description="Anzahl der Posts."
    )
    
    # Business-Analyse
    is_business_account: bool = Field(
        False, 
        description="Sieht das nach einem geschäftlichen Profil aus?"
    )
    is_creator_account: bool = Field(
        False, 
        description="Ist es ein Creator/Influencer Account?"
    )
    industry_guess: Optional[str] = Field(
        None, 
        description="Geschätzte Branche (z.B. 'Fitness', 'Coaching', 'Real Estate')."
    )
    
    # Lead Qualifikation
    lead_intent: LeadIntent = Field(
        LeadIntent.UNCLEAR, 
        description="Geschätztes Interesse: Business-Opportunity oder nur Produkt?"
    )
    network_marketing_signals: List[str] = Field(
        default_factory=list, 
        description="Signale die auf NM-Affinität hindeuten (z.B. 'Freiheit', 'passives Einkommen', 'Team')."
    )
    
    # KI-Bewertung
    confidence_score: float = Field(
        ..., 
        ge=0, 
        le=1, 
        description="Wie sicher ist sich die KI bei der Extraktion (0.0 - 1.0)?"
    )
    
    # Erste Aktion
    suggested_icebreaker_topic: Optional[str] = Field(
        None, 
        description="Ein Satz, worauf man die Person ansprechen könnte, basierend auf der Bio."
    )
    suggested_first_message: Optional[str] = Field(
        None, 
        description="Vorschlag für die erste Nachricht (kurz, nicht werblich)."
    )

    model_config = ConfigDict(extra="ignore", protected_namespaces=())  # Ignoriert zusätzliche Felder von der AI


class ScreenshotUploadResponse(BaseModel):
    """Response nach erfolgreichem Screenshot-Import"""
    status: str
    lead_id: str
    lead_name: str
    platform: str
    icebreaker: Optional[str]
    suggested_message: Optional[str]
    confidence: float
    message: str


class ScreenshotAnalysisError(BaseModel):
    """Fehler bei der Screenshot-Analyse"""
    status: str = "error"
    error_code: str
    message: str
    suggestion: Optional[str] = None


__all__ = [
    "DetectedPlatform",
    "LeadIntent",
    "LeadFromImageSchema",
    "ScreenshotUploadResponse",
    "ScreenshotAnalysisError",
]

