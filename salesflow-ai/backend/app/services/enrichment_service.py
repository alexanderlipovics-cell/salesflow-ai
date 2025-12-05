"""
Sales Flow AI - Non Plus Ultra Enrichment Service (E-Score)

Lead-Datenanreicherung:
- Firmendaten (Branche, Größe, Umsatz)
- Kontaktperson Details (Titel, Seniorität)
- Technologie-Stack
- ICP (Ideal Customer Profile) Matching
- Finanzielle Signale (Funding, Hiring)

Version 1.0
"""

import re
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION & ENUMS
# ============================================================================

class CompanySize(str, Enum):
    """Unternehmensgrößen-Kategorien"""
    SOLOPRENEUR = "1"
    MICRO = "2-10"
    SMALL = "11-50"
    MEDIUM = "51-200"
    LARGE = "201-500"
    ENTERPRISE = "500+"


class Seniority(str, Enum):
    """Seniorität-Levels"""
    C_LEVEL = "c_level"
    VP = "vp"
    DIRECTOR = "director"
    MANAGER = "manager"
    SENIOR = "senior"
    INDIVIDUAL = "individual"
    UNKNOWN = "unknown"


class RevenueRange(str, Enum):
    """Umsatz-Kategorien"""
    UNDER_1M = "<1M"
    ONE_TO_10M = "1-10M"
    TEN_TO_50M = "10-50M"
    FIFTY_TO_100M = "50-100M"
    OVER_100M = "100M+"


# ICP (Ideal Customer Profile) Konfiguration
ICP_CONFIG = {
    # Welche Branchen sind ideal? (weight = Wichtigkeit)
    "target_industries": [
        {"industry": "Network Marketing", "weight": 1.0, "score_bonus": 30},
        {"industry": "Direct Sales", "weight": 1.0, "score_bonus": 30},
        {"industry": "Insurance", "weight": 0.8, "score_bonus": 20},
        {"industry": "Real Estate", "weight": 0.8, "score_bonus": 20},
        {"industry": "Financial Services", "weight": 0.7, "score_bonus": 15},
        {"industry": "Consulting", "weight": 0.6, "score_bonus": 10},
        {"industry": "Coaching", "weight": 0.9, "score_bonus": 25},
        {"industry": "SaaS", "weight": 0.5, "score_bonus": 5},
    ],
    
    # Welche Unternehmensgrößen?
    "target_company_sizes": [
        {"size": "2-10", "weight": 0.8, "score_bonus": 15},
        {"size": "11-50", "weight": 1.0, "score_bonus": 25},
        {"size": "51-200", "weight": 0.9, "score_bonus": 20},
        {"size": "201-500", "weight": 0.6, "score_bonus": 10},
    ],
    
    # Welche Rollen/Seniority?
    "target_seniorities": [
        {"seniority": "c_level", "weight": 1.0, "score_bonus": 30},
        {"seniority": "vp", "weight": 0.9, "score_bonus": 25},
        {"seniority": "director", "weight": 0.8, "score_bonus": 20},
        {"seniority": "manager", "weight": 0.6, "score_bonus": 10},
    ],
    
    # Technologien die auf Fit hinweisen
    "positive_tech_signals": [
        {"tech": "Salesforce", "category": "CRM", "score_bonus": 15},
        {"tech": "HubSpot", "category": "CRM", "score_bonus": 10},
        {"tech": "Pipedrive", "category": "CRM", "score_bonus": 10},
        {"tech": "ActiveCampaign", "category": "Marketing", "score_bonus": 10},
        {"tech": "Mailchimp", "category": "Marketing", "score_bonus": 5},
    ],
    
    # Konkurrenten (hohes Conversion-Potenzial!)
    "competitor_signals": [
        {"competitor": "Recruitee", "score_bonus": 25, "reason": "Aktiver Nutzer sucht Alternative"},
        {"competitor": "Personio", "score_bonus": 20, "reason": "HR-fokussiert"},
    ],
    
    # Score-Gewichtungen
    "weights": {
        "industry": 0.25,
        "company_size": 0.20,
        "seniority": 0.20,
        "tech_stack": 0.15,
        "completeness": 0.20,
    }
}


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class CompanyData:
    """Angereicherte Firmendaten"""
    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    sub_industry: Optional[str] = None
    size_range: Optional[str] = None
    employee_count: Optional[int] = None
    founded_year: Optional[int] = None
    revenue_range: Optional[str] = None
    revenue_estimate: Optional[float] = None
    company_type: Optional[str] = None  # Private, Public, Non-Profit
    description: Optional[str] = None
    logo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    twitter_url: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None


