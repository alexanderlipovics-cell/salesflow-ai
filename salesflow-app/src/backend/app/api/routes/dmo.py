"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DMO (Daily Method of Operation) API v2                                    ║
║  /api/v2/dmo/* Endpoints                                                   ║
╚════════════════════════════════════════════════════════════════════════════╝

DMO ist das tägliche Aktivitäts-Tracking für Network Marketing:
- Neue Kontakte
- Follow-ups
- Präsentationen
- Closes
- Trainings

Endpoints:
- GET /today - Heutiger DMO Status
- POST /log - Aktivität loggen
- GET /history - DMO Historie
- GET /stats - DMO Statistiken
- PUT /targets - Tagesziele setzen
"""

from typing import Optional, List
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from supabase import Client
import uuid

from ...db.deps import get_db, get_current_user, CurrentUser


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/dmo", tags=["dmo", "activities"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class DMOCategory(BaseModel):
    """Eine DMO Kategorie mit Target und Done."""
    target: int
    done: int
    remaining: int
    percent: float


class DMOTodayResponse(BaseModel):
    """Heutiger DMO Status."""
    date: str
    new_contacts: DMOCategory
    follow_ups: DMOCategory
    presentations: DMOCategory
    closes: DMOCategory
    trainings: DMOCategory
    overall_percent: float
    is_complete: bool
    streak_days: int


class LogActivityRequest(BaseModel):
    """Request für Aktivität loggen."""
    activity_type: str = Field(
        ...,
        pattern="^(new_contact|follow_up|presentation|close|training)$",
        description="Art der Aktivität"
    )
    count: int = Field(default=1, ge=1, le=100)
    contact_id: Optional[str] = None
    notes: Optional[str] = None


class LogActivityResponse(BaseModel):
    """Response für Aktivität loggen."""
    success: bool
    activity_type: str
    new_total: int
    target: int
    message: str


class DMOHistoryEntry(BaseModel):
    """Ein Eintrag in der DMO Historie."""
    date: str
    new_contacts: int
    follow_ups: int
    presentations: int
    closes: int
    trainings: int
    completion_percent: float
    was_complete: bool


class DMOHistoryResponse(BaseModel):
    """Response für DMO Historie."""
    entries: List[DMOHistoryEntry]
    period_start: str
    period_end: str


class DMOStatsResponse(BaseModel):
    """DMO Statistiken."""
    current_streak: int
    longest_streak: int
    total_activities: int
    avg_daily_completion: float
    best_day: Optional[str]
    this_week: dict
    this_month: dict


class SetTargetsRequest(BaseModel):
    """Request für Tagesziele setzen."""
    new_contacts: Optional[int] = Field(None, ge=0, le=100)
    follow_ups: Optional[int] = Field(None, ge=0, le=100)
    presentations: Optional[int] = Field(None, ge=0, le=50)
    closes: Optional[int] = Field(None, ge=0, le=50)
    trainings: Optional[int] = Field(None, ge=0, le=20)


class SetTargetsResponse(BaseModel):
    """Response für Tagesziele setzen."""
    success: bool
    targets: dict


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def get_or_create_dmo_entry(db: Client, user_id: str, entry_date: str) -> dict:
    """Holt oder erstellt einen DMO Eintrag für ein Datum."""
    # Versuche zu laden
    result = db.table("dmo_entries").select("*").eq(
        "user_id", user_id
    ).eq("entry_date", entry_date).execute()
    
    if result.data:
        return result.data[0]
    
    # Erstellen mit Defaults
    default_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "entry_date": entry_date,
        "new_contacts": 0,
        "follow_ups": 0,
        "presentations": 0,
        "closes": 0,
        "trainings": 0,
        "target_new_contacts": 5,
        "target_follow_ups": 10,
        "target_presentations": 2,
        "target_closes": 1,
        "target_trainings": 1,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    db.table("dmo_entries").insert(default_entry).execute()
    return default_entry


def calculate_streak(db: Client, user_id: str) -> int:
    """Berechnet die aktuelle Streak."""
    today = date.today()
    streak = 0
    
    for i in range(365):  # Max 1 Jahr zurück
        check_date = (today - timedelta(days=i)).isoformat()
        
        result = db.table("dmo_entries").select("*").eq(
            "user_id", user_id
        ).eq("entry_date", check_date).execute()
        
        if not result.data:
            break
        
        entry = result.data[0]
        # Prüfen ob Tag "complete" war (alle Targets erreicht)
        targets = [
            entry.get("new_contacts", 0) >= entry.get("target_new_contacts", 5),
            entry.get("follow_ups", 0) >= entry.get("target_follow_ups", 10),
        ]
        
        if all(targets):
            streak += 1
        else:
            break
    
    return streak


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/today", response_model=DMOTodayResponse)
async def get_dmo_today(
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt den heutigen DMO Status zurück.
    
    ## DMO Kategorien
    
    - **new_contacts**: Neue Kontakte / Erstansprachen
    - **follow_ups**: Follow-up Nachrichten
    - **presentations**: Präsentationen / Gespräche
    - **closes**: Abschlüsse (Kunde oder Partner)
    - **trainings**: Team-Trainings / eigene Weiterbildung
    """
    today = date.today().isoformat()
    entry = get_or_create_dmo_entry(db, current_user.id, today)
    
    # Kategorien aufbauen
    def build_category(done: int, target: int) -> DMOCategory:
        remaining = max(0, target - done)
        percent = (done / target * 100) if target > 0 else 100
        return DMOCategory(
            target=target,
            done=done,
            remaining=remaining,
            percent=min(100, percent),
        )
    
    new_contacts = build_category(
        entry.get("new_contacts", 0),
        entry.get("target_new_contacts", 5)
    )
    follow_ups = build_category(
        entry.get("follow_ups", 0),
        entry.get("target_follow_ups", 10)
    )
    presentations = build_category(
        entry.get("presentations", 0),
        entry.get("target_presentations", 2)
    )
    closes = build_category(
        entry.get("closes", 0),
        entry.get("target_closes", 1)
    )
    trainings = build_category(
        entry.get("trainings", 0),
        entry.get("target_trainings", 1)
    )
    
    # Overall berechnen
    total_done = sum([
        new_contacts.done,
        follow_ups.done,
        presentations.done,
        closes.done,
        trainings.done,
    ])
    total_target = sum([
        new_contacts.target,
        follow_ups.target,
        presentations.target,
        closes.target,
        trainings.target,
    ])
    overall_percent = (total_done / total_target * 100) if total_target > 0 else 0
    
    is_complete = all([
        new_contacts.done >= new_contacts.target,
        follow_ups.done >= follow_ups.target,
    ])
    
    streak = calculate_streak(db, current_user.id)
    
    return DMOTodayResponse(
        date=today,
        new_contacts=new_contacts,
        follow_ups=follow_ups,
        presentations=presentations,
        closes=closes,
        trainings=trainings,
        overall_percent=min(100, overall_percent),
        is_complete=is_complete,
        streak_days=streak,
    )


@router.post("/log", response_model=LogActivityResponse)
async def log_activity(
    payload: LogActivityRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt eine DMO Aktivität.
    
    ## Aktivitätstypen
    
    - `new_contact`: Neuer Kontakt / Erstansprache
    - `follow_up`: Follow-up Nachricht gesendet
    - `presentation`: Präsentation gehalten
    - `close`: Abschluss (Kunde oder Partner gewonnen)
    - `training`: Training absolviert
    
    ## Beispiel
    
    ```json
    {
      "activity_type": "new_contact",
      "count": 1,
      "contact_id": "optional-contact-uuid",
      "notes": "Über Instagram kennengelernt"
    }
    ```
    """
    today = date.today().isoformat()
    entry = get_or_create_dmo_entry(db, current_user.id, today)
    
    # Mapping von activity_type zu DB-Feld
    field_map = {
        "new_contact": ("new_contacts", "target_new_contacts"),
        "follow_up": ("follow_ups", "target_follow_ups"),
        "presentation": ("presentations", "target_presentations"),
        "close": ("closes", "target_closes"),
        "training": ("trainings", "target_trainings"),
    }
    
    field_name, target_field = field_map[payload.activity_type]
    current_value = entry.get(field_name, 0)
    new_value = current_value + payload.count
    target = entry.get(target_field, 5)
    
    # Update
    update_data = {
        field_name: new_value,
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    # Contact IDs tracken (optional)
    if payload.contact_id:
        ids_field = f"{field_name.rstrip('s')}_ids"  # new_contacts -> new_contact_ids
        current_ids = entry.get(ids_field, []) or []
        if payload.contact_id not in current_ids:
            current_ids.append(payload.contact_id)
            update_data[ids_field] = current_ids
    
    # Notes updaten (append)
    if payload.notes:
        current_notes = entry.get("daily_notes", "") or ""
        timestamp = datetime.now().strftime("%H:%M")
        new_note = f"\n[{timestamp}] {payload.activity_type}: {payload.notes}"
        update_data["daily_notes"] = current_notes + new_note
    
    db.table("dmo_entries").update(update_data).eq(
        "id", entry["id"]
    ).execute()
    
    # Message generieren
    if new_value >= target:
        message = f"🎉 Ziel erreicht! {new_value}/{target} {payload.activity_type.replace('_', ' ')}s"
    else:
        remaining = target - new_value
        message = f"✅ Geloggt! Noch {remaining} {payload.activity_type.replace('_', ' ')}(s) bis zum Ziel"
    
    return LogActivityResponse(
        success=True,
        activity_type=payload.activity_type,
        new_total=new_value,
        target=target,
        message=message,
    )


@router.get("/history", response_model=DMOHistoryResponse)
async def get_dmo_history(
    days: int = Query(30, ge=1, le=365),
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt die DMO Historie zurück.
    
    ## Parameter
    
    - `days`: Anzahl Tage in die Vergangenheit (default: 30)
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    result = db.table("dmo_entries").select("*").eq(
        "user_id", current_user.id
    ).gte("entry_date", start_date.isoformat()).lte(
        "entry_date", end_date.isoformat()
    ).order("entry_date", desc=True).execute()
    
    entries = []
    for row in result.data or []:
        total_done = sum([
            row.get("new_contacts", 0),
            row.get("follow_ups", 0),
            row.get("presentations", 0),
            row.get("closes", 0),
            row.get("trainings", 0),
        ])
        total_target = sum([
            row.get("target_new_contacts", 5),
            row.get("target_follow_ups", 10),
            row.get("target_presentations", 2),
            row.get("target_closes", 1),
            row.get("target_trainings", 1),
        ])
        completion = (total_done / total_target * 100) if total_target > 0 else 0
        
        entries.append(DMOHistoryEntry(
            date=row["entry_date"],
            new_contacts=row.get("new_contacts", 0),
            follow_ups=row.get("follow_ups", 0),
            presentations=row.get("presentations", 0),
            closes=row.get("closes", 0),
            trainings=row.get("trainings", 0),
            completion_percent=min(100, completion),
            was_complete=completion >= 100,
        ))
    
    return DMOHistoryResponse(
        entries=entries,
        period_start=start_date.isoformat(),
        period_end=end_date.isoformat(),
    )


@router.get("/stats", response_model=DMOStatsResponse)
async def get_dmo_stats(
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt DMO Statistiken zurück.
    
    - Aktuelle und längste Streak
    - Durchschnittliche Completion Rate
    - Wöchentliche und monatliche Summen
    """
    today = date.today()
    
    # Streak berechnen
    current_streak = calculate_streak(db, current_user.id)
    
    # Letzte 90 Tage für Stats
    start_90 = (today - timedelta(days=90)).isoformat()
    result = db.table("dmo_entries").select("*").eq(
        "user_id", current_user.id
    ).gte("entry_date", start_90).execute()
    
    entries = result.data or []
    
    # Total Activities
    total_activities = sum([
        sum([
            e.get("new_contacts", 0),
            e.get("follow_ups", 0),
            e.get("presentations", 0),
            e.get("closes", 0),
            e.get("trainings", 0),
        ])
        for e in entries
    ])
    
    # Avg Completion
    completions = []
    for e in entries:
        total_done = sum([
            e.get("new_contacts", 0),
            e.get("follow_ups", 0),
        ])
        total_target = sum([
            e.get("target_new_contacts", 5),
            e.get("target_follow_ups", 10),
        ])
        if total_target > 0:
            completions.append(total_done / total_target * 100)
    
    avg_completion = sum(completions) / len(completions) if completions else 0
    
    # Best Day
    best_day = None
    best_activities = 0
    for e in entries:
        daily = sum([
            e.get("new_contacts", 0),
            e.get("follow_ups", 0),
            e.get("presentations", 0),
            e.get("closes", 0),
            e.get("trainings", 0),
        ])
        if daily > best_activities:
            best_activities = daily
            best_day = e.get("entry_date")
    
    # This Week
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    week_entries = [e for e in entries if e.get("entry_date", "") >= week_start]
    this_week = {
        "new_contacts": sum(e.get("new_contacts", 0) for e in week_entries),
        "follow_ups": sum(e.get("follow_ups", 0) for e in week_entries),
        "presentations": sum(e.get("presentations", 0) for e in week_entries),
        "closes": sum(e.get("closes", 0) for e in week_entries),
        "trainings": sum(e.get("trainings", 0) for e in week_entries),
    }
    
    # This Month
    month_start = today.replace(day=1).isoformat()
    month_entries = [e for e in entries if e.get("entry_date", "") >= month_start]
    this_month = {
        "new_contacts": sum(e.get("new_contacts", 0) for e in month_entries),
        "follow_ups": sum(e.get("follow_ups", 0) for e in month_entries),
        "presentations": sum(e.get("presentations", 0) for e in month_entries),
        "closes": sum(e.get("closes", 0) for e in month_entries),
        "trainings": sum(e.get("trainings", 0) for e in month_entries),
    }
    
    return DMOStatsResponse(
        current_streak=current_streak,
        longest_streak=current_streak,  # TODO: Track longest separately
        total_activities=total_activities,
        avg_daily_completion=round(avg_completion, 1),
        best_day=best_day,
        this_week=this_week,
        this_month=this_month,
    )


@router.put("/targets", response_model=SetTargetsResponse)
async def set_dmo_targets(
    payload: SetTargetsRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Setzt die täglichen DMO Ziele.
    
    Diese Ziele werden für zukünftige Tage verwendet.
    """
    today = date.today().isoformat()
    entry = get_or_create_dmo_entry(db, current_user.id, today)
    
    update_data = {"updated_at": datetime.utcnow().isoformat()}
    
    if payload.new_contacts is not None:
        update_data["target_new_contacts"] = payload.new_contacts
    if payload.follow_ups is not None:
        update_data["target_follow_ups"] = payload.follow_ups
    if payload.presentations is not None:
        update_data["target_presentations"] = payload.presentations
    if payload.closes is not None:
        update_data["target_closes"] = payload.closes
    if payload.trainings is not None:
        update_data["target_trainings"] = payload.trainings
    
    db.table("dmo_entries").update(update_data).eq("id", entry["id"]).execute()
    
    # Aktualisierte Targets zurückgeben
    updated = db.table("dmo_entries").select("*").eq("id", entry["id"]).single().execute()
    
    return SetTargetsResponse(
        success=True,
        targets={
            "new_contacts": updated.data.get("target_new_contacts", 5),
            "follow_ups": updated.data.get("target_follow_ups", 10),
            "presentations": updated.data.get("target_presentations", 2),
            "closes": updated.data.get("target_closes", 1),
            "trainings": updated.data.get("target_trainings", 1),
        }
    )

