"""
Sales Flow AI - Commissions Router

Provisions-Tracking und Rechnungsgenerierung
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from supabase import Client

from app.core.deps import get_current_user, get_supabase

router = APIRouter(prefix="/commissions", tags=["Commissions"])


# ============================================================================
# SCHEMAS
# ============================================================================


class CommissionBase(BaseModel):
    deal_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    deal_value: Decimal = Field(..., gt=0)
    commission_rate: Decimal = Field(..., ge=0, le=100)  # 0-100%
    commission_month: date
    notes: Optional[str] = None


class CommissionCreate(CommissionBase):
    pass


class Commission(CommissionBase):
    id: UUID
    org_id: UUID
    user_id: UUID
    commission_amount: Decimal
    currency: str = "EUR"
    status: str
    invoice_number: Optional[str] = None
    invoice_generated_at: Optional[datetime] = None
    invoice_pdf_url: Optional[str] = None
    tax_rate: Decimal
    tax_amount: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommissionSummary(BaseModel):
    month: date
    total_deal_value: Decimal
    total_commission: Decimal
    total_tax: Decimal
    total_net: Decimal
    commission_count: int
    commissions: List[Commission]


# ============================================================================
# CRUD
# ============================================================================


@router.post("", response_model=Commission, status_code=status.HTTP_201_CREATED)
async def create_commission(
    commission: CommissionCreate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Erstelle eine neue Provision."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    # Berechne Provision
    commission_amount = commission.deal_value * (commission.commission_rate / 100)
    
    # Standard-Umsatzsteuer (19%)
    tax_rate = Decimal("19.00")
    tax_amount = commission_amount * (tax_rate / 100)
    net_amount = commission_amount - tax_amount

    data = {
        "user_id": user_id,
        "deal_id": str(commission.deal_id) if commission.deal_id else None,
        "contact_id": str(commission.contact_id) if commission.contact_id else None,
        "deal_value": float(commission.deal_value),
        "commission_rate": float(commission.commission_rate),
        "commission_amount": float(commission_amount),
        "commission_month": commission.commission_month.isoformat(),
        "tax_rate": float(tax_rate),
        "tax_amount": float(tax_amount),
        "net_amount": float(net_amount),
        "status": "pending",
        "currency": "EUR",
        "notes": commission.notes,
    }

    result = supabase.table("commissions").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create commission")

    return Commission(**result.data[0])


@router.get("", response_model=List[Commission])
async def list_commissions(
    month: Optional[date] = Query(None, description="Filter by month (YYYY-MM-01)"),
    status_filter: Optional[str] = Query(None, alias="status"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Liste alle Provisionen."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    query = supabase.table("commissions").select("*").eq("user_id", user_id)

    if month:
        query = query.eq("commission_month", month.isoformat())
    if status_filter:
        query = query.eq("status", status_filter)

    query = query.order("commission_month", desc=True).order("created_at", desc=True)

    result = query.execute()

    return [Commission(**row) for row in result.data]


@router.get("/summary", response_model=CommissionSummary)
async def get_commission_summary(
    month: date = Query(..., description="Month to summarize (YYYY-MM-01)"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Hole Monatsübersicht der Provisionen."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    result = (
        supabase.table("commissions")
        .select("*")
        .eq("user_id", user_id)
        .eq("commission_month", month.isoformat())
        .execute()
    )

    commissions = [Commission(**row) for row in result.data]

    total_deal_value = sum(c.deal_value for c in commissions)
    total_commission = sum(c.commission_amount for c in commissions)
    total_tax = sum(c.tax_amount or Decimal(0) for c in commissions)
    total_net = sum(c.net_amount or Decimal(0) for c in commissions)

    return CommissionSummary(
        month=month,
        total_deal_value=total_deal_value,
        total_commission=total_commission,
        total_tax=total_tax,
        total_net=total_net,
        commission_count=len(commissions),
        commissions=commissions,
    )


@router.post("/{commission_id}/generate-invoice")
async def generate_invoice(
    commission_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Generiere PDF-Rechnung für eine Provision."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    # Hole Commission
    result = (
        supabase.table("commissions")
        .select("*")
        .eq("id", str(commission_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Commission not found")

    commission = Commission(**result.data[0])

    # TODO: PDF-Generierung implementieren
    # - Logo einbinden
    # - Rechnungsnummer generieren (z.B. RE-2025-001)
    # - PDF erstellen mit allen Details
    # - In S3/Storage hochladen
    # - URL zurückgeben

    invoice_number = f"RE-{datetime.now().year}-{commission_id.hex[:6].upper()}"
    invoice_pdf_url = f"/invoices/{commission_id}.pdf"  # Placeholder

    # Update Commission
    supabase.table("commissions").update({
        "invoice_number": invoice_number,
        "invoice_generated_at": datetime.now().isoformat(),
        "invoice_pdf_url": invoice_pdf_url,
    }).eq("id", str(commission_id)).execute()

    return {
        "invoice_number": invoice_number,
        "invoice_pdf_url": invoice_pdf_url,
        "message": "Invoice generated successfully",
    }


@router.post("/{commission_id}/send-to-accountant")
async def send_to_accountant(
    commission_id: UUID,
    accountant_email: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Sende Rechnung an Buchhaltung/Steuerberater."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    # Hole Commission
    result = (
        supabase.table("commissions")
        .select("*")
        .eq("id", str(commission_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Commission not found")

    commission = Commission(**result.data[0])

    if not commission.invoice_pdf_url:
        raise HTTPException(status_code=400, detail="Invoice not generated yet")

    # TODO: E-Mail an Buchhaltung senden
    # - PDF als Attachment
    # - Zusammenfassung im Body

    supabase.table("commissions").update({
        "invoice_sent_to_accountant": True,
        "invoice_sent_at": datetime.now().isoformat(),
    }).eq("id", str(commission_id)).execute()

    return {"message": "Invoice sent to accountant successfully"}

