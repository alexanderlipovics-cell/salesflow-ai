"""
Service-Funktionen, um Vertriebsszenarien aus Supabase zu laden
und als Knowledge-Text für KI-Prompts aufzubereiten.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence, Dict, Any

from .supabase_client import SupabaseNotConfiguredError, get_supabase_client


@dataclass
class SalesScenario:
    """Repräsentiert ein Vertriebsszenario aus der Tabelle sales_scenarios."""
    id: str
    vertical: str
    title: str
    channel: Optional[str]
    stage: Optional[str]
    outcome: Optional[str]
    tags: List[str]
    transcript: str
    notes: Optional[str]

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "SalesScenario":
        return cls(
            id=str(row.get("id")),
            vertical=row.get("vertical") or "",
            title=row.get("title") or "",
            channel=row.get("channel"),
            stage=row.get("stage"),
            outcome=row.get("outcome"),
            tags=row.get("tags") or [],
            transcript=row.get("transcript") or "",
            notes=row.get("notes"),
        )


def fetch_scenarios(
    vertical: str,
    tags: Optional[Sequence[str]] = None,
    limit: int = 3,
) -> List[SalesScenario]:
    """
    Lädt passende Vertriebsszenarien aus Supabase.

    - `vertical`: Branche / Vertikale, z. B. "art", "network_marketing".
    - `tags`: optionale Liste von Tags zur weiteren Eingrenzung.
    - `limit`: maximale Anzahl Szenarien (1–10).

    Gibt eine leere Liste zurück, wenn Supabase nicht konfiguriert ist
    oder keine Daten gefunden werden.
    """
    try:
        supabase = get_supabase_client()
    except SupabaseNotConfiguredError:
        return []

    safe_limit = max(1, min(limit, 10))

    query = (
        supabase.table("sales_scenarios")
        .select(
            "id, vertical, title, channel, stage, outcome, tags, transcript, notes"
        )
        .eq("vertical", vertical)
        .limit(safe_limit)
    )

    if tags:
        # Erwartet text[]-Spalte "tags".
        # Supabase-Py: contains -> Array enthält alle angegebenen Werte.
        query = query.contains("tags", list(tags))

    response = query.execute()
    rows = getattr(response, "data", None) or []
    return [SalesScenario.from_row(row) for row in rows]


def render_scenarios_as_knowledge(
    scenarios: Sequence[SalesScenario],
    max_chars: int = 4000,
) -> str:
    """
    Formatiert Szenarien als kompakten Knowledge-Text für Systemprompts.

    `max_chars` begrenzt die Länge, damit der Prompt nicht explodiert.
    Gibt einen leeren String zurück, wenn keine Szenarien übergeben werden.
    """
    if not scenarios:
        return ""

    lines: List[str] = []
    lines.append("Reale Vertriebsszenarien (verkürzt):")
    lines.append("")

    for idx, sc in enumerate(scenarios, start=1):
        header = f"Szenario {idx} – {sc.title}"
        meta_parts: List[str] = []

        if sc.channel:
            meta_parts.append(f"Kanal: {sc.channel}")
        if sc.stage:
            meta_parts.append(f"Phase: {sc.stage}")
        if sc.outcome:
            meta_parts.append(f"Ergebnis: {sc.outcome}")
        if sc.tags:
            meta_parts.append("Tags: " + ", ".join(sc.tags))

        if meta_parts:
            header += " (" + " | ".join(meta_parts) + ")"

        lines.append(header)
        lines.append("-" * len(header))

        transcript = sc.transcript.strip()

        # Optional kürzen, wenn Transcript sehr lang ist
        if len(transcript) > 1200:
            transcript = transcript[:1150].rstrip() + " …"

        lines.append(transcript)

        if sc.notes:
            lines.append("")
            lines.append("Lern-Notiz: " + sc.notes.strip())

        lines.append("")

        joined = "\n".join(lines)
        if len(joined) >= max_chars:
            lines.append(
                "… (weitere Szenarien gekürzt, um den Prompt kurz zu halten)"
            )
            break

    return "\n".join(lines)
