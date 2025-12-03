"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ACTION EXECUTOR                                                           ║
║  Führt verschiedene Aktions-Typen aus (Email, LinkedIn, etc.)             ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, Optional
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)


class ActionExecutor:
    """Executor für verschiedene Aktions-Typen."""
    
    def __init__(self, supabase, email_sender=None):
        self.supabase = supabase
        self.email_sender = email_sender
    
    # =========================================================================
    # MAIN EXECUTE
    # =========================================================================
    
    async def execute_step(
        self,
        enrollment: Dict,
        step: Dict,
    ) -> Dict:
        """Führt einen Step für ein Enrollment aus."""
        step_type = step["step_type"]
        
        # Create action record
        action = await self._create_action(enrollment, step)
        
        try:
            if step_type == "email":
                result = await self._execute_email(enrollment, step, action)
            elif step_type == "linkedin_connect":
                result = await self._execute_linkedin_connect(enrollment, step, action)
            elif step_type == "linkedin_dm":
                result = await self._execute_linkedin_dm(enrollment, step, action)
            elif step_type == "linkedin_inmail":
                result = await self._execute_linkedin_inmail(enrollment, step, action)
            elif step_type == "whatsapp":
                result = await self._execute_whatsapp(enrollment, step, action)
            elif step_type == "sms":
                result = await self._execute_sms(enrollment, step, action)
            elif step_type == "wait":
                result = {"success": True, "action": "wait"}
            elif step_type == "condition":
                result = await self._execute_condition(enrollment, step, action)
            else:
                result = {"success": False, "error": f"Unknown step type: {step_type}"}
            
            # Update action status
            if result.get("success"):
                await self._update_action(action["id"], {
                    "status": "sent",
                    "sent_at": datetime.utcnow().isoformat(),
                })
            else:
                await self._update_action(action["id"], {
                    "status": "failed",
                    "failed_at": datetime.utcnow().isoformat(),
                    "error_message": result.get("error"),
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing step {step['id']}: {e}")
            await self._update_action(action["id"], {
                "status": "failed",
                "failed_at": datetime.utcnow().isoformat(),
                "error_message": str(e),
            })
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # EMAIL
    # =========================================================================
    
    async def _execute_email(
        self,
        enrollment: Dict,
        step: Dict,
        action: Dict,
    ) -> Dict:
        """Sendet eine Email."""
        contact_email = enrollment.get("contact_email")
        if not contact_email:
            return {"success": False, "error": "No contact email"}
        
        # Personalize content
        variables = enrollment.get("variables", {})
        variables["contact_name"] = enrollment.get("contact_name", "")
        variables["contact_email"] = contact_email
        
        subject = self._personalize(step.get("subject", ""), variables)
        content = self._personalize(step.get("content", ""), variables)
        content_html = self._personalize(step.get("content_html", ""), variables) if step.get("content_html") else None
        
        # Update action with personalized content
        await self._update_action(action["id"], {
            "sent_subject": subject,
            "sent_content": content,
        })
        
        # Send email
        if self.email_sender:
            result = await self.email_sender.send(
                to_email=contact_email,
                to_name=enrollment.get("contact_name"),
                subject=subject,
                content=content,
                content_html=content_html,
                action_id=action["id"],
            )
            return result
        else:
            # Demo mode - just log
            logger.info(f"[DEMO] Would send email to {contact_email}: {subject}")
            return {"success": True, "demo": True}
    
    # =========================================================================
    # LINKEDIN (Placeholder - needs Browser Extension)
    # =========================================================================
    
    async def _execute_linkedin_connect(
        self,
        enrollment: Dict,
        step: Dict,
        action: Dict,
    ) -> Dict:
        """Sendet LinkedIn Connection Request."""
        linkedin_url = enrollment.get("contact_linkedin_url")
        if not linkedin_url:
            return {"success": False, "error": "No LinkedIn URL"}
        
        # This requires browser extension integration
        # For now, create a pending task for manual action or extension
        
        variables = enrollment.get("variables", {})
        connection_note = self._personalize(
            step.get("platform_settings", {}).get("connection_note", ""),
            variables
        )
        
        await self._update_action(action["id"], {
            "sent_content": connection_note,
            "platform_response": {
                "linkedin_url": linkedin_url,
                "action_type": "connect",
                "note": connection_note,
                "status": "pending_manual",
            }
        })
        
        # TODO: Push to browser extension queue
        logger.info(f"[LINKEDIN] Connection request queued for {linkedin_url}")
        
        return {
            "success": True,
            "pending_manual": True,
            "message": "LinkedIn action queued - requires extension",
        }
    
    async def _execute_linkedin_dm(
        self,
        enrollment: Dict,
        step: Dict,
        action: Dict,
    ) -> Dict:
        """Sendet LinkedIn Direct Message."""
        linkedin_url = enrollment.get("contact_linkedin_url")
        if not linkedin_url:
            return {"success": False, "error": "No LinkedIn URL"}
        
        variables = enrollment.get("variables", {})
        message = self._personalize(step.get("content", ""), variables)
        
        await self._update_action(action["id"], {
            "sent_content": message,
            "platform_response": {
                "linkedin_url": linkedin_url,
                "action_type": "dm",
                "message": message,
                "status": "pending_manual",
            }
        })
        
        logger.info(f"[LINKEDIN] DM queued for {linkedin_url}")
        
        return {
            "success": True,
            "pending_manual": True,
            "message": "LinkedIn DM queued - requires extension",
        }
    
    async def _execute_linkedin_inmail(
        self,
        enrollment: Dict,
        step: Dict,
        action: Dict,
    ) -> Dict:
        """Sendet LinkedIn InMail."""
        linkedin_url = enrollment.get("contact_linkedin_url")
        if not linkedin_url:
            return {"success": False, "error": "No LinkedIn URL"}
        
        variables = enrollment.get("variables", {})
        subject = self._personalize(step.get("subject", ""), variables)
        message = self._personalize(step.get("content", ""), variables)
        
        await self._update_action(action["id"], {
            "sent_subject": subject,
            "sent_content": message,
            "platform_response": {
                "linkedin_url": linkedin_url,
                "action_type": "inmail",
                "subject": subject,
                "message": message,
                "status": "pending_manual",
            }
        })
        
        logger.info(f"[LINKEDIN] InMail queued for {linkedin_url}")
        
        return {
            "success": True,
            "pending_manual": True,
            "message": "LinkedIn InMail queued - requires extension",
        }
    
    # =========================================================================
    # OTHER CHANNELS (Placeholder)
    # =========================================================================
    
    async def _execute_whatsapp(
        self,
        enrollment: Dict,
        step: Dict,
        action: Dict,
    ) -> Dict:
        """Sendet WhatsApp Nachricht."""
        phone = enrollment.get("contact_phone")
        if not phone:
            return {"success": False, "error": "No phone number"}
        
        variables = enrollment.get("variables", {})
        message = self._personalize(step.get("content", ""), variables)
        
        await self._update_action(action["id"], {
            "sent_content": message,
            "platform_response": {
                "phone": phone,
                "action_type": "whatsapp",
                "message": message,
                "status": "pending_manual",
            }
        })
        
        # TODO: WhatsApp Business API integration
        logger.info(f"[WHATSAPP] Message queued for {phone}")
        
        return {
            "success": True,
            "pending_manual": True,
            "message": "WhatsApp queued - requires API integration",
        }
    
    async def _execute_sms(
        self,
        enrollment: Dict,
        step: Dict,
        action: Dict,
    ) -> Dict:
        """Sendet SMS."""
        phone = enrollment.get("contact_phone")
        if not phone:
            return {"success": False, "error": "No phone number"}
        
        variables = enrollment.get("variables", {})
        message = self._personalize(step.get("content", ""), variables)
        
        await self._update_action(action["id"], {
            "sent_content": message,
            "platform_response": {
                "phone": phone,
                "action_type": "sms",
                "message": message,
                "status": "pending_manual",
            }
        })
        
        # TODO: Twilio/SMS API integration
        logger.info(f"[SMS] Message queued for {phone}")
        
        return {
            "success": True,
            "pending_manual": True,
            "message": "SMS queued - requires API integration",
        }
    
    async def _execute_condition(
        self,
        enrollment: Dict,
        step: Dict,
        action: Dict,
    ) -> Dict:
        """Evaluiert eine Bedingung."""
        condition_type = step.get("condition_type")
        condition_step_id = step.get("condition_step_id")
        
        if not condition_type or not condition_step_id:
            return {"success": True, "condition_met": True}
        
        # Get previous action for condition step
        prev_action = self.supabase.table("sequence_actions").select("*").eq(
            "enrollment_id", enrollment["id"]
        ).eq("step_id", condition_step_id).single().execute()
        
        if not prev_action.data:
            return {"success": True, "condition_met": False}
        
        pa = prev_action.data
        condition_met = False
        
        if condition_type == "if_no_reply":
            condition_met = pa.get("replied_at") is None
        elif condition_type == "if_opened":
            condition_met = pa.get("opened_at") is not None
        elif condition_type == "if_clicked":
            condition_met = pa.get("clicked_at") is not None
        elif condition_type == "if_replied":
            condition_met = pa.get("replied_at") is not None
        
        return {"success": True, "condition_met": condition_met}
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    async def _create_action(self, enrollment: Dict, step: Dict) -> Dict:
        """Erstellt einen Action-Record."""
        data = {
            "enrollment_id": enrollment["id"],
            "step_id": step["id"],
            "action_type": step["step_type"],
            "status": "pending",
            "scheduled_at": datetime.utcnow().isoformat(),
        }
        
        result = self.supabase.table("sequence_actions").insert(data).execute()
        return result.data[0] if result.data else None
    
    async def _update_action(self, action_id: str, updates: Dict) -> None:
        """Aktualisiert einen Action-Record."""
        updates["updated_at"] = datetime.utcnow().isoformat()
        self.supabase.table("sequence_actions").update(updates).eq(
            "id", action_id
        ).execute()
    
    def _personalize(self, text: str, variables: Dict) -> str:
        """Ersetzt {{variables}} im Text."""
        if not text:
            return ""
        
        result = text
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value) if value else "")
        
        # Remove unreplaced variables
        result = re.sub(r'\{\{[^}]+\}\}', '', result)
        
        return result.strip()

