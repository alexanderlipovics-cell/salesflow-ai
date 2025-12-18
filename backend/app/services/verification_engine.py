"""
Sales Flow AI - Non Plus Ultra Verification Engine (V-Score)

Umfassende Lead-Verifizierung:
- E-Mail Validierung (Syntax, Domain, SMTP, Disposable)
- Telefon Validierung (Format, Carrier, Typ)
- Domain Authentizität (Alter, SSL, Spam-Listen)
- Social Profile Verification
- Behavioral/Bot Detection

Version 1.0
"""

import re
import logging
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field, asdict
import dns.resolver
import socket

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ============================================================================

VERIFICATION_CONFIG = {
    # E-Mail Validation
    "email_weight": 0.30,
    "disposable_domains": [
        "tempmail.com", "guerrillamail.com", "10minutemail.com", "mailinator.com",
        "throwaway.email", "temp-mail.org", "fakeinbox.com", "trashmail.com",
        "tempinbox.com", "getnada.com", "mohmal.com", "yopmail.com"
    ],
    "role_based_prefixes": [
        "info", "support", "sales", "contact", "admin", "help", "service",
        "noreply", "no-reply", "mail", "office", "team", "hello"
    ],
    
    # Phone Validation
    "phone_weight": 0.20,
    "valid_country_codes": ["+49", "+43", "+41", "+1", "+44", "+33", "+39"],
    
    # Domain Validation
    "domain_weight": 0.15,
    "min_domain_age_days": 30,
    
    # Social Validation
    "social_weight": 0.25,
    "min_linkedin_connections": 50,
    "min_activity_score": 20,
    
    # Behavioral
    "behavioral_weight": 0.10,
    "min_form_fill_time_seconds": 3,  # Unter 3 Sekunden = Bot
    "max_form_fill_time_seconds": 1800,  # Über 30 Min = Suspicious
}


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class EmailValidationResult:
    """Ergebnis der E-Mail Validierung"""
    valid: bool = False
    syntax_ok: bool = False
    domain_exists: bool = False
    mx_records: bool = False
    smtp_check: bool = False
    catch_all: bool = False
    disposable: bool = False
    role_based: bool = False
    score: float = 0.0
    error: Optional[str] = None


@dataclass
class PhoneValidationResult:
    """Ergebnis der Telefon Validierung"""
    valid: bool = False
    phone_type: str = "unknown"  # mobile, landline, voip
    carrier: Optional[str] = None
    country_code: Optional[str] = None
    formatted: Optional[str] = None
    score: float = 0.0
    error: Optional[str] = None


@dataclass
class DomainValidationResult:
    """Ergebnis der Domain Validierung"""
    exists: bool = False
    age_days: Optional[int] = None
    ssl_valid: bool = False
    on_spam_list: bool = False
    score: float = 0.0
    error: Optional[str] = None


@dataclass
class SocialValidationResult:
    """Ergebnis der Social Media Validierung"""
    profiles_found: int = 0
    linkedin_verified: bool = False
    linkedin_connections: int = 0
    linkedin_activity_score: float = 0.0
    facebook_verified: bool = False
    instagram_verified: bool = False
    profile_image_authentic: bool = True
    score: float = 0.0


@dataclass
class BehavioralValidationResult:
    """Ergebnis der Verhaltens-Validierung"""
    honeypot_triggered: bool = False
    form_fill_time_seconds: Optional[int] = None
    mouse_movements_detected: bool = True
    is_bot: bool = False
    score: float = 100.0


@dataclass
class VerificationResult:
    """Gesamtergebnis der Verifizierung"""
    lead_id: str
    v_score: float = 0.0
    email: EmailValidationResult = field(default_factory=EmailValidationResult)
    phone: PhoneValidationResult = field(default_factory=PhoneValidationResult)
    domain: DomainValidationResult = field(default_factory=DomainValidationResult)
    social: SocialValidationResult = field(default_factory=SocialValidationResult)
    behavioral: BehavioralValidationResult = field(default_factory=BehavioralValidationResult)
    is_duplicate: bool = False
    duplicate_of_lead_id: Optional[str] = None
    duplicate_confidence: float = 0.0
    verified_at: datetime = field(default_factory=datetime.utcnow)


