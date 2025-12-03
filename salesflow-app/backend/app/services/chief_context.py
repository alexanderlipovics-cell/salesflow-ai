"""
CHIEF Context Service - Das Herzstück der AI-Coach-Integration.

Bereitet alle relevanten Daten für CHIEF vor:
- Daily Flow Status (wo steht der User heute)
- Remaining Counts (was fehlt noch)
- Lead Suggestions (passende Leads für nächste Aktionen)
- Vertical Profile (für kontextbezogene Antworten)

CHIEF bekommt diese Daten als JSON und kann dann
personalisierte, datenbasierte Coaching-Tipps geben.
"""

from typing import TypedDict, Optional, Any
from datetime import date, datetime, timedelta
from math import ceil
from supabase import Client

from app.core.database import get_supabase


# ═══════════════════════════════════════════════════════════════════════════
# TYPE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

class RemainingCounts(TypedDict):
    """Was dem User heute noch fehlt."""
    new_contacts: int
    followups: int
    reactivations: int


class ProgressItem(TypedDict):
    """Fortschritt einer einzelnen KPI."""
    target: float
    done: float
    remaining: float
    percent: float


class DailyFlowStatus(TypedDict):
    """Kompletter Daily Flow Status."""
    date: str
    new_contacts: ProgressItem
    followups: ProgressItem
    reactivations: ProgressItem
    overall_percent: float
    is_on_track: bool


class LeadSuggestion(TypedDict):
    """Ein vorgeschlagener Lead für CHIEF."""
    id: str
    name: str
    status: str
    last_contact_at: Optional[str]
    reason: str  # Warum CHIEF diesen Lead vorschlägt


class VerticalProfile(TypedDict):
    """Vertical-spezifischer Kontext für CHIEF."""
    vertical_id: str
    vertical_label: str
    role: Optional[str]
    product_context: Optional[str]
    conversation_style: str
    key_metrics: list[str]


class ChiefContext(TypedDict):
    """Kompletter Kontext für CHIEF."""
    daily_flow_status: DailyFlowStatus
    remaining_today: RemainingCounts
    suggested_leads: list[LeadSuggestion]
    vertical_profile: VerticalProfile
    user_name: Optional[str]
    current_goal_summary: Optional[str]


# ═══════════════════════════════════════════════════════════════════════════
# REMAINING COUNTS
# ═══════════════════════════════════════════════════════════════════════════

def compute_remaining_counts(daily_status: DailyFlowStatus) -> RemainingCounts:
    """Berechnet verbleibende Aktionen für heute."""
    def remaining(progress: ProgressItem) -> int:
        target = float(progress["target"])
        done = float(progress["done"])
        if target <= 0:
            return 0
        rem = target - done
        return max(0, ceil(rem))
    
    return RemainingCounts(
        new_contacts=remaining(daily_status["new_contacts"]),
        followups=remaining(daily_status["followups"]),
        reactivations=remaining(daily_status["reactivations"]),
    )


# ═══════════════════════════════════════════════════════════════════════════
# DAILY FLOW STATUS
# ═══════════════════════════════════════════════════════════════════════════

