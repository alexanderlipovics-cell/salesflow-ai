import uuid
import logging
import json
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import openai

from app.ai.agent import run_sales_agent
from app.core.security.main import get_current_user
from app.core.deps import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatRequest(BaseModel):
    message: Optional[str] = None
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None
    lead_id: Optional[str] = None
    lead_context: Optional[Dict[str, Any]] = None
    include_context: Optional[bool] = None


class ChatResponse(BaseModel):
    message: str
    tools_used: List[dict]
    session_id: str


async def process_vision_request(image_base64: str, message: str, user_id: str, db):
    """Analysiert ein Bild und erstellt optional Leads aus erkannten Kontakten."""

    lead_keywords = ["lead", "kontakt", "speicher", "erstell", "extrahier", "namen", "liste"]
    wants_leads = any(kw in (message or "").lower() for kw in lead_keywords)

    system_prompt = """Du bist CHIEF, ein Sales-Assistent der Screenshots analysiert.

DEINE AUFGABEN:
1. Analysiere das Bild (Instagram, Facebook, WhatsApp, LinkedIn Screenshots)
2. Erkenne alle sichtbaren Namen/Kontakte in Nachrichtenlisten, Follower-Listen, etc.
3. Wenn der User Leads erstellen will, extrahiere die Namen

ANTWORT-FORMAT:
- Wenn User nur Analyse will: Beschreibe was du siehst
- Wenn User Leads erstellen will, antworte EXAKT in diesem JSON-Format:
```json
{
    "action": "create_leads",
    "leads": [
        {"name": "Max Mustermann"},
        {"name": "Anna Schmidt"},
        {"name": "Thomas Müller"}
    ],
    "source": "instagram",
    "count": 3
}
```

WICHTIG: 
- Erkenne die Plattform (Instagram, Facebook, WhatsApp, LinkedIn)
- Extrahiere NUR echte Namen, keine Timestamps oder UI-Elemente
- Bei Unsicherheit frage nach
"""

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": message},
                    {"type": "image_url", "image_url": {"url": image_base64}},
                ],
            },
        ],
        max_tokens=2000,
    )

    result = response.choices[0].message.content

    # Versuche JSON zu extrahieren und Leads zu erstellen
    try:
        if "create_leads" in result or '"action"' in result:
            json_start = result.find("{")
            json_end = result.rfind("}") + 1

            if json_start != -1 and json_end > json_start:
                json_str = result[json_start:json_end]
                data = json.loads(json_str)

                if data.get("action") == "create_leads" and data.get("leads"):
                    created_leads = []
                    source = data.get("source", "screen_to_lead")

                    for lead_data in data["leads"]:
                        name = (lead_data.get("name") or "").strip()
                        if name and len(name) > 1:
                            try:
                                new_lead = {
                                    "name": name,
                                    "user_id": user_id,
                                    "status": "new",
                                    "source": f"screen_to_lead_{source}",
                                    "temperature": 50,
                                    "notes": f"Importiert via Screen-to-Lead aus {source}",
                                }
                                db.table("leads").insert(new_lead).execute()
                                created_leads.append(name)
                            except Exception as e:
                                logger.error(f"Error creating lead {name}: {e}")

                    if created_leads:
                        return {
                            "message": f"✅ **{len(created_leads)} Leads erfolgreich erstellt!**\n\n"
                            + "\n".join([f"• {name}" for name in created_leads])
                            + f"\n\nQuelle: {source.title()}\n\nDu findest sie jetzt in deiner Lead-Liste.",
                            "tools_used": ["vision", "create_lead"],
                            "leads_created": len(created_leads),
                        }
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"JSON parsing error: {e}")

    # Normale Vision-Antwort
    return {
        "message": result,
        "tools_used": ["vision"],
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Chat with the AI Sales Agent."""

    try:
        body = await request.json()
        logger.info(f"AI Chat request body: {body}")
        logger.info(f"AI Chat current_user: {current_user}")

        # Extract message (allow fallback key names)
        message = body.get("message") or body.get("prompt")
        if not message:
            raise HTTPException(status_code=400, detail="No message provided")

        image_base64 = body.get("image")

        session_id = body.get("session_id") or body.get("sessionId")
        user_id = (
            current_user.get("sub")
            or current_user.get("id")
            or current_user.get("user_id")
        )
        if not user_id:
            raise HTTPException(status_code=400, detail="User-Kontext fehlt")

        if not session_id:
            session_id = str(uuid.uuid4())
            db.table("ai_chat_sessions").insert(
                {
                    "id": session_id,
                    "user_id": user_id,
                }
            ).execute()

        conversation_history = body.get("conversation_history") or body.get("messages") or body.get("history")
        if conversation_history and not isinstance(conversation_history, list):
            logger.warning("conversation_history provided but not a list; ignoring")
            conversation_history = None

        if conversation_history:
            message_history = conversation_history
        else:
            history = (
                db.table("ai_chat_messages")
                .select("role, content")
                .eq("session_id", session_id)
                .order("created_at")
                .execute()
            )
            message_history = (
                [{"role": m.get("role"), "content": m.get("content")} for m in history.data]
                if history and history.data
                else []
            )

        # Vision branch: wenn Bild vorhanden, direkte OpenAI Vision Anfrage + optional Lead-Erstellung
        if image_base64:
            try:
                vision_result = await process_vision_request(image_base64, message, user_id, db)
                return ChatResponse(
                    message=vision_result.get("message", ""),
                    tools_used=[{"name": t} for t in vision_result.get("tools_used", [])],
                    session_id=session_id,
                )
            except Exception as exc:
                logger.error(f"Vision request failed: {exc}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Vision request failed: {exc}")
        else:
        logger.info(f"AI Chat: calling run_sales_agent with user_id={user_id}")
        result = await run_sales_agent(
            message=message,
            user_id=user_id,
            db=db,
            session_id=session_id,
            message_history=message_history,
        )

        return ChatResponse(
            message=result["message"],
            tools_used=result["tools_used"],
            session_id=session_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

