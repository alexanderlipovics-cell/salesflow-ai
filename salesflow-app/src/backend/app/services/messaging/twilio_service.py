"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TWILIO SERVICE                                                            ║
║  SMS & WhatsApp Integration via Twilio                                    ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class MessageChannel(str, Enum):
    SMS = "sms"
    WHATSAPP = "whatsapp"


class MessageStatus(str, Enum):
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    UNDELIVERED = "undelivered"


class TwilioService:
    """Service für Twilio SMS & WhatsApp."""
    
    def __init__(self, supabase):
        self.supabase = supabase
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        self.whatsapp_number = os.getenv("TWILIO_WHATSAPP_NUMBER")
        self.client = None
        
        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("Twilio client initialized")
            except ImportError:
                logger.warning("Twilio SDK not installed. Run: pip install twilio")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
    
    @property
    def is_configured(self) -> bool:
        """Prüft ob Twilio konfiguriert ist."""
        return self.client is not None
    
    async def send_sms(
        self,
        to_number: str,
        body: str,
        user_id: str,
        lead_id: Optional[str] = None,
        sequence_action_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sendet eine SMS via Twilio.
        
        Args:
            to_number: Empfänger-Telefonnummer (E.164 Format, z.B. +491234567890)
            body: Nachrichtentext
            user_id: User ID
            lead_id: Optional Lead ID
            sequence_action_id: Optional Sequence Action ID
            
        Returns:
            Dict mit message_sid, status, etc.
        """
        if not self.is_configured:
            return {"success": False, "error": "Twilio not configured"}
        
        if not self.phone_number:
            return {"success": False, "error": "TWILIO_PHONE_NUMBER not set"}
        
        try:
            # Nummer normalisieren
            to_number = self._normalize_phone_number(to_number)
            
            # Nachricht senden
            message = self.client.messages.create(
                body=body,
                from_=self.phone_number,
                to=to_number,
            )
            
            # In DB loggen
            log_data = {
                "user_id": user_id,
                "lead_id": lead_id,
                "sequence_action_id": sequence_action_id,
                "channel": MessageChannel.SMS.value,
                "from_number": self.phone_number,
                "to_number": to_number,
                "body": body,
                "message_sid": message.sid,
                "status": message.status,
                "created_at": datetime.utcnow().isoformat(),
            }
            
            self.supabase.table("message_logs").insert(log_data).execute()
            
            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
            }
            
        except Exception as e:
            logger.error(f"SMS send error: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_whatsapp(
        self,
        to_number: str,
        body: str,
        user_id: str,
        lead_id: Optional[str] = None,
        sequence_action_id: Optional[str] = None,
        media_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sendet eine WhatsApp-Nachricht via Twilio.
        
        Args:
            to_number: Empfänger-Telefonnummer (E.164 Format)
            body: Nachrichtentext
            user_id: User ID
            lead_id: Optional Lead ID
            sequence_action_id: Optional Sequence Action ID
            media_url: Optional Media URL (Bild, PDF)
            
        Returns:
            Dict mit message_sid, status, etc.
        """
        if not self.is_configured:
            return {"success": False, "error": "Twilio not configured"}
        
        whatsapp_from = self.whatsapp_number or f"whatsapp:{self.phone_number}"
        if not whatsapp_from.startswith("whatsapp:"):
            whatsapp_from = f"whatsapp:{whatsapp_from}"
        
        try:
            # Nummer normalisieren
            to_number = self._normalize_phone_number(to_number)
            to_whatsapp = f"whatsapp:{to_number}"
            
            # Nachricht erstellen
            message_params = {
                "body": body,
                "from_": whatsapp_from,
                "to": to_whatsapp,
            }
            
            if media_url:
                message_params["media_url"] = [media_url]
            
            message = self.client.messages.create(**message_params)
            
            # In DB loggen
            log_data = {
                "user_id": user_id,
                "lead_id": lead_id,
                "sequence_action_id": sequence_action_id,
                "channel": MessageChannel.WHATSAPP.value,
                "from_number": whatsapp_from,
                "to_number": to_whatsapp,
                "body": body,
                "message_sid": message.sid,
                "status": message.status,
                "media_url": media_url,
                "created_at": datetime.utcnow().isoformat(),
            }
            
            self.supabase.table("message_logs").insert(log_data).execute()
            
            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
            }
            
        except Exception as e:
            logger.error(f"WhatsApp send error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_message_status(self, message_sid: str) -> Dict[str, Any]:
        """Holt den aktuellen Status einer Nachricht."""
        if not self.is_configured:
            return {"success": False, "error": "Twilio not configured"}
        
        try:
            message = self.client.messages(message_sid).fetch()
            return {
                "success": True,
                "status": message.status,
                "error_code": message.error_code,
                "error_message": message.error_message,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def handle_webhook(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verarbeitet Twilio Status Webhooks.
        
        Twilio sendet Updates zu:
        - Message Status (queued → sent → delivered → read)
        - Incoming Messages (Antworten)
        """
        message_sid = data.get("MessageSid")
        message_status = data.get("MessageStatus") or data.get("SmsStatus")
        from_number = data.get("From")
        to_number = data.get("To")
        body = data.get("Body")
        
        # Status Update
        if message_sid and message_status:
            # Update in DB
            self.supabase.table("message_logs").update({
                "status": message_status,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("message_sid", message_sid).execute()
            
            return {"success": True, "type": "status_update", "status": message_status}
        
        # Incoming Message (Reply)
        if from_number and body:
            # Suche Lead anhand Telefonnummer
            lead = self.supabase.table("leads").select("*").eq(
                "phone", self._normalize_phone_number(from_number.replace("whatsapp:", ""))
            ).single().execute()
            
            if lead.data:
                # Log incoming message
                self.supabase.table("message_logs").insert({
                    "user_id": lead.data.get("user_id"),
                    "lead_id": lead.data["id"],
                    "channel": MessageChannel.WHATSAPP.value if "whatsapp" in from_number.lower() else MessageChannel.SMS.value,
                    "from_number": from_number,
                    "to_number": to_number,
                    "body": body,
                    "direction": "inbound",
                    "status": "received",
                    "created_at": datetime.utcnow().isoformat(),
                }).execute()
                
                # Mark lead as replied in sequence if enrolled
                enrollment = self.supabase.table("sequence_enrollments").select("*").eq(
                    "lead_id", lead.data["id"]
                ).eq("status", "active").single().execute()
                
                if enrollment.data:
                    # Stop sequence on reply
                    self.supabase.table("sequence_enrollments").update({
                        "status": "replied",
                        "replied_at": datetime.utcnow().isoformat(),
                    }).eq("id", enrollment.data["id"]).execute()
                
                return {
                    "success": True,
                    "type": "incoming_message",
                    "lead_id": lead.data["id"],
                }
            
            return {"success": True, "type": "incoming_message", "lead_found": False}
        
        return {"success": False, "error": "Unknown webhook type"}
    
    async def get_account_info(self) -> Dict[str, Any]:
        """Gibt Twilio Account-Informationen zurück."""
        if not self.is_configured:
            return {"configured": False}
        
        try:
            account = self.client.api.accounts(self.account_sid).fetch()
            
            # Balance (nur in paid accounts)
            balance = None
            try:
                balance_data = self.client.api.accounts(self.account_sid).balance.fetch()
                balance = float(balance_data.balance)
            except:
                pass
            
            return {
                "configured": True,
                "account_name": account.friendly_name,
                "account_status": account.status,
                "phone_number": self.phone_number,
                "whatsapp_number": self.whatsapp_number,
                "balance": balance,
            }
        except Exception as e:
            return {"configured": True, "error": str(e)}
    
    async def get_usage_stats(self, days: int = 30) -> Dict[str, Any]:
        """Gibt Usage-Statistiken zurück."""
        result = self.supabase.table("message_logs").select(
            "channel, status", count="exact"
        ).gte(
            "created_at",
            (datetime.utcnow() - __import__('datetime').timedelta(days=days)).isoformat()
        ).execute()
        
        stats = {
            "sms_sent": 0,
            "whatsapp_sent": 0,
            "sms_delivered": 0,
            "whatsapp_delivered": 0,
            "sms_failed": 0,
            "whatsapp_failed": 0,
        }
        
        for row in result.data or []:
            channel = row.get("channel", "sms")
            status = row.get("status", "")
            
            if channel == "sms":
                stats["sms_sent"] += 1
                if status in ["delivered", "read"]:
                    stats["sms_delivered"] += 1
                elif status in ["failed", "undelivered"]:
                    stats["sms_failed"] += 1
            elif channel == "whatsapp":
                stats["whatsapp_sent"] += 1
                if status in ["delivered", "read"]:
                    stats["whatsapp_delivered"] += 1
                elif status in ["failed", "undelivered"]:
                    stats["whatsapp_failed"] += 1
        
        return stats
    
    def _normalize_phone_number(self, number: str) -> str:
        """Normalisiert eine Telefonnummer zu E.164 Format."""
        # Entferne alles außer Zahlen und +
        clean = ''.join(c for c in number if c.isdigit() or c == '+')
        
        # Stelle sicher, dass + am Anfang steht
        if not clean.startswith('+'):
            # Versuche deutsche Nummer zu erkennen
            if clean.startswith('0'):
                clean = '+49' + clean[1:]
            elif clean.startswith('49'):
                clean = '+' + clean
            else:
                clean = '+' + clean
        
        return clean


# =============================================================================
# HELPER: Sequence Step Execution
# =============================================================================

async def execute_sms_step(supabase, enrollment: Dict, step: Dict) -> Dict[str, Any]:
    """Führt einen SMS Sequence Step aus."""
    service = TwilioService(supabase)
    
    lead_id = enrollment.get("lead_id")
    lead = supabase.table("leads").select("*").eq("id", lead_id).single().execute()
    
    if not lead.data or not lead.data.get("phone"):
        return {"success": False, "error": "Lead has no phone number"}
    
    # Personalisierung
    config = step.get("config", {})
    body = config.get("body", "")
    
    # Variablen ersetzen
    body = body.replace("{{first_name}}", lead.data.get("first_name", ""))
    body = body.replace("{{last_name}}", lead.data.get("last_name", ""))
    body = body.replace("{{company}}", lead.data.get("company", ""))
    
    return await service.send_sms(
        to_number=lead.data["phone"],
        body=body,
        user_id=enrollment.get("user_id"),
        lead_id=lead_id,
        sequence_action_id=step.get("id"),
    )


async def execute_whatsapp_step(supabase, enrollment: Dict, step: Dict) -> Dict[str, Any]:
    """Führt einen WhatsApp Sequence Step aus."""
    service = TwilioService(supabase)
    
    lead_id = enrollment.get("lead_id")
    lead = supabase.table("leads").select("*").eq("id", lead_id).single().execute()
    
    if not lead.data or not lead.data.get("phone"):
        return {"success": False, "error": "Lead has no phone number"}
    
    # Personalisierung
    config = step.get("config", {})
    body = config.get("body", config.get("message", ""))
    media_url = config.get("media_url")
    
    # Variablen ersetzen
    body = body.replace("{{first_name}}", lead.data.get("first_name", ""))
    body = body.replace("{{last_name}}", lead.data.get("last_name", ""))
    body = body.replace("{{company}}", lead.data.get("company", ""))
    
    return await service.send_whatsapp(
        to_number=lead.data["phone"],
        body=body,
        user_id=enrollment.get("user_id"),
        lead_id=lead_id,
        sequence_action_id=step.get("id"),
        media_url=media_url,
    )

