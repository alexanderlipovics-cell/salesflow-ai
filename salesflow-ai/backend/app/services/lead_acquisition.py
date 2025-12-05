"""
Sales Flow AI - Non Plus Ultra Lead Acquisition Service

Omnichannel Lead-Erfassung:
- Social Media Webhooks (Facebook, LinkedIn, Instagram)
- Web Form Handler
- Web Scraper für Kontaktdaten
- Import-Pipelines (CSV, API)
- Source Attribution & UTM Tracking

Version 1.0
"""

import re
import csv
import logging
import asyncio
from io import StringIO
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from urllib.parse import urlparse, parse_qs

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION & ENUMS
# ============================================================================

class SourceType(str, Enum):
    """Lead-Quellen"""
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    WEB_FORM = "web_form"
    WEB_SCRAPE = "web_scrape"
    MANUAL = "manual"
    IMPORT = "import"
    REFERRAL = "referral"
    CHAT = "chat"
    WHATSAPP = "whatsapp"


class SourceMedium(str, Enum):
    """Traffic-Medien"""
    ORGANIC = "organic"
    PAID = "paid"
    REFERRAL = "referral"
    DIRECT = "direct"
    EMAIL = "email"
    SOCIAL = "social"


# Field Mappings für verschiedene Quellen
FIELD_MAPPINGS = {
    "linkedin": {
        "firstName": "first_name",
        "lastName": "last_name",
        "emailAddress": "email",
        "headline": "title",
        "companyName": "company",
        "industry": "industry",
        "profileUrl": "linkedin_url",
    },
    "facebook": {
        "first_name": "first_name",
        "last_name": "last_name",
        "email": "email",
        "phone_number": "phone",
        "company_name": "company",
        "job_title": "title",
    },
    "instagram": {
        "username": "instagram_handle",
        "full_name": "name",
        "email": "email",
        "bio": "notes",
    },
    "web_form": {
        "name": "name",
        "vorname": "first_name",
        "nachname": "last_name",
        "email": "email",
        "e-mail": "email",
        "telefon": "phone",
        "phone": "phone",
        "firma": "company",
        "company": "company",
        "unternehmen": "company",
        "nachricht": "notes",
        "message": "notes",
    },
    "csv_import": {
        "Name": "name",
        "Vorname": "first_name",
        "Nachname": "last_name",
        "E-Mail": "email",
        "Email": "email",
        "Telefon": "phone",
        "Phone": "phone",
        "Firma": "company",
        "Company": "company",
        "Unternehmen": "company",
        "LinkedIn": "linkedin_url",
        "Website": "company_domain",
        "Notizen": "notes",
        "Notes": "notes",
    }
}


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class RawLeadData:
    """Rohe Lead-Daten vor Normalisierung"""
    source_type: str
    source_platform: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)
    utm_params: Dict[str, str] = field(default_factory=dict)
    referrer_url: Optional[str] = None
    acquisition_url: Optional[str] = None
    form_data: Optional[Dict] = None  # Für Bot-Detection


@dataclass
class NormalizedLead:
    """Normalisierte Lead-Daten"""
    # Kontakt
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Firma
    company: Optional[str] = None
    company_domain: Optional[str] = None
    title: Optional[str] = None
    industry: Optional[str] = None
    
    # Social
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    
    # Meta
    notes: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    # Source Attribution
    source_type: str = "manual"
    source_platform: Optional[str] = None
    source_campaign: Optional[str] = None
    source_medium: str = "direct"
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    referrer_url: Optional[str] = None
    acquisition_url: Optional[str] = None


@dataclass
class AcquisitionResult:
    """Ergebnis einer Lead-Erfassung"""
    success: bool
    lead_id: Optional[str] = None
    is_duplicate: bool = False
    duplicate_lead_id: Optional[str] = None
    normalized_lead: Optional[NormalizedLead] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class ImportResult:
    """Ergebnis eines Batch-Imports"""
    total_rows: int = 0
    imported: int = 0
    duplicates: int = 0
    errors: int = 0
    error_details: List[Dict] = field(default_factory=list)


# ============================================================================
# LEAD ACQUISITION SERVICE
# ============================================================================

