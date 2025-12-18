# alerts/smart_alerts.py

from __future__ import annotations

import os
from typing import Dict, List

import httpx
import structlog

logger = structlog.get_logger()

class SmartAlertManager:
    """
    AI/Heuristik-basiertes Alerting:

    - mappt Severity → Kanal (Slack, E-Mail, PagerDuty, ...)

    """

    def __init__(self) -> None:
        self.slack_webhook_url = os.getenv("SLACK_ALERT_WEBHOOK_URL")
        self.email_endpoint = os.getenv("EMAIL_ALERT_ENDPOINT")

    async def send_alert(self, anomaly: Dict) -> None:
        severity = anomaly.get("severity", "low")
        metric = anomaly.get("metric")
        value = anomaly.get("value")
        context = anomaly.get("context", {})

        msg = (
            f"[{severity.upper()}] Anomaly detected on metric '{metric}' – value={value}, "
            f"context={context}"
        )

        logger.warning("Anomaly alert", anomaly=anomaly)

        channels: List[str] = []
        if severity in ["critical", "high"]:
            channels = ["slack", "email"]
        elif severity == "medium":
            channels = ["slack"]
        else:
            channels = []

        for ch in channels:
            if ch == "slack":
                await self._send_slack(msg)
            elif ch == "email":
                await self._send_email(msg)

    async def _send_slack(self, text: str) -> None:
        if not self.slack_webhook_url:
            logger.info("Slack webhook not configured, skipping", text=text)
            return
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(self.slack_webhook_url, json={"text": text})

    async def _send_email(self, text: str) -> None:
        # Platzhalter – hier kannst du z.B. deinen eigenen Mail-Microservice ansprechen
        if not self.email_endpoint:
            logger.info("Email endpoint not configured, skipping", text=text)
            return
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(self.email_endpoint, json={"message": text})
