"""
Helper und Service-Layer für den Bestandskunden-Import.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Mapping, Optional, Sequence

from supabase import Client

from .ai_client import AIClient
from .schemas import ChatMessage, ImportSummary

logger = logging.getLogger(__name__)

CSV_DELIMITERS = ",;|\t"

HEADER_ALIASES: Dict[str, set[str]] = {
    "name": {
        "name",
        "fullname",
        "full_name",
        "full name",
        "kontakt",
        "kontaktname",
        "person",
        "kunde",
    },
    "__first_name": {"first_name", "firstname", "vorname"},
    "__last_name": {"last_name", "lastname", "nachname", "surname"},
    "email": {"email", "e-mail", "mail"},
    "phone": {"phone", "telefon", "tel", "mobile", "mobil"},
    "company": {"company", "firma", "unternehmen", "organization", "org"},
    "status": {
        "status",
        "last_status",
        "last status",
        "lead_status",
        "deal_status",
        "phase",
        "pipeline_stage",
        "letzter status",
        "letzter_status",
        "phase_status",
    },
    "notes": {
        "notes",
        "note",
        "notizen",
        "kommentar",
        "comments",
        "comment",
        "memo",
        "remark",
    },
    "last_contact": {
        "last_contact",
        "last_contact_at",
        "last_contact_date",
        "last_contacted",
        "letzter kontakt",
        "letzter_kontakt",
        "zuletzt kontaktiert",
        "last_touch",
    },
    "deal_value": {"deal_value", "value", "deal", "betrag", "umsatz", "amount"},
    "tags": {"tags", "labels", "gruppen", "label"},
}

SUPPORTED_DATE_FORMATS = [
    "%Y-%m-%d",
    "%d.%m.%Y",
    "%d.%m.%y",
    "%d/%m/%Y",
    "%Y/%m/%d",
    "%m/%d/%Y",
    "%d-%m-%Y",
]


class LeadImportError(ValueError):
    """Fehler, der ausgelöst wird, wenn das Importformat ungültig ist."""


@dataclass
class NormalizedLead:
    """Normiertes Lead-Objekt nach Parsing der CSV/JSON-Daten."""

    row_number: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    last_contact_text: Optional[str] = None
    last_contact: Optional[datetime] = None
    last_contact_parse_failed: bool = False
    deal_value: Optional[float] = None
    tags: List[str] = field(default_factory=list)

    def has_context(self) -> bool:
        """True, wenn Infos für eine AI-Analyse vorhanden sind."""

        return bool(
            (self.notes and self.notes.strip())
            or (self.status and self.status.strip())
        )


@dataclass
class ImportStats:
    """Hilfsobjekt zum Sammeln der Importstatistik."""

    total_rows: int = 0
    imported_count: int = 0
    updated_count: int = 0
    needs_action_count: int = 0
    without_last_contact_count: int = 0
    errors: List[str] = field(default_factory=list)


def parse_import_payload(payload: Any) -> List[NormalizedLead]:
    """
    Normalisiert beliebige Payloads (CSV-Text, JSON-Objekt oder Array).
    """

    if payload is None:
        raise LeadImportError("Der Request-Body ist leer.")

    if isinstance(payload, (bytes, bytearray)):
        payload = payload.decode("utf-8", errors="ignore")

    if isinstance(payload, str):
        stripped = payload.strip()
        if not stripped:
            raise LeadImportError("Die CSV darf nicht leer sein.")
        # Wenn valid JSON, erneut parsen
        if stripped.startswith("{") or stripped.startswith("["):
            try:
                data = json.loads(stripped)
                return parse_import_payload(data)
            except json.JSONDecodeError:
                pass
        return parse_csv_contacts(stripped)

    if isinstance(payload, Mapping):
        csv_text = (
            payload.get("csv_text")
            or payload.get("csv")
            or payload.get("text")
            or payload.get("raw")
        )
        if csv_text:
            return parse_import_payload(str(csv_text))
        leads = payload.get("leads") or payload.get("data") or payload.get("contacts")
        if leads:
            return parse_structured_leads(leads)
        raise LeadImportError(
            "Ungültiges JSON. Erwartet wird entweder das Feld 'csv' oder 'leads'."
        )

    if isinstance(payload, Sequence):
        return parse_structured_leads(payload)

    raise LeadImportError("Das Importformat wird nicht unterstützt.")


def parse_structured_leads(records: Sequence[Any]) -> List[NormalizedLead]:
    """Parst bereits strukturierte JSON-Objekte."""

    if not records:
        raise LeadImportError("Die Liste der Kontakte ist leer.")

    normalized: List[NormalizedLead] = []
    for idx, record in enumerate(records, start=1):
        if not isinstance(record, Mapping):
            logger.warning("Kontakt %s wird übersprungen (kein Objekt).", idx)
            continue
        parsed = normalize_record(record, idx)
        if parsed:
            normalized.append(parsed)

    if not normalized:
        raise LeadImportError("Keiner der Kontakte enthält ausreichend Daten.")
    return normalized


def parse_csv_contacts(csv_text: str) -> List[NormalizedLead]:
    """Parst CSV-Text tolerant gegenüber Trennzeichen und Groß-/Kleinschreibung."""

    if not csv_text.strip():
        raise LeadImportError("Die CSV darf nicht leer sein.")

    try:
        dialect = csv.Sniffer().sniff(csv_text[:1024], delimiters=CSV_DELIMITERS)
    except csv.Error:
        dialect = csv.excel

    csv_buffer = io.StringIO(csv_text)
    reader = csv.DictReader(csv_buffer, dialect=dialect)
    if not reader.fieldnames:
        raise LeadImportError("Die CSV enthält keine Header.")

    normalized: List[NormalizedLead] = []
    for idx, row in enumerate(reader, start=2):  # +2 wegen Headerzeile
        parsed = normalize_record(row, idx)
        if parsed:
            normalized.append(parsed)

    if not normalized:
        raise LeadImportError("Keine gültigen Kontakte in der CSV gefunden.")

    return normalized


def normalize_record(record: Mapping[str, Any], row_number: int) -> Optional[NormalizedLead]:
    """Mappt beliebige Felder eines Datensatzes in unser Standardformat."""

    canonical: Dict[str, Optional[str]] = {
        "name": None,
        "email": None,
        "phone": None,
        "company": None,
        "notes": None,
        "status": None,
        "last_contact": None,
        "deal_value": None,
        "tags": None,
        "__first_name": None,
        "__last_name": None,
    }

    for key, value in record.items():
        if value is None:
            continue
        normalized_value = str(value).strip()
        if not normalized_value:
            continue
        lookup_key = resolve_header(key)
        if not lookup_key:
            continue
        if lookup_key == "tags":
            canonical["tags"] = normalized_value
        else:
            canonical[lookup_key] = normalized_value

    name = canonical.get("name")
    first = canonical.get("__first_name")
    last = canonical.get("__last_name")
    if not name:
        combined = " ".join(part for part in [first, last] if part).strip()
        name = combined or None

    if not any([name, canonical.get("email"), canonical.get("phone")]):
        logger.warning("Kontakt in Zeile %s enthält weder Name noch Email/Telefon.", row_number)
        return None

    tags = split_tags(canonical.get("tags"))
    deal_value = parse_deal_value(canonical.get("deal_value"))
    last_contact, parse_failed = parse_last_contact(canonical.get("last_contact"))

    return NormalizedLead(
        row_number=row_number,
        name=name,
        email=canonical.get("email"),
        phone=canonical.get("phone"),
        company=canonical.get("company"),
        notes=canonical.get("notes"),
        status=canonical.get("status"),
        last_contact_text=canonical.get("last_contact"),
        last_contact=last_contact,
        last_contact_parse_failed=parse_failed,
        deal_value=deal_value,
        tags=tags,
    )


def resolve_header(raw_key: str) -> Optional[str]:
    """Findet den kanonischen Header für ein beliebiges Feld."""

    normalized = raw_key.strip().lower()
    for canonical, variants in HEADER_ALIASES.items():
        if normalized in variants:
            return canonical
    return normalized if normalized in {"name", "email", "phone", "company"} else None


def split_tags(raw: Optional[str]) -> List[str]:
    """Zerlegt Tag-Felder in eine Liste."""

    if not raw:
        return []
    tags = re.split(r"[;,|]", raw)
    cleaned = sorted({tag.strip() for tag in tags if tag.strip()})
    return cleaned


def parse_deal_value(raw: Optional[str]) -> Optional[float]:
    """Parst numerische Werte (z. B. 12.500 €)."""

    if not raw:
        return None
    cleaned = raw.replace("€", "").replace("EUR", "").replace("eur", "")
    cleaned = cleaned.replace(" ", "")
    cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_last_contact(raw: Optional[str]) -> tuple[Optional[datetime], bool]:
    """Parst last_contact in ein datetime-Objekt. Gibt (wert, parse_failed) zurück."""

    if not raw:
        return None, False

    text = raw.strip()
    if not text:
        return None, False

    # ISO mit Datum/Zeit
    try:
        parsed = datetime.fromisoformat(text)
        return parsed, False
    except ValueError:
        pass

    for fmt in SUPPORTED_DATE_FORMATS:
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed, False
        except ValueError:
            continue

    return None, True


STATUS_KEYWORDS: Dict[str, set[str]] = {
    "new": {"neu", "new", "erstkontakt", "unqualifiziert"},
    "hot": {"hot", "sofort", "urgent", "kritisch", "abschluss", "deal"},
    "warm": {"warm", "aktiv", "follow-up", "pipeline"},
    "cold": {"cold", "funkstille", "inactive", "stalled"},
    "customer": {"kunde", "kundenstatus", "bestandskunde", "customer", "won", "closed won"},
    "lost": {"lost", "abgelehnt", "kein interesse", "cancelled", "rejected", "churn"},
}

NOTE_STATUS_HINTS: Dict[str, List[str]] = {
    "customer": ["bestandskunde", "customer", "renewal", "verlängerung"],
    "hot": ["angebot", "proposal", "deal", "closing"],
    "lost": ["abgesagt", "lost", "kein interesse", "abbruch", "gekündigt"],
}

STATUS_FOLLOW_UP_RULES: Dict[str, Dict[str, Any]] = {
    "new": {"days": 1, "description": "Erstkontakt herstellen"},
    "hot": {"days": 1, "description": "Nachfassen nach Angebot"},
    "warm": {"days": 3, "description": "Check-in zum aktuellen Gespräch"},
    "cold": {"days": 14, "description": "Reaktivierungsgespräch planen"},
    "customer": {"days": 90, "description": "Beziehungs-Pflege bei Bestandskunde"},
    "lost": {"days": 30, "description": "Feedback zum verlorenen Deal sichern"},
}

NEXT_ACTION_BY_STATUS = {
    "new": "CHECK_IN",
    "hot": "FOLLOW_UP",
    "warm": "FOLLOW_UP",
    "cold": "CHECK_IN",
    "customer": "VALUE",
    "lost": "CHECK_IN",
}


def normalize_status_token(value: Optional[str]) -> Optional[str]:
    """Formt beliebige Statusangaben in die Ziel-Kategorien."""

    if not value:
        return None
    text = value.strip().lower()
    for status, keywords in STATUS_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return status
    return None


def infer_status_from_notes(notes: Optional[str]) -> Optional[str]:
    """Zieht Hinweise aus Freitextnotizen."""

    if not notes:
        return None
    text = notes.strip().lower()
    if not text:
        return None
    for status, keywords in NOTE_STATUS_HINTS.items():
        if any(keyword in text for keyword in keywords):
            return status
    return None


def infer_status_from_last_contact(
    last_contact: Optional[datetime],
    fallback_from_notes: Optional[str],
) -> Optional[str]:
    """Leitet Status anhand der Kontaktfrische ab."""

    if not last_contact:
        return None

    days_since_contact = (datetime.utcnow() - last_contact).days

    if days_since_contact <= 3:
        return "hot"
    if days_since_contact <= 14:
        return "warm"
    if fallback_from_notes:
        return fallback_from_notes
    return "customer" if days_since_contact <= 90 else "cold"


def derive_status_and_next_action(
    contact: NormalizedLead,
    ai_client: Optional[AIClient] = None,
) -> Dict[str, Any]:
    """
    Ermittelt Status + nächste Aktion aus Kontaktinformationen bzw. optionaler KI.
    """

    status = normalize_status_token(contact.status)
    note_hint = infer_status_from_notes(contact.notes)
    ai_result: Dict[str, Any] = {}

    if not status and note_hint:
        status = note_hint

    if not status:
        status = infer_status_from_last_contact(contact.last_contact, note_hint)

    if not status and ai_client and contact.has_context():
        ai_result = _call_ai_for_status(contact, ai_client) or {}
        status = ai_result.get("status") or status

    if not status:
        status = "new"

    rule = STATUS_FOLLOW_UP_RULES.get(status, STATUS_FOLLOW_UP_RULES["new"])
    next_action_description = ai_result.get("next_action_description") or rule["description"]

    next_action_at: Optional[datetime] = ai_result.get("next_action_at")
    if not next_action_at and contact.last_contact and rule["days"] is not None:
        next_action_at = contact.last_contact + timedelta(days=int(rule["days"]))

    if not contact.last_contact and not next_action_at:
        next_action_at = None

    needs_action = True
    if next_action_at:
        needs_action = next_action_at <= (datetime.utcnow() + timedelta(days=1))
    elif contact.last_contact and rule["days"] is None:
        needs_action = False

    return {
        "status": status,
        "needs_action": bool(needs_action),
        "next_action": NEXT_ACTION_BY_STATUS.get(status),
        "next_action_at": next_action_at,
        "next_action_description": next_action_description,
    }


def _call_ai_for_status(
    contact: NormalizedLead,
    ai_client: AIClient,
) -> Optional[Dict[str, Any]]:
    """Fragt optional den KI-Client für Status/Follow-up-Tipps."""

    system_prompt = (
        "Du bist Sales Flow AI. Antworte ausschließlich mit kompakter JSON-Struktur "
        'im Format {"status":"new|hot|warm|cold|customer|lost","next_action_description":"...","next_action_in_days":3}. '
        "Wenn keine Aktion nötig ist, setze next_action_in_days auf 0."
    )
    payload = {
        "name": contact.name,
        "status_hint": contact.status,
        "last_contact": contact.last_contact_text,
        "notes": contact.notes,
    }

    try:
        reply = ai_client.generate(
            system_prompt,
            [ChatMessage(role="user", content=json.dumps(payload, ensure_ascii=False))],
        )
    except Exception:  # pragma: no cover - defensive
        logger.exception("AI-Analyse für Lead %s fehlgeschlagen.", contact.name)
        return None

    data = extract_json_dict(reply)
    if not isinstance(data, dict):
        return None

    normalized_status = normalize_status_token(data.get("status"))
    next_action_desc = data.get("next_action_description")

    next_action_at = None
    if data.get("next_action_at"):
        parsed, _ = parse_last_contact(str(data["next_action_at"]))
        next_action_at = parsed
    elif isinstance(data.get("next_action_in_days"), (int, float)):
        delta_days = max(0, int(data["next_action_in_days"]))
        anchor = contact.last_contact or datetime.utcnow()
        next_action_at = anchor + timedelta(days=delta_days)

    return {
        "status": normalized_status,
        "next_action_description": next_action_desc,
        "next_action_at": next_action_at,
    }


def build_notes(lead: NormalizedLead) -> Optional[str]:
    """Kombiniert Freitext, Tags und den importierten Status."""

    lines: List[str] = []
    if lead.notes:
        lines.append(lead.notes.strip())
    if lead.tags:
        lines.append(f"Tags: {', '.join(lead.tags)}")
    if lead.status:
        lines.append(f"Import-Status (roh): {lead.status.strip()}")
    joined = "\n".join(line for line in lines if line).strip()
    return joined or None


def extract_json_dict(reply: str) -> Optional[Dict[str, Any]]:
    """Extrahiert JSON aus KI-Antworten oder Freitext."""

    if not reply:
        return None

    stripped = reply.strip().strip("`")
    try:
        data = json.loads(stripped)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", reply, flags=re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        return None
    return None


def format_datetime_for_storage(value: Optional[datetime]) -> Optional[str]:
    """Gibt ISO-Strings für Supabase zurück."""

    if not value:
        return None
    normalized = value.replace(microsecond=0)
    return normalized.isoformat()


class LeadImportService:
    """Kapselt den kompletten Import inkl. Supabase-Insert."""

    def __init__(self, supabase: Client, ai_client: Optional[AIClient] = None) -> None:
        self._supabase = supabase
        self._ai_client = ai_client

    def run(self, contacts: Sequence[NormalizedLead]) -> ImportSummary:
        if not contacts:
            raise LeadImportError("Es wurden keine Kontakte übergeben.")

        stats = ImportStats(total_rows=len(contacts))
        batch_id = str(uuid.uuid4())
        prepared_rows: List[Dict[str, Any]] = []

        for lead in contacts:
            stats.imported_count += 1

            derived = derive_status_and_next_action(lead, self._ai_client)
            notes = build_notes(lead)
            last_contact_iso = format_datetime_for_storage(lead.last_contact)
            next_action_at_iso = format_datetime_for_storage(derived.get("next_action_at"))

            if lead.last_contact is None:
                stats.without_last_contact_count += 1
                if lead.last_contact_parse_failed and lead.last_contact_text:
                    stats.errors.append(
                        f"Zeile {lead.row_number}: last_contact '{lead.last_contact_text}' konnte nicht geparst werden."
                    )

            if derived.get("needs_action"):
                stats.needs_action_count += 1

            row = {
                "name": lead.name,
                "email": lead.email,
                "phone": lead.phone,
                "company": lead.company,
                "notes": notes,
                "status": derived.get("status"),
                "next_action": derived.get("next_action"),
                "last_contact": last_contact_iso,
                "deal_value": lead.deal_value,
                "needs_action": derived.get("needs_action"),
                "next_action_at": next_action_at_iso,
                "next_action_description": derived.get("next_action_description"),
                "import_batch_id": batch_id,
                "source": "import",
            }

            prepared_rows.append({k: v for k, v in row.items() if v is not None})

        self._insert_rows(prepared_rows)
        return ImportSummary(
            total_rows=stats.total_rows,
            imported_count=stats.imported_count,
            updated_count=stats.updated_count,
            needs_action_count=stats.needs_action_count,
            without_last_contact_count=stats.without_last_contact_count,
            errors=stats.errors or None,
        )

    def _insert_rows(self, rows: Sequence[Dict[str, Any]]) -> None:
        """Schreibt die Daten in Supabase in Batches."""

        if not rows:
            return

        batch_size = 50
        for start in range(0, len(rows), batch_size):
            chunk = rows[start : start + batch_size]
            response = self._supabase.table("leads").insert(chunk).execute()
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(f"Supabase-Insert fehlgeschlagen: {error}")


__all__ = [
    "LeadImportService",
    "LeadImportError",
    "parse_import_payload",
    "NormalizedLead",
]
