from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_current_user, get_supabase
from app.ai_client import client as ai_client


router = APIRouter(prefix="/lead-analysis", tags=["lead-analysis"])


class DeepScanRequest(BaseModel):
    lead_id: str


DISC_PROMPT = """Analysiere diesen Sales-Lead und erstelle ein DISC-Profil.

Lead: {name} bei {company}
Status: {status}
Notizen: {notes}

Antworte NUR mit JSON:
{{"disc_profile":{{"dominant":<0-100>,"influential":<0-100>,"steady":<0-100>,"conscientious":<0-100>,"primary_type":"<z.B. Analytiker (C)>","description":"<1 Satz>"}},"dos":["<3 Tipps>"],"donts":["<3 Fehler>"],"closing_probability":<0-100>,"recommended_approach":"<2 Sätze Strategie>"}}"""


def _extract_user_id(user: Any) -> str:
    if isinstance(user, dict):
        return str(user.get("id") or user.get("user_id") or user.get("sub"))
    if hasattr(user, "id"):
        return str(getattr(user, "id"))
    return str(user)


@router.post("/deep-scan")
async def deep_scan(request: DeepScanRequest, user=Depends(get_current_user), supabase=Depends(get_supabase)):
    user_id = _extract_user_id(user)

    result = supabase.table("leads").select("*").eq("id", request.lead_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")

    lead = result.data[0]

    try:
        response = await ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sales-Psychologie-Experte. Nur JSON ausgeben."},
                {"role": "user", "content": DISC_PROMPT.format(
                    name=lead.get("name", "?"),
                    company=lead.get("company", "?"),
                    status=lead.get("status", "new"),
                    notes=lead.get("notes", "-")
                )}
            ],
            temperature=0.7
        )
        text = response.choices[0].message.content
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        analysis = json.loads(text)
    except Exception:
        analysis = {
            "disc_profile": {"dominant": 25, "influential": 25, "steady": 25, "conscientious": 25, "primary_type": "Ausgeglichen", "description": "Mehr Daten nötig"},
            "dos": ["Fragen stellen", "Zuhören", "Bedürfnisse klären"],
            "donts": ["Druck machen", "Unterbrechen", "Annahmen treffen"],
            "closing_probability": 50,
            "recommended_approach": "Erst Vertrauen aufbauen, dann Lösung präsentieren."
        }

    supabase.table("leads").update({"analysis_data": analysis}).eq("id", request.lead_id).execute()

    return {"success": True, "name": lead.get("name"), "company": lead.get("company"), **analysis}

