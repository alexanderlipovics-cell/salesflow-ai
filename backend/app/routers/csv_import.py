from datetime import datetime
import csv
import io
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..core.deps import get_current_user, get_supabase


router = APIRouter(prefix="/csv-import", tags=["csv-import"])


class CSVContact(BaseModel):
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    warm_score: int = 50


class ImportRequest(BaseModel):
    contacts: List[CSVContact]
    default_temperature: str = "cold"
    default_source: str = "csv_import"
    skip_duplicates: bool = True


def _extract_user_id(user: Any) -> str:
    """Ermittelt eine user_id aus Dict oder Objekt."""
    if user is None:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext gefunden")

    if isinstance(user, dict):
        user_id = user.get("user_id") or user.get("id")
    else:
        user_id = getattr(user, "id", None) or getattr(user, "user_id", None)

    if not user_id:
        raise HTTPException(status_code=401, detail="Konnte user_id nicht bestimmen")

    return str(user_id)


@router.post("/parse")
async def parse_csv(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """CSV-Datei parsen und Vorschau zurückgeben."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Nur CSV-Dateien erlaubt")

    contents = await file.read()

    # Verschiedene Encodings ausprobieren
    text: Optional[str] = None
    for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
        try:
            text = contents.decode(encoding)
            break
        except Exception:
            continue

    if text is None:
        raise HTTPException(
            status_code=400,
            detail="Konnte Datei nicht lesen. Bitte UTF-8 Encoding verwenden.",
        )

    reader = csv.DictReader(io.StringIO(text))

    contacts: List[Dict[str, Any]] = []
    column_mapping: Dict[str, str] = {}

    # Auto-Mapping
    if reader.fieldnames:
        for field in reader.fieldnames:
            field_lower = field.lower().strip()

            if any(x in field_lower for x in ["name", "vollständiger name", "full name"]):
                column_mapping["name"] = field
            elif any(x in field_lower for x in ["vorname", "first", "given"]):
                column_mapping["first_name"] = field
            elif any(x in field_lower for x in ["nachname", "last", "family", "surname"]):
                column_mapping["last_name"] = field
            elif any(x in field_lower for x in ["email", "e-mail", "mail"]):
                column_mapping["email"] = field
            elif any(x in field_lower for x in ["telefon", "phone", "mobile", "handy", "tel"]):
                column_mapping["phone"] = field
            elif any(x in field_lower for x in ["firma", "company", "unternehmen", "organization"]):
                column_mapping["company"] = field
            elif any(x in field_lower for x in ["position", "titel", "title", "job", "rolle"]):
                column_mapping["position"] = field
            elif any(x in field_lower for x in ["notiz", "note", "bemerkung", "comment"]):
                column_mapping["notes"] = field

    for row in reader:
        contact: Dict[str, Any] = {}
        name_parts: List[str] = []

        if "first_name" in column_mapping:
            contact["first_name"] = (row.get(column_mapping["first_name"]) or "").strip()
            name_parts.append(contact["first_name"])

        if "last_name" in column_mapping:
            contact["last_name"] = (row.get(column_mapping["last_name"]) or "").strip()
            name_parts.append(contact["last_name"])

        if "name" in column_mapping:
            contact["name"] = (row.get(column_mapping["name"]) or "").strip()
        elif name_parts:
            contact["name"] = " ".join(name_parts).strip()
        else:
            first_col = list(row.values())[0] if row else ""
            contact["name"] = (first_col or "").strip()

        if not contact.get("name"):
            continue

        for field in ["email", "phone", "company", "position", "notes"]:
            if field in column_mapping:
                contact[field] = (row.get(column_mapping[field]) or "").strip() or None

        # Warm Score berechnen
        score = 30
        if contact.get("phone"):
            score += 25
        if contact.get("email"):
            score += 15
        if contact.get("company"):
            score += 20
        if contact.get("position"):
            score += 10

        contact["warm_score"] = min(100, score)
        contacts.append(contact)

    return {
        "success": True,
        "total_rows": len(contacts),
        "columns_detected": column_mapping,
        "preview": contacts[:10],
        "all_contacts": contacts,
    }


@router.post("/import")
async def import_contacts(
    request: ImportRequest,
    current_user=Depends(get_current_user),
):
    """Parste Kontakte in Leads übernehmen."""
    supabase = get_supabase()
    user_id = _extract_user_id(current_user)

    imported = 0
    skipped = 0
    errors: List[Dict[str, str]] = []

    for contact in request.contacts:
        try:
            existing = None

            if request.skip_duplicates and contact.email:
                existing = (
                    supabase.table("leads")
                    .select("id")
                    .eq("user_id", user_id)
                    .eq("email", contact.email)
                    .execute()
                )

            if request.skip_duplicates and (not existing or not existing.data) and contact.phone:
                phone_clean = "".join(filter(str.isdigit, contact.phone or ""))
                if phone_clean:
                    existing = (
                        supabase.table("leads")
                        .select("id")
                        .eq("user_id", user_id)
                        .ilike("phone", f"%{phone_clean[-8:]}%")
                        .execute()
                    )

            if existing and existing.data:
                skipped += 1
                continue

            lead_data: Dict[str, Any] = {
                "user_id": user_id,
                "name": contact.name,
                "first_name": contact.first_name
                or (contact.name.split()[0] if contact.name else None),
                "last_name": contact.last_name
                or (" ".join(contact.name.split()[1:]) if contact.name and len(contact.name.split()) > 1 else None),
                "email": contact.email,
                "phone": contact.phone,
                "company": contact.company,
                "position": contact.position,
                "notes": contact.notes,
                "source": contact.source or request.default_source,
                "temperature": request.default_temperature,
                "status": "active",
                "warm_score": contact.warm_score,
                "created_at": datetime.now().isoformat(),
            }

            lead_data = {k: v for k, v in lead_data.items() if v is not None}

            supabase.table("leads").insert(lead_data).execute()
            imported += 1
        except Exception as exc:  # pragma: no cover - defensive logging
            errors.append({"contact": contact.name, "error": str(exc)})

    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "message": f"✅ {imported} Kontakte importiert, {skipped} übersprungen (Duplikate)",
    }


@router.post("/parse-vcf")
async def parse_vcf(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """VCF-Datei (vCard) parsen."""
    if not file.filename.lower().endswith(".vcf"):
        raise HTTPException(status_code=400, detail="Nur VCF-Dateien erlaubt")

    contents = await file.read()
    text = contents.decode("utf-8", errors="ignore")

    contacts: List[Dict[str, Any]] = []
    current_contact: Dict[str, Any] = {}

    for line in text.split("\n"):
        line = line.strip()

        if line == "BEGIN:VCARD":
            current_contact = {}
        elif line == "END:VCARD":
            if current_contact.get("name"):
                score = 30
                if current_contact.get("phone"):
                    score += 25
                if current_contact.get("email"):
                    score += 15
                if current_contact.get("company"):
                    score += 20
                current_contact["warm_score"] = min(100, score)
                contacts.append(current_contact)
            current_contact = {}
        elif ":" in line:
            key, value = line.split(":", 1)
            key = key.split(";")[0].upper()

            if key == "FN":
                current_contact["name"] = value
            elif key == "N":
                parts = value.split(";")
                if len(parts) >= 2:
                    current_contact["last_name"] = parts[0]
                    current_contact["first_name"] = parts[1]
            elif key == "EMAIL":
                current_contact["email"] = value
            elif key == "TEL":
                current_contact["phone"] = value
            elif key == "ORG":
                current_contact["company"] = value
            elif key == "TITLE":
                current_contact["position"] = value

    return {
        "success": True,
        "total_rows": len(contacts),
        "preview": contacts[:10],
        "all_contacts": contacts,
    }

