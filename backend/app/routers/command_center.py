"""
Command Center Router - Aggregierte Daten & CHIEF Integration
Non Plus Ultra: Alles für einen Lead in einem Request
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import json
import logging

from app.core.deps import get_supabase
from app.core.security import get_current_user_dict
from app.ai_client import AIClient
from app.core.config import get_settings
from app.ai.chief_identity import get_chief_system_prompt, is_ceo_user, get_vertical_context
from app.services.workflow_engine import detect_workflow_status
from app.services.chief_brain import ChiefBrain

router = APIRouter(
    prefix="/command-center", 
    tags=["command-center"],
    dependencies=[Depends(get_current_user_dict)]  # ALLE Endpoints brauchen Auth
)
logger = logging.getLogger(__name__)

# ============================================================================
# AGGREGATION ENDPOINT - Alles für einen Lead in einem Request
# ============================================================================

# ============================================================================
# SPEZIFISCHE ROUTEN MÜSSEN VOR PARAMETRISIERTEN ROUTEN KOMMEN!
# ============================================================================

@router.get("/queue")
async def get_smart_queue(
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """
    Get prioritized queue using CHIEF Brain.
    Gibt NUR die Leads zurück die JETZT actionable sind.
    Sortiert nach Priorität mit Workflow Detection.
    """
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    try:
        # Nutze CHIEF Brain für priorisierte Queue
        brain = ChiefBrain(supabase, user_id)
        queue_items = await brain.get_prioritized_queue(limit=20)
        
        # Transformiere in das erwartete Format
        queue = {
            "action_required": [],   # Lead wartet auf Antwort
            "followups_today": [],   # Follow-ups fällig
            "hot_leads": [],         # Hot ohne Aktivität 24h
            "new_leads": [],         # Noch nie kontaktiert
            "nurture": [],           # >7 Tage kein Kontakt
            "appointments_today": [] # Termine heute
        }
        
        for item in queue_items:
            lead = item['lead']
            workflow = item['workflow']
            
            # Füge workflow als suggested_action hinzu (für Kompatibilität)
            lead["suggested_action"] = workflow
            lead["priority"] = workflow.get('priority', 'medium')
            lead["workflow"] = workflow
            
            # Kategorisiere basierend auf Workflow Case
            case = workflow.get('case', '').upper()
            
            if case == 'RESPONSE_RECEIVED':
                queue["action_required"].append(lead)
            elif case == 'FOLLOWUP_DUE':
                queue["followups_today"].append(lead)
            elif case == 'HOT_LEAD':
                queue["hot_leads"].append(lead)
            elif case == 'NEW_LEAD':
                queue["new_leads"].append(lead)
            elif case == 'GONE_COLD':
                queue["nurture"].append(lead)
            elif case == 'QUALIFIED':
                queue["action_required"].append(lead)
            else:
                # Default: in new_leads
                queue["new_leads"].append(lead)
        
        return {
            "queue": queue,
            "total_actionable": sum(len(v) for v in queue.values()),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating smart queue: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating queue: {str(e)}")


@router.get("/queue/debug")
async def debug_queue(
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """Debug endpoint to see why queue might be empty."""
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    now = datetime.utcnow()
    three_days_ago = (now - timedelta(days=3)).isoformat()
    
    try:
        # Count leads by status
        all_leads_result = supabase.table("leads").select("id, status, temperature, last_contact_at").eq("user_id", user_id).execute()
        leads_data = all_leads_result.data or []
        
        status_counts = {}
        temp_counts = {"hot": 0, "warm": 0, "cold": 0, "none": 0}
        last_contact_stats = {"null": 0, "recent_3d": 0, "older_3d": 0}
        
        for lead in leads_data:
            # Status
            status = lead.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Temperature
            temp = lead.get("temperature", "none")
            if temp in temp_counts:
                temp_counts[temp] += 1
            else:
                temp_counts["none"] += 1
            
            # Last contact
            lc = lead.get("last_contact_at")
            if not lc:
                last_contact_stats["null"] += 1
            else:
                try:
                    lc_dt = datetime.fromisoformat(lc.replace('Z', '+00:00'))
                    three_days_ago_dt = datetime.fromisoformat(three_days_ago.replace('Z', '+00:00'))
                    if lc_dt > three_days_ago_dt:
                        last_contact_stats["recent_3d"] += 1
                    else:
                        last_contact_stats["older_3d"] += 1
                except:
                    last_contact_stats["null"] += 1
        
        # Count pending follow-ups
        followups_result = supabase.table("followup_suggestions")\
            .select("id, status, due_at")\
            .eq("user_id", user_id)\
            .eq("status", "pending")\
            .execute()
        followups_data = followups_result.data or []
        
        due_now = 0
        due_future = 0
        for fu in followups_data:
            due_at = fu.get("due_at", "")
            if due_at:
                try:
                    due_dt = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
                    if due_dt <= now:
                        due_now += 1
                    else:
                        due_future += 1
                except:
                    due_future += 1
            else:
                due_future += 1
        
        return {
            "total_leads": len(leads_data),
            "status_breakdown": status_counts,
            "temperature_breakdown": temp_counts,
            "last_contact_breakdown": last_contact_stats,
            "followups": {
                "total_pending": len(followups_data),
                "due_now": due_now,
                "due_future": due_future,
            },
            "queue_criteria": {
                "hot_leads": f"{temp_counts.get('hot', 0)} leads with temperature='hot'",
                "new_no_contact": f"{last_contact_stats['null']} leads with last_contact_at=null",
                "stale_contacted": f"Leads with status='contacted' AND last_contact > 3 days",
                "followups_due": f"{due_now} follow-ups due now",
            },
            "debug_timestamp": now.isoformat(),
        }
    except Exception as e:
        logger.error(f"Error in debug_queue: {e}")
        raise HTTPException(status_code=500, detail=f"Error in debug: {str(e)}")


async def generate_suggested_action(
    supabase,
    lead: dict,
    followup: Optional[dict] = None
) -> dict:
    """
    Generiert die vorgeschlagene nächste Aktion basierend auf Kontext.
    """
    status = lead.get("status", "new")
    temperature = lead.get("temperature", "cold")
    waiting = lead.get("waiting_for_response", False)
    last_message = lead.get("last_inbound_message", "")
    
    # Lead wartet auf Antwort - höchste Priorität
    if waiting and last_message:
        # Analysiere was der Lead gesagt hat
        message_lower = last_message.lower()
        
        if "termin" in message_lower or "zeit" in message_lower or "wann" in message_lower:
            return {
                "type": "schedule_meeting",
                "reason": "Lead fragt nach Termin",
                "message": "Hey! Perfekt, lass uns telefonieren. Passt dir Donnerstag um 15 Uhr? Dauert nur 20 Minuten, dann zeig ich dir alles.",
                "urgency": "high"
            }
        elif "preis" in message_lower or "kostet" in message_lower or "kosten" in message_lower:
            return {
                "type": "pricing",
                "reason": "Lead fragt nach Preis",
                "message": "Gerne erkläre ich dir die Preise persönlich. Lass uns kurz telefonieren - ich zeig dir auch, wie du das System optimal nutzt.",
                "urgency": "high"
            }
        elif any(word in message_lower for word in ["ja", "ok", "klingt gut", "interessant"]):
            return {
                "type": "respond_positive",
                "reason": "Lead zeigt Interesse",
                "message": "Super! Lass uns kurz telefonieren damit ich dir alles zeigen kann. Wann passt es dir am besten?",
                "urgency": "high"
            }
        else:
            return {
                "type": "respond",
                "reason": "Lead wartet auf Antwort",
                "message": "Danke für deine Nachricht! Lass mich dir das gerne persönlich erklären.",
                "urgency": "critical"
            }
    
    # Follow-up fällig
    if followup:
        return {
            "type": "followup",
            "reason": f"Follow-up geplant für {followup.get('due_at', 'heute')}",
            "message": followup.get("suggested_message") or followup.get("message") or f"Hey {lead.get('name', '').split()[0] if lead.get('name') else ''}! Wollte kurz nachfragen...",
            "urgency": "high"
        }
    
    # Neuer Lead
    if status == "new" or not lead.get("last_contact_at"):
        return {
            "type": "icebreaker",
            "reason": "Erstkontakt nötig",
            "message": f"Hey {lead.get('name', '').split()[0] if lead.get('name') else 'dort'}! Ich hab gesehen dass du dich für [Produkt] interessierst. Lass uns kurz telefonieren damit ich dir alles zeigen kann!",
            "urgency": "medium"
        }
    
    # Qualifizierter Lead
    if status == "qualified":
        return {
            "type": "close",
            "reason": "Lead ist qualifiziert - Zeit für Abschluss",
            "message": "Perfekt! Lass uns jetzt den nächsten Schritt gehen. Ich zeig dir wie du startest.",
            "urgency": "high"
        }
    
    # Default
    return {
        "type": "check_in",
        "reason": "Beziehung pflegen",
        "message": f"Hey {lead.get('name', '').split()[0] if lead.get('name') else 'dort'}! Wie läuft es? Alles klar?",
        "urgency": "low"
    }


@router.get("/{lead_id}")
async def get_lead_details(
    lead_id: str,
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """Holt Lead-Details inkl. Workflow-Status"""
    user_id = current_user.get("id") or current_user.get("sub") or current_user.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    # Lead laden
    try:
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).eq("user_id", user_id).maybe_single().execute()
        lead = lead_res.data
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading lead: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading lead: {str(e)}")
    
    # Messages laden (falls Tabelle existiert)
    messages = []
    try:
        messages_res = supabase.table("messages").select("*").eq("lead_id", lead_id).order("created_at").execute()
        messages = messages_res.data or []
    except:
        # Falls messages Tabelle nicht existiert, versuche lead_messages
        try:
            messages_res = supabase.table("lead_messages").select("*").eq("lead_id", lead_id).order("sent_at").execute()
            messages = messages_res.data or []
        except:
            pass
    
    # Interactions/Timeline laden
    interactions = []
    try:
        interactions_res = supabase.table("lead_interactions").select("*").eq("lead_id", lead_id).order("created_at", desc=True).execute()
        interactions = interactions_res.data or []
    except:
        pass
    
    # Follow-ups laden
    followups = []
    try:
        followups_res = supabase.table("followup_suggestions").select("*").eq("lead_id", lead_id).eq("status", "pending").execute()
        followups = followups_res.data or []
    except:
        pass
    
    # WORKFLOW STATUS DETECTION
    workflow = detect_workflow_status(lead, messages, followups)
    
    # Score berechnen
    score = 10
    status_scores = {'new': 10, 'contacted': 25, 'qualified': 60, 'won': 100, 'lost': 0}
    score = status_scores.get(lead.get('status', 'new'), 10)
    if lead.get('temperature') == 'hot':
        score += 25
    elif lead.get('temperature') == 'warm':
        score += 10
    score += min(len(interactions) * 5, 20)
    score = min(score, 95)
    
    # CHIEF Insight aus Workflow
    chief_insight = {
        "strategy": workflow.get('reason'),
        "next_action": workflow.get('action'),
        "icebreaker": workflow.get('suggested_message'),
        "probability": score,
        "workflow_case": workflow.get('case'),
        "urgency": workflow.get('urgency'),
        "buttons": workflow.get('buttons'),
        "channel": workflow.get('channel')
    }
    
    # Timeline formatieren
    timeline = [{
        "id": i.get("id"),
        "type": i.get("interaction_type"),
        "content": i.get("notes") or i.get("interaction_type"),
        "timestamp": i.get("created_at"),
        "channel": i.get("channel")
    } for i in interactions]
    
    return {
        "lead": {**lead, "score": score},
        "messages": messages,
        "timeline": timeline,
        "followups": followups,
        "chief_insight": chief_insight,
        "workflow": workflow
    }


@router.patch("/{lead_id}")
async def update_lead(
    lead_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """
    Update Lead Status/Temperature oder andere Felder.
    """
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    # Prüfe ob Lead existiert und User gehört
    try:
        lead_check = supabase.table("leads").select("id").eq(
            "id", lead_id
        ).eq("user_id", user_id).maybe_single().execute()
        
        if not lead_check.data:
            raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking lead ownership: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    
    # Erstelle Updates Dict
    updates = {}
    allowed_fields = ["status", "temperature", "score", "notes", "company", "position", "email", "phone"]
    
    for field in allowed_fields:
        if field in request:
            updates[field] = request[field]
    
    if not updates:
        raise HTTPException(status_code=400, detail="Keine gültigen Felder zum Update")
    
    updates["updated_at"] = datetime.now().isoformat()
    
    try:
        result = supabase.table("leads").update(updates).eq("id", lead_id).eq("user_id", user_id).execute()
        
        return {
            "success": True,
            "lead": result.data[0] if result.data else None
        }
    except Exception as e:
        logger.error(f"Error updating lead: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating lead: {str(e)}")


@router.get("/{lead_id}/messages")
async def get_lead_messages(
    lead_id: str,
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """
    Holt alle Messages für einen Lead (alle Kanäle).
    """
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    # Prüfe ob Lead existiert und User gehört
    try:
        lead_check = supabase.table("leads").select("id").eq(
            "id", lead_id
        ).eq("user_id", user_id).maybe_single().execute()
        
        if not lead_check.data:
            raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking lead ownership: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    
    # Hole Messages
    messages = []
    try:
        messages_result = supabase.table("lead_messages").select("*").eq(
            "lead_id", lead_id
        ).order("sent_at", desc=True).limit(100).execute()
        
        messages = messages_result.data or []
    except Exception as e:
        # Tabelle existiert vielleicht noch nicht
        logger.debug(f"Messages table not found or error: {e}")
    
    return messages


def generate_chief_insight(lead: dict, timeline: list, messages: list, followups: list) -> dict:
    """
    Generiert intelligente Insights basierend auf Lead-Daten.
    """
    name = lead.get("name", "Lead")
    status = lead.get("status", "new")
    temperature = lead.get("temperature", "cold")
    last_contact = lead.get("last_contact_at")
    
    # Basis-Strategie basierend auf Status + Temperature
    strategies = {
        ("new", "cold"): f"Erster Kontakt mit {name}. Starte mit einem personalisierten Eisbrecher basierend auf dem Profil.",
        ("new", "warm"): f"{name} wurde empfohlen oder hat Interesse gezeigt. Nutze die Empfehlung als Gesprächseinstieg.",
        ("new", "hot"): f"{name} ist sehr interessiert! Schnell handeln - innerhalb von 24h kontaktieren.",
        ("contacted", "cold"): f"{name} wurde kontaktiert aber zeigt wenig Interesse. Versuche einen anderen Ansatz oder Kanal.",
        ("contacted", "warm"): f"{name} ist interessiert. Follow-up mit Mehrwert (Case Study, Testimonial).",
        ("contacted", "hot"): f"{name} ist heiß! Dranbleiben und konkretes Angebot machen.",
        ("qualified", "warm"): f"{name} ist qualifiziert. Zeit für ein konkretes Angebot oder Termin.",
        ("qualified", "hot"): f"{name} ist kaufbereit! Abschluss vorbereiten.",
    }
    
    strategy = strategies.get((status, temperature), f"Analysiere {name}'s Situation und plane den nächsten Schritt.")
    
    # Nächste Aktion basierend auf Kontext
    next_action = "Nachricht senden"
    if followups:
        next_followup = followups[0]
        due_date = next_followup.get("due_at") or next_followup.get("due_date", "")
        if due_date:
            try:
                due_dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                if due_dt.date() == datetime.now().date():
                    next_action = f"Follow-up fällig: Heute!"
                else:
                    next_action = f"Follow-up fällig: {due_date[:10]}"
            except:
                next_action = f"Follow-up fällig: {due_date[:10] if due_date else 'Heute'}"
    elif status == "qualified":
        next_action = "Termin vereinbaren"
    elif temperature == "hot":
        next_action = "Sofort kontaktieren!"
    elif last_contact:
        try:
            last_contact_dt = datetime.fromisoformat(last_contact.replace("Z", "+00:00"))
            days_since = (datetime.now(last_contact_dt.tzinfo) - last_contact_dt).days
            if days_since > 7:
                next_action = f"Seit {days_since} Tagen kein Kontakt - Follow-up!"
        except:
            pass
    
    # Eisbrecher generieren
    icebreakers = {
        "new": [
            f"Hey {name.split()[0] if name else 'du'}! Ich hab gesehen, dass du...",
            f"Hi {name.split()[0] if name else 'du'}, kurze Frage...",
            f"Hallo {name.split()[0] if name else 'du'}, ich bin auf dein Profil gestoßen und..."
        ],
        "contacted": [
            f"Hey {name.split()[0] if name else 'du'}, wollte kurz nachhaken...",
            f"Hi {name.split()[0] if name else 'du'}, hattest du Zeit drüber nachzudenken?",
        ],
        "qualified": [
            f"Hey {name.split()[0] if name else 'du'}, wann passt dir ein kurzer Call?",
            f"Hi {name.split()[0] if name else 'du'}, sollen wir mal telefonieren?",
        ]
    }
    
    icebreaker = icebreakers.get(status, icebreakers["new"])[0] if icebreakers.get(status) else icebreakers["new"][0]
    
    # Win-Wahrscheinlichkeit
    probability = calculate_win_probability(lead, timeline, messages)
    
    return {
        "strategy": strategy,
        "next_action": next_action,
        "icebreaker": icebreaker,
        "probability": probability,
        "temperature_suggestion": suggest_temperature(lead, timeline),
        "status_suggestion": suggest_status(lead, timeline, messages)
    }


def calculate_lead_score(lead: dict, timeline: list, messages: list) -> int:
    """
    Berechnet Lead-Score (0-100) basierend auf Aktivität und Engagement.
    """
    score = 30  # Basis
    
    # Temperature Bonus
    temp_scores = {"hot": 30, "warm": 15, "cold": 0}
    score += temp_scores.get(lead.get("temperature", "cold"), 0)
    
    # Status Bonus
    status_scores = {"won": 100, "qualified": 25, "contacted": 10, "new": 0}
    score += status_scores.get(lead.get("status", "new"), 0)
    
    # Activity Bonus
    score += min(len(timeline) * 2, 20)  # Max 20 für Aktivität
    
    # Response Bonus (hat der Lead geantwortet?)
    inbound_messages = [m for m in messages if m.get("direction") == "inbound"]
    score += min(len(inbound_messages) * 5, 15)  # Max 15
    
    # Recency Bonus
    if lead.get("last_contact_at"):
        try:
            last_contact_dt = datetime.fromisoformat(lead["last_contact_at"].replace("Z", "+00:00"))
            days_ago = (datetime.now(last_contact_dt.tzinfo) - last_contact_dt).days
            if days_ago <= 1:
                score += 10
            elif days_ago <= 3:
                score += 5
        except:
            pass
    
    return min(score, 100)


def calculate_win_probability(lead: dict, timeline: list, messages: list) -> int:
    """
    Berechnet Gewinn-Wahrscheinlichkeit (0-100%).
    """
    base = 10
    
    # Temperature
    if lead.get("temperature") == "hot":
        base += 30
    elif lead.get("temperature") == "warm":
        base += 15
    
    # Status
    status_boost = {"qualified": 25, "contacted": 10, "new": 0, "won": 100, "lost": 0}
    base += status_boost.get(lead.get("status", "new"), 0)
    
    # Engagement (Antworten)
    inbound = len([m for m in messages if m.get("direction") == "inbound"])
    base += min(inbound * 10, 30)
    
    return min(base, 95)  # Max 95%, nie 100% sicher


def suggest_temperature(lead: dict, timeline: list) -> Optional[str]:
    """
    Schlägt Temperature-Änderung vor basierend auf Aktivität.
    """
    current = lead.get("temperature", "cold")
    
    # Wenn viel Aktivität in letzten 24h -> suggest hot
    recent = []
    for t in timeline:
        timestamp = t.get("timestamp") or t.get("created_at")
        if timestamp:
            try:
                t_dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                days_ago = (datetime.now(t_dt.tzinfo) - t_dt).days
                if days_ago < 1:
                    recent.append(t)
            except:
                pass
    
    if len(recent) >= 3 and current != "hot":
        return "hot"
    elif len(recent) >= 1 and current == "cold":
        return "warm"
    
    return None


def suggest_status(lead: dict, timeline: list, messages: list) -> Optional[str]:
    """
    Schlägt Status-Änderung vor.
    """
    current = lead.get("status", "new")
    
    # Wenn Antwort erhalten -> mindestens contacted
    inbound = [m for m in messages if m.get("direction") == "inbound"]
    if inbound and current == "new":
        return "contacted"
    
    # Wenn mehrere positive Antworten -> qualified
    if len(inbound) >= 2 and current == "contacted":
        return "qualified"
    
    return None


# ============================================================================
# CHIEF LEAD CHAT - Kontext-bewusster Chat
# ============================================================================

@router.post("/chat")
async def chief_lead_chat(
    request: dict,
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """
    Chat mit CHIEF über einen spezifischen Lead.
    CHIEF kennt den vollen Kontext (Lead, Timeline, Messages, etc.)
    """
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    lead_id = request.get("lead_id")
    user_message = request.get("message")
    context = request.get("context", {})
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    if not lead_id or not user_message:
        raise HTTPException(status_code=400, detail="lead_id and message required")
    
    # Hole Lead-Daten falls nicht im Context
    if not context.get("lead"):
        try:
            lead_result = supabase.table("leads").select("*").eq(
                "id", lead_id
            ).eq("user_id", user_id).maybe_single().execute()
            context["lead"] = lead_result.data
        except Exception as e:
            logger.error(f"Error loading lead: {e}")
            raise HTTPException(status_code=404, detail="Lead not found")
    
    # Hole User-Präferenzen
    try:
        user_result = supabase.table("users").select("*").eq(
            "id", user_id
        ).maybe_single().execute()
        user_data = user_result.data or {}
    except:
        user_data = {}
    
    # Hole Company Knowledge (falls vorhanden)
    company_knowledge = None
    try:
        knowledge_result = supabase.table("company_knowledge").select("content").eq(
            "user_id", user_id
        ).eq("is_active", True).execute()
        if knowledge_result.data:
            company_knowledge = "\n".join([k.get("content", "") for k in knowledge_result.data])
    except:
        pass
    
    # Generiere CHIEF System Prompt mit Identity System
    lead = context.get("lead", {})
    system_prompt = get_chief_system_prompt(
        user_data=user_data,
        lead_data=lead,
        company_knowledge=company_knowledge
    )
    
    # Füge Timeline und Messages zum Prompt hinzu
    if context.get("timeline"):
        system_prompt += f"\n\n## LETZTE AKTIVITÄTEN\n{format_timeline_for_prompt(context['timeline'])}"
    
    if context.get("messages"):
        system_prompt += f"\n\n## LETZTE NACHRICHTEN\n{format_messages_for_prompt(context['messages'])}"
    
    if context.get("followups"):
        system_prompt += f"\n\n## OFFENE FOLLOW-UPS\n{format_followups_for_prompt(context['followups'])}"

    # API Call
    try:
        settings = get_settings()
        if not settings.openai_api_key:
            return {"response": "OpenAI API Key nicht konfiguriert.", "success": False}
        
        ai_client = AIClient(api_key=settings.openai_api_key, model="gpt-4o-mini")
        response = await ai_client.generate_async(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            max_tokens=512,
            temperature=0.7
        )
        
        # Speichere Interaktion
        try:
            supabase.table("lead_interactions").insert({
                "lead_id": lead_id,
                "user_id": user_id,
                "interaction_type": "note",  # Statt "chief_chat" - ist im Constraint erlaubt
                "notes": f"CHIEF Chat:\nUser: {user_message}\n\nCHIEF: {response}",
                "created_at": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Could not log interaction: {e}")
        
        return {"response": response, "success": True}
        
    except Exception as e:
        logger.error(f"CHIEF chat error: {e}")
        return {"response": "Entschuldigung, da ist etwas schief gelaufen. Versuch es nochmal.", "success": False}


def format_timeline_for_prompt(timeline: list) -> str:
    if not timeline:
        return "Keine Aktivitäten"
    
    lines = []
    for t in timeline[:10]:  # Letzte 10
        timestamp = t.get("timestamp", "")[:10] if t.get("timestamp") else ""
        content = (t.get("content", "") or "")[:100]
        lines.append(f"- {timestamp}: {t.get('type', 'activity')} - {content}")
    
    return "\n".join(lines)


def format_messages_for_prompt(messages: list) -> str:
    if not messages:
        return "Keine Nachrichten"
    
    lines = []
    for m in messages[:10]:
        direction = "→" if m.get("direction") == "outbound" else "←"
        channel = m.get("channel", "?")
        content = (m.get("content", "") or "")[:100]
        lines.append(f"{direction} [{channel}] {content}")
    
    return "\n".join(lines)


def format_followups_for_prompt(followups: list) -> str:
    if not followups:
        return "Keine offenen Follow-ups"
    
    lines = []
    for f in followups[:5]:
        due = f.get("due_at") or f.get("due_date", "")
        due_str = due[:10] if due else "?"
        title = (f.get("title") or f.get("message", "Follow-up") or "")[:50]
        lines.append(f"- Fällig {due_str}: {title}")
    
    return "\n".join(lines)


# ============================================================================
# PROCESS REPLY - Antwort analysieren
# ============================================================================

@router.post("/process-reply")
async def process_lead_reply(
    request: dict,
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """
    Analysiert eine Lead-Antwort und:
    - Erkennt Status-Änderung
    - Erkennt Temperatur-Änderung
    - Generiert passende Antwort
    - Updated Lead automatisch
    """
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    lead_id = request.get("lead_id")
    lead_reply = request.get("lead_reply")
    current_state = request.get("current_state", "new")
    
    if not user_id or not lead_id or not lead_reply:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Hole Lead
    try:
        lead_result = supabase.table("leads").select("*").eq(
            "id", lead_id
        ).maybe_single().execute()
        lead = lead_result.data or {}
    except Exception as e:
        logger.error(f"Error loading lead: {e}")
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Analyse Prompt
    analysis_prompt = f"""Analysiere diese Antwort von {lead.get('name', 'dem Lead')}:

