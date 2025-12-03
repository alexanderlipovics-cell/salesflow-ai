"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EMAIL SENDER                                                              ║
║  SMTP Email Versand mit Tracking                                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, Optional
from datetime import datetime
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import uuid
import logging

logger = logging.getLogger(__name__)


class EmailSender:
    """SMTP Email Sender mit Tracking."""
    
    def __init__(self, supabase, tracking_base_url: str = None):
        self.supabase = supabase
        self.tracking_base_url = tracking_base_url or "https://your-domain.com/api/v1/track"
    
    # =========================================================================
    # SEND EMAIL
    # =========================================================================
    
    async def send(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        content: str,
        content_html: str = None,
        action_id: str = None,
        account_id: str = None,
        user_id: str = None,
    ) -> Dict:
        """Sendet eine Email über SMTP."""
        
        # Get email account
        account = await self._get_email_account(account_id, user_id)
        if not account:
            return {"success": False, "error": "No email account configured"}
        
        # Check rate limits
        if not await self._check_rate_limits(account):
            return {"success": False, "error": "Rate limit exceeded"}
        
        # Generate tracking ID
        tracking_id = str(uuid.uuid4()) if action_id else None
        
        # Build email
        msg = self._build_email(
            account=account,
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            content=content,
            content_html=content_html,
            tracking_id=tracking_id,
        )
        
        # Send via SMTP
        try:
            result = await self._send_smtp(account, msg, to_email)
            
            if result["success"]:
                # Update rate limits
                await self._increment_rate_limits(account)
                
                # Update action with tracking ID
                if action_id and tracking_id:
                    self.supabase.table("sequence_actions").update({
                        "tracking_id": tracking_id,
                        "message_id": result.get("message_id"),
                    }).eq("id", action_id).execute()
                
                # Log tracking event
                if action_id:
                    self.supabase.table("email_tracking_events").insert({
                        "action_id": action_id,
                        "event_type": "sent",
                    }).execute()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            await self._log_error(account, str(e))
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # EMAIL BUILDING
    # =========================================================================
    
    def _build_email(
        self,
        account: Dict,
        to_email: str,
        to_name: str,
        subject: str,
        content: str,
        content_html: str = None,
        tracking_id: str = None,
    ) -> MIMEMultipart:
        """Baut die Email-Message."""
        msg = MIMEMultipart("alternative")
        
        # Headers
        from_name = account.get("from_name", "")
        from_email = account["email_address"]
        msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
        msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email
        msg["Subject"] = subject
        msg["Reply-To"] = account.get("reply_to", from_email)
        
        # Custom headers for tracking
        if tracking_id:
            msg["X-SalesFlow-Tracking-ID"] = tracking_id
        
        # Plain text
        msg.attach(MIMEText(content, "plain", "utf-8"))
        
        # HTML (with tracking pixel if enabled)
        if content_html:
            if tracking_id:
                tracking_pixel = f'<img src="{self.tracking_base_url}/open/{tracking_id}" width="1" height="1" style="display:none;" />'
                content_html = content_html + tracking_pixel
            msg.attach(MIMEText(content_html, "html", "utf-8"))
        
        return msg
    
    # =========================================================================
    # SMTP
    # =========================================================================
    
    async def _send_smtp(
        self,
        account: Dict,
        msg: MIMEMultipart,
        to_email: str,
    ) -> Dict:
        """Sendet via SMTP."""
        provider = account.get("provider", "smtp")
        
        if provider == "smtp":
            return await self._send_generic_smtp(account, msg, to_email)
        elif provider == "sendgrid":
            return await self._send_sendgrid(account, msg, to_email)
        elif provider == "mailgun":
            return await self._send_mailgun(account, msg, to_email)
        else:
            return await self._send_generic_smtp(account, msg, to_email)
    
    async def _send_generic_smtp(
        self,
        account: Dict,
        msg: MIMEMultipart,
        to_email: str,
    ) -> Dict:
        """Sendet via generischem SMTP."""
        host = account.get("smtp_host")
        port = account.get("smtp_port", 587)
        username = account.get("smtp_username")
        password = account.get("smtp_password")
        use_ssl = account.get("smtp_secure", True)
        
        if not host or not username or not password:
            return {"success": False, "error": "Missing SMTP configuration"}
        
        try:
            if use_ssl and port == 465:
                # SSL
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(host, port, context=context) as server:
                    server.login(username, password)
                    server.send_message(msg)
            else:
                # STARTTLS
                with smtplib.SMTP(host, port) as server:
                    server.ehlo()
                    if use_ssl:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                        server.ehlo()
                    server.login(username, password)
                    server.send_message(msg)
            
            return {
                "success": True,
                "message_id": msg.get("Message-ID"),
            }
            
        except smtplib.SMTPAuthenticationError:
            return {"success": False, "error": "SMTP authentication failed"}
        except smtplib.SMTPException as e:
            return {"success": False, "error": f"SMTP error: {str(e)}"}
    
    async def _send_sendgrid(self, account: Dict, msg: MIMEMultipart, to_email: str) -> Dict:
        """Sendet via SendGrid API."""
        # TODO: Implement SendGrid API
        logger.warning("SendGrid not implemented, falling back to SMTP")
        return await self._send_generic_smtp(account, msg, to_email)
    
    async def _send_mailgun(self, account: Dict, msg: MIMEMultipart, to_email: str) -> Dict:
        """Sendet via Mailgun API."""
        # TODO: Implement Mailgun API
        logger.warning("Mailgun not implemented, falling back to SMTP")
        return await self._send_generic_smtp(account, msg, to_email)
    
    # =========================================================================
    # RATE LIMITING
    # =========================================================================
    
    async def _check_rate_limits(self, account: Dict) -> bool:
        """Prüft ob Rate Limits eingehalten werden."""
        daily_limit = account.get("daily_limit", 500)
        hourly_limit = account.get("hourly_limit", 50)
        sent_today = account.get("sent_today", 0)
        sent_this_hour = account.get("sent_this_hour", 0)
        
        # Check if limits need reset
        now = datetime.utcnow()
        last_reset_daily = account.get("last_reset_daily")
        last_reset_hourly = account.get("last_reset_hourly")
        
        if last_reset_daily:
            last_reset_daily = datetime.fromisoformat(last_reset_daily.replace("Z", "+00:00")).replace(tzinfo=None)
            if (now - last_reset_daily).days >= 1:
                sent_today = 0
                self.supabase.table("email_accounts").update({
                    "sent_today": 0,
                    "last_reset_daily": now.isoformat(),
                }).eq("id", account["id"]).execute()
        
        if last_reset_hourly:
            last_reset_hourly = datetime.fromisoformat(last_reset_hourly.replace("Z", "+00:00")).replace(tzinfo=None)
            if (now - last_reset_hourly).total_seconds() >= 3600:
                sent_this_hour = 0
                self.supabase.table("email_accounts").update({
                    "sent_this_hour": 0,
                    "last_reset_hourly": now.isoformat(),
                }).eq("id", account["id"]).execute()
        
        return sent_today < daily_limit and sent_this_hour < hourly_limit
    
    async def _increment_rate_limits(self, account: Dict) -> None:
        """Erhöht die Rate Limit Counter."""
        self.supabase.table("email_accounts").update({
            "sent_today": (account.get("sent_today", 0) + 1),
            "sent_this_hour": (account.get("sent_this_hour", 0) + 1),
            "last_sent_at": datetime.utcnow().isoformat(),
            "consecutive_errors": 0,
        }).eq("id", account["id"]).execute()
    
    async def _log_error(self, account: Dict, error: str) -> None:
        """Loggt einen Fehler."""
        consecutive = account.get("consecutive_errors", 0) + 1
        
        update = {
            "last_error": error,
            "consecutive_errors": consecutive,
        }
        
        # Disable account after too many errors
        if consecutive >= 5:
            update["is_active"] = False
            logger.warning(f"Email account {account['id']} disabled after {consecutive} errors")
        
        self.supabase.table("email_accounts").update(update).eq("id", account["id"]).execute()
    
    # =========================================================================
    # ACCOUNT MANAGEMENT
    # =========================================================================
    
    async def _get_email_account(
        self,
        account_id: str = None,
        user_id: str = None,
    ) -> Optional[Dict]:
        """Holt einen aktiven Email-Account."""
        if account_id:
            result = self.supabase.table("email_accounts").select("*").eq(
                "id", account_id
            ).eq("is_active", True).single().execute()
            return result.data
        
        if user_id:
            result = self.supabase.table("email_accounts").select("*").eq(
                "user_id", user_id
            ).eq("is_active", True).order("created_at").limit(1).execute()
            return result.data[0] if result.data else None
        
        return None
    
    async def verify_account(self, account_id: str, user_id: str) -> Dict:
        """Verifiziert einen Email-Account durch Test-Email."""
        account = self.supabase.table("email_accounts").select("*").eq(
            "id", account_id
        ).eq("user_id", user_id).single().execute()
        
        if not account.data:
            return {"success": False, "error": "Account not found"}
        
        # Send test email to self
        result = await self.send(
            to_email=account.data["email_address"],
            to_name="Test",
            subject="AURA OS - Email Verification",
            content="This is a test email to verify your email account setup.\n\nIf you received this, your account is configured correctly!",
            account_id=account_id,
        )
        
        if result["success"]:
            self.supabase.table("email_accounts").update({
                "is_verified": True,
                "verified_at": datetime.utcnow().isoformat(),
            }).eq("id", account_id).execute()
        
        return result

