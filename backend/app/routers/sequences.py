import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from app.core.security.main import get_current_user
from app.core.deps import get_supabase
from app.services.sequence_engine import SequenceEngine

router = APIRouter(prefix="/api/sequences", tags=["sequences"])
logger = logging.getLogger(__name__)


def _get_user_id(current_user) -> str:
    return current_user.get("sub") or current_user.get("id") or current_user.get("user_id")


@router.post("/lead/{lead_id}/responded")
async def mark_responded(lead_id: str, current_user=Depends(get_current_user), db=Depends(get_supabase)):
    try:
        engine = SequenceEngine(db)
        result = await engine.process_lead_response(lead_id, responded=True)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        return {"success": True, "message": "Lead als geantwortet markiert"}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error("mark_responded failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/lead/{lead_id}/no-response")
async def mark_no_response(lead_id: str, current_user=Depends(get_current_user), db=Depends(get_supabase)):
    try:
        engine = SequenceEngine(db)
        result = await engine.process_lead_response(lead_id, responded=False)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        return {"success": True, "message": "Nächster Follow-up geplant"}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error("mark_no_response failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/lead/{lead_id}/won")
async def mark_won(lead_id: str, current_user=Depends(get_current_user), db=Depends(get_supabase)):
    try:
        engine = SequenceEngine(db)
        result = await engine.mark_lead_won(lead_id)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        return {"success": True, "message": "Lead als gewonnen markiert"}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error("mark_won failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/lead/{lead_id}/lost")
async def mark_lost(lead_id: str, current_user=Depends(get_current_user), db=Depends(get_supabase)):
    try:
        engine = SequenceEngine(db)
        result = await engine.mark_lead_lost(lead_id)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        return {"success": True, "message": "Lead als verloren markiert, Reaktivierung geplant"}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error("mark_lost failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/templates")
async def list_templates(current_user=Depends(get_current_user), db=Depends(get_supabase)):
    try:
        result = db.table("follow_up_sequence_steps").select("*").execute()
        return {"success": True, "templates": result.data or []}
    except Exception as exc:  # noqa: BLE001
        logger.error("list_templates failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/start/{lead_id}")