"{lead_reply}"

Aktueller Status: {current_state}
Aktuelle Temperatur: {lead.get('temperature', 'cold')}

Antworte NUR mit diesem JSON Format:
{{
    "sentiment": "positive|neutral|negative",
    "intent": "interested|wants_info|wants_meeting|not_interested|unclear",
    "new_status": "new|contacted|qualified|won|lost|null",
    "new_temperature": "cold|warm|hot|null",
    "urgency_score": 0-100,
    "suggested_response": "Deine vorgeschlagene Antwort hier",
    "next_action": "Was der User als nächstes tun sollte",
    "key_points": ["Wichtiger Punkt 1", "Wichtiger Punkt 2"]
}}
"""

    try:
        settings = get_settings()
        if not settings.openai_api_key:
            return {
                "success": False,
                "error": "OpenAI API Key nicht konfiguriert",
                "suggested_response": "Danke für deine Nachricht! Ich melde mich gleich."
            }
        
        ai_client = AIClient(api_key=settings.openai_api_key, model="gpt-4o-mini")
        response = await ai_client.generate_async(
            system_prompt="Du bist ein Experte für Lead-Analyse. Antworte NUR mit gültigem JSON.",
            messages=[{"role": "user", "content": analysis_prompt}],
            max_tokens=512,
            temperature=0.3
        )
        
        # Parse JSON
        clean_response = response.strip()
        if clean_response.startswith("```"):
            parts = clean_response.split("```")
            if len(parts) > 1:
                clean_response = parts[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
        
        analysis = json.loads(clean_response)
        
        # Auto-Update Lead wenn Änderungen vorgeschlagen
        updates = {
            "waiting_for_response": False,  # User bearbeitet jetzt, nicht mehr "wartend"
            "last_inbound_message": lead_reply,
            "last_inbound_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        if analysis.get("new_status") and analysis["new_status"] != "null":
            updates["status"] = analysis["new_status"]
        if analysis.get("new_temperature") and analysis["new_temperature"] != "null":
            updates["temperature"] = analysis["new_temperature"]
        
        try:
            supabase.table("leads").update(updates).eq("id", lead_id).execute()
        except Exception as e:
            logger.error(f"Error updating lead: {e}")
        
        # Log die Antwort als Interaction
        try:
            supabase.table("lead_interactions").insert({
                "lead_id": lead_id,
                "user_id": user_id,
                "interaction_type": "reply_received",
                "notes": lead_reply,
                "metadata": {"analysis": analysis},
                "created_at": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Could not log interaction: {e}")
        
        return {
            "success": True,
            "analysis": analysis,
            "lead_updated": bool(updates),
            "updates_applied": updates
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return {
            "success": False,
            "error": "Could not parse AI response",
            "suggested_response": "Danke für deine Nachricht! Ich melde mich gleich."
        }
    except Exception as e:
        logger.error(f"Process reply error: {e}")
        return {
            "success": False,
            "error": str(e),
            "suggested_response": "Danke für deine Nachricht! Ich melde mich gleich."
        }


# ============================================================================
# EXTRACT LEAD FROM SCREENSHOT
# ============================================================================

@router.post("/extract-lead")
async def extract_lead_from_image(
    request: dict,
    current_user: dict = Depends(get_current_user_dict)
):
    """
    Extrahiert Lead-Daten aus Screenshot (Instagram, LinkedIn, Visitenkarte, etc.)
    """
    from openai import AsyncOpenAI
    
    image_base64 = request.get("image")
    
    if not image_base64:
        raise HTTPException(status_code=400, detail="Kein Bild")
    
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API Key nicht konfiguriert")
    
    extraction_prompt = """Analysiere dieses Bild und extrahiere alle Kontaktinformationen.

