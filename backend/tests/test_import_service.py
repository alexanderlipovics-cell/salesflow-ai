from __future__ import annotations

from app.import_service import (
    LeadImportService,
    NormalizedLead,
    parse_csv_contacts,
    parse_import_payload,
)


class DummyResponse:
    error = None


class DummyTable:
    def __init__(self, parent):
        self.parent = parent

    def insert(self, rows):
        self.parent.rows.extend(rows)
        return self

    def execute(self):
        return DummyResponse()


class DummySupabase:
    def __init__(self):
        self.rows = []

    def table(self, name):
        assert name == "leads"
        return DummyTable(self)


def test_parse_csv_accepts_german_headers():
    csv_text = """Name;E-Mail;Letzter Kontakt;Last_Status;Notes
Anna Schmidt;anna@example.com;20.11.2024;Hot Lead;Will sich im Herbst melden
"""
    leads = parse_csv_contacts(csv_text)
    assert len(leads) == 1
    lead = leads[0]
    assert lead.name == "Anna Schmidt"
    assert lead.email == "anna@example.com"
    assert lead.last_contact_text == "20.11.2024"
    assert lead.last_status == "Hot Lead"


def test_parse_import_payload_accepts_json_list():
    payload = [
        {"name": "A", "email": "a@example.com"},
        {"vorname": "B", "nachname": "Example", "phone": "+49123"},
    ]
    leads = parse_import_payload(payload)
    assert len(leads) == 2
    assert leads[0].name == "A"
    assert leads[1].name == "B Example"


def test_import_service_creates_stats_and_rows():
    leads = [
        NormalizedLead(
            row_number=1,
            name="Warm Lead",
            email="warm@example.com",
            last_status="Hot Lead",
            notes="Wir hatten im Mai gesprochen.",
        ),
        NormalizedLead(
            row_number=2,
            name="Ohne Kontext",
        ),
    ]

    dummy = DummySupabase()
    service = LeadImportService(supabase=dummy, ai_client=None)
    summary = service.run(leads)

    assert summary.total == 2
    assert summary.with_ai_status == 1
    assert summary.without_status == 1
    assert len(dummy.rows) == 2
