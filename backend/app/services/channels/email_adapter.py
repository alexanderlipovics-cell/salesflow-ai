"""
Email SMTP Adapter

Implements ChannelAdapter for email messaging via SMTP.
"""

from __future__ import annotations

import logging
import re
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict

from .base import ChannelAdapter, ChannelPayload, NormalizedMessage, SendResult

logger = logging.getLogger(__name__)


class EmailAdapter:
    """
    SMTP Email Adapter.
    
    Supports:
    - HTML emails
    - Plain text fallback
    - Custom subject lines
    - SMTP authentication
    """
    
    def __init__(self, smtp_config: Dict[str, Any]):
        """
        Initialize Email adapter.
        
        Args:
            smtp_config: Dict with smtp_host, smtp_port, smtp_user, smtp_password, from_email
        """
        self.smtp_host = smtp_config.get("host", "smtp.gmail.com")
        self.smtp_port = smtp_config.get("port", 587)
        self.smtp_user = smtp_config.get("user")
        self.smtp_password = smtp_config.get("password")
        self.from_email = smtp_config.get("from_email", self.smtp_user)
    
    def prepare_outgoing(self, message: NormalizedMessage) -> ChannelPayload:
        """
        Prepare message for email.
        
        Email specifics:
        - HTML formatting allowed
        - Subject line required
        - Plain text fallback recommended
        """
        text = message["text"]
        
        # Convert newlines to HTML breaks
        html_text = text.replace("\n", "<br>")
        
        # Get email from metadata
        email = message["metadata"].get("email")
        
        if not email:
            raise ValueError("Email requires email in metadata")
        
        if not self.validate_recipient(email):
            raise ValueError(f"Invalid email address: {email}")
        
        # Generate subject from context or use default
        subject = message["metadata"].get("subject")
        if not subject:
            # Auto-generate based on action
            action = message.get("detected_action", "")
            if "objection" in action:
                subject = "Re: Deine Frage"
            elif "follow" in action:
                subject = "Kurzes Update"
            else:
                subject = "Nachricht von SalesFlow AI"
        
        return ChannelPayload(
            to=email,
            message=html_text,
            metadata={
                "subject": subject,
                "from": self.from_email,
                "html": html_text,
                "text": text  # Plain text fallback
            },
            channel="email"
        )
    
    async def send(self, payload: ChannelPayload) -> SendResult:
        """
        Send email via SMTP.
        
        Returns:
            SendResult with success status
        """
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = payload.metadata["subject"]
            msg["From"] = payload.metadata["from"]
            msg["To"] = payload.to
            
            # Attach plain text
            part_text = MIMEText(payload.metadata["text"], "plain", "utf-8")
            msg.attach(part_text)
            
            # Attach HTML
            part_html = MIMEText(payload.metadata["html"], "html", "utf-8")
            msg.attach(part_html)
            
            # Send via SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent to: {payload.to}")
            
            return SendResult(
                success=True,
                message_id=None,  # SMTP doesn't return message ID
                error=None,
                sent_at=datetime.utcnow()
            )
        
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {str(e)}"
            logger.error(error_msg)
            return SendResult(
                success=False,
                message_id=None,
                error=error_msg,
                sent_at=None
            )
        
        except Exception as e:
            error_msg = f"Email send error: {str(e)}"
            logger.exception(error_msg)
            return SendResult(
                success=False,
                message_id=None,
                error=error_msg,
                sent_at=None
            )
    
    def validate_recipient(self, recipient: str) -> bool:
        """
        Validate email address (RFC-5322 simplified).
        
        Args:
            recipient: Email address
            
        Returns:
            True if valid email format
        """
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, recipient))
    
    def supports_feature(self, feature: str) -> bool:
        """
        Email feature support.
        
        Supported:
        - rich_text (HTML)
        - attachments
        - html
        - tracking (with tracking pixels)
        """
        supported = ["rich_text", "attachments", "html", "tracking", "formatting"]
        return feature in supported


__all__ = ["EmailAdapter"]

