"""
Next Best Actions Router - KI-gestützte Task-Priorisierung
Endpoint für intelligente Aufgaben-Priorisierung
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import os
import json
from openai import OpenAI

router = APIRouter()

# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────

class NextBestTaskInput(BaseModel):
    """Input-Task für Priorisierung"""
    id: str
    task_type: str
    status: str
    due_at: Optional[str] = None
    vertical: Optional[str] = None
    lead_name: Optional[str] = None
    lead_status: Optional[str] = None
    potential_value: Optional[float] = None
    last_contact_at: Optional[str] = None
    notes: Optional[str] = None

class NextBestActionResult(BaseModel):
    """Priorisierte Action mit Score"""
    task_id: str
    score: float
    label: str
    reason: str
    recommended_timeframe: Optional[str] = None

class NextBestActionsRequest(BaseModel):
    """Request für Next-Best-Actions"""
    user_id: Optional[str] = None
    tasks: list[NextBestTaskInput]
    persona_key: Optional[str] = None

class NextBestActionsResponse(BaseModel):
    """Response mit priorisierten Actions"""
    actions: list[NextBestActionResult]

# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────

def get_demo_next_best_actions(tasks: list[NextBestTaskInput]) -> NextBestActionsResponse:
    """Demo-Priorisierung wenn kein OpenAI API Key vorhanden"""
    
    from datetime import datetime
    
    actions = []
    
    for task in tasks[:15]:  # Max 15 Tasks
        # Einfache Score-Berechnung für Demo
        score = 50.0
        
        # Überfällige Tasks priorisieren
        if task.due_at:
            try:
                due = datetime.fromisoformat(task.due_at.replace('Z', '+00:00'))
                now = datetime.now(due.tzinfo)
                days_overdue = (now - due).days
                if days_overdue > 0:
                    score += min(days_overdue * 5, 30)  # +5 pro Tag, max +30
            except:
                pass
        
        # Vertical-Boost
        if task.vertical and task.vertical != "generic":
            score += 5
        
        # Lead-Status-Boost
        if task.lead_status in ["warm", "hot"]:
            score += 10
        
        # Potenzial-Boost
        if task.potential_value and task.potential_value > 1000:
            score += 15
        
        score = min(score, 100)  # Cap bei 100
        
        # Label und Reason generieren
        label = f"{task.task_type.replace('_', ' ').title()} für {task.lead_name or 'Lead'}"
        
        reason_parts = []
        if task.due_at and days_overdue > 0:
            reason_parts.append(f"Task ist {days_overdue} Tag(e) überfällig")
        elif task.due_at:
            reason_parts.append("Task ist heute fällig")
        
        if task.lead_status in ["warm", "hot"]:
            reason_parts.append(f"Lead ist {task.lead_status}")
        
        if not reason_parts:
            reason_parts.append("Wichtige Aufgabe, die bald erledigt werden sollte")
        
        reason = ". ".join(reason_parts) + "."
        
        # Timeframe
        timeframe = "heute" if score > 70 else "diese Woche"
        
        actions.append(NextBestActionResult(
            task_id=task.id,
            score=score,
            label=label,
            reason=reason,
            recommended_timeframe=timeframe
        ))
    
    # Nach Score sortieren
    actions.sort(key=lambda x: x.score, reverse=True)
    
    return NextBestActionsResponse(actions=actions[:15])

# ─────────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────────

@router.post("/suggest", response_model=NextBestActionsResponse)
async def suggest_next_best_actions(payload: NextBestActionsRequest):
    """
    Generiert KI-gestützte Priorisierung von offenen Tasks.
    
    - Wenn OPENAI_API_KEY vorhanden: OpenAI GPT-4 Call
    - Wenn nicht: Intelligente Demo-Priorisierung
    """
    
    # Keine Tasks → leere Liste zurück
    if not payload.tasks:
        return NextBestActionsResponse(actions=[])
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    # ─────────────────────────────────────────────────────────────
    # DEMO MODE (kein API Key)
    # ─────────────────────────────────────────────────────────────
    
    if not api_key:
        return get_demo_next_best_actions(payload.tasks)
    
    # ─────────────────────────────────────────────────────────────
    # PRODUCTION MODE (OpenAI)
    # ─────────────────────────────────────────────────────────────
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Persona-Modus
        persona = payload.persona_key or "balanced"
        persona_instructions = ""
        if persona == "speed":
            persona_instructions = """
