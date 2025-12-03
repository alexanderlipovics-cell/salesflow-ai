# backend/app/services/finance/service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  FINANCE SERVICE                                                            ║
║  Hauptservice für Finanzverwaltung                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Funktionen:
- Transaktionen erstellen/lesen/aktualisieren
- Konten verwalten
- Zusammenfassungen berechnen
- Kategorien verwalten

WICHTIG: Keine Steuerberatung! Nur Datenmanagement.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from dataclasses import dataclass

from supabase import Client


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class TransactionCreate:
    """Neue Transaktion erstellen"""
    amount: float
    transaction_type: str  # 'income' | 'expense'
    category: str
    title: str
    transaction_date: Optional[date] = None
    description: Optional[str] = None
    counterparty_name: Optional[str] = None
    vat_amount: Optional[float] = None
    document_url: Optional[str] = None
    is_tax_relevant: bool = True
    tax_deductible_percent: float = 100.0
    tags: Optional[List[str]] = None
    account_id: Optional[UUID] = None


@dataclass
class FinanceSummary:
    """Finanz-Zusammenfassung für einen Zeitraum"""
    period_start: date
    period_end: date
    total_income: float
    total_expenses: float
    profit: float
    vat_collected: float
    vat_paid: float
    vat_balance: float
    transaction_count: int
    receipts_count: int
    # Steuer-Schätzung (mit Disclaimer!)
    estimated_tax_reserve: Optional[float] = None
    reserve_percentage: Optional[float] = None
    disclaimer: str = "Dies ist nur eine grobe Schätzung, keine Steuerberatung."


# =============================================================================
# SERVICE CLASS
# =============================================================================