def get_daily_flow_status(
    supabase: Client,
    user_id: str,
    company_id: str,
    target_date: date | None = None,
) -> DailyFlowStatus | None:
    """
    Holt den Daily Flow Status für einen User.
    
    Queries:
    1. daily_flow_targets -> User's Tagesziele
    2. activity_log -> Aktivitäten für heute
    """
    if target_date is None:
        target_date = date.today()
    
    date_str = target_date.isoformat()
    
    try:
        # 1. Targets aus daily_flow_targets holen
        targets_response = supabase.table("daily_flow_targets").select("*").eq(
            "user_id", user_id
        ).eq(
            "company_id", company_id
        ).maybeSingle().execute()
        
        if targets_response.data:
            targets = {
                "new_contacts": targets_response.data.get("new_contacts_target", 8),
                "followups": targets_response.data.get("followups_target", 6),
                "reactivations": targets_response.data.get("reactivations_target", 2),
            }
        else:
            # Fallback Defaults
            targets = {
                "new_contacts": 8,
                "followups": 6,
                "reactivations": 2,
            }
        
        # 2. Aktivitäten für heute zählen
        activities_response = supabase.table("activity_log").select(
            "activity_type"
        ).eq(
            "user_id", user_id
        ).eq(
            "company_id", company_id
        ).gte(
            "created_at", f"{date_str}T00:00:00"
        ).lt(
            "created_at", f"{date_str}T23:59:59"
        ).execute()
        
        # Aktivitäten zählen
        done = {"new_contacts": 0, "followups": 0, "reactivations": 0}
        
        if activities_response.data:
            for activity in activities_response.data:
                activity_type = activity.get("activity_type", "")
                if activity_type in ["new_contact", "cold_outreach", "first_contact"]:
                    done["new_contacts"] += 1
                elif activity_type in ["followup", "follow_up", "callback"]:
                    done["followups"] += 1
                elif activity_type in ["reactivation", "re_engagement", "dormant_contact"]:
                    done["reactivations"] += 1
        
    except Exception as e:
        # Bei Fehler: Mock-Daten als Fallback
        print(f"[ChiefContext] DB Error: {e}")
        targets = {"new_contacts": 8, "followups": 6, "reactivations": 2}
        done = {"new_contacts": 5, "followups": 4, "reactivations": 1}
    
    def make_progress(key: str) -> ProgressItem:
        target = targets.get(key, 0)
        completed = done.get(key, 0)
        remaining = max(0, target - completed)
        percent = (completed / target * 100) if target > 0 else 100
        return ProgressItem(
            target=target,
            done=completed,
            remaining=remaining,
            percent=round(percent, 1),
        )
    
    new_contacts = make_progress("new_contacts")
    followups = make_progress("followups")
    reactivations = make_progress("reactivations")
    
    total_target = targets["new_contacts"] + targets["followups"] + targets["reactivations"]
    total_done = done["new_contacts"] + done["followups"] + done["reactivations"]
    overall_percent = (total_done / total_target * 100) if total_target > 0 else 100
    
    # On Track: Bis Mittag 50%, bis 18 Uhr 80%
    current_hour = datetime.now().hour
    if current_hour < 12:
        expected_percent = 50
    elif current_hour < 18:
        expected_percent = 80
    else:
        expected_percent = 100
    
    return DailyFlowStatus(
        date=date_str,
        new_contacts=new_contacts,
        followups=followups,
        reactivations=reactivations,
        overall_percent=round(overall_percent, 1),
        is_on_track=overall_percent >= expected_percent * 0.8,
    )


# ═══════════════════════════════════════════════════════════════════════════
# LEAD SUGGESTIONS
# ═══════════════════════════════════════════════════════════════════════════

