import os

import pytest

# Ensure required settings exist for tests before app modules are imported.
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("CACHE_ENABLED", "false")


@pytest.fixture
def sample_coaching_payload():
    return {
        "workspace_id": "ws-123",
        "timeframe_days": 30,
        "language": "de",
        "team_summary": {
            "total_reps": 2,
            "avg_reply_rate_percent": 18.0,
            "avg_conversion_rate_percent": 8.0,
            "avg_overdue_followups": 3.5,
        },
        "reps": [
            {
                "user_id": "rep-1",
                "email": "rep1@example.com",
                "display_name": "Rep 1",
                "focus_area": "timing_help",
                "metrics": {
                    "leads_created": 50,
                    "contacts_contacted": 40,
                    "contacts_signed": 10,
                    "first_messages": 40,
                    "reply_events": 20,
                    "reply_rate_percent": 50.0,
                    "conversion_rate_percent": 25.0,
                },
                "followups": {
                    "overdue_followups": 5,
                    "high_priority_open_followups": 3,
                    "avg_priority_score": 85.5,
                },
                "recent_examples": {
                    "high_priority_contacts": [
                        {
                            "contact_name": "Alex",
                            "segment": "today",
                            "priority_score": 92,
                            "status": "open",
                            "due_at": "2024-12-01T10:00:00Z",
                            "last_contact_at": "2024-11-28T10:00:00Z",
                        }
                    ]
                },
            }
        ],
    }


