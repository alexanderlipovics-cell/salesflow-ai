import uuid
import logging
import json
import asyncio
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import openai

from app.ai.agent import run_sales_agent, extract_and_save_learnings
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
    image: Optional[str] = None  # base64 (data URL) optional


class ChatResponse(BaseModel):
    message: str
    reply: Optional[str] = None  # legacy field for frontend compatibility
    tools_used: List[dict]
    session_id: str


async def process_vision_request(image_base64: str, message: str, user_id: str, db):
    """Analysiert ein Bild und führt kontextabhängige Aktionen aus (Leads, Doku, Beschreibung)."""

    system_prompt = """
Du bist CHIEF (GPT-4o Vision). Analysiere das Bild und klassifiziere es:
- social_profile | social_list (Instagram/LinkedIn/WhatsApp/FB etc. Profil oder Liste)
- document (PDF/Doc/Screenshot mit Text, Folien, Tabellen)
- generic_image (alles andere)

ANTWORT-REGELN (liefere IMMER strukturiertes JSON):
{
  "action": "create_leads" | "document_summary" | "describe_only",
  "platform": "instagram|linkedin|whatsapp|facebook|business_card|other|unknown",
  "leads": [{"name": "..." , "source": "detected_platform", "confidence": 0-1}],
  "summary": "kurze Zusammenfassung bei document",
  "notes": "kurze Zusatzinfos (max 2 Sätze)",
  "detected_type": "social_profile|social_list|document|generic_image"
}

Regeln:
- Bei Social Media Profil/Liste: extrahiere echte Namen; keine Duplikate; max 50.
- Bei Dokument: fasse prägnant zusammen, nenne erkannte Titel/Tags/Use-Cases.
- Bei generischem Bild: beschreibe knapp (notes).
- Liefere trotzdem description in notes, aber halte sie sehr kurz.
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

    result = response.choices[0].message.content or ""

    # Versuche JSON zu extrahieren und Aktionen auszuführen
    def try_parse_json(text: str) -> Optional[Dict[str, Any]]:
        try:
            json_start = text.find("{")
            json_end = text.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                return json.loads(text[json_start:json_end])
        except Exception as exc:  # noqa: BLE001
            logger.error(f"JSON parsing error: {exc}")
        return None

    data = try_parse_json(result)

    if data and data.get("action") == "create_leads" and data.get("leads"):
        created_leads = []
        source = data.get("platform") or data.get("source") or "screen_to_lead"
        leads = data.get("leads") or []
        for lead_data in leads[:50]:
            name = (lead_data.get("name") or "").strip()
            if not name or len(name) < 2:
                continue
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
            except Exception as e:  # noqa: BLE001
                logger.error(f"Error creating lead {name}: {e}", exc_info=True)

        if created_leads:
            msg = (
                f"✅ **{len(created_leads)} Leads erstellt** aus {source}:\n"
                + "\n".join([f"• {n}" for n in created_leads])
                + "\n\nIch kann jetzt Follow-ups vorbereiten oder Tags setzen."
            )
            return {
                "message": msg,
                "tools_used": [{"name": "vision"}, {"name": "create_lead"}],
                "leads_created": len(created_leads),
            }

    if data and data.get("action") == "document_summary":
        summary = data.get("summary") or data.get("notes") or result
        platform = data.get("platform") or data.get("detected_type") or "document"
        msg = (
            f"📄 Dokument erkannt ({platform}):\n"
            f"{summary}\n\n"
            "Soll ich das im Knowledge speichern oder Tags hinzufügen?"
        )
        return {
            "message": msg,
            "tools_used": [{"name": "vision"}],
        }

    # Fallback: generische Beschreibung
    return {
        "message": result,
        "tools_used": [{"name": "vision"}],
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

        # User name fetch for personalization
        user_name = "Ihr Berater"
        try:
            user_result = db.table("users").select("*").eq("id", user_id).maybe_single().execute()
            logger.info(f"AI Chat user lookup for {user_id}: {user_result.data}")
            if user_result and user_result.data:
                user_data = user_result.data
                user_name = (
                    user_data.get("full_name")
                    or user_data.get("name")
                    or user_data.get("display_name")
                    or "Ihr Berater"
                )
        except Exception as e:
            logger.warning(f"AI Chat could not load user name for {user_id}: {e}")

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

        # User-Kontext für Prompt (mit Gründer-Spezialfall)
        user_email = ""
        company_name = ""
        vertical = ""
        user_context_msg = None
        try:
            user_result = db.table("users").select("*").eq("id", user_id).maybe_single().execute()
            logger.info(f"AI Chat user lookup for {user_id}: {user_result.data}")
            if user_result and user_result.data:
                user_data = user_result.data
                user_email = user_data.get("email") or ""
                company_name = user_data.get("company_name") or user_data.get("company") or ""
                vertical = user_data.get("vertical") or ""
                user_name = (
                    user_data.get("full_name")
                    or user_data.get("name")
                    or user_data.get("display_name")
                    or user_name
                )
        except Exception as e:
            logger.warning(f"AI Chat could not load user name for {user_id}: {e}")

        is_founder = user_email.lower() == "alexander.lipovics@gmail.com"
        if is_founder:
            user_context_msg = {
                "role": "system",
                "content": (
                    "ÜBER DEN NUTZER (GRÜNDER):\n"
                    "- Name: Alex Lipovics\n"
                    "- Rolle: Gründer von Sales Flow AI\n"
                    "- Produkt: Sales Flow AI (KI-CRM für Sales-Profis)\n"
                    "- Ziel: Sales Flow AI verkaufen/demonstrieren\n\n"
                    "WICHTIG FÜR NACHRICHTEN:\n"
                    "- Absender immer: \"Alex Lipovics\" oder \"Alex\"\n"
                    "- Produkt: Sales Flow AI\n"
                    "- Wenn User nichts anderes sagt, geht es um Sales Flow AI\n"
                ),
            }
        else:
            user_context_msg = {
                "role": "system",
                "content": (
                    "ÜBER DEN NUTZER:\n"
                    f"- Name: {user_name}\n"
                    f"- Unternehmen: {company_name or 'n/a'}\n"
                    f"- Branche: {vertical or 'n/a'}\n\n"
                    "WICHTIG FÜR NACHRICHTEN:\n"
                    f"- Absender immer: \"{user_name}\"\n"
                    "- NIEMALS Platzhalter wie [Dein Name], [Name], [Ihr Name], 'der Nutzer'\n"
                ),
            }

        if user_context_msg:
            message_history = [user_context_msg] + message_history

        # Vision branch: wenn Bild vorhanden, direkte OpenAI Vision Anfrage + optional Lead-Erstellung
        if image_base64:
            try:
                vision_result = await process_vision_request(image_base64, message, user_id, db)
                tools_used = vision_result.get("tools_used", [])
                # tools_used kann bereits dicts enthalten
                normalized_tools = [
                    t if isinstance(t, dict) else {"name": t} for t in tools_used
                ]
                return ChatResponse(
                    message=vision_result.get("message", ""),
                    reply=vision_result.get("message", ""),
                    tools_used=normalized_tools,
                    session_id=session_id,
                )
            except Exception as exc:
                logger.error(f"Vision request failed: {exc}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Vision request failed: {exc}")
        else:
            logger.info(f"AI Chat: calling run_sales_agent with user_id={user_id}, user_name={user_name}")
            result = await run_sales_agent(
                message=message,
                user_id=user_id,
                db=db,
                session_id=session_id,
                message_history=message_history,
            )

        def replace_placeholders(text: str, real_name: str) -> str:
            replacements = {
                "[Dein Name]": real_name,
                "[Name]": real_name,
                "[Ihr Name]": real_name,
                "[Nutzer]": real_name,
                "der Nutzer": real_name,
                "[DEIN NAME]": real_name,
            }
            for k, v in replacements.items():
                text = text.replace(k, v)
            return text

        clean_message = replace_placeholders(result["message"], user_name)

        return ChatResponse(
            message=clean_message,
            reply=clean_message,
            tools_used=result["tools_used"],
            session_id=session_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    # Hintergrund-Lernen triggern (nicht blockierend)
    try:
        convo_messages = (conversation_history or []) + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": clean_message},
        ]
        asyncio.create_task(
            extract_and_save_learnings(
                user_id=user_id,
                messages=convo_messages,
                response_text=clean_message,
                db=db,
            )
        )
    except Exception as exc:
        logger.warning(f"Could not schedule learning extraction: {exc}")