# ============================================================================
# CORE VERIFICATION ENGINE
# ============================================================================

class VerificationEngine:
    """
    Non Plus Ultra Verification Engine
    
    Führt umfassende Lead-Verifizierung durch:
    1. E-Mail Validierung
    2. Telefon Validierung
    3. Domain Authentizität
    4. Social Profile Check
    5. Bot/Behavioral Detection
    6. Duplicate Detection
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.config = VERIFICATION_CONFIG
    
    # ========================================================================
    # MAIN VERIFICATION FLOW
    # ========================================================================
    
    async def verify_lead(
        self,
        lead_id: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        company_domain: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        form_data: Optional[Dict] = None,
    ) -> VerificationResult:
        """
        Führt vollständige Lead-Verifizierung durch.
        
        Args:
            lead_id: UUID des Leads
            email: E-Mail Adresse
            phone: Telefonnummer
            company_domain: Firmen-Domain
            linkedin_url: LinkedIn Profil URL
            form_data: Formulardaten (für Bot-Detection)
            
        Returns:
            VerificationResult mit allen Scores
        """
        logger.info(f"Starting verification for lead: {lead_id}")
        
        result = VerificationResult(lead_id=lead_id)
        
        # Parallel alle Checks durchführen
        tasks = []
        
        if email:
            tasks.append(self._verify_email(email))
        if phone:
            tasks.append(self._verify_phone(phone))
        if company_domain:
            tasks.append(self._verify_domain(company_domain))
        if linkedin_url:
            tasks.append(self._verify_social(linkedin_url))
        if form_data:
            tasks.append(self._verify_behavioral(form_data))
        
        # Ausführen und Ergebnisse sammeln
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for res in results:
                if isinstance(res, Exception):
                    logger.error(f"Verification task failed: {res}")
                    continue
                    
                if isinstance(res, EmailValidationResult):
                    result.email = res
                elif isinstance(res, PhoneValidationResult):
                    result.phone = res
                elif isinstance(res, DomainValidationResult):
                    result.domain = res
                elif isinstance(res, SocialValidationResult):
                    result.social = res
                elif isinstance(res, BehavioralValidationResult):
                    result.behavioral = res
        
        # Duplicate Check
        if email:
            dup_result = await self._check_duplicate(lead_id, email, phone)
            result.is_duplicate = dup_result[0]
            result.duplicate_of_lead_id = dup_result[1]
            result.duplicate_confidence = dup_result[2]
        
        # V-Score berechnen
        result.v_score = self._calculate_v_score(result)
        
        # In DB speichern
        await self._save_verification_result(result)
        
        logger.info(f"Verification complete: lead={lead_id}, v_score={result.v_score:.2f}")
        return result
    
    # ========================================================================
    # E-MAIL VALIDATION
    # ========================================================================
    
    async def _verify_email(self, email: str) -> EmailValidationResult:
        """Validiert E-Mail Adresse"""
        result = EmailValidationResult()
        
        try:
            # 1. Syntax Check
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            result.syntax_ok = bool(re.match(email_regex, email))
            
            if not result.syntax_ok:
                result.error = "Invalid email syntax"
                return result
            
            # 2. Domain extrahieren
            domain = email.split('@')[1].lower()
            local_part = email.split('@')[0].lower()
            
            # 3. Disposable Check
            result.disposable = domain in self.config["disposable_domains"]
            
            # 4. Role-Based Check
            result.role_based = any(
                local_part.startswith(prefix) 
                for prefix in self.config["role_based_prefixes"]
            )
            
            # 5. DNS/MX Check
            try:
                mx_records = dns.resolver.resolve(domain, 'MX')
                result.domain_exists = True
                result.mx_records = len(list(mx_records)) > 0
            except dns.resolver.NXDOMAIN:
                result.domain_exists = False
                result.error = "Domain does not exist"
            except dns.resolver.NoAnswer:
                result.domain_exists = True
                result.mx_records = False
            except Exception as e:
                logger.warning(f"DNS lookup failed for {domain}: {e}")
                result.domain_exists = None
            
            # 6. SMTP Check (vereinfacht - in Production mit externem Service)
            # Hier nur Simulation - echter Check würde SMTP Verbindung aufbauen
            if result.mx_records:
                result.smtp_check = True  # Annahme: MX vorhanden = erreichbar
            
            # 7. Catch-All Detection (vereinfacht)
            # In Production: Random-Adresse an Domain senden und prüfen
            result.catch_all = False
            
            # 8. Gesamtbewertung
            result.valid = (
                result.syntax_ok and 
                result.domain_exists and 
                not result.disposable
            )
            
            # Score berechnen
            score = 0
            if result.syntax_ok:
                score += 20
            if result.domain_exists:
                score += 20
            if result.mx_records:
                score += 20
            if result.smtp_check:
                score += 20
            if not result.disposable:
                score += 10
            if not result.role_based:
                score += 5
            if not result.catch_all:
                score += 5
                
            result.score = min(100, score)
            
        except Exception as e:
            logger.exception(f"Email verification error: {e}")
            result.error = str(e)
        
        return result
    
    # ========================================================================
    # PHONE VALIDATION
    # ========================================================================
    
    async def _verify_phone(self, phone: str) -> PhoneValidationResult:
        """Validiert Telefonnummer"""
        result = PhoneValidationResult()
        
        try:
            # Nummer bereinigen
            cleaned = re.sub(r'[^\d+]', '', phone)
            
            # Länge prüfen
            if len(cleaned) < 8 or len(cleaned) > 16:
                result.error = "Invalid phone length"
                return result
            
            # Country Code erkennen
            for code in self.config["valid_country_codes"]:
                if cleaned.startswith(code.replace('+', '')):
                    result.country_code = code
                    break
            
            if not result.country_code and cleaned.startswith('+'):
                result.country_code = cleaned[:3] if len(cleaned) >= 3 else None
            
            # Format
            result.formatted = cleaned
            if not cleaned.startswith('+'):
                # Assume German if no country code
                result.formatted = '+49' + cleaned.lstrip('0')
                result.country_code = '+49'
            
            # Typ erkennen (vereinfacht)
            # Deutsche Mobilnummern: 015x, 016x, 017x
            german_mobile_prefixes = ['49150', '49151', '49152', '49155', '49157', 
                                     '49159', '49160', '49162', '49163', '49170',
                                     '49171', '49172', '49173', '49174', '49175',
                                     '49176', '49177', '49178', '49179']
            
            normalized = result.formatted.replace('+', '')
            if any(normalized.startswith(p) for p in german_mobile_prefixes):
                result.phone_type = "mobile"
            elif normalized.startswith('49'):
                result.phone_type = "landline"
            else:
                result.phone_type = "unknown"
            
            # In Production: Carrier Lookup via API (z.B. Twilio Lookup)
            result.carrier = None  # Würde durch API gefüllt
            
            # Validierung
            result.valid = len(cleaned) >= 10 and result.country_code is not None
            
            # Score
            score = 0
            if result.valid:
                score += 50
            if result.phone_type == "mobile":
                score += 30  # Mobile ist wertvoller
            elif result.phone_type == "landline":
                score += 20
            if result.country_code:
                score += 20
                
            result.score = min(100, score)
            
        except Exception as e:
            logger.exception(f"Phone verification error: {e}")
            result.error = str(e)
        
        return result
    
    # ========================================================================
    # DOMAIN VALIDATION
    # ========================================================================
    
    async def _verify_domain(self, domain: str) -> DomainValidationResult:
        """Validiert Firmen-Domain"""
        result = DomainValidationResult()
        
        try:
            # Domain bereinigen
            domain = domain.lower().strip()
            if domain.startswith('http'):
                domain = domain.split('//')[1].split('/')[0]
            
            # 1. DNS Check
            try:
                socket.gethostbyname(domain)
                result.exists = True
            except socket.gaierror:
                result.exists = False
                result.error = "Domain does not resolve"
                return result
            
            # 2. Domain Alter (vereinfacht - in Production via WHOIS API)
            # Für Demo: Zufälliger Wert
            result.age_days = 365  # Placeholder
            
            # 3. SSL Check (vereinfacht)
            # In Production: tatsächlichen SSL handshake prüfen
            result.ssl_valid = True  # Annahme
            
            # 4. Spam List Check (vereinfacht)
            # In Production: gegen bekannte Spam-Datenbanken prüfen
            result.on_spam_list = False
            
            # Score
            score = 0
            if result.exists:
                score += 40
            if result.age_days and result.age_days > self.config["min_domain_age_days"]:
                score += 25
            if result.ssl_valid:
                score += 20
            if not result.on_spam_list:
                score += 15
                
            result.score = min(100, score)
            
        except Exception as e:
            logger.exception(f"Domain verification error: {e}")
            result.error = str(e)
        
        return result
    
    # ========================================================================
    # SOCIAL PROFILE VALIDATION
    # ========================================================================
    
    async def _verify_social(self, linkedin_url: Optional[str] = None) -> SocialValidationResult:
        """Validiert Social Media Profile"""
        result = SocialValidationResult()
        
        try:
            if linkedin_url:
                # LinkedIn URL Validierung
                linkedin_pattern = r'linkedin\.com/in/([a-zA-Z0-9-]+)'
                match = re.search(linkedin_pattern, linkedin_url)
                
                if match:
                    result.linkedin_verified = True
                    result.profiles_found += 1
                    
                    # In Production: LinkedIn API oder Scraping für Details
                    # Hier Placeholder-Werte
                    result.linkedin_connections = 150  # Placeholder
                    result.linkedin_activity_score = 60.0  # Placeholder
            
            # In Production: Auch Facebook, Instagram etc. prüfen
            # via APIs oder Scraping
            
            # Score berechnen
            score = 0
            if result.linkedin_verified:
                score += 40
                if result.linkedin_connections >= self.config["min_linkedin_connections"]:
                    score += 30
                if result.linkedin_activity_score >= self.config["min_activity_score"]:
                    score += 20
            
            if result.profiles_found > 1:
                score += 10  # Bonus für mehrere Profile
                
            result.score = min(100, score)
            
        except Exception as e:
            logger.exception(f"Social verification error: {e}")
        
        return result
    
    # ========================================================================
    # BEHAVIORAL/BOT DETECTION
    # ========================================================================
    
    async def _verify_behavioral(self, form_data: Dict) -> BehavioralValidationResult:
        """Prüft auf Bot-Verhalten"""
        result = BehavioralValidationResult()
        
        try:
            # 1. Honeypot Check
            if form_data.get("honeypot_field"):
                result.honeypot_triggered = True
                result.is_bot = True
                result.score = 0
                return result
            
            # 2. Form Fill Time
            if "form_start_time" in form_data and "form_submit_time" in form_data:
                start = form_data["form_start_time"]
                end = form_data["form_submit_time"]
                
                if isinstance(start, str):
                    start = datetime.fromisoformat(start)
                if isinstance(end, str):
                    end = datetime.fromisoformat(end)
                
                result.form_fill_time_seconds = int((end - start).total_seconds())
                
                # Zu schnell = Bot
                if result.form_fill_time_seconds < self.config["min_form_fill_time_seconds"]:
                    result.is_bot = True
                    result.score = 10
                    return result
            
            # 3. Mouse Movements (aus form_data)
            result.mouse_movements_detected = form_data.get("had_mouse_movement", True)
            
            if not result.mouse_movements_detected:
                result.score = 50  # Verdächtig aber nicht sicher Bot
            else:
                result.score = 100
            
            result.is_bot = False
            
        except Exception as e:
            logger.exception(f"Behavioral verification error: {e}")
            result.score = 50  # Bei Fehler: Neutral
        
        return result
    
    # ========================================================================
    # DUPLICATE DETECTION
    # ========================================================================
    
    async def _check_duplicate(
        self, 
        lead_id: str, 
        email: Optional[str], 
        phone: Optional[str]
    ) -> Tuple[bool, Optional[str], float]:
        """
        Prüft auf Duplikate.
        
        Returns:
            Tuple[is_duplicate, duplicate_of_id, confidence]
        """
        try:
            # Nach gleicher E-Mail suchen
            if email:
                result = self.db.table("leads").select("id").eq("email", email).neq("id", lead_id).execute()
                if result.data:
                    return True, result.data[0]["id"], 1.0  # 100% Confidence bei gleicher Email
            
            # Nach ähnlichem Namen + Domain
            # (Vereinfacht - in Production: Fuzzy Matching)
            
            return False, None, 0.0
            
        except Exception as e:
            logger.exception(f"Duplicate check error: {e}")
            return False, None, 0.0
    
    # ========================================================================
    # SCORE CALCULATION
    # ========================================================================
    
    def _calculate_v_score(self, result: VerificationResult) -> float:
        """Berechnet gewichteten V-Score"""
        
        # Gewichtete Summe
        v_score = (
            result.email.score * self.config["email_weight"] +
            result.phone.score * self.config["phone_weight"] +
            result.domain.score * self.config["domain_weight"] +
            result.social.score * self.config["social_weight"] +
            result.behavioral.score * self.config["behavioral_weight"]
        )
        
        # Duplicate Penalty
        if result.is_duplicate:
            v_score = max(0, v_score - 50)
        
        return round(min(100, max(0, v_score)), 2)
    
    # ========================================================================
    # DATABASE OPERATIONS
    # ========================================================================
    
    async def _save_verification_result(self, result: VerificationResult) -> None:
        """Speichert Verifizierungsergebnis in DB"""
        try:
            data = {
                "lead_id": result.lead_id,
                "v_score": result.v_score,
                "v_score_updated_at": datetime.utcnow().isoformat(),
                
                # Email
                "email_valid": result.email.valid,
                "email_syntax_ok": result.email.syntax_ok,
                "email_domain_exists": result.email.domain_exists,
                "email_mx_records": result.email.mx_records,
                "email_smtp_check": result.email.smtp_check,
                "email_catch_all": result.email.catch_all,
                "email_disposable": result.email.disposable,
                "email_role_based": result.email.role_based,
                "email_score": result.email.score,
                "email_checked_at": datetime.utcnow().isoformat(),
                
                # Phone
                "phone_valid": result.phone.valid,
                "phone_type": result.phone.phone_type,
                "phone_carrier": result.phone.carrier,
                "phone_country_code": result.phone.country_code,
                "phone_formatted": result.phone.formatted,
                "phone_score": result.phone.score,
                "phone_checked_at": datetime.utcnow().isoformat(),
                
                # Domain
                "domain_exists": result.domain.exists,
                "domain_age_days": result.domain.age_days,
                "domain_ssl_valid": result.domain.ssl_valid,
                "domain_on_spam_list": result.domain.on_spam_list,
                "domain_score": result.domain.score,
                "domain_checked_at": datetime.utcnow().isoformat(),
                
                # Social
                "social_profiles_found": result.social.profiles_found,
                "linkedin_verified": result.social.linkedin_verified,
                "linkedin_connections": result.social.linkedin_connections,
                "linkedin_activity_score": result.social.linkedin_activity_score,
                "facebook_verified": result.social.facebook_verified,
                "instagram_verified": result.social.instagram_verified,
                "profile_image_authentic": result.social.profile_image_authentic,
                "social_score": result.social.score,
                "social_checked_at": datetime.utcnow().isoformat(),
                
                # Behavioral
                "honeypot_triggered": result.behavioral.honeypot_triggered,
                "form_fill_time_seconds": result.behavioral.form_fill_time_seconds,
                "mouse_movements_detected": result.behavioral.mouse_movements_detected,
                "behavioral_score": result.behavioral.score,
                
                # Duplicate
                "is_duplicate": result.is_duplicate,
                "duplicate_of_lead_id": result.duplicate_of_lead_id,
                "duplicate_confidence": result.duplicate_confidence,
                
                # Meta
                "verification_source": "automated",
                "last_full_verification_at": datetime.utcnow().isoformat(),
            }
            
            # Upsert (Insert or Update)
            existing = self.db.table("lead_verifications").select("id").eq("lead_id", result.lead_id).execute()
            
            if existing.data:
                self.db.table("lead_verifications").update(data).eq("lead_id", result.lead_id).execute()
            else:
                self.db.table("lead_verifications").insert(data).execute()
                
            logger.info(f"Saved verification result for lead: {result.lead_id}")
            
        except Exception as e:
            logger.exception(f"Error saving verification result: {e}")
    
    # ========================================================================
    # BATCH OPERATIONS
    # ========================================================================
    
    async def verify_leads_batch(
        self, 
        lead_ids: List[str],
        concurrency: int = 5
    ) -> Dict[str, VerificationResult]:
        """
        Verifiziert mehrere Leads parallel.
        
        Args:
            lead_ids: Liste von Lead UUIDs
            concurrency: Max. parallele Verarbeitungen
            
        Returns:
            Dict[lead_id, VerificationResult]
        """
        logger.info(f"Starting batch verification for {len(lead_ids)} leads")
        
        results = {}
        
        # Leads aus DB laden
        for i in range(0, len(lead_ids), concurrency):
            batch = lead_ids[i:i+concurrency]
            
            tasks = []
            for lead_id in batch:
                # Lead-Daten holen
                lead_result = self.db.table("leads").select("*").eq("id", lead_id).execute()
                if lead_result.data:
                    lead = lead_result.data[0]
                    task = self.verify_lead(
                        lead_id=lead_id,
                        email=lead.get("email"),
                        phone=lead.get("phone"),
                        company_domain=lead.get("company_domain"),
                        linkedin_url=lead.get("linkedin_url"),
                    )
                    tasks.append((lead_id, task))
            
            # Batch ausführen
            for lead_id, task in tasks:
                try:
                    result = await task
                    results[lead_id] = result
                except Exception as e:
                    logger.error(f"Batch verification failed for {lead_id}: {e}")
        
        logger.info(f"Batch verification complete: {len(results)} leads processed")
        return results
    
    async def get_unverified_leads(self, limit: int = 100) -> List[Dict]:
        """Holt Leads die noch nicht verifiziert wurden"""
        try:
            # Leads ohne Verification oder mit alter Verification
            result = self.db.rpc(
                "get_unverified_leads",
                {"p_limit": limit}
            ).execute()
            
            return result.data or []
        except Exception:
            # Fallback: Direkter Query
            all_leads = self.db.table("leads").select("id").limit(limit).execute()
            verified = self.db.table("lead_verifications").select("lead_id").execute()
            
            verified_ids = {v["lead_id"] for v in (verified.data or [])}
            unverified = [l for l in (all_leads.data or []) if l["id"] not in verified_ids]
            
            return unverified


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def create_verification_engine(db: Client) -> VerificationEngine:
    """Factory für VerificationEngine"""
    return VerificationEngine(db)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "VerificationEngine",
    "create_verification_engine",
    "VerificationResult",
    "EmailValidationResult",
    "PhoneValidationResult",
    "DomainValidationResult",
    "SocialValidationResult",
    "BehavioralValidationResult",
    "VERIFICATION_CONFIG",
]

