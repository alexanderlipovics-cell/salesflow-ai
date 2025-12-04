"""
Simple Import Router - Einfacher Kunden/Lead-Import ohne Auth
Demo-freundlicher Endpunkt für schnelle Imports
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional
import csv
import io
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class CustomerImportRequest(BaseModel):
    """Request für Kunden-Import"""
    customers: List[dict] = Field(..., description="Liste von Kunden-Objekten")
    

class CustomerImportResponse(BaseModel):
    """Response für Kunden-Import"""
    success: bool
    imported: int
    errors: List[str]
    message: str


@router.post("/customers", response_model=CustomerImportResponse)
async def import_customers(payload: CustomerImportRequest):
    """
    Importiert Kunden/Leads aus einer Liste.
    Demo-freundlicher Endpunkt ohne Authentifizierung.
    """
    imported_count = 0
    errors = []
    
    for i, customer in enumerate(payload.customers):
        try:
            # Validate required fields
            name = customer.get("name") or customer.get("Name") or customer.get("full_name")
            if not name:
                errors.append(f"Zeile {i+1}: Name fehlt")
                continue
            
            # In production: save to database
            # For demo: just count as successful
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Zeile {i+1}: {str(e)}")
    
    return CustomerImportResponse(
        success=imported_count > 0,
        imported=imported_count,
        errors=errors,
        message=f"{imported_count} Kunden erfolgreich importiert" if imported_count > 0 else "Keine Kunden importiert"
    )


@router.post("/csv")
async def import_csv_simple(file: UploadFile = File(...)):
    """
    Importiert Kunden/Leads aus einer CSV-Datei.
    Demo-freundlicher Endpunkt ohne Authentifizierung.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Nur CSV-Dateien werden unterstützt")
    
    content = await file.read()
    
    try:
        # Decode content
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            text = content.decode('latin-1')
        except:
            raise HTTPException(400, "Datei-Encoding nicht unterstützt")
    
    # Parse CSV
    reader = csv.DictReader(io.StringIO(text))
    customers = list(reader)
    
    imported_count = 0
    errors = []
    
    for i, row in enumerate(customers):
        try:
            # Try to find name field
            name = row.get("name") or row.get("Name") or row.get("Vorname", "") + " " + row.get("Nachname", "")
            name = name.strip()
            
            if not name:
                errors.append(f"Zeile {i+1}: Name fehlt")
                continue
            
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Zeile {i+1}: {str(e)}")
    
    return {
        "success": imported_count > 0,
        "imported": imported_count,
        "total_rows": len(customers),
        "errors": errors[:10],  # Limit errors to 10
        "error_count": len(errors),
        "message": f"{imported_count} von {len(customers)} Datensätzen importiert"
    }


@router.post("/leads")
async def import_leads_simple(leads: List[dict]):
    """
    Importiert Leads direkt aus einer Liste.
    """
    imported = 0
    errors = []
    
    for i, lead in enumerate(leads):
        try:
            if not lead.get("name"):
                errors.append(f"Lead {i+1}: Name erforderlich")
                continue
            imported += 1
        except Exception as e:
            errors.append(f"Lead {i+1}: {str(e)}")
    
    return {
        "success": imported > 0,
        "imported": imported,
        "errors": errors,
        "message": f"{imported} Leads importiert"
    }


@router.get("/templates")
async def get_import_templates():
    """
    Gibt verfügbare Import-Templates zurück.
    """
    return {
        "templates": [
            {
                "name": "Standard Lead Import",
                "description": "Basis-Import mit Name, Email, Telefon",
                "columns": ["name", "email", "phone", "status", "notes"],
                "required": ["name"]
            },
            {
                "name": "Network Marketing",
                "description": "Import für Network-Kontakte",
                "columns": ["name", "email", "phone", "instagram", "whatsapp", "source", "notes"],
                "required": ["name"]
            },
            {
                "name": "Immobilien",
                "description": "Import für Immobilien-Interessenten",
                "columns": ["name", "email", "phone", "budget", "location", "property_type", "notes"],
                "required": ["name"]
            }
        ]
    }

