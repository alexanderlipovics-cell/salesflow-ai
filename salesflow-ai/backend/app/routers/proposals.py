from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional
import tempfile

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from ..core.deps import get_supabase

router = APIRouter(prefix="/proposals", tags=["proposals"])

# PDF Support
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    PDF_AVAILABLE = True
except ImportError:  # pragma: no cover - optional dependency
    PDF_AVAILABLE = False


class ProposalItem(BaseModel):
    product_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    quantity: float = Field(default=1, gt=0)
    unit_price: float = Field(..., ge=0)


class CreateProposalRequest(BaseModel):
    lead_id: Optional[str] = None
    title: str
    recipient_name: str
    recipient_company: Optional[str] = None
    recipient_email: Optional[str] = None
    intro_text: Optional[str] = None
    items: List[ProposalItem]
    discount_percent: float = 0
    tax_percent: float = 20
    validity_days: int = 14
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


class GenerateFromLeadRequest(BaseModel):
    lead_id: str
    include_products: List[str] = Field(default_factory=list)
    custom_intro: Optional[str] = None
    discount_percent: float = 0


class CreateProductRequest(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    price_type: str = "fixed"
    category: Optional[str] = None


def _extract_user_id(current_user: Any) -> str:
    if isinstance(current_user, dict):
        return str(
            current_user.get("user_id")
            or current_user.get("id")
            or current_user.get("sub")
        )
    if hasattr(current_user, "id"):
        return str(current_user["id"])
    return str(current_user)


def _calculate_totals(
    items: List[Dict[str, Any]], discount_percent: float, tax_percent: float
) -> Dict[str, float]:
    subtotal = sum(Decimal(str(item["total"])) for item in items)
    discount_amount = subtotal * Decimal(str(discount_percent)) / Decimal(100)
    after_discount = subtotal - discount_amount
    tax_amount = after_discount * Decimal(str(tax_percent)) / Decimal(100)
    total = after_discount + tax_amount

    return {
        "subtotal": float(subtotal),
        "discount_amount": float(discount_amount),
        "tax_amount": float(tax_amount),
        "total": float(total),
    }


def _ensure_supabase():
    try:
        return get_supabase()
    except SupabaseNotConfiguredError as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/products")
async def list_products(current_user=Depends(get_current_user)):
    """Listet alle aktiven Produkte/Services des Nutzers."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("products_services")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .order("name")
        .execute()
    )

    return {"products": result.data or []}


@router.post("/products")
async def create_product(
    request: CreateProductRequest, current_user=Depends(get_current_user)
):
    """Erstellt ein neues Produkt/Service."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    product = {
        "user_id": user_id,
        "name": request.name,
        "description": request.description,
        "price": request.price,
        "price_type": request.price_type,
        "category": request.category,
        "is_active": True,
    }

    result = supabase.table("products_services").insert(product).execute()
    created = result.data[0] if result.data else None
    return {"success": True, "product": created}


@router.post("/generate-from-lead")
async def generate_proposal_from_lead(
    request: GenerateFromLeadRequest, current_user=Depends(get_current_user)
):
    """
    Generiert ein Angebot basierend auf Lead-Daten und ausgewählten Produkten.
    """
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    lead = (
        supabase.table("leads")
        .select("*")
        .eq("id", request.lead_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not lead.data:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")

    lead_data = lead.data

    items: List[Dict[str, Any]] = []
    if request.include_products:
        products = (
            supabase.table("products_services")
            .select("*")
            .eq("user_id", user_id)
            .in_("id", request.include_products)
            .execute()
        )

        for product in products.data or []:
            price = float(product.get("price") or 0)
            items.append(
                {
                    "product_id": product["id"],
                    "name": product["name"],
                    "description": product.get("description"),
                    "quantity": 1,
                    "unit_price": price,
                    "total": price,
                }
            )

    totals = _calculate_totals(
        items, discount_percent=request.discount_percent, tax_percent=20
    )

    intro_text = request.custom_intro
    if not intro_text:
        intro_text = (
            f"Sehr geehrte(r) {lead_data.get('name', 'Kunde')},\n\n"
            "vielen Dank für Ihr Interesse an unseren Leistungen. "
            "Basierend auf unserem Gespräch freue ich mich, Ihnen folgendes Angebot zu unterbreiten.\n\n"
            "Dieses Angebot wurde speziell auf Ihre Anforderungen zugeschnitten."
        )

    proposal_data = {
        "user_id": user_id,
        "lead_id": request.lead_id,
        "title": f"Angebot für {lead_data.get('company') or lead_data.get('name')}",
        "recipient_name": lead_data.get("name"),
        "recipient_company": lead_data.get("company"),
        "recipient_email": lead_data.get("email"),
        "intro_text": intro_text,
        "items": items,
        "subtotal": totals["subtotal"],
        "discount_percent": request.discount_percent,
        "discount_amount": totals["discount_amount"],
        "tax_percent": 20,
        "tax_amount": totals["tax_amount"],
        "total": totals["total"],
        "validity_days": 14,
        "status": "draft",
        "created_at": datetime.utcnow().isoformat(),
    }

    result = supabase.table("proposals").insert(proposal_data).execute()

    return {
        "success": True,
        "proposal": result.data[0] if result.data else None,
        "message": f"Angebot für {lead_data.get('name')} erstellt",
    }


@router.post("/")
async def create_proposal(request: CreateProposalRequest, current_user=Depends(get_current_user)):
    """Manuelles Anlegen eines Angebots."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    items: List[Dict[str, Any]] = []
    for item in request.items:
        total = float(item.quantity * item.unit_price)
        items.append(
            {
                "product_id": item.product_id,
                "name": item.name,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": total,
            }
        )

    totals = _calculate_totals(
        items,
        discount_percent=request.discount_percent,
        tax_percent=request.tax_percent,
    )

    proposal_data = {
        "user_id": user_id,
        "lead_id": request.lead_id,
        "title": request.title,
        "recipient_name": request.recipient_name,
        "recipient_company": request.recipient_company,
        "recipient_email": request.recipient_email,
        "intro_text": request.intro_text,
        "items": items,
        "subtotal": totals["subtotal"],
        "discount_percent": request.discount_percent,
        "discount_amount": totals["discount_amount"],
        "tax_percent": request.tax_percent,
        "tax_amount": totals["tax_amount"],
        "total": totals["total"],
        "validity_days": request.validity_days,
        "payment_terms": request.payment_terms,
        "notes": request.notes,
        "status": "draft",
        "created_at": datetime.utcnow().isoformat(),
    }

    result = supabase.table("proposals").insert(proposal_data).execute()

    return {"success": True, "proposal": result.data[0] if result.data else None}


@router.get("/")
async def list_proposals(
    status: Optional[str] = None, current_user=Depends(get_current_user)
):
    """Listet alle Angebote des Nutzers, optional gefiltert nach Status."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    query = (
        supabase.table("proposals")
        .select("*, leads(name, company)")
        .eq("user_id", user_id)
    )
    if status:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).execute()
    return {"proposals": result.data or []}


