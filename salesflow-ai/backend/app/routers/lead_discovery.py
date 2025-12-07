from datetime import datetime, timedelta
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from pydantic import BaseModel, Field
from supabase import Client

# TODO: Pfad an eure tatsächliche Dependency anpassen
# from app.dependencies import get_supabase_client, get_current_user  # type: ignore
from app.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/lead-discovery", tags=["lead-discovery"])

# ---------- Pydantic Schemas ----------

LeadSource = Literal["reactivation", "linkedin", "google_maps", "directory", "referrals"]


class LeadFilters(BaseModel):
    industry: Optional[str] = None
    region: Optional[str] = None
    company_size: Optional[str] = None
    radius_km: Optional[float] = None
    last_contact_days: Optional[int] = Field(
        default=90,
        description="Nur für Reaktivierung: Minimum-Tage seit letztem Kontakt",
    )


class LeadResult(BaseModel):
    id: str
    name: str
    company: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: str
    score: int
    reason: str


class LeadSearchRequest(BaseModel):
    source: LeadSource
    filters: LeadFilters = Field(default_factory=LeadFilters)


class LeadSearchResponse(BaseModel):
    leads: List[LeadResult]
    total: int


class LeadImportRequest(BaseModel):
    lead_ids: List[str]
    source: str


class LeadImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: List[str]


class SourceInfo(BaseModel):
    key: LeadSource
    label: str
    description: str


class Referral(BaseModel):
    id: str
    contact_id: str
    referred_name: str
    referred_company: Optional[str] = None
    context: Optional[str] = None
    score: int
    reason: str


# ---------- Helpers ----------

def _score_reactivation(days_since_last_contact: int) -> int:
    """
    Einfache Heuristik:
    - 90 Tage → Score ~ 60
    - 180 Tage → Score ~ 80
    - 365 Tage+ → Score 90–100
    """
    if days_since_last_contact <= 0:
        return 10
    if days_since_last_contact < 60:
        return 40
    if days_since_last_contact < 90:
        return 55
    if days_since_last_contact < 180:
        return 75
    if days_since_last_contact < 365:
        return 85
    return 95


# ---------- Search Implementierungen ----------

async def _search_reactivation(
    supabase: Client, user_id: str, filters: LeadFilters
) -> List[LeadResult]:
    """
    Reaktivierung: Kontakte finden, deren letzter Kontakt > X Tage zurückliegt.
    Nutzt contacts-Tabelle mit Spalten:
      - id
      - user_id (Owner)
      - name
      - company
      - email
      - phone
      - last_contact_at (timestamp)
      - industry
      - region
      - company_size
    """
    last_days = filters.last_contact_days or 90
    cutoff = datetime.utcnow() - timedelta(days=last_days)

    query = (
        supabase.table("contacts")
        .select(
            "id,name,company,email,phone,last_contact_at,industry,region,company_size"
        )
        .eq("user_id", user_id)
        .lt("last_contact_at", cutoff.isoformat())
    )

    if filters.industry:
        query = query.eq("industry", filters.industry)
    if filters.region:
        query = query.eq("region", filters.region)
    if filters.company_size:
        query = query.eq("company_size", filters.company_size)

    # Älteste zuerst → am längsten her
    query = query.order("last_contact_at", desc=False)

    res = query.execute()
    rows = res.data or []

    leads: List[LeadResult] = []
    now = datetime.utcnow()

    for row in rows:
        last_contact_at = row.get("last_contact_at")
        if last_contact_at:
            last_dt = datetime.fromisoformat(last_contact_at.replace("Z", "+00:00"))
            days_since = (now - last_dt).days
        else:
            days_since = last_days
        score = _score_reactivation(days_since)
        reason = f"Nicht kontaktiert seit {days_since} Tagen"

        leads.append(
            LeadResult(
                id=str(row["id"]),
                name=row.get("name") or "Unbekannter Kontakt",
                company=row.get("company") or "",
                email=row.get("email"),
                phone=row.get("phone"),
                source="reactivation",
                score=score,
                reason=reason,
            )
        )

    return leads