@dataclass
class PersonData:
    """Angereicherte Personendaten"""
    title: Optional[str] = None
    seniority: Optional[str] = None
    department: Optional[str] = None
    linkedin_url: Optional[str] = None
    photo_url: Optional[str] = None
    bio: Optional[str] = None


@dataclass
class TechStackItem:
    """Ein Element im Tech-Stack"""
    name: str
    category: str
    confidence: float = 0.8


@dataclass
class ICPMatchResult:
    """Ergebnis des ICP-Matchings"""
    match_score: float = 0.0
    reasons: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class EnrichmentResult:
    """Gesamtergebnis der Anreicherung"""
    lead_id: str
    e_score: float = 0.0
    company: CompanyData = field(default_factory=CompanyData)
    person: PersonData = field(default_factory=PersonData)
    tech_stack: List[TechStackItem] = field(default_factory=list)
    tech_stack_score: float = 0.0
    icp_match: ICPMatchResult = field(default_factory=ICPMatchResult)
    funding_total: Optional[float] = None
    funding_last_round: Optional[str] = None
    funding_last_date: Optional[str] = None
    is_hiring: bool = False
    job_openings_count: int = 0
    enrichment_source: str = "internal"
    enrichment_confidence: float = 0.0
    enriched_at: datetime = field(default_factory=datetime.utcnow)


# ============================================================================
# ENRICHMENT SERVICE
# ============================================================================