class FinanceService:
    """
    Finance Service für Transaktionen und Konten.
    
    WICHTIG: Alle steuerrelevanten Berechnungen sind nur Schätzungen!
    """
    
    # Länder-spezifische Defaults
    COUNTRY_DEFAULTS = {
        "AT": {
            "vat_rate": 20.0,
            "mileage_rate": 0.42,
            "small_business_limit": 35000,
        },
        "DE": {
            "vat_rate": 19.0,
            "mileage_rate": 0.30,
            "small_business_limit": 22000,
        },
        "CH": {
            "vat_rate": 8.1,
            "mileage_rate": 0.70,
            "small_business_limit": None,
        },
    }
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # TRANSACTIONS
    # =========================================================================
    
    async def create_transaction(
        self,
        user_id: str,
        data: TransactionCreate,
    ) -> Dict[str, Any]:
        """Erstellt eine neue Transaktion"""
        
        tx_date = data.transaction_date or date.today()
        
        # Berechne Netto/USt wenn VAT angegeben
        net_amount = None
        if data.vat_amount:
            net_amount = data.amount - data.vat_amount
        
        insert_data = {
            "user_id": user_id,
            "amount": data.amount,
            "transaction_type": data.transaction_type,
            "category": data.category,
            "title": data.title,
            "transaction_date": tx_date.isoformat(),
            "period_month": tx_date.month,
            "period_year": tx_date.year,
            "description": data.description,
            "counterparty_name": data.counterparty_name,
            "vat_amount": data.vat_amount or 0,
            "document_url": data.document_url,
            "is_tax_relevant": data.is_tax_relevant,
            "tax_deductible_percent": data.tax_deductible_percent,
            "tags": data.tags,
            "source": "manual",
            "status": "confirmed",
        }
        
        if net_amount:
            insert_data["net_amount"] = net_amount
            insert_data["gross_amount"] = data.amount
        
        if data.account_id:
            insert_data["account_id"] = str(data.account_id)
        
        result = self.db.table("finance_transactions").insert(insert_data).execute()
        
        if not result.data:
            raise Exception("Transaktion konnte nicht erstellt werden")
        
        return result.data[0]
    
    async def get_transactions(
        self,
        user_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        tx_type: Optional[str] = None,
        category: Optional[str] = None,
        account_id: Optional[UUID] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Holt Transaktionen mit Filtern"""
        
        query = self.db.table("finance_transactions").select("*")
        query = query.eq("user_id", user_id)
        query = query.eq("status", "confirmed")
        
        if from_date:
            query = query.gte("transaction_date", from_date.isoformat())
        
        if to_date:
            query = query.lte("transaction_date", to_date.isoformat())
        
        if tx_type:
            query = query.eq("transaction_type", tx_type)
        
        if category:
            query = query.eq("category", category)
        
        if account_id:
            query = query.eq("account_id", str(account_id))
        
        query = query.order("transaction_date", desc=True)
        query = query.limit(limit).offset(offset)
        
        result = query.execute()
        return result.data or []
    
    async def update_transaction(
        self,
        user_id: str,
        transaction_id: str,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Aktualisiert eine Transaktion"""
        
        # Verhindere Änderung von user_id
        updates.pop("user_id", None)
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = self.db.table("finance_transactions").update(updates).eq(
            "id", transaction_id
        ).eq("user_id", user_id).execute()
        
        if not result.data:
            raise Exception("Transaktion nicht gefunden oder keine Berechtigung")
        
        return result.data[0]
    
    async def delete_transaction(
        self,
        user_id: str,
        transaction_id: str,
    ) -> bool:
        """Löscht eine Transaktion (soft delete via status)"""
        
        result = self.db.table("finance_transactions").update({
            "status": "cancelled",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", transaction_id).eq("user_id", user_id).execute()
        
        return bool(result.data)
    
    # =========================================================================
    # SUMMARY & ANALYTICS
    # =========================================================================
    
    async def get_summary(
        self,
        user_id: str,
        from_date: date,
        to_date: date,
    ) -> FinanceSummary:
        """Holt Finanz-Zusammenfassung für Zeitraum"""
        
        # Nutze die RPC-Funktion
        result = self.db.rpc("get_finance_summary", {
            "p_user_id": user_id,
            "p_from_date": from_date.isoformat(),
            "p_to_date": to_date.isoformat(),
        }).execute()
        
        if not result.data:
            # Fallback mit leeren Werten
            return FinanceSummary(
                period_start=from_date,
                period_end=to_date,
                total_income=0,
                total_expenses=0,
                profit=0,
                vat_collected=0,
                vat_paid=0,
                vat_balance=0,
                transaction_count=0,
                receipts_count=0,
            )
        
        data = result.data
        summary = data.get("summary", {})
        
        total_income = float(summary.get("income_total", 0))
        total_expenses = float(summary.get("expense_total", 0))
        profit = float(summary.get("profit", total_income - total_expenses))
        
        # Hole Steuer-Reserve wenn verfügbar
        estimated_reserve = None
        reserve_pct = None
        
        if profit > 0:
            profile = await self._get_tax_profile(user_id)
            if profile:
                reserve_pct = float(profile.get("reserve_percentage", 25))
                estimated_reserve = profit * reserve_pct / 100
        
        return FinanceSummary(
            period_start=from_date,
            period_end=to_date,
            total_income=total_income,
            total_expenses=total_expenses,
            profit=profit,
            vat_collected=0,  # TODO: aus Summary extrahieren
            vat_paid=0,
            vat_balance=0,
            transaction_count=0,
            receipts_count=0,
            estimated_tax_reserve=estimated_reserve,
            reserve_percentage=reserve_pct,
        )
    
    async def get_category_breakdown(
        self,
        user_id: str,
        tx_type: str,
        from_date: date,
        to_date: date,
    ) -> List[Dict[str, Any]]:
        """Holt Kategorien-Aufschlüsselung"""
        
        result = self.db.rpc("get_category_breakdown", {
            "p_user_id": user_id,
            "p_transaction_type": tx_type,
            "p_from_date": from_date.isoformat(),
            "p_to_date": to_date.isoformat(),
        }).execute()
        
        return result.data or []
    
    async def get_monthly_data(
        self,
        user_id: str,
        months: int = 6,
    ) -> List[Dict[str, Any]]:
        """Holt monatliche Daten für Charts"""
        
        result = self.db.rpc("get_monthly_revenue_data", {
            "p_user_id": user_id,
            "p_months": months,
        }).execute()
        
        return result.data or []
    
    # =========================================================================
    # ACCOUNTS
    # =========================================================================
    
    async def get_accounts(
        self,
        user_id: str,
    ) -> List[Dict[str, Any]]:
        """Holt alle Finanzkonten des Users"""
        
        result = self.db.table("finance_accounts").select("*").eq(
            "user_id", user_id
        ).eq("is_active", True).execute()
        
        return result.data or []
    
    async def create_account(
        self,
        user_id: str,
        name: str,
        account_type: str,
        currency: str = "EUR",
        mlm_company_slug: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Erstellt ein neues Finanzkonto"""
        
        result = self.db.table("finance_accounts").insert({
            "user_id": user_id,
            "name": name,
            "account_type": account_type,
            "currency": currency,
            "mlm_company_slug": mlm_company_slug,
        }).execute()
        
        if not result.data:
            raise Exception("Konto konnte nicht erstellt werden")
        
        return result.data[0]
    
    # =========================================================================
    # TAX PROFILE
    # =========================================================================
    
    async def _get_tax_profile(self, user_id: str) -> Optional[Dict]:
        """Holt Steuerprofil des Users"""
        
        result = self.db.table("finance_tax_profiles").select("*").eq(
            "user_id", user_id
        ).single().execute()
        
        return result.data if result.data else None
    
    async def initialize_tax_profile(
        self,
        user_id: str,
        country: str = "AT",
    ) -> Dict[str, Any]:
        """Initialisiert Steuerprofil mit Länder-Defaults"""
        
        result = self.db.rpc("initialize_tax_profile", {
            "p_user_id": user_id,
            "p_country": country,
        }).execute()
        
        return result.data if result.data else {}
    
    async def update_tax_profile(
        self,
        user_id: str,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Aktualisiert das Steuerprofil"""
        
        # Verhindere Änderung von user_id
        updates.pop("user_id", None)
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = self.db.table("finance_tax_profiles").update(updates).eq(
            "user_id", user_id
        ).execute()
        
        if not result.data:
            raise Exception("Steuerprofil nicht gefunden")
        
        return result.data[0]
    
    # =========================================================================
    # GOALS
    # =========================================================================
    
    async def set_monthly_goal(
        self,
        user_id: str,
        target_amount: float,
        month: Optional[int] = None,
        year: Optional[int] = None,
    ) -> str:
        """Setzt das Monatsumsatzziel"""
        
        now = datetime.now()
        
        result = self.db.rpc("set_monthly_goal", {
            "p_user_id": user_id,
            "p_target_amount": target_amount,
            "p_month": month or now.month,
            "p_year": year or now.year,
        }).execute()
        
        return result.data if result.data else ""
    
    async def get_current_goal(
        self,
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Holt das aktuelle Monatsziel"""
        
        now = datetime.now()
        
        result = self.db.table("finance_goals").select("*").eq(
            "user_id", user_id
        ).eq("goal_type", "monthly_revenue").eq(
            "period_year", now.year
        ).eq("period_month", now.month).eq("is_active", True).single().execute()
        
        return result.data if result.data else None


# =============================================================================
# FACTORY
# =============================================================================

_service_instance: Optional[FinanceService] = None


def get_finance_service(db: Client) -> FinanceService:
    """Factory für FinanceService"""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = FinanceService(db)
    
    return _service_instance

