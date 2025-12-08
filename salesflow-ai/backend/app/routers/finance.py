from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
import os
import json
import base64

from anthropic import Anthropic
from ..core.ai_router import get_model_for_task, get_max_tokens_for_task

from app.core.deps import get_current_user
from app.supabase_client import get_supabase_client


router = APIRouter(prefix="/finance", tags=["finance"])


# ============ MODELS ============


class TransactionCreate(BaseModel):
    tx_type: str  # 'income' or 'expense'
    amount: Decimal
    date: date
    description: str
    category: str
    receipt_url: Optional[str] = None
    is_tax_relevant: bool = True
    tax_deductible_percent: int = 100  # For expenses
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    tx_type: str
    amount: Decimal
    date: date
    description: str
    category: str
    receipt_url: Optional[str]
    is_tax_relevant: bool
    created_at: datetime


class FinanceSummary(BaseModel):
    period_start: date
    period_end: date
    total_income: Decimal
    total_expenses: Decimal
    profit: Decimal
    estimated_tax_reserve: Decimal
    transaction_count: int


class MileageEntry(BaseModel):
    date: date
    start_location: str
    end_location: str
    distance_km: Decimal
    purpose: str
    lead_id: Optional[UUID] = None


# ============ CATEGORIES ============


INCOME_CATEGORIES = [
    {"key": "provision", "label": "Provisionen", "icon": "💰"},
    {"key": "bonus", "label": "Bonus/Teambonus", "icon": "🎯"},
    {"key": "coaching", "label": "Coaching-Honorare", "icon": "🎓"},
    {"key": "product_sales", "label": "Produktverkäufe", "icon": "📦"},
    {"key": "referral", "label": "Empfehlungsprämien", "icon": "🤝"},
    {"key": "other_income", "label": "Sonstige Einnahmen", "icon": "📥"},
]


EXPENSE_CATEGORIES = [
    {"key": "marketing", "label": "Marketing & Werbung", "icon": "📣", "deductible": 100},
    {"key": "samples", "label": "Produktproben", "icon": "🎁", "deductible": 100},
    {"key": "travel", "label": "Reisekosten", "icon": "✈️", "deductible": 100},
    {"key": "events", "label": "Events & Seminare", "icon": "🎪", "deductible": 100},
    {"key": "tools", "label": "Software & Tools", "icon": "💻", "deductible": 100},
    {"key": "phone", "label": "Telefon & Internet", "icon": "📱", "deductible": 50},
    {"key": "office", "label": "Büromaterial", "icon": "📎", "deductible": 100},
    {"key": "education", "label": "Weiterbildung", "icon": "📚", "deductible": 100},
    {"key": "vehicle", "label": "Fahrzeugkosten", "icon": "🚗", "deductible": 100},
    {"key": "other_expense", "label": "Sonstige Ausgaben", "icon": "📤", "deductible": 100},
]


# ============ ENDPOINTS ============


@router.get("/categories")
async def get_categories():
    """Alle Einnahme- und Ausgabenkategorien abrufen."""
    return {"income": INCOME_CATEGORIES, "expense": EXPENSE_CATEGORIES}


@router.post("/transactions")
async def create_transaction(
    data: TransactionCreate,
    current_user=Depends(get_current_user),
):
    """Neue Transaktion (Einnahme/Ausgabe) speichern."""
    supabase = get_supabase_client()

    transaction = {
        "user_id": str(current_user.id),
        "tx_type": data.tx_type,
        "amount": float(data.amount),
        "date": data.date.isoformat(),
        "description": data.description,
        "category": data.category,
        "receipt_url": data.receipt_url,
        "is_tax_relevant": data.is_tax_relevant,
        "tax_deductible_percent": data.tax_deductible_percent if data.tx_type == "expense" else None,
        "notes": data.notes,
        "created_at": datetime.now().isoformat(),
    }

    result = supabase.table("finance_transactions").insert(transaction).execute()
    return {"success": True, "transaction": result.data[0] if result.data else None}