def get_suggested_leads(
    supabase: Client,
    user_id: str,
    company_id: str,
    remaining: RemainingCounts,
    limit: int = 5,
) -> list[LeadSuggestion]:
    """
    Holt passende Lead-Vorschläge basierend auf dem was fehlt.
    
    Priorität:
    1. Überfällige Follow-ups
    2. Kalte Leads für Reaktivierung
    3. Heiße neue Kontakte
    """
    suggestions: list[LeadSuggestion] = []
    
    try:
        # 1. Follow-ups: Leads mit überfälligen Tasks
        if remaining["followups"] > 0:
            followup_leads = supabase.table("leads").select(
                "id, name, status, last_contact_at"
            ).eq(
                "user_id", user_id
            ).eq(
                "company_id", company_id
            ).in_(
                "status", ["warm", "interested", "proposal_sent"]
            ).order(
                "last_contact_at", desc=False  # Älteste zuerst
            ).limit(
                remaining["followups"]
            ).execute()
            
            if followup_leads.data:
                for lead in followup_leads.data:
                    days_ago = _days_since(lead.get("last_contact_at"))
                    suggestions.append(LeadSuggestion(
                        id=lead["id"],
                        name=lead.get("name", "Unbekannt"),
                        status=lead.get("status", "unknown"),
                        last_contact_at=lead.get("last_contact_at"),
                        reason=f"Letzter Kontakt vor {days_ago} Tagen - Zeit nachzufassen",
                    ))
        
        # 2. Reaktivierungen: Kalte Leads (> 30 Tage)
        if remaining["reactivations"] > 0 and len(suggestions) < limit:
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            cold_leads = supabase.table("leads").select(
                "id, name, status, last_contact_at"
            ).eq(
                "user_id", user_id
            ).eq(
                "company_id", company_id
            ).eq(
                "status", "cold"
            ).lt(
                "last_contact_at", thirty_days_ago
            ).limit(
                remaining["reactivations"]
            ).execute()
            
            if cold_leads.data:
                for lead in cold_leads.data:
                    days_ago = _days_since(lead.get("last_contact_at"))
                    suggestions.append(LeadSuggestion(
                        id=lead["id"],
                        name=lead.get("name", "Unbekannt"),
                        status="cold",
                        last_contact_at=lead.get("last_contact_at"),
                        reason=f"Lange nicht kontaktiert ({days_ago} Tage) - gute Chance für Reaktivierung",
                    ))
        
        # 3. Neue Kontakte: Leads ohne Erstkontakt
        if remaining["new_contacts"] > 0 and len(suggestions) < limit:
            new_leads = supabase.table("leads").select(
                "id, name, status, source, created_at"
            ).eq(
                "user_id", user_id
            ).eq(
                "company_id", company_id
            ).eq(
                "status", "new"
            ).is_(
                "last_contact_at", "null"
            ).order(
                "created_at", desc=True  # Neueste zuerst
            ).limit(
                remaining["new_contacts"]
            ).execute()
            
            if new_leads.data:
                for lead in new_leads.data:
                    source = lead.get("source", "Import")
                    suggestions.append(LeadSuggestion(
                        id=lead["id"],
                        name=lead.get("name", "Unbekannt"),
                        status="new",
                        last_contact_at=None,
                        reason=f"Neu via {source} - noch kein Erstkontakt",
                    ))
    
    except Exception as e:
        print(f"[ChiefContext] Lead Query Error: {e}")
        # Fallback: Leere Liste bei Fehler
    
    return suggestions[:limit]


def _days_since(date_str: str | None) -> int:
    """Berechnet Tage seit einem Datum."""
    if not date_str:
        return 999
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return (datetime.now(dt.tzinfo) - dt).days
    except Exception:
        return 999


# ═══════════════════════════════════════════════════════════════════════════
# VERTICAL PROFILE
# ═══════════════════════════════════════════════════════════════════════════