Das kann sein:
- Ein Instagram/Facebook/LinkedIn Profil Screenshot
- Eine Visitenkarte
- Ein Chat-Verlauf
- Ein Kontakt-Screenshot

Extrahiere NUR was du SICHER erkennst. Antworte NUR mit JSON:
{
    "name": "Voller Name oder null",
    "company": "Firmenname oder null",
    "position": "Position/Titel oder null",
    "email": "Email oder null",
    "phone": "Telefon oder null",
    "instagram": "Instagram Handle oder URL oder null",
    "linkedin": "LinkedIn URL oder null",
    "facebook": "Facebook URL oder null",
    "bio": "Bio/Beschreibung falls sichtbar oder null",
    "interests": ["Interesse1", "Interesse2"],
    "source": "instagram|linkedin|facebook|visitenkarte|chat|andere",
    "confidence": 0.0-1.0
}
"""

    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        
        # Entferne data:image prefix falls vorhanden
        if image_base64.startswith("data:image"):
            image_base64 = image_base64.split(",")[1]
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": extraction_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                        }
                    ]
                }
            ],
            max_tokens=512
        )
        
        response_text = response.choices[0].message.content
        
        # Parse JSON
        clean_response = response_text.strip()
        if clean_response.startswith("```"):
            parts = clean_response.split("```")
            if len(parts) > 1:
                clean_response = parts[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
        
        extracted = json.loads(clean_response)
        
        return {
            "success": True,
            "extracted": extracted
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return {
            "success": False,
            "error": "Could not parse extraction result",
            "extracted": {}
        }
    except Exception as e:
        logger.error(f"Extraction error: {e}")
        return {
            "success": False,
            "error": str(e),
            "extracted": {}
        }


# ============================================================================
# BULK EXTRACT & IMPORT
# ============================================================================

async def extract_leads_from_image(image_base64: str, image_number: int) -> list:
    """
    Nutzt GPT-4o Vision um Leads aus einem Screenshot zu extrahieren.
    Kann MEHRERE Leads pro Bild finden (z.B. Chat-Liste).
    """
    from openai import AsyncOpenAI
    import json
    
    settings = get_settings()
    if not settings.openai_api_key:
        logger.error("OpenAI API Key nicht konfiguriert")
        return []
    
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    # Bereinige base64 falls nötig
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    
    system_prompt = """Du bist ein Experte für das Extrahieren von Kontaktdaten aus Screenshots.