class EnrichmentService:
    """
    Non Plus Ultra Enrichment Service
    
    Reichert Lead-Daten an:
    1. Firmendaten (Branche, Größe, Umsatz)
    2. Kontaktperson (Titel, Seniorität, Department)
    3. Tech-Stack Analyse
    4. ICP Matching
    5. Finanzielle Signale
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.icp_config = ICP_CONFIG
    
    # ========================================================================
    # MAIN ENRICHMENT FLOW
    # ========================================================================
    
    async def enrich_lead(
        self,
        lead_id: str,
        email: Optional[str] = None,
        company_name: Optional[str] = None,
        company_domain: Optional[str] = None,
        person_name: Optional[str] = None,
        linkedin_url: Optional[str] = None,
    ) -> EnrichmentResult:
        """
        Führt vollständige Lead-Anreicherung durch.
        
        Args:
            lead_id: UUID des Leads
            email: E-Mail (für Domain-Extraktion)
            company_name: Firmenname
            company_domain: Firmen-Website
            person_name: Name der Kontaktperson
            linkedin_url: LinkedIn Profil URL
            
        Returns:
            EnrichmentResult mit allen angereicherten Daten
        """
        logger.info(f"Starting enrichment for lead: {lead_id}")
        
        result = EnrichmentResult(lead_id=lead_id)
        
        # Domain aus E-Mail extrahieren falls nicht vorhanden
        if not company_domain and email:
            company_domain = self._extract_domain_from_email(email)
        
        # 1. Firmendaten anreichern
        if company_domain or company_name:
            result.company = await self._enrich_company(company_domain, company_name)
        
        # 2. Personendaten anreichern
        if linkedin_url or person_name:
            result.person = await self._enrich_person(linkedin_url, person_name)
        
        # 3. Tech-Stack analysieren
        if company_domain:
            result.tech_stack = await self._analyze_tech_stack(company_domain)
            result.tech_stack_score = self._calculate_tech_score(result.tech_stack)
        
        # 4. ICP Matching
        result.icp_match = self._calculate_icp_match(result)
        
        # 5. Finanzielle Signale (Placeholder - in Production via API)
        financial_signals = await self._get_financial_signals(company_name, company_domain)
        result.funding_total = financial_signals.get("funding_total")
        result.funding_last_round = financial_signals.get("funding_last_round")
        result.is_hiring = financial_signals.get("is_hiring", False)
        result.job_openings_count = financial_signals.get("job_openings_count", 0)
        
        # 6. E-Score berechnen
        result.e_score = self._calculate_e_score(result)
        result.enrichment_confidence = self._calculate_confidence(result)
        
        # 7. In DB speichern
        await self._save_enrichment_result(result)
        
        logger.info(f"Enrichment complete: lead={lead_id}, e_score={result.e_score:.2f}")
        return result
    
    # ========================================================================
    # COMPANY ENRICHMENT
    # ========================================================================
    
    async def _enrich_company(
        self, 
        domain: Optional[str], 
        name: Optional[str]
    ) -> CompanyData:
        """Reichert Firmendaten an"""
        company = CompanyData(name=name, domain=domain)
        
        try:
            # In Production: API-Calls zu Clearbit, Apollo, etc.
            # Hier: Regelbasierte Erkennung + Demo-Daten
            
            if domain:
                # Domain-basierte Erkennung
                company = self._enrich_from_domain(domain, company)
            
            if name:
                # Name-basierte Erkennung
                company = self._enrich_from_name(name, company)
            
        except Exception as e:
            logger.exception(f"Company enrichment error: {e}")
        
        return company
    
    def _enrich_from_domain(self, domain: str, company: CompanyData) -> CompanyData:
        """Reichert Daten basierend auf Domain an"""
        domain = domain.lower()
        
        # Bekannte große Unternehmen (Demo-Daten)
        known_companies = {
            "google.com": {"industry": "Technology", "size_range": "500+", "country": "USA"},
            "microsoft.com": {"industry": "Technology", "size_range": "500+", "country": "USA"},
            "amazon.com": {"industry": "E-Commerce", "size_range": "500+", "country": "USA"},
            "salesforce.com": {"industry": "SaaS", "size_range": "500+", "country": "USA"},
        }
        
        if domain in known_companies:
            data = known_companies[domain]
            company.industry = data.get("industry")
            company.size_range = data.get("size_range")
            company.country = data.get("country")
        
        # TLD-basierte Länder-Erkennung
        tld = domain.split('.')[-1]
        country_map = {
            "de": "Germany",
            "at": "Austria",
            "ch": "Switzerland",
            "uk": "United Kingdom",
            "fr": "France",
            "it": "Italy",
            "es": "Spain",
            "nl": "Netherlands",
        }
        if tld in country_map and not company.country:
            company.country = country_map[tld]
        
        return company
    
    def _enrich_from_name(self, name: str, company: CompanyData) -> CompanyData:
        """Reichert Daten basierend auf Firmennamen an"""
        name_lower = name.lower()
        
        # Branche aus Firmennamen erkennen
        industry_keywords = {
            "Network Marketing": ["network", "mlm", "vertrieb", "direktvertrieb"],
            "Insurance": ["versicherung", "insurance", "allianz", "axa"],
            "Real Estate": ["immobilien", "real estate", "makler"],
            "Consulting": ["consulting", "beratung", "advisory"],
            "Coaching": ["coaching", "coach", "training", "academy"],
            "Technology": ["tech", "software", "it ", "digital"],
            "Finance": ["bank", "finance", "finanz", "investment"],
        }
        
        for industry, keywords in industry_keywords.items():
            if any(kw in name_lower for kw in keywords):
                company.industry = company.industry or industry
                break
        
        # Größe aus Firmennamen (GmbH, AG, etc.)
        if "ag" in name_lower or "aktiengesellschaft" in name_lower:
            company.size_range = company.size_range or "201-500"
            company.company_type = "Public"
        elif "gmbh" in name_lower:
            company.size_range = company.size_range or "11-50"
            company.company_type = "Private"
        elif "e.k." in name_lower or "einzelunternehmer" in name_lower:
            company.size_range = company.size_range or "1"
            company.company_type = "Private"
        
        return company
    
    # ========================================================================
    # PERSON ENRICHMENT
    # ========================================================================
    
    async def _enrich_person(
        self, 
        linkedin_url: Optional[str], 
        name: Optional[str]
    ) -> PersonData:
        """Reichert Personendaten an"""
        person = PersonData(linkedin_url=linkedin_url)
        
        try:
            # Titel/Seniority aus Namen erkennen
            if name:
                person = self._parse_person_title(name, person)
            
            # In Production: LinkedIn API oder Scraping
            # Hier: Placeholder
            
        except Exception as e:
            logger.exception(f"Person enrichment error: {e}")
        
        return person
    
    def _parse_person_title(self, name: str, person: PersonData) -> PersonData:
        """Extrahiert Titel und Seniority aus Namen"""
        name_lower = name.lower()
        
        # C-Level Erkennung
        c_level_patterns = [
            (r'\bceo\b', "CEO", Seniority.C_LEVEL),
            (r'\bcto\b', "CTO", Seniority.C_LEVEL),
            (r'\bcfo\b', "CFO", Seniority.C_LEVEL),
            (r'\bcoo\b', "COO", Seniority.C_LEVEL),
            (r'\bcmo\b', "CMO", Seniority.C_LEVEL),
            (r'geschäftsführer', "Geschäftsführer", Seniority.C_LEVEL),
            (r'founder', "Founder", Seniority.C_LEVEL),
            (r'gründer', "Gründer", Seniority.C_LEVEL),
            (r'inhaber', "Inhaber", Seniority.C_LEVEL),
        ]
        
        vp_patterns = [
            (r'\bvp\b', "VP", Seniority.VP),
            (r'vice president', "Vice President", Seniority.VP),
            (r'head of', "Head of", Seniority.VP),
        ]
        
        director_patterns = [
            (r'director', "Director", Seniority.DIRECTOR),
            (r'leiter', "Leiter", Seniority.DIRECTOR),
        ]
        
        manager_patterns = [
            (r'manager', "Manager", Seniority.MANAGER),
            (r'teamlead', "Team Lead", Seniority.MANAGER),
            (r'team lead', "Team Lead", Seniority.MANAGER),
        ]
        
        # Prüfen in Reihenfolge der Seniorität
        all_patterns = c_level_patterns + vp_patterns + director_patterns + manager_patterns
        
        for pattern, title, seniority in all_patterns:
            if re.search(pattern, name_lower):
                person.title = title
                person.seniority = seniority.value
                break
        
        if not person.seniority:
            person.seniority = Seniority.UNKNOWN.value
        
        # Department erkennen
        dept_keywords = {
            "Sales": ["sales", "vertrieb", "account"],
            "Marketing": ["marketing", "brand", "content"],
            "HR": ["hr", "human resources", "recruiting", "people"],
            "IT": ["it", "tech", "engineering", "developer"],
            "Finance": ["finance", "accounting", "controlling"],
            "Operations": ["operations", "ops", "betrieb"],
        }
        
        for dept, keywords in dept_keywords.items():
            if any(kw in name_lower for kw in keywords):
                person.department = dept
                break
        
        return person
    
    # ========================================================================
    # TECH STACK ANALYSIS
    # ========================================================================
    
    async def _analyze_tech_stack(self, domain: str) -> List[TechStackItem]:
        """
        Analysiert den Tech-Stack eines Unternehmens.
        
        In Production: Wappalyzer API, BuiltWith, etc.
        """
        tech_stack = []
        
        try:
            # Placeholder: Simulierte Tech-Stack Erkennung
            # In Production würde hier ein API-Call stattfinden
            
            # Beispiel-Logik basierend auf Domain-Patterns
            domain_lower = domain.lower()
            
            if "hubspot" in domain_lower or ".hs-sites.com" in domain_lower:
                tech_stack.append(TechStackItem("HubSpot", "Marketing", 0.95))
            
            # Standard-Annahmen für Business-Websites
            tech_stack.append(TechStackItem("Google Analytics", "Analytics", 0.70))
            
        except Exception as e:
            logger.exception(f"Tech stack analysis error: {e}")
        
        return tech_stack
    
    def _calculate_tech_score(self, tech_stack: List[TechStackItem]) -> float:
        """Berechnet Tech-Stack Score basierend auf ICP"""
        score = 0.0
        
        for tech in tech_stack:
            for signal in self.icp_config["positive_tech_signals"]:
                if tech.name.lower() == signal["tech"].lower():
                    score += signal["score_bonus"] * tech.confidence
                    break
            
            # Competitor Check
            for competitor in self.icp_config["competitor_signals"]:
                if tech.name.lower() == competitor["competitor"].lower():
                    score += competitor["score_bonus"] * tech.confidence
                    break
        
        return min(100, score)
    
    # ========================================================================
    # ICP MATCHING
    # ========================================================================
    
    def _calculate_icp_match(self, result: EnrichmentResult) -> ICPMatchResult:
        """Berechnet wie gut der Lead zum ICP passt"""
        icp_result = ICPMatchResult()
        total_score = 0.0
        
        # 1. Industry Match
        if result.company.industry:
            for target in self.icp_config["target_industries"]:
                if result.company.industry.lower() == target["industry"].lower():
                    bonus = target["score_bonus"]
                    total_score += bonus
                    icp_result.reasons.append({
                        "factor": "industry",
                        "match": True,
                        "value": result.company.industry,
                        "score_impact": bonus
                    })
                    break
        
        # 2. Company Size Match
        if result.company.size_range:
            for target in self.icp_config["target_company_sizes"]:
                if result.company.size_range == target["size"]:
                    bonus = target["score_bonus"]
                    total_score += bonus
                    icp_result.reasons.append({
                        "factor": "company_size",
                        "match": True,
                        "value": result.company.size_range,
                        "score_impact": bonus
                    })
                    break
        
        # 3. Seniority Match
        if result.person.seniority:
            for target in self.icp_config["target_seniorities"]:
                if result.person.seniority == target["seniority"]:
                    bonus = target["score_bonus"]
                    total_score += bonus
                    icp_result.reasons.append({
                        "factor": "seniority",
                        "match": True,
                        "value": result.person.seniority,
                        "score_impact": bonus
                    })
                    break
        
        # 4. Tech Stack Score
        if result.tech_stack_score > 0:
            icp_result.reasons.append({
                "factor": "tech_stack",
                "match": True,
                "value": f"{len(result.tech_stack)} technologies",
                "score_impact": result.tech_stack_score
            })
            total_score += result.tech_stack_score
        
        # Normalize to 0-100
        icp_result.match_score = min(100, total_score)
        
        return icp_result
    
    # ========================================================================
    # FINANCIAL SIGNALS
    # ========================================================================
    
    async def _get_financial_signals(
        self, 
        company_name: Optional[str], 
        domain: Optional[str]
    ) -> Dict[str, Any]:
        """
        Holt finanzielle Signale (Funding, Hiring).
        
        In Production: Crunchbase API, LinkedIn Jobs, etc.
        """
        signals = {
            "funding_total": None,
            "funding_last_round": None,
            "funding_last_date": None,
            "is_hiring": False,
            "job_openings_count": 0,
        }
        
        try:
            # Placeholder: In Production würde hier API-Call stattfinden
            # Z.B. Crunchbase für Funding, LinkedIn für Jobs
            pass
            
        except Exception as e:
            logger.exception(f"Financial signals error: {e}")
        
        return signals
    
    # ========================================================================
    # SCORE CALCULATION
    # ========================================================================
    
    def _calculate_e_score(self, result: EnrichmentResult) -> float:
        """Berechnet gewichteten E-Score"""
        weights = self.icp_config["weights"]
        
        # Company Completeness (0-100)
        company_completeness = self._calculate_company_completeness(result.company)
        
        # Person Completeness (0-100)
        person_completeness = self._calculate_person_completeness(result.person)
        
        # ICP Match (bereits 0-100)
        icp_score = result.icp_match.match_score
        
        # Tech Stack (bereits 0-100)
        tech_score = result.tech_stack_score
        
        # Gewichtete Summe (industry und company_size sind in ICP)
        e_score = (
            (icp_score * (weights["industry"] + weights["company_size"])) +
            (person_completeness * weights["seniority"]) +
            (tech_score * weights["tech_stack"]) +
            (company_completeness * weights["completeness"])
        )
        
        return round(min(100, max(0, e_score)), 2)
    
    def _calculate_company_completeness(self, company: CompanyData) -> float:
        """Berechnet Vollständigkeit der Firmendaten"""
        fields = [
            company.name,
            company.domain,
            company.industry,
            company.size_range,
            company.country,
        ]
        filled = sum(1 for f in fields if f)
        return (filled / len(fields)) * 100
    
    def _calculate_person_completeness(self, person: PersonData) -> float:
        """Berechnet Vollständigkeit der Personendaten"""
        fields = [
            person.title,
            person.seniority,
            person.department,
            person.linkedin_url,
        ]
        filled = sum(1 for f in fields if f)
        return (filled / len(fields)) * 100
    
    def _calculate_confidence(self, result: EnrichmentResult) -> float:
        """Berechnet Vertrauenswürdigkeit der Anreicherung"""
        confidence = 0.0
        
        # Mehr Daten = höhere Confidence
        if result.company.name:
            confidence += 20
        if result.company.domain:
            confidence += 20
        if result.company.industry:
            confidence += 15
        if result.person.title:
            confidence += 15
        if result.person.seniority and result.person.seniority != "unknown":
            confidence += 15
        if len(result.tech_stack) > 0:
            confidence += 15
        
        return min(100, confidence)
    
    # ========================================================================
    # DATABASE OPERATIONS
    # ========================================================================
    
    async def _save_enrichment_result(self, result: EnrichmentResult) -> None:
        """Speichert Anreicherungsergebnis in DB"""
        try:
            data = {
                "lead_id": result.lead_id,
                "e_score": result.e_score,
                "e_score_updated_at": datetime.utcnow().isoformat(),
                
                # Company
                "company_name": result.company.name,
                "company_domain": result.company.domain,
                "company_industry": result.company.industry,
                "company_sub_industry": result.company.sub_industry,
                "company_size_range": result.company.size_range,
                "company_employee_count": result.company.employee_count,
                "company_founded_year": result.company.founded_year,
                "company_revenue_range": result.company.revenue_range,
                "company_revenue_estimate": result.company.revenue_estimate,
                "company_type": result.company.company_type,
                "company_description": result.company.description,
                "company_logo_url": result.company.logo_url,
                "company_linkedin_url": result.company.linkedin_url,
                "company_facebook_url": result.company.facebook_url,
                "company_twitter_url": result.company.twitter_url,
                "company_country": result.company.country,
                "company_state": result.company.state,
                "company_city": result.company.city,
                "company_postal_code": result.company.postal_code,
                "company_address": result.company.address,
                "company_timezone": result.company.timezone,
                
                # Person
                "person_title": result.person.title,
                "person_seniority": result.person.seniority,
                "person_department": result.person.department,
                "person_linkedin_url": result.person.linkedin_url,
                "person_photo_url": result.person.photo_url,
                "person_bio": result.person.bio,
                
                # Tech Stack (JSON)
                "tech_stack": [
                    {"name": t.name, "category": t.category, "confidence": t.confidence}
                    for t in result.tech_stack
                ],
                "tech_stack_score": result.tech_stack_score,
                
                # ICP Match
                "icp_match_score": result.icp_match.match_score,
                "icp_match_reasons": result.icp_match.reasons,
                
                # Financial
                "funding_total": result.funding_total,
                "funding_last_round": result.funding_last_round,
                "funding_last_date": result.funding_last_date,
                "is_hiring": result.is_hiring,
                "job_openings_count": result.job_openings_count,
                
                # Meta
                "enrichment_source": result.enrichment_source,
                "enrichment_confidence": result.enrichment_confidence,
                "last_enriched_at": datetime.utcnow().isoformat(),
            }
            
            # Upsert
            existing = self.db.table("lead_enrichments").select("id").eq("lead_id", result.lead_id).execute()
            
            if existing.data:
                self.db.table("lead_enrichments").update(data).eq("lead_id", result.lead_id).execute()
            else:
                self.db.table("lead_enrichments").insert(data).execute()
                
            logger.info(f"Saved enrichment result for lead: {result.lead_id}")
            
        except Exception as e:
            logger.exception(f"Error saving enrichment result: {e}")
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _extract_domain_from_email(self, email: str) -> Optional[str]:
        """Extrahiert Domain aus E-Mail"""
        try:
            domain = email.split('@')[1].lower()
            # Ignore common email providers
            free_providers = [
                "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                "web.de", "gmx.de", "gmx.net", "t-online.de", "freenet.de",
                "icloud.com", "me.com", "aol.com", "live.com"
            ]
            if domain not in free_providers:
                return domain
        except:
            pass
        return None
    
    # ========================================================================
    # BATCH OPERATIONS
    # ========================================================================
    
    async def enrich_leads_batch(
        self, 
        lead_ids: List[str],
        concurrency: int = 5
    ) -> Dict[str, EnrichmentResult]:
        """Reichert mehrere Leads parallel an"""
        logger.info(f"Starting batch enrichment for {len(lead_ids)} leads")
        
        results = {}
        
        for i in range(0, len(lead_ids), concurrency):
            batch = lead_ids[i:i+concurrency]
            
            tasks = []
            for lead_id in batch:
                lead_result = self.db.table("leads").select("*").eq("id", lead_id).execute()
                if lead_result.data:
                    lead = lead_result.data[0]
                    task = self.enrich_lead(
                        lead_id=lead_id,
                        email=lead.get("email"),
                        company_name=lead.get("company"),
                        company_domain=lead.get("company_domain"),
                        person_name=lead.get("name"),
                        linkedin_url=lead.get("linkedin_url"),
                    )
                    tasks.append((lead_id, task))
            
            for lead_id, task in tasks:
                try:
                    result = await task
                    results[lead_id] = result
                except Exception as e:
                    logger.error(f"Batch enrichment failed for {lead_id}: {e}")
        
        logger.info(f"Batch enrichment complete: {len(results)} leads processed")
        return results


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def create_enrichment_service(db: Client) -> EnrichmentService:
    """Factory für EnrichmentService"""
    return EnrichmentService(db)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "EnrichmentService",
    "create_enrichment_service",
    "EnrichmentResult",
    "CompanyData",
    "PersonData",
    "TechStackItem",
    "ICPMatchResult",
    "ICP_CONFIG",
    "CompanySize",
    "Seniority",
    "RevenueRange",
]

