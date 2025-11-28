"""
FastAPI-Einstiegspunkt für Sales Flow AI.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .ai_client import AIClient
from .config import get_settings
from .prompts import build_system_prompt
from .schemas import ActionRequest, ActionResponse

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="Sales Flow AI – KI-gestütztes Vertriebs-CRM.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    """Einfacher Health-Check."""

    return {"status": "ok"}


@app.post("/ai", response_model=ActionResponse)
async def handle_ai(request: ActionRequest) -> ActionResponse:
    """
    Zentraler Endpoint, der Actions wie chat, generate_message etc. verarbeitet.
    """

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500, detail="OPENAI_API_KEY ist nicht gesetzt."
        )

    client = AIClient(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
    )

    try:
        system_prompt = build_system_prompt(request.action, request.data)
        reply = client.generate(system_prompt, request.data.messages)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=502,
            detail=f"KI-Provider-Fehler: {exc}",
        ) from exc

    return ActionResponse(action=request.action, reply=reply)


__all__ = ["app"]