@router.get("/{proposal_id}")
async def get_proposal(proposal_id: str, current_user=Depends(get_current_user)):
    """Liefert ein einzelnes Angebot."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("proposals")
        .select("*, leads(*)")
        .eq("id", proposal_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")

    return {"proposal": result.data}


@router.post("/{proposal_id}/generate-pdf")
async def generate_pdf(proposal_id: str, current_user=Depends(get_current_user)):
    """Erstellt ein PDF für ein Angebot und liefert es als Download."""
    if not PDF_AVAILABLE:  # pragma: no cover - optional dependency
        raise HTTPException(
            status_code=500,
            detail="PDF-Generierung nicht verfügbar. Bitte 'reportlab' installieren.",
        )

    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("proposals")
        .select("*")
        .eq("id", proposal_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")

    proposal = result.data
    filename = f"angebot_{proposal_id[:8]}.pdf"
    filepath = Path(tempfile.gettempdir()) / filename

    doc = SimpleDocTemplate(
        str(filepath), pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title", parent=styles["Heading1"], fontSize=24, spaceAfter=30
    )
    normal_style = styles["Normal"]

    elements: List[Any] = []

    elements.append(Paragraph(proposal.get("title", "Angebot"), title_style))
    elements.append(Spacer(1, 20))

    elements.append(
        Paragraph(f"<b>An:</b> {proposal.get('recipient_name', 'Kunde')}", normal_style)
    )
    if proposal.get("recipient_company"):
        elements.append(Paragraph(str(proposal["recipient_company"]), normal_style))
    if proposal.get("recipient_email"):
        elements.append(Paragraph(str(proposal["recipient_email"]), normal_style))
    elements.append(Spacer(1, 20))

    if proposal.get("intro_text"):
        intro_html = str(proposal["intro_text"]).replace("\n", "<br/>")
        elements.append(Paragraph(intro_html, normal_style))
        elements.append(Spacer(1, 20))

    items = proposal.get("items", [])
    if items:
        table_data = [["Position", "Beschreibung", "Menge", "Preis", "Gesamt"]]
        for idx, item in enumerate(items, 1):
            table_data.append(
                [
                    str(idx),
                    item.get("name", ""),
                    str(item.get("quantity", 1)),
                    f"€{float(item.get('unit_price', 0)):.2f}",
                    f"€{float(item.get('total', 0)):.2f}",
                ]
            )

        table = Table(table_data, colWidths=[1.5 * cm, 8 * cm, 2 * cm, 3 * cm, 3 * cm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ]
            )
        )
        elements.append(table)
        elements.append(Spacer(1, 20))

    totals_data = [["Zwischensumme:", f"€{float(proposal.get('subtotal', 0)):.2f}"]]
    if float(proposal.get("discount_percent", 0) or 0) > 0:
        totals_data.append(
            [
                f"Rabatt ({proposal['discount_percent']}%):",
                f"-€{float(proposal.get('discount_amount', 0)):.2f}",
            ]
        )
    totals_data.append(
        [
            f"MwSt. ({proposal.get('tax_percent', 20)}%):",
            f"€{float(proposal.get('tax_amount', 0)):.2f}",
        ]
    )
    totals_data.append(["GESAMT:", f"€{float(proposal.get('total', 0)):.2f}"])

    totals_table = Table(totals_data, colWidths=[12 * cm, 4 * cm])
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
            ]
        )
    )
    elements.append(totals_table)
    elements.append(Spacer(1, 30))

    valid_until = (
        datetime.utcnow() + timedelta(days=proposal.get("validity_days", 14))
    ).strftime("%d.%m.%Y")
    elements.append(
        Paragraph(
            f"<i>Dieses Angebot ist gültig bis {valid_until}.</i>", normal_style
        )
    )

    doc.build(elements)

    return FileResponse(
        filepath, filename=filename, media_type="application/pdf"
    )


@router.post("/{proposal_id}/send")
async def send_proposal(proposal_id: str, current_user=Depends(get_current_user)):
    """Markiert ein Angebot als gesendet."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)

    supabase.table("proposals").update(
        {
            "status": "sent",
            "sent_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
    ).eq("id", proposal_id).eq("user_id", user_id).execute()

    return {"success": True, "message": "Angebot als gesendet markiert"}