def get_vertical_profile(
    supabase: Client,
    user_id: str,
    company_id: str,
) -> VerticalProfile:
    """
    Holt das Vertical-Profil für kontextbezogene CHIEF-Antworten.
    
    Queries:
    1. user_profiles -> Rolle und Vertical
    2. company_settings -> Produkt-Kontext und USPs
    """
    try:
        # User Profil holen
        profile_response = supabase.table("user_profiles").select(
            "role, vertical_id, display_name"
        ).eq(
            "user_id", user_id
        ).maybeSingle().execute()
        
        # Company Settings holen
        company_response = supabase.table("companies").select(
            "name, vertical_id, product_context, conversation_style"
        ).eq(
            "id", company_id
        ).maybeSingle().execute()
        
        profile = profile_response.data or {}
        company = company_response.data or {}
        
        vertical_id = profile.get("vertical_id") or company.get("vertical_id", "network_marketing")
        
        # Vertical Labels
        vertical_labels = {
            "network_marketing": "Network Marketing",
            "real_estate": "Immobilien",
            "finance": "Finanzvertrieb",
            "insurance": "Versicherungen",
            "coaching": "Coaching & Beratung",
        }
        
        # Key Metrics pro Vertical
        vertical_metrics = {
            "network_marketing": ["Neue Kontakte", "Follow-ups", "Reaktivierungen", "Team-Volumen"],
            "real_estate": ["Exposé-Versand", "Besichtigungen", "Angebote", "Abschlüsse"],
            "finance": ["Beratungsgespräche", "Angebote", "Abschlüsse", "Cross-Selling"],
            "insurance": ["Termine", "Angebote", "Policen", "Bestandskunden"],
            "coaching": ["Discovery Calls", "Follow-ups", "Proposals", "Conversions"],
        }
        
        return VerticalProfile(
            vertical_id=vertical_id,
            vertical_label=vertical_labels.get(vertical_id, "Vertrieb"),
            role=profile.get("role"),
            product_context=company.get("product_context"),
            conversation_style=company.get("conversation_style", "locker, direkt, motivierend, duzen"),
            key_metrics=vertical_metrics.get(vertical_id, ["Kontakte", "Follow-ups", "Abschlüsse"]),
        )
        
    except Exception as e:
        print(f"[ChiefContext] Profile Query Error: {e}")
        # Fallback
        return VerticalProfile(
            vertical_id="network_marketing",
            vertical_label="Network Marketing",
            role=None,
            product_context=None,
            conversation_style="locker, direkt, motivierend, duzen",
            key_metrics=["Neue Kontakte", "Follow-ups", "Reaktivierungen"],
        )


# ═══════════════════════════════════════════════════════════════════════════
# GOAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

def get_current_goal_summary(
    supabase: Client,
    user_id: str,
    company_id: str,
) -> str | None:
    """Holt die aktuelle Ziel-Zusammenfassung."""
    try:
        goal_response = supabase.table("user_goals").select(
            "goal_type, target_value, target_rank, deadline, progress_percent"
        ).eq(
            "user_id", user_id
        ).eq(
            "company_id", company_id
        ).eq(
            "is_active", True
        ).maybeSingle().execute()
        
        if goal_response.data:
            goal = goal_response.data
            target = goal.get("target_value") or goal.get("target_rank", "")
            deadline = goal.get("deadline", "")
            progress = goal.get("progress_percent", 0)
            
            return f"Ziel: {target} bis {deadline} ({progress}% erreicht)"
        
    except Exception:
        pass
    
    return None


# ═══════════════════════════════════════════════════════════════════════════
# MAIN: BUILD CONTEXT
# ═══════════════════════════════════════════════════════════════════════════

def build_chief_context(
    user_id: str,
    company_id: str,
    user_name: str | None = None,
    supabase: Client | None = None,
) -> ChiefContext | None:
    """
    Baut den kompletten Kontext für CHIEF.
    
    Wird vom /ai/chief/chat Endpoint aufgerufen.
    """
    if supabase is None:
        supabase = get_supabase()
    
    # 1. Daily Flow Status
    status = get_daily_flow_status(supabase, user_id=user_id, company_id=company_id)
    if status is None:
        return None
    
    # 2. Remaining Counts
    remaining = compute_remaining_counts(status)
    
    # 3. Lead Suggestions
    suggested_leads = get_suggested_leads(
        supabase=supabase,
        user_id=user_id,
        company_id=company_id,
        remaining=remaining,
        limit=5,
    )
    
    # 4. Vertical Profile
    vertical_profile = get_vertical_profile(supabase, user_id=user_id, company_id=company_id)
    
    # 5. Current Goal Summary
    goal_summary = get_current_goal_summary(supabase, user_id, company_id)
    
    return ChiefContext(
        daily_flow_status=status,
        remaining_today=remaining,
        suggested_leads=suggested_leads,
        vertical_profile=vertical_profile,
        user_name=user_name,
        current_goal_summary=goal_summary,
    )