PERSONA-MODUS: SPEED
- Bevorzuge höhere Aktivität, leicht aggressiveres Tempo.
- Leicht höhere Gewichtung auf Anzahl der Touchpoints und Overdue-Tasks.
- Priorisiere Tasks, die schnell erledigt werden können.
"""
        elif persona == "relationship":
            persona_instructions = """
PERSONA-MODUS: RELATIONSHIP
- Bevorzuge Aufgaben mit warmen Leads, hoher Deal-Wahrscheinlichkeit.
- Leicht höhere Gewichtung auf Qualität und Potenzial.
- Priorisiere Tasks mit langfristigem Beziehungsaufbau.
"""
        else:  # balanced
            persona_instructions = """
PERSONA-MODUS: BALANCED
- Mischung aus Dringlichkeit und Potenzial.
- Ausgewogene Gewichtung aller Faktoren.
"""
        
        # System Prompt für Task-Priorisierung
        system_prompt = f"""Du bist ein erfahrener Vertriebsleiter und Priorisierungscoach.
Du hilfst einem Verkäufer, seine nächsten Aufgaben intelligent zu ordnen.

Du bekommst eine Liste von offenen Aufgaben (Follow-ups, Hunter, Field Ops),
inkl. Fälligkeit, Lead-Kontext und Notizen.

Deine Aufgabe:
- Bewerte jede Aufgabe mit einem Score von 0 bis 100.
- Score = Kombination aus:
  - Dringlichkeit (Fälligkeit/Überfälligkeit)
  - Potenzial (z.B. hohes Ticket, warmer Lead)
  - Momentum (wie lange kein Kontakt, Follow-up-Stufe)
- Gib eine kurze, klare Begründung.
- Gib optional eine empfohlene Zeitspanne (z.B. "jetzt sofort", "heute", "diese Woche").

{persona_instructions}

Regeln:
- Sprich in deinen Begründungen den Verkäufer mit "du" an.
- Bleib konkret ("Dieser Lead ist überfällig und war schon interessiert.").
- Sei knapp, maximal 1–2 Sätze pro Aufgabe.
- Fokussiere auf die Top 5-15 wichtigsten Tasks.

ANTWORT-FORMAT (JSON):
{
  "actions": [
    {
      "task_id": "...",
      "score": 87,
      "label": "Warmes Follow-up mit hohem Potenzial",
      "reason": "Der Lead ist warm, der Termin liegt kurz zurück und der Dealwert ist hoch – ideal für ein schnelles Follow-up.",
      "recommended_timeframe": "heute"
    }
  ]
}"""

        # Kompakte Task-Liste für User-Prompt
        tasks_compact = []
        for task in payload.tasks[:30]:  # Max 30 Tasks an KI senden
            tasks_compact.append({
                "id": task.id,
                "type": task.task_type,
                "status": task.status,
                "due_at": task.due_at,
                "vertical": task.vertical,
                "lead_name": task.lead_name,
                "lead_status": task.lead_status,
                "potential_value": task.potential_value,
                "last_contact_at": task.last_contact_at,
                "notes": task.notes
            })
        
        user_message = f"Hier sind meine offenen Aufgaben:\n\n{json.dumps(tasks_compact, indent=2, ensure_ascii=False)}\n\nPersona: {persona}"
        
        # OpenAI API Call
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        # Response parsen
        response_text = completion.choices[0].message.content
        response_data = json.loads(response_text)
        
        # Validierung: Nur Tasks zurückgeben, die auch in payload.tasks vorkommen
        valid_task_ids = {task.id for task in payload.tasks}
        actions = []
        
        for action_data in response_data.get("actions", []):
            if action_data["task_id"] in valid_task_ids:
                actions.append(NextBestActionResult(
                    task_id=action_data["task_id"],
                    score=float(action_data["score"]),
                    label=action_data["label"],
                    reason=action_data["reason"],
                    recommended_timeframe=action_data.get("recommended_timeframe")
                ))
        
        # Nach Score sortieren
        actions.sort(key=lambda x: x.score, reverse=True)
        
        return NextBestActionsResponse(actions=actions[:15])
        
    except Exception as e:
        print(f"OpenAI Error in Next-Best-Actions: {e}")
        # Fallback zu Demo-Priorisierung bei Fehler
        return get_demo_next_best_actions(payload.tasks)