async def _search_linkedin(
    supabase: Client, user_id: str, filters: LeadFilters
) -> List[LeadResult]:
    """
    LinkedIn-Suche: MVP nutzt vorhandene Daten in lead_enrichments.
    Erwartete Spalten:
      - id
      - user_id
      - contact_id
      - full_name
      - company
      - email
      - phone
      - source ("linkedin")
      - industry
      - region
      - company_size
      - linkedin_url
      - relevance_score (0-100)
    """
    query = (
        supabase.table("lead_enrichments")
        .select(
            "id,full_name,company,email,phone,industry,region,company_size,relevance_score"
        )
        .eq("user_id", user_id)
        .eq("source", "linkedin")
    )

    if filters.industry:
        query = query.eq("industry", filters.industry)
    if filters.region:
        query = query.eq("region", filters.region)
    if filters.company_size:
        query = query.eq("company_size", filters.company_size)

    res = query.execute()
    rows = res.data or []

    leads: List[LeadResult] = []
    for row in rows:
        score = int(row.get("relevance_score") or 70)
        reason = "Match zu deinen Filterkriterien (LinkedIn)"
        leads.append(
            LeadResult(
                id=str(row["id"]),
                name=row.get("full_name") or "Unbekannter Kontakt",
                company=row.get("company") or "",
                email=row.get("email"),
                phone=row.get("phone"),
                source="linkedin",
                score=score,
                reason=reason,
            )
        )

    return leads


async def _search_directory(
    supabase: Client, user_id: str, filters: LeadFilters
) -> List[LeadResult]:
    """
    Branchenverzeichnisse: MVP nutzt ebenfalls lead_enrichments mit source in ('wlw','kompass').
    """
    query = (
        supabase.table("lead_enrichments")
        .select(
            "id,full_name,company,email,phone,industry,region,company_size,source,relevance_score"
        )
        .eq("user_id", user_id)
        .in_("source", ["wlw", "kompass"])
    )

    if filters.industry:
        query = query.eq("industry", filters.industry)
    if filters.region:
        query = query.eq("region", filters.region)
    if filters.company_size:
        query = query.eq("company_size", filters.company_size)

    res = query.execute()
    rows = res.data or []

    leads: List[LeadResult] = []
    for row in rows:
        src = row.get("source") or "directory"
        score = int(row.get("relevance_score") or 65)
        reason = f"Gefunden in Branchenverzeichnis ({src.upper()})"
        leads.append(
            LeadResult(
                id=str(row["id"]),
                name=row.get("full_name") or "Unbekannter Kontakt",
                company=row.get("company") or "",
                email=row.get("email"),
                phone=row.get("phone"),
                source=src,
                score=score,
                reason=reason,
            )
        )

    return leads


async def _search_google_maps(
    supabase: Client, user_id: str, filters: LeadFilters
) -> List[LeadResult]:
    """
    Google Maps / Places: Für MVP nur Mock / vereinfachte Daten.
    Später: Anbindung an Google Places API.
    """
    # TODO: echte Integration mit Google Places
    radius = filters.radius_km or 10
    industry = filters.industry or "Allgemein"
    region = filters.region or "in deiner Nähe"

    # Ein paar synthetische Leads
    mock_leads: List[LeadResult] = []
    for i in range(1, 6):
        mock_leads.append(
            LeadResult(
                id=f"gm_{i}",
                name=f"{industry} Business {i}",
                company=f"{industry} {region}",
                email=None,
                phone=None,
                source="google_maps",
                score=70 + i,
                reason=f"Lokales Business innerhalb von {radius} km ({region})",
            )
        )

    return mock_leads