# ═══════════════════════════════════════════════════════════════════════════
# FORMAT FOR LLM
# ═══════════════════════════════════════════════════════════════════════════

def format_context_for_llm(context: ChiefContext) -> str:
    """
    Formatiert den Context als lesbaren Text für das LLM.
    
    Alternative zum JSON-Dump für bessere LLM-Verarbeitung.
    """
    status = context["daily_flow_status"]
    remaining = context["remaining_today"]
    leads = context["suggested_leads"]
    profile = context["vertical_profile"]
    
    lines = [
        "=== AKTUELLER STATUS ===",
        f"Datum: {status['date']}",
        f"Gesamtfortschritt: {status['overall_percent']}%",
        f"Auf Kurs: {'✅ Ja' if status['is_on_track'] else '⚠️ Nein'}",
        "",
        "Neue Kontakte: {done}/{target} ({remaining} fehlen)".format(
            done=int(status["new_contacts"]["done"]),
            target=int(status["new_contacts"]["target"]),
            remaining=remaining["new_contacts"],
        ),
        "Follow-ups: {done}/{target} ({remaining} fehlen)".format(
            done=int(status["followups"]["done"]),
            target=int(status["followups"]["target"]),
            remaining=remaining["followups"],
        ),
        "Reaktivierungen: {done}/{target} ({remaining} fehlen)".format(
            done=int(status["reactivations"]["done"]),
            target=int(status["reactivations"]["target"]),
            remaining=remaining["reactivations"],
        ),
        "",
        "=== PASSENDE LEADS ===",
    ]
    
    if leads:
        for lead in leads:
            lines.append(f"- {lead['name']} ({lead['status']}): {lead['reason']}")
    else:
        lines.append("- Keine offenen Lead-Vorschläge")
    
    if context.get("current_goal_summary"):
        lines.extend([
            "",
            "=== AKTUELLES ZIEL ===",
            context["current_goal_summary"],
        ])
    
    lines.extend([
        "",
        "=== USER PROFIL ===",
        f"Vertical: {profile['vertical_label']}",
        f"Rolle: {profile.get('role') or 'k.A.'}",
        f"Gesprächsstil: {profile['conversation_style']}",
    ])
    
    if context.get("user_name"):
        lines.insert(0, f"User: {context['user_name']}")
        lines.insert(1, "")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
# SERVICE CLASS (Singleton Pattern)
# ═══════════════════════════════════════════════════════════════════════════

class ChiefContextService:
    """
    Service-Klasse für CHIEF Context.
    Bietet High-Level API für die Integration.
    """
    
    def __init__(self, supabase: Client | None = None):
        self._supabase = supabase
    
    @property
    def supabase(self) -> Client:
        if self._supabase is None:
            self._supabase = get_supabase()
        return self._supabase
    
    def get_context(
        self,
        user_id: str,
        company_id: str,
        user_name: str | None = None,
    ) -> ChiefContext | None:
        """Holt den kompletten CHIEF Context."""
        return build_chief_context(
            user_id=user_id,
            company_id=company_id,
            user_name=user_name,
            supabase=self.supabase,
        )
    
    def get_formatted_context(
        self,
        user_id: str,
        company_id: str,
        user_name: str | None = None,
    ) -> str | None:
        """Holt den CHIEF Context als formatierten String für LLM."""
        context = self.get_context(user_id, company_id, user_name)
        if context is None:
            return None
        return format_context_for_llm(context)
    
    def get_remaining_counts(
        self,
        user_id: str,
        company_id: str,
    ) -> RemainingCounts | None:
        """Holt nur die verbleibenden Counts für heute."""
        status = get_daily_flow_status(self.supabase, user_id, company_id)
        if status is None:
            return None
        return compute_remaining_counts(status)


# Global instance
chief_context_service = ChiefContextService()

