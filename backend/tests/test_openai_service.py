import json
import types

import pytest

from app.models.coaching import CoachingInput
from app.services.openai_service import OpenAIService


class DummyResponse:
    def __init__(self, content: str):
        self.choices = [
            types.SimpleNamespace(
                message=types.SimpleNamespace(content=content),
            )
        ]
        self.usage = types.SimpleNamespace(total_tokens=123)


class DummyCompletions:
    def __init__(self, content: str):
        self._content = content

    async def create(self, *args, **kwargs):
        return DummyResponse(self._content)


class DummyChat:
    def __init__(self, content: str):
        self.completions = DummyCompletions(content)


class DummyClient:
    def __init__(self, content: str):
        self.chat = DummyChat(content)


@pytest.mark.asyncio
async def test_openai_service_generates_output(sample_coaching_payload):
    fake_payload = {
        "timeframe_days": 30,
        "language": "de",
        "team_summary": {
            "headline": "Test Headline",
            "description": "Beschreibung",
            "suggested_team_actions": ["Aktion 1"],
            "key_insights": ["Insight"],
        },
        "reps": [
            {
                "user_id": "rep-1",
                "display_name": "Rep 1",
                "focus_area": "timing_help",
                "diagnosis": "Alles gut.",
                "suggested_actions": ["Foo"],
                "script_ideas": ["Bar"],
                "priority_actions": ["Baz"],
                "timeline": "Diese Woche",
            }
        ],
    }

    service = OpenAIService()
    service.client = DummyClient(json.dumps(fake_payload))

    result = await service.generate_coaching(CoachingInput(**sample_coaching_payload))

    assert result.team_summary.headline == "Test Headline"
    assert result.reps[0].user_id == "rep-1"