async def _search_referrals(
    supabase: Client, user_id: str, filters: LeadFilters
) -> List[LeadResult]:
    """
    Referral-Vorschläge: "Frag Kunde X nach Empfehlungen"
    MVP: Nutzt referrals-Tabelle (wenn vorhanden) oder generiert Vorschläge aus Bestandskunden.
    Erwartete referrals-Spalten:
      - id
      - user_id
      - contact_id (bestehender Kunde)
      - referred_name
      - referred_company
      - industry
      - region
      - score
    """
    # Wenn es eine referrals-Tabelle gibt:
    try:
        query = (
            supabase.table("referrals")
            .select(
                "id,contact_id,referred_name,referred_company,industry,region,score"
            )
            .eq("user_id", user_id)
        )
        if filters.industry:
            query = query.eq("industry", filters.industry)
        if filters.region:
            query = query.eq("region", filters.region)

        res = query.execute()
        rows = res.data or []
        leads: List[LeadResult] = []

        for row in rows:
            score = int(row.get("score") or 80)
            reason = f"Empfohlen von Kontakt {row.get('contact_id')}"
            leads.append(
                LeadResult(
                    id=str(row["id"]),
                    name=row.get("referred_name") or "Empfohlener Kontakt",
                    company=row.get("referred_company") or "",
                    email=None,
                    phone=None,
                    source="referrals",
                    score=score,
                    reason=reason,
                )
            )

        return leads
    except Exception:
        # Fallback: Keine referrals-Tabelle → leere Liste zurück
        return []


# ---------- API Endpoints ----------

@router.post(
    "/search",
    response_model=LeadSearchResponse,
    status_code=status.HTTP_200_OK,
)
async def search_leads(
    payload: LeadSearchRequest,
    supabase: Client = Depends(get_supabase_client),
    # current_user=Depends(get_current_user),  # TODO: Auth aktivieren
):
    """
    Multi-Source-Suche für die Lead Discovery Engine.
    """
    # TODO: user_id aus current_user holen
    user_id = "dev-user-id"  # Mock für jetzt

    source = payload.source
    filters = payload.filters

    if source == "reactivation":
        leads = await _search_reactivation(supabase, user_id, filters)
    elif source == "linkedin":
        leads = await _search_linkedin(supabase, user_id, filters)
    elif source == "google_maps":
        leads = await _search_google_maps(supabase, user_id, filters)
    elif source == "directory":
        leads = await _search_directory(supabase, user_id, filters)
    elif source == "referrals":
        leads = await _search_referrals(supabase, user_id, filters)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Ungültige Quelle"
        )

    return LeadSearchResponse(leads=leads, total=len(leads))


