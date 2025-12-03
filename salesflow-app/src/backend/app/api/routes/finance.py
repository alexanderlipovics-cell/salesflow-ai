# backend/app/api/routes/finance.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  FINANCE API ROUTES                                                         ║
║  Endpoints für Finanz-Tracking und Steuer-Vorbereitung                      ║
╚════════════════════════════════════════════════════════════════════════════╝

⚠️ WICHTIG: Die Steuer-Reserve ist nur eine SCHÄTZUNG, keine Steuerberatung!

Endpoints:
- /finance/transactions - CRUD für Transaktionen
- /finance/summary - Zusammenfassungen
- /finance/tax-prep - Steuer-Vorbereitung
- /finance/mileage - Fahrtenbuch
- /finance/accounts - Konten
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from uuid import UUID

from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.finance.service import FinanceService, TransactionCreate
from ...services.finance.tax_prep_service import TaxPrepService
from ...services.finance.mileage_service import MileageService, MileageEntry


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter(
    prefix="/finance",
    tags=["finance"],
)


# =============================================================================
# SCHEMAS
# =============================================================================

class TransactionCreateRequest(BaseModel):
    """Request für neue Transaktion"""
    amount: float = Field(..., gt=0, description="Betrag (positiv)")
    transaction_type: str = Field(..., pattern="^(income|expense)$")
    category: str = Field(..., description="Kategorie (z.B. commission, marketing)")
    title: str = Field(..., min_length=1, max_length=200)
    transaction_date: Optional[date] = None
    description: Optional[str] = None
    counterparty_name: Optional[str] = None
    vat_amount: Optional[float] = Field(None, ge=0)
    document_url: Optional[str] = None
    is_tax_relevant: bool = True
    tax_deductible_percent: float = Field(100, ge=0, le=100)
    tags: Optional[List[str]] = None
    account_id: Optional[UUID] = None


class MileageCreateRequest(BaseModel):
    """Request für Fahrtenbuch-Eintrag"""
    date: date
    start_location: str = Field(..., min_length=1, max_length=200)
    end_location: str = Field(..., min_length=1, max_length=200)
    distance_km: float = Field(..., gt=0)
    purpose: str = Field(..., min_length=1, max_length=500)
    purpose_category: Optional[str] = Field(None, pattern="^(client_visit|event|training|team_meeting|other)$")
    lead_id: Optional[UUID] = None
    vehicle_type: str = Field("car", pattern="^(car|motorcycle|bike|public)$")
    license_plate: Optional[str] = None
    is_round_trip: bool = False


class TaxProfileUpdateRequest(BaseModel):
    """Request für Tax Profile Update"""
    country: Optional[str] = Field(None, pattern="^(AT|DE|CH)$")
    vat_status: Optional[str] = Field(None, pattern="^(none|registered|reverse_charge)$")
    vat_id: Optional[str] = None
    estimated_income_tax_rate: Optional[float] = Field(None, ge=0, le=100)
    reserve_percentage: Optional[float] = Field(None, ge=0, le=100)
    mileage_rate: Optional[float] = Field(None, ge=0)
    home_office_rate: Optional[float] = Field(None, ge=0)


# =============================================================================
# TRANSACTIONS
# =============================================================================

