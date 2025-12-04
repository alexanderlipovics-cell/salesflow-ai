"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MLM CSV IMPORT API                                                       ║
║  Spezialisierter Import für MLM-Kontakte                                  ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json

from ...db.deps import get_db, get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...services.csv_import import MLMParserFactory, MLMCompany, ContactImporter
from ...services.csv_import.mapping import ColumnMapper, AutoMapper

router = APIRouter(prefix="/mlm-import", tags=["mlm-import"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ImportPreviewRequest(BaseModel):
    """Request für Import-Preview."""
    mlm_company: str
    field_mapping: Optional[Dict[str, str]] = None


class ImportPreviewResponse(BaseModel):
    """Response für Import-Preview."""
    detected_columns: List[str]
    suggested_mapping: Dict[str, str]
    sample_rows: List[Dict[str, Any]]
    total_rows: int
    estimated_duplicates: int


class ImportExecuteRequest(BaseModel):
    """Request für Import-Ausführung."""
    mlm_company: str
    field_mapping: Optional[Dict[str, str]] = None
    skip_duplicates: bool = True
    sync_mode: str = "once"  # "once" oder "weekly"


class ImportResult(BaseModel):
    """Import-Ergebnis."""
    batch_id: str
    total_rows: int
    imported: int
    skipped: int
    errors: int
    duplicates: int
    error_details: List[Dict[str, Any]]


# ═══════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    mlm_company: str = Form(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: Any = Depends(get_supabase),
):
    """
    Zeigt Vorschau des CSV-Imports mit automatischer Spalten-Erkennung.
    """
    try:
        # CSV lesen
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # MLM Company validieren
        try:
            mlm_enum = MLMCompany(mlm_company)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Ungültiges MLM-Unternehmen: {mlm_company}"
            )
        
        # Parser erstellen
        parser = MLMParserFactory.create_parser(mlm_enum, csv_content)
        rows = parser.parse()
        headers = parser.get_headers()
        sample_rows = parser.get_sample_rows(5)
        
        # Auto-Mapping
        auto_mapper = AutoMapper()
        suggested_mapping = await auto_mapper.detect_columns_with_gpt(
            headers,
            sample_rows,
            mlm_company
        )
        
        # Standard-Mapping als Fallback
        if not suggested_mapping:
            suggested_mapping = ColumnMapper.suggest_mapping(headers)
        
        # Duplikat-Schätzung
        importer = ContactImporter(db, current_user.id)
        estimated_duplicates = 0
        for row in sample_rows:
            normalized = parser.normalize_contact(row)
            is_dup = await importer._check_duplicate(
                email=normalized.get('email'),
                phone=normalized.get('phone'),
                mlm_id=normalized.get('mlm_id'),
                mlm_company=mlm_company
            )
            if is_dup:
                estimated_duplicates += 1
        
        # Hochrechnung
        if len(rows) > len(sample_rows):
            dup_rate = estimated_duplicates / len(sample_rows) if sample_rows else 0
            estimated_duplicates = int(len(rows) * dup_rate)
        
        return ImportPreviewResponse(
            detected_columns=headers,
            suggested_mapping=suggested_mapping,
            sample_rows=[parser.normalize_contact(row) for row in sample_rows],
            total_rows=len(rows),
            estimated_duplicates=estimated_duplicates
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview-Fehler: {str(e)}")


@router.post("/execute", response_model=ImportResult)
async def execute_import(
    file: UploadFile = File(...),
    mlm_company: str = Form(...),
    field_mapping: str = Form(None),  # JSON-String
    skip_duplicates: bool = Form(True),
    sync_mode: str = Form("once"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Any = Depends(get_supabase),
):
    """
    Führt den MLM-Import aus.
    """
    try:
        # CSV lesen
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # MLM Company validieren
        try:
            mlm_enum = MLMCompany(mlm_company)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Ungültiges MLM-Unternehmen: {mlm_company}"
            )
        
        # Field Mapping parsen
        mapping = None
        if field_mapping:
            try:
                mapping = json.loads(field_mapping)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Ungültiges Field-Mapping")
        
        # Import ausführen
        importer = ContactImporter(db, current_user.id)
        result = await importer.import_contacts(
            csv_content=csv_content,
            mlm_company=mlm_enum,
            field_mapping=mapping,
            skip_duplicates=skip_duplicates,
            sync_mode=sync_mode
        )
        
        return ImportResult(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import-Fehler: {str(e)}")


@router.get("/companies")
async def get_mlm_companies():
    """Gibt verfügbare MLM-Unternehmen zurück."""
    return {
        "companies": [
            {
                "id": "zinzino",
                "name": "Zinzino",
                "description": "Zinzino Export: Partner ID, Vorname, Nachname, Email, Telefon, Rang, Credits, Team Credits, PCP, Sponsor ID, Z4F Status, ECB Status",
                "template": ["Partner ID", "Vorname", "Nachname", "Email", "Telefon", "Rang", "Credits", "Team Credits", "PCP", "Sponsor ID", "Z4F", "ECB"]
            },
            {
                "id": "pm-international",
                "name": "PM-International (FitLine)",
                "description": "PM-International Export: Partner-Nr, Vorname, Nachname, Email, Telefon, Rang, Punkte, GV, Erstlinie, Sponsor, Autoship",
                "template": ["Partner-Nr", "Vorname", "Nachname", "Email", "Telefon", "Rang", "Punkte", "GV", "Erstlinie", "Sponsor", "Autoship"]
            },
            {
                "id": "doterra",
                "name": "doTERRA",
                "description": "doTERRA Export (Compensation Plan Elevated 2025): Member ID, Vorname, Nachname, Email, Telefon, Rank, PV, OV, PGV, TV, Legs, LRP Status",
                "template": ["Member ID", "Vorname", "Nachname", "Email", "Telefon", "Rank", "PV", "OV", "PGV", "TV", "Legs", "LRP Active"]
            },
            {
                "id": "herbalife",
                "name": "Herbalife",
                "description": "Herbalife Export: Name, ID, Sponsor, Level, VP, PP"
            },
            {
                "id": "lr",
                "name": "LR",
                "description": "LR Export (ähnlich Herbalife)"
            },
            {
                "id": "vorwerk",
                "name": "Vorwerk",
                "description": "Vorwerk Export (ähnlich PM-International)"
            },
            {
                "id": "generic",
                "name": "Generic MLM",
                "description": "Generisches Format mit automatischer Spalten-Erkennung"
            },
        ]
    }

