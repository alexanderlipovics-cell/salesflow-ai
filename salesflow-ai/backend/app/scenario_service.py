"""
Hilfsfunktionen für die Tabelle ``public.sales_scenarios``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence

from .supabase_client import SupabaseNotConfiguredError, get_supabase_client


@dataclass
class SalesScenario:
    id: Optional[str]
    vertical: Optional[str]
    title: str
    channel: Optional[str]
    stage: Optional[str]
    outcome: Optional[str]
    tags: List[str]
    transcript: Optional[str]
    notes: Optional[str]

    @classmethod
    def from_row(cls, row: dict) -> "SalesScenario":
        return cls(
            id=row.get("id"),
            vertical=row.get("vertical"),
            title=(row.get("title") or "").strip() or "Ohne Titel",
            channel=row.get("channel"),
            stage=row.get("stage"),
            outcome=row.get("outcome"),
            tags=row.get("tags") or [],
            transcript=row.get("transcript"),
            notes=row.get("notes"),
        )


def fetch_scenarios(
    vertical: Optional[str] = None,
    tag_filter: Optional[Sequence[str]] = None,
    limit: int = 20,
) -> List[SalesScenario]:
    """
    Lädt Sales-Szenarien aus Supabase.

    Args:
        vertical: Branchen-Key, z.B. "network_marketing", "real_estate", "art".
        tag_filter: Liste von Tags, die enthalten sein sollen.
        limit: Maximale Anzahl Szenarien.

    Returns:
        Liste von SalesScenario-Objekten (kann leer sein).
    """

    try:
        supabase = get_supabase_client()
    except SupabaseNotConfiguredError:
        # In Dev/Test lieber leise leer zurückgeben, statt die App zu crashen
        return []

    query = supabase.table("sales_scenarios").select(
        "id,vertical,title,channel,stage,outcome,tags,transcript,notes"
    )

    if vertical:
        query = query.eq("vertical", vertical)

    if tag_filter:
        # tags ist ein text[]-Array; contains sucht nach allen übergebenen Werten
        query = query.contains("tags", list(tag_filter))

    response = query.limit(max(1, min(limit, 50))).execute()

    if getattr(response, "error", None):
        # Optional: später Logging ergänzen
        return []

    rows = getattr(response, "data", None) or []
    return [SalesScenario.from_row(row) for row in rows]


def render_scenarios_as_knowledge(
    scenarios: Sequence[SalesScenario],
    max_chars: int = 4000,
) -> str:
    """
    Formatiert Szenarien als Knowledge-Block für den Systemprompt.

    Idee:
    - CHIEF bekommt echte Dialogbeispiele & Lernpunkte
    - Wir begrenzen die Länge, damit der Prompt nicht explodiert
    """

    if not scenarios:
        return ""

    lines: List[str] = ["### Reale Vertriebsszenarien aus dem CRM", ""]

    for idx, sc in enumerate(scenarios, start=1):
        block_lines: List[str] = [
            f"Szenario {idx}: {sc.title}",
            f"- Branche/Vertical: {sc.vertical or '-'}",
            f"- Kanal: {sc.channel or '-'}, Phase: {sc.stage or '-'}, Outcome: {sc.outcome or '-'}",
        ]

        if sc.tags:
            block_lines.append(f"- Tags: {', '.join(sc.tags)}")

        if sc.transcript:
            block_lines.append("\nDialog-Beispiel:\n" + sc.transcript.strip())

        if sc.notes:
            block_lines.append("\nNotizen / Lernpunkte:\n" + (sc.notes or "").strip())

        block_text = "\n".join(block_lines).strip()

        projected = "\n\n".join([*lines, block_text]).strip()
        if len(projected) > max_chars:
            break

        lines.append(block_text)
        lines.append("")  # Leerzeile zwischen Szenarien

    return "\n\n".join(lines).strip()


__all__ = ["SalesScenario", "fetch_scenarios", "render_scenarios_as_knowledge"]
