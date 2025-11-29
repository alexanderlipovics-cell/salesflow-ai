"""Service-Layer zum Laden und Formatieren von Vertriebsszenarien."""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Sequence

from pydantic import BaseModel, Field


class SalesScenario(BaseModel):
    """Leichtgewichtige Repräsentation einer sales_scenarios-Zeile."""

    id: Optional[str] = None
    vertical: str
    title: str
    channel: Optional[str] = None
    stage: Optional[str] = None
    outcome: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    transcript: str
    notes: Optional[str] = None


def fetch_scenarios(
    supabase: Any,
    vertical: str,
    tags: Optional[List[str]] = None,
    limit: int = 5,
) -> List[SalesScenario]:
    """Lädt Szenarien per Supabase-Client und mappt sie auf ``SalesScenario``."""

    safe_limit = max(1, min(limit, 25))
    query = (
        supabase.table("sales_scenarios")
        .select("id,vertical,title,channel,stage,outcome,tags,transcript,notes")
        .eq("vertical", vertical)
        .limit(safe_limit)
    )

    normalized_tags = _normalize_tags(tags)
    if normalized_tags:
        # Supabase-Py stellt je nach Version overlaps/contains bereit.
        if hasattr(query, "overlaps"):
            query = query.overlaps("tags", normalized_tags)
        else:
            query = query.contains("tags", normalized_tags)

    try:
        response = query.execute()
    except Exception:  # pragma: no cover - defensive, Supabase SDK
        return []

    rows = getattr(response, "data", None) or []
    return [SalesScenario(**_coerce_row(row)) for row in rows]


def render_scenarios_as_knowledge(scenarios: Sequence[SalesScenario]) -> str:
    """Formatiert Szenarien als Prompt-tauglichen Wissensblock."""

    if not scenarios:
        return ""

    lines: List[str] = ["Reale Vertriebsszenarien (Wissensbasis):", ""]

    for index, scenario in enumerate(scenarios, start=1):
        tags_repr = f"[{', '.join(scenario.tags)}]" if scenario.tags else "[]"
        header_meta = ", ".join(
            [
                f"vertical={scenario.vertical}",
                f"stage={scenario.stage or '-'}",
                f"outcome={scenario.outcome or '-'}",
                f"tags={tags_repr}",
            ]
        )
        title_line = f"{index}) {scenario.title} – {header_meta}"
        lines.append(title_line)
        lines.append("TRANSCRIPT:")
        lines.append(scenario.transcript.strip())
        lines.append("")

        if scenario.notes:
            lines.append("NOTES:")
            lines.append(scenario.notes.strip())
            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines).rstrip()


def _normalize_tags(tags: Optional[Sequence[str]]) -> List[str]:
    if not tags:
        return []
    return [tag.strip() for tag in tags if tag and tag.strip()]


def _coerce_row(row: Mapping[str, Any]) -> Dict[str, Any]:
    raw_tags = row.get("tags") or []
    if isinstance(raw_tags, str):
        tags: List[str] = [raw_tags]
    else:
        tags = list(raw_tags)

    return {
        "id": _to_optional_str(row.get("id")),
        "vertical": row.get("vertical") or "",
        "title": row.get("title") or "",
        "channel": _to_optional_str(row.get("channel")),
        "stage": _to_optional_str(row.get("stage")),
        "outcome": _to_optional_str(row.get("outcome")),
        "tags": [tag for tag in tags if isinstance(tag, str)],
        "transcript": (row.get("transcript") or "").strip(),
        "notes": _to_optional_str(row.get("notes")),
    }


def _to_optional_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


__all__ = ["SalesScenario", "fetch_scenarios", "render_scenarios_as_knowledge"]
