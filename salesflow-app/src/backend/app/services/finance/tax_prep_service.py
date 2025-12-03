# backend/app/services/finance/tax_prep_service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TAX PREP SERVICE                                                           ║
║  Steuer-Vorbereitung (KEINE Steuerberatung!)                                ║
╚════════════════════════════════════════════════════════════════════════════╝

Funktionen:
- Jahres-Zusammenfassungen generieren
- Steuer-Reserve schätzen (mit Disclaimer!)
- Export für Steuerberater erstellen
- Kategorien-Analyse

RECHTLICHER HINWEIS:
Dieses Modul bietet KEINE Steuerberatung. Alle Berechnungen sind nur
Schätzungen zur Vorbereitung. Bitte konsultiere einen Steuerberater!
"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime
from dataclasses import dataclass, field

from supabase import Client


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class TaxPrepExport:
    """Export für Steuerberater"""
    year: int
    
    # Zusammenfassung
    total_income: float
    total_expenses: float
    profit: float
    
    # Nach Kategorien
    income_by_source: List[Dict[str, Any]] = field(default_factory=list)
    expenses_by_category: List[Dict[str, Any]] = field(default_factory=list)
    
    # Fahrtenbuch
    total_mileage_km: float = 0
    total_mileage_amount: float = 0
    
    # Belege
    receipts_count: int = 0
    missing_receipts_count: int = 0
    
    # Export-URLs
    pdf_url: Optional[str] = None
    csv_url: Optional[str] = None
    
    # Disclaimer (WICHTIG!)
    disclaimer: str = (
        "Diese Zusammenfassung dient nur zur VORBEREITUNG für deinen Steuerberater. "
        "Es handelt sich NICHT um eine Steuererklärung und KEINE Steuerberatung."
    )
    generated_at: str = ""


@dataclass
class TaxReserveEstimate:
    """Geschätzte Steuer-Reserve"""
    profit: float
    estimated_tax: float
    reserve_amount: float
    reserve_percentage: float
    disclaimer: str = (
        "Dies ist nur eine GROBE Schätzung basierend auf deinem eingestellten "
        "Steuersatz. Die tatsächliche Steuerlast kann deutlich abweichen. "
        "Bitte konsultiere deinen Steuerberater!"
    )


# =============================================================================
# SERVICE CLASS
# =============================================================================