Analysiere das Bild und extrahiere ALLE sichtbaren Kontakte/Profile/Leads.

Das Bild kann sein:
- Instagram DM Liste (mehrere Chats sichtbar)
- WhatsApp Chat-Liste
- Facebook Messenger Liste
- LinkedIn Nachrichten
- Einzelnes Profil
- Visitenkarte

Für JEDEN gefundenen Kontakt extrahiere:
- name: Vollständiger Name oder Username
- platform: instagram, whatsapp, facebook, linkedin, unknown
- username: @username falls sichtbar
- phone: Telefonnummer falls sichtbar
- email: Email falls sichtbar
- company: Firma falls sichtbar
- bio: Bio/Status falls sichtbar
- last_message: Letzte Nachricht im Chat falls sichtbar
- has_unread: true/false - Hat ungelesene Nachrichten

Antworte NUR mit validem JSON Array. Kein Markdown, keine Erklärung.
Beispiel: [{"name": "Max Müller", "platform": "instagram", "username": "@maxm", ...}]

Wenn keine Kontakte gefunden werden: []"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Bild {image_number}: Extrahiere alle Kontakte/Leads aus diesem Screenshot."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=4000,
            temperature=0.1
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Bereinige falls in Markdown eingewickelt
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
            result_text = result_text.strip()
        
        leads = json.loads(result_text)
        
        # Füge Quelle hinzu
        for lead in leads:
            lead["source"] = f"bulk_import_image_{image_number}"
            lead["extracted_at"] = datetime.now().isoformat()
        
        return leads if isinstance(leads, list) else []
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error bei Bild {image_number}: {e}")
        logger.debug(f"Response text: {result_text[:500]}")
        return []
    except Exception as e:
        logger.error(f"GPT-4o Vision Fehler bei Bild {image_number}: {e}")
        return []


