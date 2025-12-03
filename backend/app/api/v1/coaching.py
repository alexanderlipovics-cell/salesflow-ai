"""CHIEF Coaching endpoints."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request
from openai import OpenAIError

from app.config import get_settings
from app.models.coaching import CoachingInput, CoachingOutput
from app.services.cache_service import cache_service
from app.services.openai_service import OpenAIService
from app.utils.logger import get_logger
from app.utils.rate_limit import rate_limit

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter()


DEMO_COACHING_OUTPUT = {
    "timeframe_days": 30,
    "language": "de",
    "generated_at": "2024-12-01T12:00:00",
    "team_summary": {
        "headline": "Team zeigt starke Aktivität, aber Follow-up-Disziplin verbesserungsbedürftig",
        "description": (
            "Das Team hat eine durchschnittliche Reply-Rate von 18%, was im Zielbereich liegt. "
            "Allerdings zeigen sich bei mehreren Reps Schwächen in der Follow-up-Disziplin mit durchschnittlich "
            "3.5 überfälligen Tasks. Die Conversion-Rate von 8% ist solide, deutet aber auf Optimierungspotenzial "
            "beim Closing hin."
        ),
        "suggested_team_actions": [
            "Wöchentliches Follow-up-Review mit dem gesamten Team einführen",
            "Best-Practice-Sharing: Top-Performer präsentieren erfolgreiche Scripts",
            "Tägliche 10-Minuten-Standup für Task-Priorisierung",
        ],
        "key_insights": [
            "Timing-Probleme sind der häufigste Engpass (40% der Reps)",
            "Script-Optimierung könnte Reply-Rate um 5-10% steigern",
        ],
    },
    "reps": [
        {
            "user_id": "demo-rep-1",
            "display_name": "Demo Rep 1",
            "focus_area": "timing_help",
            "diagnosis": (
                "Mit 8 überfälligen Follow-ups und 12 High-Priority-Tasks zeigt sich ein klares Zeitmanagement-Problem. "
                "Die Reply-Rate von 22% ist gut, wird aber durch mangelnde Follow-up-Disziplin nicht in Conversions "
                "umgewandelt (nur 6%). Das Hauptproblem ist nicht die Ansprache, sondern das konsequente Nachfassen."
            ),
            "suggested_actions": [
                "Implementiere tägliche 60-Minuten-Follow-up-Blöcke (9-10 Uhr)",
                "Nutze Priority Score >90 als Filter für tägliche Must-Do-Liste",
                "Setze Reminder 24h vor Task-Fälligkeit",
            ],
            "script_ideas": [
                "Opener bei überfälligen Tasks: 'Hi [Name], ich merke gerade, dass ich mich bei dir noch nicht zurückgemeldet habe – lass uns das nachholen!'",
                "Zeitmanagement-Trick: Plane Follow-ups direkt nach Erstkontakt im Kalender ein",
            ],
            "priority_actions": ["Diese Woche: Follow-up-Blöcke etablieren"],
            "timeline": "7 Tage",
        },
        {
            "user_id": "demo-rep-2",
            "display_name": "Demo Rep 2",
            "focus_area": "script_help",
            "diagnosis": (
                "Bei 45 Erstkontakten liegt die Reply-Rate nur bei 11%, deutlich unter Team-Durchschnitt (18%). "
                "Die Conversion von 4% zeigt, dass selbst bei Antworten der Pitch nicht überzeugt. "
                "Hier ist Script-Optimierung der Hebel mit dem größten Impact."
            ),
            "suggested_actions": [
                "A/B-teste 2 verschiedene Opener: Problem-fokussiert vs. Benefit-fokussiert",
                "Analysiere die 5 Kontakte mit Reply: Was war anders?",
                "Führe 3 Rollenspiele mit Top-Performern durch",
            ],
            "script_ideas": [
                "Opener V1: 'Hi [Name]! Ich helfe [Zielgruppe] dabei, [spezifisches Problem] zu lösen. Interessiert dich das?'",
                "Opener V2: 'Hi [Name]! Stell dir vor, du könntest [konkreter Benefit] – genau das machen wir möglich. Kurz quatschen?'",
                "Follow-up nach keiner Antwort: 'Hey [Name], vielleicht war mein Timing schlecht – ist [Problem] bei dir aktuell ein Thema?'",
            ],
            "priority_actions": ["Sofort: 3 Rollenspiele mit Top-Performer"],
            "timeline": "Diese Woche",
        },
    ],
}


async def get_openai_service() -> OpenAIService:
    """Dependency to create a new OpenAIService instance per request."""

    return OpenAIService()


@router.post("/squad", response_model=CoachingOutput)
@rate_limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
@rate_limit(f"{settings.RATE_LIMIT_PER_HOUR}/hour")
async def generate_squad_coaching(
    request: Request,
    coaching_input: CoachingInput,
    dry_run: bool = False,
    openai_service: OpenAIService = Depends(get_openai_service),
) -> CoachingOutput:
    """Generate AI coaching for a squad based on recent performance metrics."""

    request.state.workspace_id = coaching_input.workspace_id
    logger.info(
        "Coaching request empfangen",
        extra={
            "workspace_id": coaching_input.workspace_id,
            "num_reps": len(coaching_input.reps),
            "language": coaching_input.language,
            "dry_run": dry_run,
        },
    )

    if dry_run:
        logger.info("Dry-run aktiviert, gebe Demo-Daten zurück")
        demo_output = CoachingOutput(**DEMO_COACHING_OUTPUT)
        demo_output.timeframe_days = coaching_input.timeframe_days
        demo_output.language = coaching_input.language
        return demo_output

    cache_key = cache_service.generate_key(
        "coaching", coaching_input.model_dump(mode="json")
    )
    cached_result = await cache_service.get(cache_key)
    if cached_result:
        logger.info("Cache-Hit für Coaching-Ergebnis", extra={"cache_key": cache_key})
        return CoachingOutput(**cached_result)

    try:
        coaching_output = await openai_service.generate_coaching(coaching_input)
        await cache_service.set(
            cache_key, coaching_output.model_dump(mode="json"), ttl=settings.CACHE_TTL
        )
        return coaching_output

    except asyncio.TimeoutError:
        logger.error(
            "OpenAI Anfrage Timeout",
            extra={"workspace_id": coaching_input.workspace_id},
        )
        raise HTTPException(
            status_code=504,
            detail="OpenAI request timeout. Please try again.",
        ) from None

    except OpenAIError as exc:
        logger.error(
            "OpenAI API Fehler",
            extra={"workspace_id": coaching_input.workspace_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API error: {exc}",
        ) from exc

    except ValueError as exc:
        logger.error(
            "Antwortvalidierung fehlgeschlagen",
            extra={"workspace_id": coaching_input.workspace_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=500,
            detail=f"Response validation failed: {exc}",
        ) from exc

    except Exception as exc:
        logger.error(
            "Unerwarteter Fehler im Coaching Endpoint",
            extra={"workspace_id": coaching_input.workspace_id, "error": str(exc)},
        )
        raise HTTPException(status_code=500, detail="Internal server error") from exc