class TaxPrepService:
    """
    Tax Prep Service für Steuer-Vorbereitung.
    
    ⚠️ WICHTIG: Dieses Modul bietet KEINE Steuerberatung!
    Alle Berechnungen sind nur Schätzungen zur Vorbereitung.
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # TAX PREP EXPORT
    # =========================================================================
    
    async def generate_tax_prep_export(
        self,
        user_id: str,
        year: int,
    ) -> TaxPrepExport:
        """
        Generiert Steuer-Vorbereitungs-Export.
        
        ⚠️ DISCLAIMER: Dies ist KEINE Steuererklärung, sondern eine
        strukturierte Zusammenfassung zur Vorbereitung!
        """
        
        # Nutze die RPC-Funktion
        result = self.db.rpc("generate_tax_prep_summary", {
            "p_user_id": user_id,
            "p_year": year,
        }).execute()
        
        if not result.data:
            return TaxPrepExport(
                year=year,
                total_income=0,
                total_expenses=0,
                profit=0,
                generated_at=datetime.utcnow().isoformat(),
            )
        
        data = result.data
        summary = data.get("summary", {})
        mileage = data.get("mileage", {})
        
        return TaxPrepExport(
            year=year,
            total_income=float(summary.get("total_income", 0)),
            total_expenses=float(summary.get("total_expenses", 0)),
            profit=float(summary.get("profit", 0)),
            income_by_source=data.get("income_by_source", []),
            expenses_by_category=data.get("expenses_by_category", []),
            total_mileage_km=float(mileage.get("total_km", 0)),
            total_mileage_amount=float(mileage.get("total_amount", 0)),
            receipts_count=int(summary.get("receipts_count", 0)),
            missing_receipts_count=await self._get_missing_receipts_count(user_id, year),
            generated_at=datetime.utcnow().isoformat(),
        )
    
    async def _get_missing_receipts_count(
        self,
        user_id: str,
        year: int,
    ) -> int:
        """Zählt fehlende Belege für Ausgaben >= 50€"""
        
        result = self.db.table("finance_transactions").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq(
            "transaction_type", "expense"
        ).gte("amount", 50).is_(
            "document_url", "null"
        ).is_("receipt_url", "null").execute()
        
        return result.count or 0
    
    # =========================================================================
    # TAX RESERVE
    # =========================================================================
    
    async def calculate_tax_reserve(
        self,
        user_id: str,
        year: int,
    ) -> TaxReserveEstimate:
        """
        Berechnet eine GROBE Steuer-Reserve-Schätzung.
        
        ⚠️ WICHTIG: Dies ist KEINE Steuerberatung!
        Die tatsächliche Steuerlast kann deutlich abweichen.
        """
        
        result = self.db.rpc("calculate_tax_reserve", {
            "p_user_id": user_id,
            "p_year": year,
        }).execute()
        
        if not result.data or len(result.data) == 0:
            return TaxReserveEstimate(
                profit=0,
                estimated_tax=0,
                reserve_amount=0,
                reserve_percentage=25,
            )
        
        data = result.data[0]
        
        return TaxReserveEstimate(
            profit=float(data.get("profit", 0)),
            estimated_tax=float(data.get("estimated_tax", 0)),
            reserve_amount=float(data.get("reserve_amount", 0)),
            reserve_percentage=float(data.get("reserve_percentage", 25)),
        )
    
    # =========================================================================
    # EXPORT GENERATION
    # =========================================================================
    
    async def create_export_file(
        self,
        user_id: str,
        year: int,
        export_type: str = "steuerberater_package",
    ) -> Dict[str, Any]:
        """
        Erstellt eine Export-Datei.
        
        Export-Typen:
        - summary_pdf: PDF-Zusammenfassung
        - transactions_csv: Alle Transaktionen als CSV
        - datev_csv: DATEV-kompatibles CSV (für deutschen Steuerberater)
        - steuerberater_package: Komplettes Paket (PDF + CSV)
        """
        
        # Generiere Summary
        export_data = await self.generate_tax_prep_export(user_id, year)
        
        # TODO: Implementiere tatsächliche Datei-Generierung
        # Für jetzt: Speichere nur Metadaten
        
        result = self.db.table("finance_exports").insert({
            "user_id": user_id,
            "year": year,
            "period": "year",
            "export_type": export_type,
            "file_url": f"exports/{user_id}/{year}_{export_type}.pdf",  # Placeholder
            "summary": {
                "total_income": export_data.total_income,
                "total_expenses": export_data.total_expenses,
                "profit": export_data.profit,
                "receipts_count": export_data.receipts_count,
            },
            "disclaimer_accepted": True,
        }).execute()
        
        if not result.data:
            raise Exception("Export konnte nicht erstellt werden")
        
        return result.data[0]
    
    async def get_exports(
        self,
        user_id: str,
        year: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Holt alle Exports des Users"""
        
        query = self.db.table("finance_exports").select("*").eq("user_id", user_id)
        
        if year:
            query = query.eq("year", year)
        
        query = query.order("created_at", desc=True)
        result = query.execute()
        
        return result.data or []
    
    # =========================================================================
    # YEAR-END CHECKLIST
    # =========================================================================
    
    async def get_year_end_checklist(
        self,
        user_id: str,
        year: int,
    ) -> List[Dict[str, Any]]:
        """
        Generiert eine Jahresend-Checkliste.
        
        ⚠️ Dies ist KEINE Steuerberatung, sondern eine allgemeine
        Struktur-Hilfe zur Vorbereitung.
        """
        
        # Hole Daten
        export_data = await self.generate_tax_prep_export(user_id, year)
        
        checklist = [
            {
                "id": "receipts",
                "title": "Belege vollständig",
                "description": "Alle Ausgaben >= 50€ haben einen Beleg",
                "status": "complete" if export_data.missing_receipts_count == 0 else "incomplete",
                "details": f"{export_data.missing_receipts_count} fehlende Belege" if export_data.missing_receipts_count > 0 else None,
            },
            {
                "id": "mileage",
                "title": "Fahrtenbuch geprüft",
                "description": "Alle geschäftlichen Fahrten dokumentiert",
                "status": "complete" if export_data.total_mileage_km > 0 else "pending",
                "details": f"{export_data.total_mileage_km:.0f} km erfasst",
            },
            {
                "id": "categories",
                "title": "Kategorien korrekt",
                "description": "Einnahmen/Ausgaben richtig zugeordnet",
                "status": "review",
                "details": "Bitte manuell prüfen",
            },
            {
                "id": "reserve",
                "title": "Steuer-Reserve geprüft",
                "description": "Rücklage für Steuerzahlung vorhanden",
                "status": "review",
                "details": "Bitte mit Steuerberater besprechen",
            },
            {
                "id": "export",
                "title": "Export für Steuerberater",
                "description": "Zusammenfassung exportiert und übermittelt",
                "status": "pending",
                "details": None,
            },
        ]
        
        return checklist
    
    # =========================================================================
    # CATEGORY HINTS
    # =========================================================================
    
    def get_category_tax_hints(self) -> Dict[str, str]:
        """
        Gibt allgemeine Hinweise zu Kategorien.
        
        ⚠️ Dies sind ALLGEMEINE Informationen, KEINE individuelle Steuerberatung!
        """
        
        return {
            "marketing_ads": "Werbeanzeigen werden typischerweise als Betriebsausgabe behandelt.",
            "travel_hotel": "Übernachtungskosten bei Geschäftsreisen sind oft absetzbar.",
            "travel_meals": "Für Verpflegung gelten oft Pauschalen (DE: 28€/Tag, AT: 26,40€/Tag).",
            "vehicle_mileage": "Kilometerpauschale: AT 0,42€/km, DE 0,30€/km",
            "phone_mobile": "Bei gemischter Nutzung: Anteilige Absetzung möglich.",
            "office_rent": "Arbeitszimmer: Anteilige Miete kann absetzbar sein.",
            "software_tools": "Beruflich genutzte Software ist typischerweise absetzbar.",
            "education_courses": "Berufliche Weiterbildung ist oft absetzbar.",
            "gifts_clients": "Kundengeschenke: Grenzen beachten! (DE: 35€/Person/Jahr)",
            "product_samples": "Testprodukte für Demos können Betriebsausgabe sein.",
            
            # Disclaimer am Ende
            "_disclaimer": (
                "Dies sind allgemeine Informationen. Die steuerliche Behandlung "
                "hängt vom Einzelfall ab. Bitte konsultiere deinen Steuerberater!"
            ),
        }


# =============================================================================
# FACTORY
# =============================================================================

_service_instance: Optional[TaxPrepService] = None


def get_tax_prep_service(db: Client) -> TaxPrepService:
    """Factory für TaxPrepService"""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = TaxPrepService(db)
    
    return _service_instance

