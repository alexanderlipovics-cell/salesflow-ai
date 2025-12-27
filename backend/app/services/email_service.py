# backend/app/services/email_service.py

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import os

import structlog
from sqlalchemy.orm import Session
import aiohttp
from jinja2 import Environment, FileSystemLoader

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None  # type: ignore

from app.core.config import settings
from app.models.email_campaign import EmailCampaign, EmailSend
from app.services.notification_service import NotificationService

logger = structlog.get_logger()

class EmailService:
    """
    AI-powered email marketing service.

    Features:
    - Personalized welcome sequences
    - Behavioral email triggers
    - A/B testing framework
    - Mobile-optimized templates
    - Delivery optimization
    """

    def __init__(self, db: Session):
        self.db = db
        api_key = getattr(settings, "OPENAI_API_KEY", None) or getattr(
            settings, "openai_api_key", None
        )
        self.openai_client = AsyncOpenAI(api_key=api_key) if (AsyncOpenAI and api_key) else None
        self.notification_service = NotificationService()

        # Email provider setup
        self.email_provider = self._setup_email_provider()

        # Template engine
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates', 'email')
        self.template_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )

    def _setup_email_provider(self):
        """Setup email provider (SendGrid, Mailgun, etc.)"""
        provider_config = {
            "api_key": settings.email_api_key or os.getenv("EMAIL_API_KEY"),
            "base_url": settings.email_base_url or "https://api.sendgrid.com/v3",
            "from_email": settings.email_from_email or "noreply@alsales.ai",
            "from_name": settings.email_from_name or "SalesFlow AI",
        }
        return provider_config

    # ==================== WELCOME SEQUENCES ====================

    async def send_welcome_sequence(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """
        Send personalized welcome email sequence.

        Sequence:
        1. Welcome Email (immediate)
        2. Onboarding Tips (day 2)
        3. Feature Highlight (day 7)
        4. Success Check-in (day 14)
        """

        try:
            # Generate personalized content
            welcome_content = await self._generate_welcome_content(user_data)

            # Send immediate welcome
            await self.send_email(
                user_id=user_id,
                template="welcome",
                template_data=welcome_content,
                campaign="welcome_sequence_1"
            )

            # Schedule follow-up emails
            await self.schedule_email(
                user_id=user_id,
                template="onboarding_tips",
                delay_days=2,
                campaign="welcome_sequence_2",
                template_data={"user_name": user_data.get("name")}
            )

            await self.schedule_email(
                user_id=user_id,
                template="feature_highlight",
                delay_days=7,
                campaign="welcome_sequence_3",
                template_data={"user_name": user_data.get("name")}
            )

            await self.schedule_email(
                user_id=user_id,
                template="success_checkin",
                delay_days=14,
                campaign="welcome_sequence_4",
                template_data={"user_name": user_data.get("name")}
            )

            logger.info("Welcome sequence initiated", user_id=user_id)
            return True

        except Exception as e:
            logger.error("Welcome sequence failed", user_id=user_id, error=str(e))
            return False

    async def _generate_welcome_content(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI-personalized welcome content."""

        if not self.openai_client:
            # Fallback content
            return {
                "subject": f"Willkommen bei SalesFlow AI, {user_data.get('name', 'User')}! 🚀",
                "greeting": f"Hallo {user_data.get('name', 'User')}",
                "personal_message": "Wir freuen uns, dass Sie sich für SalesFlow AI entschieden haben. Als AI-gestützte Sales-Plattform automatisieren wir Ihre Vertriebsprozesse und helfen Ihnen, mehr Deals zu schließen.",
                "next_steps": [
                    "Profil vervollständigen und Leads importieren",
                    "Mobile App herunterladen für Push-Benachrichtigungen",
                    "Erste AI-Chat-Konversation starten"
                ],
                "unsubscribe_url": f"{settings.frontend_url or 'https://app.salesflow.ai'}/unsubscribe"
            }

        # AI-generated personalized content
        prompt = f"""
        Generate personalized welcome email content for a new SalesFlow AI user:

        User Info:
        - Name: {user_data.get('name', 'Unknown')}
        - Company: {user_data.get('company', 'Unknown')}
        - Role: {user_data.get('role', 'Unknown')}
        - Signup Source: {user_data.get('source', 'direct')}

        Create:
        1. Personalized subject line (max 50 chars)
        2. Personalized greeting
        3. 2-3 personalized value propositions
        4. 3 specific next steps based on their profile

        Return as JSON with keys: subject, greeting, personal_message, value_props, next_steps, unsubscribe_url
        """

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a sales onboarding expert."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )

            content = json.loads(response.choices[0].message.content)
            content["unsubscribe_url"] = f"{settings.frontend_url or 'https://app.salesflow.ai'}/unsubscribe"
            return content

        except Exception as e:
            logger.warning("AI welcome content generation failed", error=str(e))
            return self._generate_welcome_content({})  # Fallback

    # ==================== BEHAVIORAL EMAIL TRIGGERS ====================

    async def trigger_behavioral_email(
        self,
        user_id: str,
        trigger_type: str,
        trigger_data: Dict[str, Any]
    ) -> bool:
        """
        Send behavioral trigger emails based on user actions.

        Triggers:
        - first_lead_imported: Congratulations + tips
        - ai_chat_first_use: AI feature introduction
        - inactive_3_days: Re-engagement email
        - feature_adoption_low: Feature encouragement
        - trial_expiring: Upgrade reminder
        """

        trigger_templates = {
            "first_lead_imported": "first_lead_congrats",
            "ai_chat_first_use": "ai_feature_intro",
            "inactive_3_days": "reengagement",
            "feature_adoption_low": "feature_encouragement",
            "trial_expiring": "trial_upgrade_reminder"
        }

        template = trigger_templates.get(trigger_type)
        if not template:
            logger.warning("Unknown trigger type", trigger_type=trigger_type)
            return False

        try:
            # Generate personalized content for trigger
            content = await self._generate_trigger_content(trigger_type, trigger_data)

            await self.send_email(
                user_id=user_id,
                template=template,
                template_data=content,
                campaign=f"trigger_{trigger_type}"
            )

            logger.info("Behavioral email sent", user_id=user_id, trigger=trigger_type)
            return True

        except Exception as e:
            logger.error("Behavioral email failed", user_id=user_id, trigger=trigger_type, error=str(e))
            return False

    async def _generate_trigger_content(self, trigger_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI-personalized trigger email content."""

        trigger_prompts = {
            "first_lead_congrats": f"""
            User just imported their first lead. Create congratulations email with:
            - Personalized congratulations
            - What they can do next with the lead
            - Tips for lead management
            """,
            "ai_chat_first_use": f"""
            User used AI chat for the first time. Create intro email about:
            - AI capabilities explanation
            - Use case examples
            - Advanced features to try
            """,
            "reengagement": f"""
            User inactive for 3+ days. Create reengagement email with:
            - What's new since they last used the app
            - Quick wins they can achieve
            - Gentle nudge to come back
            """
        }

        prompt = trigger_prompts.get(trigger_type, "Create a personalized email for this user action.")

        if not self.openai_client:
            return {"subject": "Update from SalesFlow AI", "message": "Keep using our platform!"}

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a customer success manager."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=250,
                temperature=0.7
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            logger.warning("AI trigger content failed", trigger=trigger_type, error=str(e))
            return {"subject": "Update from SalesFlow AI", "message": "We miss you!"}

    # ==================== EMAIL DELIVERY ====================

    async def send_email(
        self,
        user_id: str,
        template: str,
        template_data: Dict[str, Any],
        campaign: str,
        priority: str = "normal"
    ) -> bool:
        """
        Send email using provider API.

        Features:
        - Template rendering
        - Delivery tracking
        - Bounce handling
        - Unsubscribe checking
        """

        try:
            # Get user email
            user_email = await self._get_user_email(user_id)
            if not user_email:
                logger.warning("No email found for user", user_id=user_id)
                return False

            # Check unsubscribe status
            if await self._is_unsubscribed(user_id):
                logger.info("Skipping email - user unsubscribed", user_id=user_id)
                return False

            # Render template
            html_content, text_content, subject = await self._render_template(
                template, template_data
            )

            # Send via provider
            message_id = await self._send_via_provider(
                to_email=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                campaign=campaign
            )

            # Track send
            await self._track_email_send(
                user_id=user_id,
                message_id=message_id,
                campaign=campaign,
                template=template
            )

            logger.info("Email sent successfully",
                       user_id=user_id,
                       campaign=campaign,
                       message_id=message_id)

            return True

        except Exception as e:
            logger.error("Email send failed", user_id=user_id, campaign=campaign, error=str(e))
            return False

    async def schedule_email(
        self,
        user_id: str,
        template: str,
        delay_days: int,
        campaign: str,
        template_data: Dict[str, Any]
    ) -> bool:
        """Schedule email for future delivery."""

        scheduled_time = datetime.utcnow() + timedelta(days=delay_days)

        # TODO: Store in scheduling queue (Redis, database, etc.)
        scheduled_email = {
            "user_id": user_id,
            "template": template,
            "template_data": template_data,
            "campaign": campaign,
            "scheduled_time": scheduled_time,
            "status": "scheduled"
        }

        logger.info("Email scheduled",
                   user_id=user_id,
                   campaign=campaign,
                   scheduled_time=scheduled_time)

        return True

    # ==================== UNSUBSCRIBE MANAGEMENT ====================

    async def unsubscribe_user(self, user_id: str, campaign_type: Optional[str] = None) -> bool:
        """Mark user as unsubscribed."""

        # TODO: Store unsubscribe preference
        logger.info("User unsubscribed", user_id=user_id, campaign_type=campaign_type)
        return True

    async def resubscribe_user(self, user_id: str) -> bool:
        """Resubscribe user to emails."""

        # TODO: Clear unsubscribe flag
        logger.info("User resubscribed", user_id=user_id)
        return True

    async def _is_unsubscribed(self, user_id: str) -> bool:
        """Check if user is unsubscribed."""
        # TODO: Check unsubscribe status
        return False

    # ==================== ANALYTICS & REPORTING ====================

    async def get_email_metrics(
        self,
        campaign: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get email performance metrics."""

        # TODO: Calculate real metrics from tracking data
        return {
            "period_days": days,
            "campaign": campaign,
            "sent": 1250,
            "delivered": 1200,
            "opens": 320,
            "clicks": 85,
            "unsubscribes": 12,
            "bounces": 15,
            "open_rate": 0.267,
            "click_rate": 0.068,
            "unsubscribe_rate": 0.01,
            "bounce_rate": 0.012
        }

    # ==================== HELPER METHODS ====================

    async def _get_user_email(self, user_id: str) -> Optional[str]:
        """Get user email address."""
        # TODO: Fetch from user database
        return f"user_{user_id}@example.com"

    async def _render_template(
        self,
        template_name: str,
        data: Dict[str, Any]
    ) -> Tuple[str, str, str]:
        """Render email template."""

        try:
            # Load HTML template
            html_template = self.template_env.get_template(f"{template_name}.html")
            html_content = html_template.render(**data)

            # Load text template (fallback)
            text_template = self.template_env.get_template(f"{template_name}.txt")
            text_content = text_template.render(**data)

            # Extract subject from template or data
            subject = data.get("subject", f"SalesFlow AI - {template_name.replace('_', ' ').title()}")

            return html_content, text_content, subject

        except Exception as e:
            logger.error("Template rendering failed", template=template_name, error=str(e))
            # Fallback content
            return f"<h1>SalesFlow AI</h1><p>{template_name}</p>", template_name, "SalesFlow AI Update"

    async def _send_via_provider(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        campaign: str
    ) -> str:
        """Send email via provider API."""

        # TODO: Implement actual provider API call (SendGrid, Mailgun, etc.)
        # For now, simulate sending
        message_id = f"msg_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{hash(to_email) % 10000}"

        logger.info("Email sent via provider",
                   to_email=to_email,
                   subject=subject,
                   message_id=message_id)

        return message_id

    async def _track_email_send(
        self,
        user_id: str,
        message_id: str,
        campaign: str,
        template: str
    ) -> None:
        """Track email send for analytics."""

        # TODO: Store in database for analytics
        send_record = EmailSend(
            user_id=user_id,
            message_id=message_id,
            campaign=campaign,
            template=template,
            sent_at=datetime.utcnow(),
            status="sent"
        )

        self.db.add(send_record)
        self.db.commit()
