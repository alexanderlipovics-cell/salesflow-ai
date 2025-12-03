import asyncio
import json

from openai import AsyncOpenAI, OpenAIError
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings
from app.models.coaching import CoachingInput, CoachingOutput
from app.prompts.coaching_prompt import get_system_prompt
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class OpenAIService:
    """Kapselt alle Interaktionen mit der OpenAI API."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=settings.OPENAI_TIMEOUT,
        )
        self.model = settings.OPENAI_MODEL

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((OpenAIError, asyncio.TimeoutError)),
        reraise=True,
    )
    async def generate_coaching(
        self, coaching_input: CoachingInput
    ) -> CoachingOutput:
        """Erstellt Coaching-Empfehlungen via GPT-4 (JSON-Mode)."""

        system_prompt = get_system_prompt(coaching_input.language)
        user_content = self._build_user_content(coaching_input)

        logger.info(
            "Starte OpenAI-Coaching",
            extra={
                "workspace_id": coaching_input.workspace_id,
                "num_reps": len(coaching_input.reps),
                "language": coaching_input.language,
            },
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("OpenAI lieferte keinen Inhalt zurück")

        try:
            raw_data = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.error(
                "Ungültiges JSON von OpenAI",
                extra={"error": str(exc)},
            )
            raise ValueError(f"Invalid JSON response: {exc}") from exc

        coaching_output = CoachingOutput(**raw_data)

        logger.info(
            "OpenAI-Coaching erfolgreich",
            extra={
                "workspace_id": coaching_input.workspace_id,
                "tokens_used": response.usage.total_tokens if response.usage else 0,
            },
        )

        return coaching_output

    def _build_user_content(self, coaching_input: CoachingInput) -> str:
        """Bereitet die Nutzereingabe kompakt auf."""

        parts: list[str] = [
            f"TIMEFRAME: {coaching_input.timeframe_days} Tage",
            f"WORKSPACE: {coaching_input.workspace_id}",
            "",
            "TEAM SUMMARY:",
            f"- Total Reps: {coaching_input.team_summary.total_reps}",
            f"- Ø Reply Rate: {coaching_input.team_summary.avg_reply_rate_percent:.1f}%",
            f"- Ø Conversion: {coaching_input.team_summary.avg_conversion_rate_percent:.1f}%",
            f"- Ø Overdue Follow-ups: {coaching_input.team_summary.avg_overdue_followups:.1f}",
            "",
            "REPS:",
        ]

        for rep in coaching_input.reps:
            rep_block = [
                f"\n#{rep.display_name or rep.email or rep.user_id}",
                f"User ID: {rep.user_id}",
                f"Focus Area: {rep.focus_area}",
                "",
                "Metrics:",
                f"  - Leads: {rep.metrics.leads_created}",
                f"  - Contacted: {rep.metrics.contacts_contacted}",
                f"  - Signed: {rep.metrics.contacts_signed}",
                f"  - Reply Rate: {rep.metrics.reply_rate_percent:.1f}%",
                f"  - Conversion: {rep.metrics.conversion_rate_percent:.1f}%",
                "",
                "Follow-ups:",
                f"  - Overdue: {rep.followups.overdue_followups}",
                f"  - High Priority: {rep.followups.high_priority_open_followups}",
                f"  - Avg Score: {rep.followups.avg_priority_score:.1f}",
            ]

            examples = rep.recent_examples.get("high_priority_contacts") or []
            if examples:
                rep_block.append("\nTop Priority Contacts:")
                for contact in examples[:3]:
                    rep_block.append(
                        "  - "
                        f"{contact.contact_name or 'Unbekannt'} "
                        f"(Score {contact.priority_score:.0f}, Segment {contact.segment})"
                    )

            parts.extend(rep_block)

        return "\n".join(parts)