@router.get("/transactions")
async def list_transactions(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    tx_type: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    current_user=Depends(get_current_user),
):
    """Transaktionen mit Filtern listen."""
    supabase = get_supabase_client()

    query = (
        supabase.table("finance_transactions")
        .select("*")
        .eq("user_id", str(current_user.id))
        .order("date", desc=True)
        .limit(limit)
    )

    if from_date:
        query = query.gte("date", from_date.isoformat())
    if to_date:
        query = query.lte("date", to_date.isoformat())
    if tx_type:
        query = query.eq("tx_type", tx_type)
    if category:
        query = query.eq("category", category)

    result = query.execute()
    return {"transactions": result.data or []}


@router.get("/summary")
async def get_summary(
    from_date: date,
    to_date: date,
    current_user=Depends(get_current_user),
):
    """Finanzübersicht für einen Zeitraum."""
    supabase = get_supabase_client()

    result = (
        supabase.table("finance_transactions")
        .select("*")
        .eq("user_id", str(current_user.id))
        .gte("date", from_date.isoformat())
        .lte("date", to_date.isoformat())
        .execute()
    )

    transactions = result.data or []

    total_income = sum(t["amount"] for t in transactions if t["tx_type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["tx_type"] == "expense")
    profit = total_income - total_expenses
    estimated_tax = max(0, profit * 0.30)

    return {
        "period_start": from_date.isoformat(),
        "period_end": to_date.isoformat(),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "profit": profit,
        "estimated_tax_reserve": estimated_tax,
        "transaction_count": len(transactions),
        "disclaimer": "Die Steuer-Reserve ist eine grobe Schätzung (~30%). Keine Steuerberatung.",
    }


@router.get("/summary/by-category")
async def get_summary_by_category(
    from_date: date,
    to_date: date,
    current_user=Depends(get_current_user),
):
    """Übersicht nach Kategorie gruppiert."""
    supabase = get_supabase_client()

    result = (
        supabase.table("finance_transactions")
        .select("*")
        .eq("user_id", str(current_user.id))
        .gte("date", from_date.isoformat())
        .lte("date", to_date.isoformat())
        .execute()
    )

    transactions = result.data or []
    income_by_cat = {}
    expense_by_cat = {}

    for t in transactions:
        cat = t["category"]
        amount = t["amount"]
        if t["tx_type"] == "income":
            income_by_cat[cat] = income_by_cat.get(cat, 0) + amount
        else:
            expense_by_cat[cat] = expense_by_cat.get(cat, 0) + amount

    return {"income_by_category": income_by_cat, "expense_by_category": expense_by_cat}


# ============ RECEIPT SCANNING ============


@router.post("/scan-receipt")
async def scan_receipt(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Beleg mit AI auslesen."""
    contents = await file.read()
    base64_image = base64.standard_b64encode(contents).decode("utf-8")
    content_type = file.content_type or "image/jpeg"

    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    model = get_model_for_task("receipt_vision")
    max_tokens = min(get_max_tokens_for_task("receipt_vision"), 1000)
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": content_type,
                            "data": base64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": """Analysiere diesen Beleg/Rechnung und extrahiere:

Antworte NUR mit JSON (kein Markdown):
{
    "vendor": "Name des Geschäfts/Verkäufers",
    "date": "YYYY-MM-DD",
    "amount": 123.45,
    "currency": "EUR",
    "description": "Kurze Beschreibung was gekauft wurde",
    "category_suggestion": "marketing|samples|travel|events|tools|phone|office|education|vehicle|other_expense",
    "tax_rate": 20,
    "is_business_expense": true,
    "confidence": 0.95
}

Falls etwas nicht lesbar: null setzen.
category_suggestion basierend auf Inhalt wählen.""",
                    },
                ],
            }
        ],
    )

    response_text = message.content[0].text.strip()
    if "```" in response_text:
        parts = response_text.split("```")
        response_text = parts[1] if len(parts) > 1 else parts[0]
        if response_text.startswith("json"):
            response_text = response_text[4:]

    try:
        data = json.loads(response_text.strip())
        return {"success": True, "extracted": data}
    except Exception:
        return {"success": False, "error": "Could not parse receipt", "raw": response_text}


# ============ MILEAGE / FAHRTENBUCH ============


@router.post("/mileage")
async def add_mileage(
    entry: MileageEntry,
    current_user=Depends(get_current_user),
):
    """Fahrtenbucheintrag speichern."""
    supabase = get_supabase_client()

    profile = (
        supabase.table("user_business_profile")
        .select("country")
        .eq("user_id", str(current_user.id))
        .single()
        .execute()
    )
    country = profile.data.get("country", "AT") if profile.data else "AT"

    rates = {"AT": 0.42, "DE": 0.30, "CH": 0.70}
    rate = rates.get(country, 0.42)
    amount = float(entry.distance_km) * rate

    mileage_data = {
        "user_id": str(current_user.id),
        "date": entry.date.isoformat(),
        "start_location": entry.start_location,
        "end_location": entry.end_location,
        "distance_km": float(entry.distance_km),
        "purpose": entry.purpose,
        "lead_id": str(entry.lead_id) if entry.lead_id else None,
        "rate_per_km": rate,
        "total_amount": amount,
        "created_at": datetime.now().isoformat(),
    }

    result = supabase.table("finance_mileage").insert(mileage_data).execute()
    return {"success": True, "entry": result.data[0] if result.data else None, "amount": amount}


@router.get("/mileage")
async def list_mileage(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user=Depends(get_current_user),
):
    """Fahrtenbucheinträge listen."""
    supabase = get_supabase_client()

    query = (
        supabase.table("finance_mileage")
        .select("*")
        .eq("user_id", str(current_user.id))
        .order("date", desc=True)
    )

    if from_date:
        query = query.gte("date", from_date.isoformat())
    if to_date:
        query = query.lte("date", to_date.isoformat())

    result = query.execute()
    entries = result.data or []
    total_km = sum(e["distance_km"] for e in entries)
    total_amount = sum(e["total_amount"] for e in entries)

    return {"entries": entries, "total_km": total_km, "total_amount": total_amount}


# ============ TAX EXPORT ============


@router.get("/tax-export/{year}")
async def get_tax_export(
    year: int,
    current_user=Depends(get_current_user),
):
    """Jahres-Export für Steuer-Vorbereitung."""
    supabase = get_supabase_client()

    from_date = f"{year}-01-01"
    to_date = f"{year}-12-31"

    tx_result = (
        supabase.table("finance_transactions")
        .select("*")
        .eq("user_id", str(current_user.id))
        .gte("date", from_date)
        .lte("date", to_date)
        .execute()
    )
    transactions = tx_result.data or []

    ml_result = (
        supabase.table("finance_mileage")
        .select("*")
        .eq("user_id", str(current_user.id))
        .gte("date", from_date)
        .lte("date", to_date)
        .execute()
    )
    mileage = ml_result.data or []

    income = [t for t in transactions if t["tx_type"] == "income"]
    expenses = [t for t in transactions if t["tx_type"] == "expense"]

    total_income = sum(t["amount"] for t in income)
    total_expenses = sum(t["amount"] for t in expenses)
    total_mileage_km = sum(m["distance_km"] for m in mileage)
    total_mileage_amount = sum(m["total_amount"] for m in mileage)

    income_by_cat = {}
    for t in income:
        income_by_cat[t["category"]] = income_by_cat.get(t["category"], 0) + t["amount"]

    expense_by_cat = {}
    for t in expenses:
        expense_by_cat[t["category"]] = expense_by_cat.get(t["category"], 0) + t["amount"]

    missing_receipts = len([t for t in expenses if t["amount"] >= 50 and not t.get("receipt_url")])

    return {
        "year": year,
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "total_mileage_amount": total_mileage_amount,
            "profit": total_income - total_expenses - total_mileage_amount,
        },
        "income_by_category": income_by_cat,
        "expenses_by_category": expense_by_cat,
        "mileage": {
            "total_km": total_mileage_km,
            "total_amount": total_mileage_amount,
            "entries_count": len(mileage),
        },
        "receipts": {
            "total": len(expenses),
            "with_receipt": len([t for t in expenses if t.get("receipt_url")]),
            "missing": missing_receipts,
        },
        "disclaimer": "Dies ist KEINE Steuererklärung, nur Vorbereitung. Alle Angaben ohne Gewähr.",
    }