@router.post("/bulk-extract")
async def bulk_extract_leads(
    request: dict,
    current_user: dict = Depends(get_current_user_dict)
):
    """
    Extrahiert Leads aus mehreren Screenshots auf einmal.
    Nutzt GPT-4o Vision für Analyse.
    
    Request body:
    {
        "images": ["base64_image_1", "base64_image_2", ...]
    }
    """
    images = request.get("images", [])
    
    if not images:
        raise HTTPException(status_code=400, detail="Keine Bilder übermittelt")
    
    if len(images) > 20:
        raise HTTPException(status_code=400, detail="Maximal 20 Bilder erlaubt")
    
    all_leads = []
    
    for idx, image_base64 in enumerate(images):
        try:
            # GPT-4o Vision Analyse
            extracted = await extract_leads_from_image(image_base64, idx + 1)
            if extracted:
                all_leads.extend(extracted)
        except Exception as e:
            logger.error(f"Fehler bei Bild {idx + 1}: {e}")
            continue
    
    # Deduplizierung nach Name (case-insensitive)
    seen_names = set()
    unique_leads = []
    for lead in all_leads:
        name_lower = lead.get("name", "").lower().strip()
        if name_lower and name_lower not in seen_names:
            seen_names.add(name_lower)
            unique_leads.append(lead)
    
    return {
        "total_found": len(all_leads),
        "unique_leads": len(unique_leads),
        "duplicates_removed": len(all_leads) - len(unique_leads),
        "leads": unique_leads
    }