@router.post("/transactions")
async def create_transaction(
    payload: TransactionCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Erstellt eine neue Transaktion (Einnahme oder Ausgabe).
    """
    service = FinanceService(db)
    
    data = TransactionCreate(
        amount=payload.amount,
        transaction_type=payload.transaction_type,
        category=payload.category,
        title=payload.title,
        transaction_date=payload.transaction_date,
        description=payload.description,
        counterparty_name=payload.counterparty_name,
        vat_amount=payload.vat_amount,
        document_url=payload.document_url,
        is_tax_relevant=payload.is_tax_relevant,
        tax_deductible_percent=payload.tax_deductible_percent,
        tags=payload.tags,
        account_id=payload.account_id,
    )
    
    result = await service.create_transaction(current_user.id, data)
    return result


@router.get("/transactions")
async def list_transactions(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    tx_type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    category: Optional[str] = None,
    account_id: Optional[UUID] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Listet Transaktionen mit Filtern.
    """
    service = FinanceService(db)
    
    return await service.get_transactions(
        user_id=current_user.id,
        from_date=from_date,
        to_date=to_date,
        tx_type=tx_type,
        category=category,
        account_id=account_id,
        limit=limit,
        offset=offset,
    )


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Löscht eine Transaktion (Soft Delete).
    """
    service = FinanceService(db)
    
    success = await service.delete_transaction(current_user.id, str(transaction_id))
    
    if not success:
        raise HTTPException(status_code=404, detail="Transaktion nicht gefunden")
    
    return {"success": True}


# =============================================================================
# SUMMARY
# =============================================================================

@router.get("/summary")
async def get_summary(
    from_date: date,
    to_date: date,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Finanz-Zusammenfassung für einen Zeitraum.
    
    ⚠️ Die Steuer-Reserve ist nur eine grobe SCHÄTZUNG, keine Steuerberatung!
    """
    service = FinanceService(db)
    
    summary = await service.get_summary(current_user.id, from_date, to_date)
    
    return {
        "period": {
            "from": from_date.isoformat(),
            "to": to_date.isoformat(),
        },
        "summary": {
            "total_income": summary.total_income,
            "total_expenses": summary.total_expenses,
            "profit": summary.profit,
            "vat_collected": summary.vat_collected,
            "vat_paid": summary.vat_paid,
            "vat_balance": summary.vat_balance,
            "transaction_count": summary.transaction_count,
            "receipts_count": summary.receipts_count,
        },
        "tax_reserve": {
            "estimated_amount": summary.estimated_tax_reserve,
            "percentage": summary.reserve_percentage,
            "disclaimer": summary.disclaimer,
        },
    }


@router.get("/categories/{tx_type}")
async def get_category_breakdown(
    tx_type: str,
    from_date: date,
    to_date: date,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Aufschlüsselung nach Kategorien.
    """
    if tx_type not in ["income", "expense"]:
        raise HTTPException(status_code=400, detail="tx_type muss 'income' oder 'expense' sein")
    
    service = FinanceService(db)
    
    return await service.get_category_breakdown(
        user_id=current_user.id,
        tx_type=tx_type,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/monthly-data")
async def get_monthly_data(
    months: int = Query(6, ge=1, le=24),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt monatliche Daten für Charts.
    """
    service = FinanceService(db)
    
    return await service.get_monthly_data(current_user.id, months)


# =============================================================================
# TAX PREP
# =============================================================================

@router.get("/tax-prep/{year}")
async def get_tax_prep_export(
    year: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Generiert Steuer-Vorbereitungs-Export.
    
    ⚠️ Dies ist KEINE Steuererklärung, sondern eine strukturierte
    Zusammenfassung zur Vorbereitung für Steuerberater/Steuerprogramm.
    """
    service = TaxPrepService(db)
    
    export = await service.generate_tax_prep_export(current_user.id, year)
    
    return {
        "year": export.year,
        "generated_at": export.generated_at,
        "summary": {
            "total_income": export.total_income,
            "total_expenses": export.total_expenses,
            "profit": export.profit,
        },
        "income_by_source": export.income_by_source,
        "expenses_by_category": export.expenses_by_category,
        "mileage": {
            "total_km": export.total_mileage_km,
            "total_amount": export.total_mileage_amount,
        },
        "receipts": {
            "count": export.receipts_count,
            "missing": export.missing_receipts_count,
        },
        "disclaimer": export.disclaimer,
    }


@router.get("/tax-prep/{year}/reserve")
async def get_tax_reserve(
    year: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Berechnet eine GROBE Steuer-Reserve-Schätzung.
    
    ⚠️ WICHTIG: Dies ist KEINE Steuerberatung!
    """
    service = TaxPrepService(db)
    
    reserve = await service.calculate_tax_reserve(current_user.id, year)
    
    return {
        "year": year,
        "profit": reserve.profit,
        "estimated_tax": reserve.estimated_tax,
        "reserve_amount": reserve.reserve_amount,
        "reserve_percentage": reserve.reserve_percentage,
        "disclaimer": reserve.disclaimer,
    }


@router.get("/tax-prep/{year}/checklist")
async def get_year_end_checklist(
    year: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Generiert eine Jahresend-Checkliste.
    
    ⚠️ Dies ist KEINE Steuerberatung.
    """
    service = TaxPrepService(db)
    
    return await service.get_year_end_checklist(current_user.id, year)


# =============================================================================
# MILEAGE
# =============================================================================

@router.post("/mileage")
async def add_mileage_entry(
    payload: MileageCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Fügt einen Fahrtenbuch-Eintrag hinzu.
    """
    service = MileageService(db)
    
    entry = MileageEntry(
        date=payload.date,
        start_location=payload.start_location,
        end_location=payload.end_location,
        distance_km=payload.distance_km,
        purpose=payload.purpose,
        purpose_category=payload.purpose_category,
        lead_id=payload.lead_id,
        vehicle_type=payload.vehicle_type,
        license_plate=payload.license_plate,
        is_round_trip=payload.is_round_trip,
    )
    
    return await service.add_entry(current_user.id, entry)


@router.get("/mileage")
async def list_mileage_entries(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    purpose_category: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Listet Fahrtenbuch-Einträge.
    """
    service = MileageService(db)
    
    return await service.get_entries(
        user_id=current_user.id,
        from_date=from_date,
        to_date=to_date,
        purpose_category=purpose_category,
        limit=limit,
        offset=offset,
    )


@router.get("/mileage/summary/{year}")
async def get_mileage_summary(
    year: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Fahrtenbuch-Zusammenfassung für ein Jahr.
    """
    service = MileageService(db)
    
    summary = await service.get_summary(current_user.id, year)
    
    return {
        "year": year,
        "period_start": summary.period_start.isoformat(),
        "period_end": summary.period_end.isoformat(),
        "total_km": summary.total_km,
        "total_amount": summary.total_amount,
        "trips_count": summary.trips_count,
        "by_purpose": summary.by_purpose,
        "rate_per_km": summary.rate_per_km,
    }


@router.get("/mileage/purpose-categories")
async def get_purpose_categories(
    db: Client = Depends(get_db),
):
    """
    Gibt verfügbare Zweck-Kategorien zurück.
    """
    service = MileageService(db)
    return service.get_purpose_categories()


# =============================================================================
# TAX PROFILE
# =============================================================================

@router.get("/tax-profile")
async def get_tax_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt das Steuerprofil des Users.
    """
    service = FinanceService(db)
    
    profile = await service._get_tax_profile(current_user.id)
    
    if not profile:
        # Automatisch initialisieren
        profile = await service.initialize_tax_profile(current_user.id, "AT")
    
    return profile


@router.post("/tax-profile/initialize")
async def initialize_tax_profile(
    country: str = Query("AT", pattern="^(AT|DE|CH)$"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Initialisiert das Steuerprofil mit Länder-Defaults.
    """
    service = FinanceService(db)
    
    return await service.initialize_tax_profile(current_user.id, country)


@router.patch("/tax-profile")
async def update_tax_profile(
    payload: TaxProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Aktualisiert das Steuerprofil.
    """
    service = FinanceService(db)
    
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen angegeben")
    
    return await service.update_tax_profile(current_user.id, updates)


# =============================================================================
# GOALS
# =============================================================================

@router.get("/goal")
async def get_current_goal(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt das aktuelle Monatsumsatzziel.
    """
    service = FinanceService(db)
    
    goal = await service.get_current_goal(current_user.id)
    
    if not goal:
        return {"goal": None}
    
    return {"goal": goal}


@router.post("/goal")
async def set_monthly_goal(
    target_amount: float = Query(..., gt=0),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Setzt das Monatsumsatzziel.
    """
    service = FinanceService(db)
    
    goal_id = await service.set_monthly_goal(
        user_id=current_user.id,
        target_amount=target_amount,
        month=month,
        year=year,
    )
    
    return {"goal_id": goal_id, "target_amount": target_amount}