@router.post(
    "/import",
    response_model=LeadImportResponse,
    status_code=status.HTTP_200_OK,
)
async def import_leads(
    payload: LeadImportRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Importiert Leads in die contacts-Tabelle (oder markiert bestehende Kontakte als "entdeckt").
    MVP-Ansatz:
      - Für Reaktivierung: lead_ids = contact.id → nur discovered_at/source aktualisieren.
      - Für LinkedIn/Directory/Google Maps/Referrals:
          - Wenn Mapping zu contacts existiert (contact_id), update contacts.
          - Sonst → skip + Fehlertext.
    """
    # User-ID aus Header oder DEV fallback
    user_id = x_user_id or "dev-user-id"

    lead_ids = payload.lead_ids or []
    source = payload.source

    if not lead_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine lead_ids angegeben.",
        )

    imported = 0
    skipped = 0
    errors: List[str] = []
    now_iso = datetime.utcnow().isoformat()

    # Reaktivierung: contacts direkt updaten
    if source == "reactivation":
        # Update aller Contacts mit diesen IDs
        try:
            res = (
                supabase.table("contacts")
                .update({"source": source, "discovered_at": now_iso})
                .in_("id", lead_ids)
                .eq("user_id", user_id)
                .execute()
            )
            updated_rows = res.data or []
            imported = len(updated_rows)
            skipped = max(0, len(lead_ids) - imported)
            if skipped > 0:
                errors.append(
                    f"{skipped} Kontakte konnten nicht gefunden oder aktualisiert werden."
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Fehler beim Import: {e}",
            )

        return LeadImportResponse(imported=imported, skipped=skipped, errors=errors)

    # Andere Quellen: LinkedIn / Directory / Google Maps / Referrals
    # MVP: Wir erwarten, dass es eine Mapping-Tabelle 'lead_enrichments' gibt,
    # in der contact_id referenziert wird. Falls kein Mapping → skip.
    try:
        res = (
            supabase.table("lead_enrichments")
            .select("id,contact_id")
            .in_("id", lead_ids)
            .eq("user_id", user_id)
            .execute()
        )
        rows = res.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Laden der Lead-Daten: {e}",
        )

    if not rows:
        return LeadImportResponse(
            imported=0,
            skipped=len(lead_ids),
            errors=["Keine Lead-Mappings gefunden."],
        )

    contact_ids = [r["contact_id"] for r in rows if r.get("contact_id")]

    if contact_ids:
        try:
            update_res = (
                supabase.table("contacts")
                .update({"source": source, "discovered_at": now_iso})
                .in_("id", contact_ids)
                .eq("user_id", user_id)
                .execute()
            )
            updated = update_res.data or []
            imported = len(updated)
            skipped = len(lead_ids) - imported
            if skipped > 0:
                errors.append(
                    f"{skipped} Leads hatten kein gültiges contact_id-Mapping."
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Fehler beim Aktualisieren der Kontakte: {e}",
            )

    return LeadImportResponse(imported=imported, skipped=skipped, errors=errors)


@router.get(
    "/sources",
    response_model=List[SourceInfo],
    status_code=status.HTTP_200_OK,
)
async def list_sources() -> List[SourceInfo]:
    """
    Gibt alle verfügbaren Quellen für die Lead Discovery Engine zurück.
    """
    return [
        SourceInfo(
            key="reactivation",
            label="Reaktivierung",
            description="Alte Kontakte, die lange nicht kontaktiert wurden.",
        ),
        SourceInfo(
            key="linkedin",
            label="LinkedIn",
            description="Leads aus LinkedIn / Sales Navigator.",
        ),
        SourceInfo(
            key="google_maps",
            label="Google Maps",
            description="Lokale Unternehmen in deiner Nähe.",
        ),
        SourceInfo(
            key="directory",
            label="Branchenverzeichnisse",
            description="WLW, Kompass & andere Verzeichnisse.",
        ),
        SourceInfo(
            key="referrals",
            label="Referrals",
            description="Empfehlungen durch bestehende Kunden.",
        ),
    ]


@router.get(
    "/referrals",
    response_model=List[Referral],
    status_code=status.HTTP_200_OK,
)
async def get_referrals_for_contact(
    contact_id: str = Query(..., description="ID des bestehenden Kunden"),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Liste von Referral-Vorschlägen für einen bestimmten Kontakt.
    """
    # User-ID aus Header oder DEV fallback
    user_id = x_user_id or "dev-user-id"

    try:
        res = (
            supabase.table("referrals")
            .select(
                "id,contact_id,referred_name,referred_company,context,score"
            )
            .eq("user_id", user_id)
            .eq("contact_id", contact_id)
            .execute()
        )
        rows = res.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Laden von Referrals: {e}",
        )

    referrals: List[Referral] = []
    for row in rows:
        referrals.append(
            Referral(
                id=str(row["id"]),
                contact_id=row["contact_id"],
                referred_name=row.get("referred_name") or "Empfehlung",
                referred_company=row.get("referred_company"),
                context=row.get("context"),
                score=int(row.get("score") or 80),
                reason=f"Empfohlen von Kontakt {row['contact_id']}",
            )
        )

    return referrals