@router.post("/bulk-import")
async def bulk_import_leads(
    request: dict,
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """
    Importiert mehrere Leads auf einmal.
    
    Request body:
    {
        "leads": [...],
        "default_status": "new",
        "default_temperature": "cold",
        "create_followup": true,
        "followup_days": 3
    }
    """
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    leads_to_import = request.get("leads", [])
    default_status = request.get("default_status", "new")
    default_temperature = request.get("default_temperature", "cold")
    create_followup = request.get("create_followup", True)
    followup_days = request.get("followup_days", 3)
    
    imported = []
    failed = []
    
    for lead_data in leads_to_import:
        try:
            # Extrahiere Social Handles
            instagram_handle = lead_data.get("instagram_handle") or lead_data.get("username")
            
            # Erstelle Lead mit Social Handles
            new_lead = {
                "user_id": user_id,
                "name": lead_data.get("name") or instagram_handle or "Unknown",
                "email": lead_data.get("email"),
                "phone": lead_data.get("phone"),
                "company": lead_data.get("company"),
                "status": default_status,
                "temperature": default_temperature,
                "source": lead_data.get("platform") or lead_data.get("source", "bulk_import"),
                "notes": f"Imported from {lead_data.get('platform', 'screenshot')}",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Social Handles in separate Felder
            if instagram_handle:
                new_lead["instagram_handle"] = instagram_handle.lstrip("@") if instagram_handle.startswith("@") else instagram_handle
                new_lead["instagram_url"] = f"https://instagram.com/{new_lead['instagram_handle']}"
            
            if lead_data.get("whatsapp_number"):
                new_lead["whatsapp_number"] = lead_data.get("whatsapp_number")
            
            # Entferne None values
            new_lead = {k: v for k, v in new_lead.items() if v is not None}
            
            result = supabase.table("leads").insert(new_lead).execute()
            
            if result.data:
                lead_id = result.data[0]["id"]
                imported.append(result.data[0])
                
                # Erstelle Follow-up wenn gewünscht
                if create_followup:
                    followup_date = (datetime.now() + timedelta(days=followup_days)).isoformat()
                    supabase.table("followup_suggestions").insert({
                        "lead_id": lead_id,
                        "user_id": user_id,
                        "title": "Erstkontakt",
                        "suggested_message": f"Follow-up für {lead_data.get('name', 'Lead')}",
                        "due_at": followup_date,
                        "status": "pending",
                        "created_at": datetime.now().isoformat()
                    }).execute()
                    
        except Exception as e:
            logger.error(f"Fehler beim Import von Lead {lead_data.get('name', 'Unbekannt')}: {e}")
            failed.append({"lead": lead_data, "error": str(e)})
    
    return {
        "success": True,
        "imported_count": len(imported),
        "failed_count": len(failed),
        "imported": imported,
        "failed": failed
    }


# ============================================================================
# PARAMETRISIERTE ROUTEN GANZ AM ENDE!
# ============================================================================


@router.post("/{lead_id}/mark-processed")
async def mark_lead_processed(
    lead_id: str,
    body: dict = Body(default={}),
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """
    Markiert einen Lead als bearbeitet.
    Er verschwindet aus der Queue bis zum nächsten Trigger.
    """
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    action = body.get("action", "done")
    outcome = body.get("outcome")
    notes = body.get("notes")
    next_followup = body.get("next_followup")  # ISO date string or None
    
    try:
        updates = {
            "waiting_for_response": False,  # User hat geantwortet
            "last_action": action,
            "updated_at": datetime.now().isoformat()
        }
        
        # Füge notes hinzu falls vorhanden
        if notes:
            updates["notes"] = notes
        
        # WICHTIG: next_contact_at IMMER setzen wenn vom Frontend mitgeschickt
        if next_followup:
            updates["next_contact_at"] = next_followup
            logger.info(f"Setting next_contact_at to user-provided date: {next_followup}")
        
        # Wenn Nachricht gesendet wurde, aktualisiere last_contact_at
        if action in ["message_sent", "call_made", "meeting_scheduled"]:
            updates["last_contact_at"] = datetime.now().isoformat()
            updates["waiting_for_response"] = True
        
        # Wenn "Later" gewählt, erstelle Follow-up
        if action == "later" and next_followup:
            try:
                supabase.table("followup_suggestions").insert({
                    "lead_id": lead_id,
                    "user_id": user_id,
                    "due_at": next_followup,
                    "title": "Manueller Follow-up",
                    "status": "pending"
                }).execute()
            except Exception as e:
                logger.debug(f"Could not create followup: {e}")
        
        # Status-Updates basierend auf Action
        if action == "won":
            updates["status"] = "won"
            updates["customer_since"] = datetime.now().isoformat()
        elif action == "lost":
            updates["status"] = "lost"
        elif action in ["done", "message_sent"]:
            # Bei "Done" oder "Nachricht gesendet": 
            # Setze Status auf "contacted" wenn noch "new"
            try:
                lead_result = supabase.table("leads")\
                    .select("status")\
                    .eq("id", lead_id)\
                    .eq("user_id", user_id)\
                    .single()\
                    .execute()
                
                current_status = (lead_result.data.get("status") or "").lower() if lead_result.data else ""
                
                if current_status in ["new", ""]:
                    updates["status"] = "contacted"
                    logger.info(f"Lead {lead_id}: Status changed from '{current_status}' to 'contacted'")
            except Exception as e:
                logger.warning(f"Could not check lead status: {e}")
                # Fallback: Setze auf contacted wenn action ist done/message_sent
                updates["status"] = "contacted"
            
            # Setze last_contact_at
            updates["last_contact_at"] = datetime.now().isoformat()
            updates["waiting_for_response"] = True  # Wir warten jetzt auf Antwort
            
            # Erstelle Auto-Follow-up (wenn noch keins existiert)
            followup_date = None
            try:
                existing_followup = supabase.table("followup_suggestions")\
                    .select("id, due_at")\
                    .eq("lead_id", lead_id)\
                    .eq("user_id", user_id)\
                    .eq("status", "pending")\
                    .execute()
                
                if not existing_followup.data:
                    # Berechne Follow-up Datum (nur wenn noch nicht vom User gesetzt)
                    if not next_followup:
                        # Smart Default basierend auf Action/Outcome
                        days = 3  # Default
                        if action == "call":
                            if outcome == "positive":
                                days = 1
                            elif outcome == "neutral":
                                days = 5
                            elif outcome == "no_answer":
                                days = 1
                        elif action == "live":
                            days = 1
                        elif action == "meeting":
                            days = 1
                        
                        followup_date = (datetime.now() + timedelta(days=days)).isoformat()
                    else:
                        # User hat bereits custom Datum gewählt (wurde oben schon gesetzt)
                        followup_date = next_followup
                    
                    insert_result = supabase.table("followup_suggestions").insert({
                        "lead_id": lead_id,
                        "user_id": user_id,
                        "due_at": followup_date,
                        "title": "Auto-Follow-up nach Erstkontakt",
                        "reason": "Automatisch erstellt nach Nachricht",
                        "status": "pending",
                        "priority": "medium",
                        "channel": "WHATSAPP",
                        "flow": "follow_up",
                        "source": "system",
                        "stage": 1,
                        "suggested_message": "Hey! Wollte kurz nachhaken - hast du dir das anschauen können?"
                    }).execute()
                    
                    logger.info(f"Auto-Follow-up created for lead {lead_id}: {insert_result.data if insert_result.data else 'no data returned'}")
                    # Setze next_contact_at nur wenn noch nicht gesetzt
                    if "next_contact_at" not in updates:
                        updates["next_contact_at"] = followup_date
                else:
                    logger.info(f"Follow-up already exists for lead {lead_id}, skipping creation")
                    # WICHTIG: Auch hier next_contact_at setzen wenn Follow-up existiert (nur wenn noch nicht gesetzt)
                    if "next_contact_at" not in updates:
                        existing_due = existing_followup.data[0].get("due_at") if existing_followup.data else None
                        if existing_due:
                            updates["next_contact_at"] = existing_due
                        else:
                            # Fallback: 3 Tage default
                            updates["next_contact_at"] = (datetime.now() + timedelta(days=3)).isoformat()
            except Exception as e:
                logger.error(f"Could not create auto-followup for lead {lead_id}: {e}", exc_info=True)
                # Fallback: Wenn immer noch kein next_contact_at, default setzen
                if "next_contact_at" not in updates:
                    updates["next_contact_at"] = (datetime.now() + timedelta(days=3)).isoformat()
        
        # FINALE ABSICHERUNG: Stelle sicher dass next_contact_at IMMER gesetzt ist
        if "next_contact_at" not in updates:
            if next_followup:
                updates["next_contact_at"] = next_followup
            else:
                # Default: 3 Tage
                updates["next_contact_at"] = (datetime.now() + timedelta(days=3)).isoformat()
            logger.info(f"Setting next_contact_at as final fallback: {updates['next_contact_at']}")
        
        supabase.table("leads").update(updates).eq("id", lead_id).eq("user_id", user_id).execute()
        
        return {
            "success": True,
            "removed_from_queue": True,
            "message": "Lead wurde als bearbeitet markiert und verschwindet aus der Queue."
        }
        
    except Exception as e:
        logger.error(f"Error marking lead as processed: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/{lead_id}/interactions")
async def create_interaction(
    lead_id: str,
    interaction: dict = Body(...),
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """
    Erstellt eine neue Interaction für einen Lead.
    
    Body:
    {
        "interaction_type": "message" | "call" | "meeting" | "live" | "lost",
        "outcome": "positive" | "neutral" | "negative" | "no_answer" | "scheduled" | null,
        "outcome_reason": "no_interest" | "too_expensive" | ... | null,
        "notes": "string",
        "channel": "whatsapp" | "instagram" | "phone" | "email" | "in_person",
        "scheduled_at": "ISO datetime" | null,
        "location": "string" | null,
        "meeting_type": "online" | "phone" | "in_person" | null,
        "duration_seconds": int | null
    }
    """
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    
    try:
        # Validate lead belongs to user
        lead_check = supabase.table("leads")\
            .select("id")\
            .eq("id", lead_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not lead_check.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Create interaction
        interaction_data = {
            "lead_id": lead_id,
            "user_id": user_id,
            "interaction_type": interaction.get("interaction_type"),
            "outcome": interaction.get("outcome"),
            "outcome_reason": interaction.get("outcome_reason"),
            "notes": interaction.get("notes"),
            "channel": interaction.get("channel"),
            "scheduled_at": interaction.get("scheduled_at"),
            "location": interaction.get("location"),
            "meeting_type": interaction.get("meeting_type"),
            "duration_seconds": interaction.get("duration_seconds"),
        }
        
        # Remove None values
        interaction_data = {k: v for k, v in interaction_data.items() if v is not None}
        
        result = supabase.table("lead_interactions").insert(interaction_data).execute()
        
        logger.info(f"Interaction created for lead {lead_id}: {interaction.get('interaction_type')}")
        
        return {
            "success": True,
            "interaction": result.data[0] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating interaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{lead_id}/interactions")
async def get_interactions(
    lead_id: str,
    current_user: dict = Depends(get_current_user_dict),
    supabase = Depends(get_supabase)
):
    """Holt alle Interactions für einen Lead."""
    user_id = current_user.get("user_id") or current_user.get("sub") or current_user.get("id")
    
    try:
        result = supabase.table("lead_interactions")\
            .select("*")\
            .eq("lead_id", lead_id)\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        
        return {
            "interactions": result.data or [],
            "count": len(result.data or [])
        }
        
    except Exception as e:
        logger.error(f"Error fetching interactions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