async def start_sequence(lead_id: str, current_user=Depends(get_current_user), db=Depends(get_supabase)):
    try:
        user_id = _get_user_id(current_user)
        now = datetime.now(timezone.utc).isoformat()
        db.table("leads").update(
            {
                "sequence_status": "new",
                "follow_up_count": 0,
                "next_follow_up_at": now,
                "user_id": user_id,
            }
        ).eq("id", lead_id).execute()

        engine = SequenceEngine(db)
        await engine.advance_sequence(lead_id)

        return {"success": True, "message": "Sequenz gestartet"}
    except Exception as exc:  # noqa: BLE001
        logger.error("start_sequence failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
from datetime import date, datetime, timedelta
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.supabase_client import get_supabase_client


router = APIRouter(prefix="/sequences", tags=["sequences"])


class SequenceStep(BaseModel):
    step_number: int
    delay_days: int
    message_template: str
    channel: str = "whatsapp"
    subject: Optional[str] = None


class CreateSequenceRequest(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[SequenceStep]


class EnrollLeadRequest(BaseModel):
    lead_id: str
    sequence_id: str
    start_date: Optional[date] = None


def _extract_user_id(current_user: Any) -> str:
    """Ermittle eine user_id, egal ob Dict oder User-Objekt."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext gefunden")

    if isinstance(current_user, dict):
        user_id = current_user.get("user_id") or current_user.get("id")
    else:
        user_id = getattr(current_user, "id", None) or getattr(current_user, "user_id", None)

    if not user_id:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext gefunden")

    return str(user_id)


def _build_message(template: str, lead: Dict[str, Any]) -> str:
    """Platzhalter {name}, {vorname}, {firma} mit Lead-Daten ersetzen."""
    message = template or ""
    name = lead.get("name") or lead.get("first_name") or ""
    first_name = lead.get("first_name") or ""
    company = lead.get("company") or ""

    return (
        message.replace("{name}", name)
        .replace("{vorname}", first_name)
        .replace("{firma}", company)
    )


@router.get("/")
async def list_sequences(current_user=Depends(get_current_user)):
    """Alle Sequenzen des Nutzers inklusive Steps und Enrollments laden."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    result = supabase.table("follow_up_sequences").select(
        "*, sequence_steps(*), sequence_enrollments(id, lead_id, current_step, status, next_action_date, started_at, leads(id, name, first_name, phone, email, company))"
    ).eq("user_id", user_id).order("created_at", desc=True).execute()

    return {"sequences": result.data or []}


@router.post("/")
async def create_sequence(
    request: CreateSequenceRequest,
    current_user=Depends(get_current_user),
):
    """Neue Follow-up Sequenz speichern."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    seq_data = {
        "user_id": user_id,
        "name": request.name,
        "description": request.description,
        "total_steps": len(request.steps),
        "is_active": True,
        "created_at": datetime.now().isoformat(),
    }

    seq_result = supabase.table("follow_up_sequences").insert(seq_data).execute()
    if not seq_result.data:
        raise HTTPException(status_code=400, detail="Sequence konnte nicht angelegt werden")

    sequence = seq_result.data[0]

    for step in request.steps:
        step_data = {
            "sequence_id": sequence["id"],
            "step_number": step.step_number,
            "delay_days": step.delay_days,
            "message_template": step.message_template,
            "channel": step.channel,
            "subject": step.subject,
        }
        supabase.table("sequence_steps").insert(step_data).execute()

    return {"success": True, "sequence": sequence}


@router.delete("/{sequence_id}")
async def delete_sequence(sequence_id: str, current_user=Depends(get_current_user)):
    """Sequenz löschen (inkl. Steps & Enrollments via Cascade)."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    supabase.table("follow_up_sequences").delete().eq("id", sequence_id).eq("user_id", user_id).execute()
    return {"success": True}


@router.post("/enroll")
async def enroll_lead(request: EnrollLeadRequest, current_user=Depends(get_current_user)):
    """Lead in Sequenz einschreiben."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    existing = supabase.table("sequence_enrollments").select("id").eq("lead_id", request.lead_id).eq(
        "sequence_id", request.sequence_id
    ).eq("status", "active").eq("user_id", user_id).execute()

    if existing.data:
        raise HTTPException(status_code=400, detail="Lead ist bereits in dieser Sequenz")

    first_step = (
        supabase.table("sequence_steps")
        .select("*")
        .eq("sequence_id", request.sequence_id)
        .eq("step_number", 1)
        .single()
        .execute()
    )

    if not first_step.data:
        raise HTTPException(status_code=400, detail="Sequence hat keine Steps")

    start = request.start_date or date.today()
    next_action = start + timedelta(days=first_step.data.get("delay_days", 0))

    enrollment = {
        "lead_id": request.lead_id,
        "sequence_id": request.sequence_id,
        "user_id": user_id,
        "current_step": first_step.data.get("step_number", 1),
        "status": "active",
        "next_action_date": next_action.isoformat(),
        "started_at": datetime.now().isoformat(),
    }

    result = supabase.table("sequence_enrollments").insert(enrollment).execute()
    return {"success": True, "enrollment": result.data[0] if result.data else None}


@router.post("/unenroll/{enrollment_id}")
async def unenroll_lead(
    enrollment_id: str,
    reason: str = Query(default="manual", description="replied oder manual"),
    current_user=Depends(get_current_user),
):
    """Lead aus Sequenz nehmen (Status paused oder replied)."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)
    status = "replied" if reason == "replied" else "paused"

    supabase.table("sequence_enrollments").update(
        {"status": status, "paused_at": datetime.now().isoformat()}
    ).eq("id", enrollment_id).eq("user_id", user_id).execute()

    return {"success": True}


@router.get("/due-today")
async def get_due_today(current_user=Depends(get_current_user)):
    """Alle fälligen Sequenz-Aktionen bis heute abrufen."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)
    today = date.today().isoformat()

    enrollment_result = (
        supabase.table("sequence_enrollments")
        .select("*, leads(*), follow_up_sequences(name, total_steps)")
        .eq("user_id", user_id)
        .eq("status", "active")
        .lte("next_action_date", today)
        .execute()
    )

    enrollments = enrollment_result.data or []
    sequence_ids = {item["sequence_id"] for item in enrollments}

    steps_lookup: Dict[Tuple[str, int], Dict[str, Any]] = {}
    if sequence_ids:
        steps_result = (
            supabase.table("sequence_steps")
            .select("*")
            .in_("sequence_id", list(sequence_ids))
            .execute()
        )
        for step in steps_result.data or []:
            steps_lookup[(step["sequence_id"], step["step_number"])] = step

    due_actions = []
    for enrollment in enrollments:
        key = (enrollment["sequence_id"], enrollment.get("current_step", 1))
        current_step = steps_lookup.get(key)
        if not current_step:
            continue

        lead = enrollment.get("leads") or {}
        message = _build_message(current_step.get("message_template", ""), lead)

        due_actions.append(
            {
                "enrollment_id": enrollment["id"],
                "lead_id": enrollment["lead_id"],
                "lead_name": lead.get("name") or lead.get("first_name"),
                "lead_phone": lead.get("phone"),
                "lead_email": lead.get("email"),
                "sequence_name": enrollment.get("follow_up_sequences", {}).get("name"),
                "step_number": enrollment.get("current_step"),
                "channel": current_step.get("channel"),
                "message": message,
                "subject": current_step.get("subject"),
            }
        )

    return {"due_actions": due_actions, "count": len(due_actions)}


@router.post("/advance/{enrollment_id}")
async def advance_step(enrollment_id: str, current_user=Depends(get_current_user)):
    """Aktuellen Step abschließen und zum nächsten springen."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    enrollment = (
        supabase.table("sequence_enrollments")
        .select("*, follow_up_sequences(total_steps)")
        .eq("id", enrollment_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not enrollment.data:
        raise HTTPException(status_code=404, detail="Enrollment nicht gefunden")

    current = enrollment.data
    total_steps = (current.get("follow_up_sequences") or {}).get("total_steps", 0) or 0
    next_step = int(current.get("current_step", 1)) + 1

    if next_step > total_steps:
        supabase.table("sequence_enrollments").update(
            {"status": "completed", "completed_at": datetime.now().isoformat()}
        ).eq("id", enrollment_id).execute()

        return {"success": True, "completed": True}

    next_step_data = (
        supabase.table("sequence_steps")
        .select("delay_days")
        .eq("sequence_id", current["sequence_id"])
        .eq("step_number", next_step)
        .single()
        .execute()
    )

    delay = (next_step_data.data or {}).get("delay_days", 1)
    next_action = date.today() + timedelta(days=delay)

    supabase.table("sequence_enrollments").update(
        {"current_step": next_step, "next_action_date": next_action.isoformat()}
    ).eq("id", enrollment_id).eq("user_id", user_id).execute()

    return {"success": True, "next_step": next_step, "next_action_date": next_action.isoformat()}


@router.get("/lead/{lead_id}")
async def get_lead_sequences(lead_id: str, current_user=Depends(get_current_user)):
    """Alle Sequenzen für einen Lead auflisten."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("sequence_enrollments")
        .select("*, follow_up_sequences(name, total_steps)")
        .eq("lead_id", lead_id)
        .eq("user_id", user_id)
        .execute()
    )
    return {"enrollments": result.data or []}


@router.get("/{sequence_id}/enrollments")
async def get_sequence_enrollments(sequence_id: str, current_user=Depends(get_current_user)):
    """Enrollments einer Sequenz inkl. Lead-Daten abrufen."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("sequence_enrollments")
        .select("*, leads(id, name, first_name, phone, email, company)")
        .eq("sequence_id", sequence_id)
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .execute()
    )
    return {"enrollments": result.data or []}


@router.get("/turbo-today")
async def get_turbo_today(
    current_user=Depends(get_current_user),
):
    """Get all due actions with pre-generated messages for turbo mode."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)
    today = date.today().isoformat()

    enrollments = (
        supabase.table("sequence_enrollments")
        .select("*, leads(*), follow_up_sequences(name, total_steps)")
        .eq("user_id", user_id)
        .eq("status", "active")
        .lte("next_action_date", today)
        .execute()
    )

    if not enrollments.data:
        return {"actions": [], "count": 0, "message": "Keine Follow-ups heute! 🎉"}

    sequence_ids = list({e["sequence_id"] for e in enrollments.data})
    steps = supabase.table("sequence_steps").select("*").in_("sequence_id", sequence_ids).execute()

    steps_lookup = {}
    for step in steps.data or []:
        key = (step["sequence_id"], step["step_number"])
        steps_lookup[key] = step

    actions = []
    for enrollment in enrollments.data:
        lead = enrollment.get("leads") or {}
        sequence = enrollment.get("follow_up_sequences") or {}
        step_key = (enrollment["sequence_id"], enrollment.get("current_step", 1))
        step = steps_lookup.get(step_key)

        if not step:
            continue

        message = step.get("message_template", "")
        message = message.replace("{name}", lead.get("name") or "")
        message = message.replace(
            "{vorname}",
            lead.get("first_name")
            or (lead.get("name", "").split()[0] if lead.get("name") else ""),
        )
        message = message.replace("{nachname}", lead.get("last_name") or "")
        message = message.replace("{firma}", lead.get("company") or "")

        channel = step.get("channel", "whatsapp")
        phone = (lead.get("phone") or "").replace(" ", "").replace("+", "")
        email = lead.get("email", "")
        instagram = (lead.get("instagram") or "").replace("@", "")

        if channel == "whatsapp" and phone:
            deep_link = f"https://wa.me/{phone}?text={urllib.parse.quote(message)}"
        elif channel == "email" and email:
            subject = urllib.parse.quote(step.get("subject") or "Follow-up")
            deep_link = f"mailto:{email}?subject={subject}&body={urllib.parse.quote(message)}"
        elif channel == "instagram" and instagram:
            deep_link = f"https://instagram.com/{instagram}"
        else:
            deep_link = None

        actions.append(
            {
                "enrollment_id": enrollment["id"],
                "lead_id": lead.get("id"),
                "lead_name": lead.get("name"),
                "lead_phone": phone,
                "lead_email": email,
                "lead_company": lead.get("company"),
                "sequence_name": sequence.get("name"),
                "step_number": enrollment.get("current_step", 1),
                "total_steps": sequence.get("total_steps", 1),
                "channel": channel,
                "message": message,
                "deep_link": deep_link,
                "can_send": deep_link is not None,
            }
        )

    actions.sort(key=lambda x: x.get("lead_name") or "")

    return {"actions": actions, "count": len(actions), "message": f"🔥 {len(actions)} Follow-ups heute!"}


@router.post("/turbo-complete")
async def turbo_complete_action(
    enrollment_id: str = Body(..., embed=True),
    current_user=Depends(get_current_user),
):
    """Mark action as done and advance to next step (turbo mode)."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    enrollment = (
        supabase.table("sequence_enrollments")
        .select("*, follow_up_sequences(total_steps)")
        .eq("id", enrollment_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not enrollment.data:
        raise HTTPException(404, "Enrollment nicht gefunden")

    current_step = enrollment.data.get("current_step", 1)
    total_steps = (enrollment.data.get("follow_up_sequences") or {}).get("total_steps", 1)

    if current_step >= total_steps:
        supabase.table("sequence_enrollments").update(
            {"status": "completed", "current_step": current_step}
        ).eq("id", enrollment_id).execute()

        return {"success": True, "completed": True, "message": "Sequence abgeschlossen! 🎉"}

    next_step_data = (
        supabase.table("sequence_steps")
        .select("delay_days")
        .eq("sequence_id", enrollment.data["sequence_id"])
        .eq("step_number", current_step + 1)
        .single()
        .execute()
    )

    delay_days = next_step_data.data.get("delay_days", 1) if next_step_data.data else 1
    next_date = (date.today() + timedelta(days=delay_days)).isoformat()

    supabase.table("sequence_enrollments").update(
        {"current_step": current_step + 1, "next_action_date": next_date}
    ).eq("id", enrollment_id).execute()

    return {
        "success": True,
        "completed": False,
        "next_step": current_step + 1,
        "next_date": next_date,
        "message": f"Weiter zu Step {current_step + 1}",
    }


@router.post("/turbo-complete-bulk")
async def turbo_complete_bulk(
    enrollment_ids: List[str] = Body(..., embed=True),
    current_user=Depends(get_current_user),
):
    """Mark multiple actions as done."""
    results = []
    for eid in enrollment_ids:
        try:
            result = await turbo_complete_action(eid, current_user)
            results.append({"id": eid, **result})
        except Exception as exc:
            results.append({"id": eid, "success": False, "error": str(exc)})

    completed = sum(1 for r in results if r.get("success"))
    return {"success": True, "completed_count": completed, "total": len(enrollment_ids), "results": results}


__all__ = ["router"]