class LeadAcquisitionService:
    """
    Non Plus Ultra Lead Acquisition Service
    
    Erfasst Leads aus verschiedenen Kanälen:
    1. Social Media Webhooks
    2. Web Forms
    3. CSV/Excel Import
    4. Manual Entry
    5. Web Scraping (Basic)
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.field_mappings = FIELD_MAPPINGS
    
    # ========================================================================
    # MAIN ACQUISITION FLOW
    # ========================================================================
    
    async def acquire_lead(
        self,
        raw_data: RawLeadData,
        user_id: Optional[str] = None,
        skip_duplicate_check: bool = False,
    ) -> AcquisitionResult:
        """
        Hauptmethode zur Lead-Erfassung.
        
        Args:
            raw_data: Rohe Lead-Daten mit Quellinformationen
            user_id: Optional - User ID für Zuordnung
            skip_duplicate_check: Duplikat-Prüfung überspringen
            
        Returns:
            AcquisitionResult mit Lead-ID und Status
        """
        logger.info(f"Acquiring lead from source: {raw_data.source_type}")
        
        result = AcquisitionResult(success=False)
        
        try:
            # 1. Daten normalisieren
            normalized = self._normalize_lead_data(raw_data)
            result.normalized_lead = normalized
            
            # 2. Validierung
            validation_errors = self._validate_lead(normalized)
            if validation_errors:
                result.errors = validation_errors
                return result
            
            # 3. Duplikat-Check
            if not skip_duplicate_check:
                duplicate = await self._check_duplicate(normalized)
                if duplicate:
                    result.is_duplicate = True
                    result.duplicate_lead_id = duplicate
                    result.warnings.append(f"Duplicate found: {duplicate}")
                    # Optional: Trotzdem Source tracken
                    await self._add_source_to_existing_lead(duplicate, normalized)
                    result.lead_id = duplicate
                    result.success = True
                    return result
            
            # 4. Lead erstellen
            lead_id = await self._create_lead(normalized, user_id)
            result.lead_id = lead_id
            
            # 5. Source Attribution speichern
            await self._save_source_attribution(lead_id, normalized)
            
            result.success = True
            logger.info(f"Lead acquired successfully: {lead_id}")
            
        except Exception as e:
            logger.exception(f"Lead acquisition error: {e}")
            result.errors.append(str(e))
        
        return result
    
    # ========================================================================
    # DATA NORMALIZATION
    # ========================================================================
    
    def _normalize_lead_data(self, raw: RawLeadData) -> NormalizedLead:
        """Normalisiert Lead-Daten aus verschiedenen Quellen"""
        normalized = NormalizedLead(
            source_type=raw.source_type,
            source_platform=raw.source_platform,
            referrer_url=raw.referrer_url,
            acquisition_url=raw.acquisition_url,
        )
        
        # UTM Parameter übernehmen
        if raw.utm_params:
            normalized.utm_source = raw.utm_params.get("utm_source")
            normalized.utm_medium = raw.utm_params.get("utm_medium")
            normalized.utm_campaign = raw.utm_params.get("utm_campaign")
            normalized.utm_content = raw.utm_params.get("utm_content")
            normalized.utm_term = raw.utm_params.get("utm_term")
            
            # Source Medium bestimmen
            if normalized.utm_medium:
                normalized.source_medium = normalized.utm_medium
            elif "cpc" in str(normalized.utm_source or "").lower():
                normalized.source_medium = SourceMedium.PAID.value
        
        # Campaign aus UTM oder Platform
        normalized.source_campaign = normalized.utm_campaign or raw.source_platform
        
        # Field Mapping anwenden
        mapping = self.field_mappings.get(raw.source_type, self.field_mappings.get("web_form", {}))
        
        for source_field, target_field in mapping.items():
            value = raw.raw_data.get(source_field)
            if value and hasattr(normalized, target_field):
                setattr(normalized, target_field, str(value).strip())
        
        # Fallback: Direkte Zuordnung für Standard-Felder
        direct_fields = ["name", "email", "phone", "company", "notes"]
        for field in direct_fields:
            if not getattr(normalized, field, None):
                value = raw.raw_data.get(field)
                if value:
                    setattr(normalized, field, str(value).strip())
        
        # Name zusammensetzen falls nur Vor-/Nachname
        if not normalized.name and (normalized.first_name or normalized.last_name):
            parts = [normalized.first_name, normalized.last_name]
            normalized.name = " ".join(p for p in parts if p)
        
        # Domain aus E-Mail extrahieren
        if normalized.email and not normalized.company_domain:
            normalized.company_domain = self._extract_domain(normalized.email)
        
        # Tags aus Source
        if raw.source_type:
            normalized.tags.append(f"source:{raw.source_type}")
        if raw.source_platform:
            normalized.tags.append(f"platform:{raw.source_platform}")
        
        return normalized
    
    def _extract_domain(self, email: str) -> Optional[str]:
        """Extrahiert Business-Domain aus E-Mail"""
        try:
            domain = email.split("@")[1].lower()
            free_providers = [
                "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                "web.de", "gmx.de", "gmx.net", "t-online.de", "freenet.de",
                "icloud.com", "aol.com", "live.com", "mail.de"
            ]
            if domain not in free_providers:
                return domain
        except:
            pass
        return None
    
    # ========================================================================
    # VALIDATION
    # ========================================================================
    
    def _validate_lead(self, lead: NormalizedLead) -> List[str]:
        """Validiert Lead-Daten"""
        errors = []
        
        # Mindestens ein Kontaktweg
        if not lead.email and not lead.phone and not lead.linkedin_url:
            errors.append("Mindestens E-Mail, Telefon oder LinkedIn URL erforderlich")
        
        # E-Mail Format
        if lead.email:
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, lead.email):
                errors.append(f"Ungültiges E-Mail Format: {lead.email}")
        
        # Name
        if not lead.name and not lead.first_name:
            errors.append("Name oder Vorname erforderlich")
        
        return errors
    
    # ========================================================================
    # DUPLICATE DETECTION
    # ========================================================================
    
    async def _check_duplicate(self, lead: NormalizedLead) -> Optional[str]:
        """Prüft auf existierende Leads"""
        try:
            # 1. E-Mail Check (höchste Priorität)
            if lead.email:
                result = (
                    self.db.table("leads")
                    .select("id")
                    .eq("email", lead.email.lower())
                    .limit(1)
                    .execute()
                )
                if result.data:
                    return result.data[0]["id"]
            
            # 2. Telefon Check
            if lead.phone:
                # Normalisierte Telefonnummer
                phone_normalized = re.sub(r'[^\d+]', '', lead.phone)
                result = (
                    self.db.table("leads")
                    .select("id")
                    .eq("phone", phone_normalized)
                    .limit(1)
                    .execute()
                )
                if result.data:
                    return result.data[0]["id"]
            
            # 3. LinkedIn URL Check
            if lead.linkedin_url:
                result = (
                    self.db.table("leads")
                    .select("id")
                    .eq("linkedin_url", lead.linkedin_url)
                    .limit(1)
                    .execute()
                )
                if result.data:
                    return result.data[0]["id"]
            
        except Exception as e:
            logger.exception(f"Duplicate check error: {e}")
        
        return None
    
    # ========================================================================
    # LEAD CREATION
    # ========================================================================
    
    async def _create_lead(
        self, 
        lead: NormalizedLead, 
        user_id: Optional[str] = None
    ) -> str:
        """Erstellt neuen Lead in DB"""
        data = {
            "name": lead.name or f"{lead.first_name or ''} {lead.last_name or ''}".strip(),
            "email": lead.email.lower() if lead.email else None,
            "phone": re.sub(r'[^\d+]', '', lead.phone) if lead.phone else None,
            "company": lead.company,
            "company_domain": lead.company_domain,
            "title": lead.title,
            "linkedin_url": lead.linkedin_url,
            "notes": lead.notes,
            "tags": lead.tags,
            "platform": self._determine_platform(lead),
            "status": "NEW",
            "temperature": 50,  # Default
            "created_at": datetime.utcnow().isoformat(),
        }
        
        # Owner zuweisen falls vorhanden
        if user_id:
            data["owner_id"] = user_id
        
        result = self.db.table("leads").insert(data).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        raise Exception("Failed to create lead")
    
    def _determine_platform(self, lead: NormalizedLead) -> str:
        """Bestimmt bevorzugte Kommunikationsplattform"""
        if lead.source_type == SourceType.WHATSAPP.value:
            return "WhatsApp"
        elif lead.source_type == SourceType.LINKEDIN.value:
            return "LinkedIn"
        elif lead.source_type == SourceType.FACEBOOK.value:
            return "Facebook"
        elif lead.source_type == SourceType.INSTAGRAM.value:
            return "Instagram"
        elif lead.email:
            return "Email"
        elif lead.phone:
            return "WhatsApp"
        return "WhatsApp"
    
    # ========================================================================
    # SOURCE ATTRIBUTION
    # ========================================================================
    
    async def _save_source_attribution(self, lead_id: str, lead: NormalizedLead) -> None:
        """Speichert Source Attribution"""
        try:
            data = {
                "lead_id": lead_id,
                "source_type": lead.source_type,
                "source_platform": lead.source_platform,
                "source_campaign": lead.source_campaign,
                "source_medium": lead.source_medium,
                "acquisition_url": lead.acquisition_url,
                "referrer_url": lead.referrer_url,
                "utm_source": lead.utm_source,
                "utm_medium": lead.utm_medium,
                "utm_campaign": lead.utm_campaign,
                "utm_content": lead.utm_content,
                "utm_term": lead.utm_term,
                "first_touch_at": datetime.utcnow().isoformat(),
            }
            
            self.db.table("lead_sources").insert(data).execute()
            logger.debug(f"Saved source attribution for lead: {lead_id}")
            
        except Exception as e:
            logger.exception(f"Error saving source attribution: {e}")
    
    async def _add_source_to_existing_lead(self, lead_id: str, lead: NormalizedLead) -> None:
        """Fügt neue Source zu existierendem Lead hinzu (Multi-Touch Attribution)"""
        await self._save_source_attribution(lead_id, lead)
    
    # ========================================================================
    # SOCIAL MEDIA WEBHOOKS
    # ========================================================================
    
    async def handle_facebook_lead_webhook(
        self,
        payload: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> AcquisitionResult:
        """
        Verarbeitet Facebook Lead Ads Webhook.
        
        Payload Format (Facebook):
        {
            "entry": [{
                "changes": [{
                    "value": {
                        "form_id": "...",
                        "leadgen_id": "...",
                        "field_data": [
                            {"name": "email", "values": ["test@example.com"]},
                            {"name": "first_name", "values": ["John"]}
                        ]
                    }
                }]
            }]
        }
        """
        try:
            # Daten extrahieren
            entry = payload.get("entry", [{}])[0]
            change = entry.get("changes", [{}])[0]
            value = change.get("value", {})
            
            # Field Data normalisieren
            field_data = {}
            for field in value.get("field_data", []):
                name = field.get("name")
                values = field.get("values", [])
                if name and values:
                    field_data[name] = values[0]
            
            raw_data = RawLeadData(
                source_type=SourceType.FACEBOOK.value,
                source_platform="facebook_lead_ads",
                raw_data=field_data,
            )
            
            return await self.acquire_lead(raw_data, user_id)
            
        except Exception as e:
            logger.exception(f"Facebook webhook error: {e}")
            return AcquisitionResult(success=False, errors=[str(e)])
    
    async def handle_linkedin_lead_webhook(
        self,
        payload: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> AcquisitionResult:
        """
        Verarbeitet LinkedIn Lead Gen Form Webhook.
        """
        try:
            raw_data = RawLeadData(
                source_type=SourceType.LINKEDIN.value,
                source_platform="linkedin_lead_gen",
                raw_data=payload.get("formResponse", payload),
            )
            
            return await self.acquire_lead(raw_data, user_id)
            
        except Exception as e:
            logger.exception(f"LinkedIn webhook error: {e}")
            return AcquisitionResult(success=False, errors=[str(e)])
    
    async def handle_instagram_lead(
        self,
        payload: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> AcquisitionResult:
        """
        Verarbeitet Instagram Lead (aus DM oder Comment).
        """
        try:
            raw_data = RawLeadData(
                source_type=SourceType.INSTAGRAM.value,
                source_platform="instagram",
                raw_data=payload,
            )
            
            return await self.acquire_lead(raw_data, user_id)
            
        except Exception as e:
            logger.exception(f"Instagram lead error: {e}")
            return AcquisitionResult(success=False, errors=[str(e)])
    
    # ========================================================================
    # WEB FORM HANDLING
    # ========================================================================
    
    async def handle_web_form_submission(
        self,
        form_data: Dict[str, Any],
        form_id: Optional[str] = None,
        page_url: Optional[str] = None,
        referrer: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> AcquisitionResult:
        """
        Verarbeitet Web-Formular Submission.
        
        Args:
            form_data: Formulardaten
            form_id: ID des Formulars
            page_url: URL der Seite mit Formular
            referrer: Referrer URL
            user_id: User ID für Zuordnung
        """
        try:
            # UTM Parameter aus URL extrahieren
            utm_params = {}
            if page_url:
                parsed = urlparse(page_url)
                query_params = parse_qs(parsed.query)
                for param in ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]:
                    if param in query_params:
                        utm_params[param] = query_params[param][0]
            
            # Bot-Detection Daten
            behavioral_data = {
                "honeypot_field": form_data.pop("_honeypot", None),
                "form_start_time": form_data.pop("_form_start", None),
                "form_submit_time": form_data.pop("_form_submit", None),
                "had_mouse_movement": form_data.pop("_had_mouse", True),
            }
            
            raw_data = RawLeadData(
                source_type=SourceType.WEB_FORM.value,
                source_platform=form_id,
                raw_data=form_data,
                utm_params=utm_params,
                referrer_url=referrer,
                acquisition_url=page_url,
                form_data=behavioral_data,
            )
            
            return await self.acquire_lead(raw_data, user_id)
            
        except Exception as e:
            logger.exception(f"Web form error: {e}")
            return AcquisitionResult(success=False, errors=[str(e)])
    
    # ========================================================================
    # CSV IMPORT
    # ========================================================================
    
    async def import_from_csv(
        self,
        csv_content: str,
        user_id: Optional[str] = None,
        skip_duplicates: bool = True,
        default_tags: Optional[List[str]] = None,
    ) -> ImportResult:
        """
        Importiert Leads aus CSV.
        
        Args:
            csv_content: CSV Inhalt als String
            user_id: User ID für Zuordnung
            skip_duplicates: Duplikate überspringen
            default_tags: Tags für alle Leads
            
        Returns:
            ImportResult mit Statistiken
        """
        logger.info("Starting CSV import")
        result = ImportResult()
        
        try:
            # CSV parsen
            reader = csv.DictReader(StringIO(csv_content))
            rows = list(reader)
            result.total_rows = len(rows)
            
            # Batch-Import
            for row_num, row in enumerate(rows, start=2):  # Start bei 2 wegen Header
                try:
                    # Tags hinzufügen
                    tags = default_tags or []
                    tags.append("import:csv")
                    
                    raw_data = RawLeadData(
                        source_type=SourceType.IMPORT.value,
                        source_platform="csv_import",
                        raw_data=row,
                    )
                    
                    acquisition_result = await self.acquire_lead(
                        raw_data, 
                        user_id,
                        skip_duplicate_check=not skip_duplicates
                    )
                    
                    if acquisition_result.success:
                        if acquisition_result.is_duplicate:
                            result.duplicates += 1
                        else:
                            result.imported += 1
                    else:
                        result.errors += 1
                        result.error_details.append({
                            "row": row_num,
                            "data": row,
                            "errors": acquisition_result.errors
                        })
                        
                except Exception as e:
                    result.errors += 1
                    result.error_details.append({
                        "row": row_num,
                        "error": str(e)
                    })
            
            logger.info(
                f"CSV import complete: {result.imported} imported, "
                f"{result.duplicates} duplicates, {result.errors} errors"
            )
            
        except Exception as e:
            logger.exception(f"CSV import error: {e}")
            result.error_details.append({"error": str(e)})
        
        return result
    
    # ========================================================================
    # WEB SCRAPING (Basic)
    # ========================================================================
    
    async def scrape_contact_from_url(
        self,
        url: str,
        user_id: Optional[str] = None,
    ) -> AcquisitionResult:
        """
        Extrahiert Kontaktdaten von einer Webseite (Basic Implementation).
        
        In Production: Puppeteer/Playwright für JS-Rendering.
        """
        logger.info(f"Scraping contact from: {url}")
        
        try:
            import httpx
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, follow_redirects=True, timeout=10.0)
                html = response.text
            
            # E-Mail Extraktion
            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            emails = re.findall(email_pattern, html)
            
            # Telefon Extraktion (deutsch/international)
            phone_patterns = [
                r'\+49\s*\d{2,4}\s*\d{3,8}\s*\d{0,8}',
                r'0\d{2,4}[\s/-]?\d{3,8}[\s/-]?\d{0,8}',
            ]
            phones = []
            for pattern in phone_patterns:
                phones.extend(re.findall(pattern, html))
            
            if not emails and not phones:
                return AcquisitionResult(
                    success=False,
                    errors=["Keine Kontaktdaten gefunden"]
                )
            
            # Domain für Firmennamen
            parsed = urlparse(url)
            domain = parsed.netloc.replace("www.", "")
            
            raw_data = RawLeadData(
                source_type=SourceType.WEB_SCRAPE.value,
                source_platform=domain,
                raw_data={
                    "email": emails[0] if emails else None,
                    "phone": phones[0] if phones else None,
                    "company_domain": domain,
                    "company": domain.split('.')[0].title(),
                },
                acquisition_url=url,
            )
            
            return await self.acquire_lead(raw_data, user_id)
            
        except Exception as e:
            logger.exception(f"Web scrape error: {e}")
            return AcquisitionResult(success=False, errors=[str(e)])
    
    # ========================================================================
    # MANUAL ENTRY
    # ========================================================================
    
    async def create_manual_lead(
        self,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> AcquisitionResult:
        """
        Erstellt Lead manuell.
        """
        raw_data = RawLeadData(
            source_type=SourceType.MANUAL.value,
            source_platform="manual_entry",
            raw_data=data,
        )
        
        result = await self.acquire_lead(raw_data, user_id)
        
        # Zusätzliche Tags
        if tags and result.success and result.lead_id:
            try:
                current = self.db.table("leads").select("tags").eq("id", result.lead_id).execute()
                if current.data:
                    existing_tags = current.data[0].get("tags", []) or []
                    all_tags = list(set(existing_tags + tags))
                    self.db.table("leads").update({"tags": all_tags}).eq("id", result.lead_id).execute()
            except Exception as e:
                logger.warning(f"Could not update tags: {e}")
        
        return result
    
    # ========================================================================
    # CHAT/WHATSAPP LEADS
    # ========================================================================
    
    async def create_lead_from_chat(
        self,
        phone: str,
        name: Optional[str] = None,
        platform: str = "WhatsApp",
        initial_message: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> AcquisitionResult:
        """
        Erstellt Lead aus Chat/WhatsApp Konversation.
        """
        raw_data = RawLeadData(
            source_type=SourceType.CHAT.value if platform != "WhatsApp" else SourceType.WHATSAPP.value,
            source_platform=platform.lower(),
            raw_data={
                "phone": phone,
                "name": name or f"WhatsApp {phone[-4:]}",
                "notes": f"Erste Nachricht: {initial_message}" if initial_message else None,
            },
        )
        
        return await self.acquire_lead(raw_data, user_id)
    
    # ========================================================================
    # ANALYTICS
    # ========================================================================
    
    async def get_acquisition_stats(
        self,
        days: int = 30,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Holt Akquisitions-Statistiken.
        """
        try:
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            # Leads nach Source
            sources_result = (
                self.db.table("lead_sources")
                .select("source_type, source_campaign")
                .gte("created_at", cutoff)
                .execute()
            )
            
            sources = sources_result.data or []
            
            # Aggregieren
            by_source = {}
            by_campaign = {}
            
            for source in sources:
                src_type = source.get("source_type", "unknown")
                campaign = source.get("source_campaign", "none")
                
                by_source[src_type] = by_source.get(src_type, 0) + 1
                by_campaign[campaign] = by_campaign.get(campaign, 0) + 1
            
            return {
                "period_days": days,
                "total_leads": len(sources),
                "by_source": by_source,
                "by_campaign": by_campaign,
                "top_sources": sorted(by_source.items(), key=lambda x: x[1], reverse=True)[:5],
                "top_campaigns": sorted(by_campaign.items(), key=lambda x: x[1], reverse=True)[:5],
            }
            
        except Exception as e:
            logger.exception(f"Stats error: {e}")
            return {}


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def create_lead_acquisition_service(db: Client) -> LeadAcquisitionService:
    """Factory für LeadAcquisitionService"""
    return LeadAcquisitionService(db)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "LeadAcquisitionService",
    "create_lead_acquisition_service",
    "RawLeadData",
    "NormalizedLead",
    "AcquisitionResult",
    "ImportResult",
    "SourceType",
    "SourceMedium",
    "FIELD_MAPPINGS",
]

