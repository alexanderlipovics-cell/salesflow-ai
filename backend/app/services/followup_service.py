"""
Automatic Follow-up Service with i18n Support
Handles automatic follow-up detection, generation, and sending
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import asyncio

from app.core.database import get_db
from app.services.whatsapp_service import whatsapp_service
from app.services.email_service import email_service
from app.services.template_service import template_service
from app.services.i18n_service import i18n_service


class FollowUpService:
    """Automatic Follow-up Management"""
    
    async def check_and_trigger_followups(self, user_id: Optional[str] = None) -> Dict:
        """
        Main cron function - checks leads and triggers follow-ups
        
        Returns:
            dict: Statistics about checked, triggered, failed, skipped
        """
        
        results = {
            "checked": 0,
            "triggered": 0,
            "failed": 0,
            "skipped": 0,
            "details": []
        }
        
        async with get_db() as db:
            # Get leads needing follow-up
            query = "SELECT * FROM get_leads_needing_followup(3, $1)"
            leads = await db.fetch(query, user_id)
            
            results["checked"] = len(leads)
            
            for lead in leads:
                try:
                    # Skip if no recommended playbook
                    if not lead['recommended_playbook']:
                        results["skipped"] += 1
                        continue
                    
                    # Generate follow-up message in user's language
                    message_data = await self.generate_followup(
                        lead_id=lead['lead_id'],
                        playbook_id=lead['recommended_playbook'],
                        user_id=lead['user_id'],
                        lead_context={
                            'first_name': lead.get('lead_name', '').split(' ')[0],
                            'last_name': lead.get('lead_name', '').split(' ')[-1],
                            'name': lead['lead_name'],
                            'email': lead.get('lead_email'),
                            'phone': lead.get('lead_phone'),
                            'bant_score': lead.get('bant_score', 0),
                            'status': lead.get('status'),
                            'days_since_contact': lead.get('days_since_last_contact', 0)
                        }
                    )
                    
                    # Select best channel
                    channel = await self.select_channel(lead['lead_id'])
                    
                    # Send follow-up
                    success = await self.send_followup(
                        lead_id=lead['lead_id'],
                        user_id=lead['user_id'],
                        channel=channel,
                        message=message_data['message'],
                        subject=message_data.get('subject'),
                        playbook_id=lead['recommended_playbook']
                    )
                    
                    if success:
                        results["triggered"] += 1
                        results["details"].append({
                            "lead_id": str(lead['lead_id']),
                            "lead_name": lead['lead_name'],
                            "channel": channel,
                            "playbook": lead['recommended_playbook']
                        })
                    else:
                        results["failed"] += 1
                        
                except Exception as e:
                    print(f"Error triggering follow-up for lead {lead['lead_id']}: {e}")
                    results["failed"] += 1
        
        return results
    
    async def generate_followup(
        self,
        lead_id: str,
        playbook_id: str,
        lead_context: Optional[Dict] = None,
        user_id: Optional[str] = None
    ) -> Dict:
        """
        Generate follow-up message from playbook or template in user's language
        
        Args:
            lead_id: Lead UUID
            playbook_id: Playbook ID or template trigger_key
            lead_context: Optional context override
            user_id: User UUID for language detection
            
        Returns:
            dict: { 'message': str, 'subject': str (optional), 'language': str }
        """
        
        async with get_db() as db:
            # Get user language if user_id provided
            user_language = 'de'
            if user_id:
                user_language = await i18n_service.get_user_language(user_id)
            
            # Try to get playbook first
            playbook = await db.fetchrow(
                "SELECT * FROM get_playbook_by_id($1)",
                playbook_id
            )
            
            if not playbook:
                # Try as template ID - get in user's language
                template = await i18n_service.get_template_in_language(
                    template_id=playbook_id,
                    language=user_language
                )
                
                if not template:
                    # Fallback
                    return {
                        'message': f"Follow-up for lead {lead_id}",
                        'subject': 'Follow-up',
                        'language': user_language
                    }
                
                # Use translated template
                playbook = {
                    'message_template': template.get('body_template'),
                    'subject_template': template.get('subject_template')
                }
            
            # Build lead context if not provided
            if not lead_context:
                context_result = await db.fetchrow(
                    "SELECT * FROM build_lead_context($1)",
                    lead_id
                )
                lead_context = dict(context_result) if context_result else {}
            
            # Render template
            message = await db.fetchval(
                "SELECT render_template($1, $2::jsonb)",
                playbook['message_template'],
                lead_context
            )
            
            subject = None
            if playbook.get('subject_template'):
                subject = await db.fetchval(
                    "SELECT render_template($1, $2::jsonb)",
                    playbook['subject_template'],
                    lead_context
                )
            
            return {
                'message': message,
                'subject': subject,
                'language': user_language
            }
    
    async def select_channel(self, lead_id: str) -> str:
        """
        Select best channel for lead
        
        Args:
            lead_id: Lead UUID
            
        Returns:
            str: Channel name ('whatsapp', 'email', 'in_app')
        """
        
        async with get_db() as db:
            channel = await db.fetchval(
                "SELECT select_best_channel_for_lead($1)",
                lead_id
            )
            
            return channel or 'email'
    
    async def send_followup(
        self,
        lead_id: str,
        user_id: str,
        channel: str,
        message: str,
        subject: Optional[str] = None,
        playbook_id: Optional[str] = None,
        gpt_generated: bool = False
    ) -> bool:
        """
        Send follow-up via specified channel
        
        Args:
            lead_id: Lead UUID
            user_id: User UUID
            channel: Channel to send via
            message: Message body
            subject: Email subject (optional)
            playbook_id: Playbook ID (optional)
            gpt_generated: Whether message was GPT-generated
            
        Returns:
            bool: Success
        """
        
        try:
            # Get lead contact info
            async with get_db() as db:
                lead = await db.fetchrow(
                    "SELECT email, phone FROM leads WHERE id = $1",
                    lead_id
                )
                
                if not lead:
                    return False
                
                # Send via appropriate channel
                if channel == 'whatsapp' and lead['phone']:
                    result = await whatsapp_service.send_message(
                        to=lead['phone'],
                        message=message
                    )
                    success = result.get('success', False)
                    
                elif channel == 'email' and lead['email']:
                    result = await email_service.send_email(
                        to=lead['email'],
                        subject=subject or 'Follow-up',
                        body=message
                    )
                    success = result.get('success', False)
                    
                elif channel == 'in_app':
                    # In-app notification - for now, just log
                    success = True
                    
                else:
                    print(f"Unsupported channel or missing contact: {channel}")
                    return False
                
                # Log follow-up
                if success:
                    await db.execute(
                        "SELECT log_followup($1, $2, $3, $4, $5, $6, $7)",
                        lead_id,
                        user_id,
                        channel,
                        message,
                        subject,
                        playbook_id,
                        gpt_generated
                    )
                
                return success
                
        except Exception as e:
            print(f"Error sending follow-up: {e}")
            return False
    
    async def get_followup_analytics(
        self,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict:
        """
        Get follow-up analytics
        
        Args:
            user_id: User UUID (optional, None = all users)
            days: Days to look back
            
        Returns:
            dict: Analytics data
        """
        
        async with get_db() as db:
            # Overall stats
            stats = await db.fetchrow(
                "SELECT * FROM get_followup_analytics($1, $2)",
                user_id,
                days
            )
            
            # Channel performance
            channel_perf = await db.fetch(
                "SELECT * FROM channel_performance"
            )
            
            # Weekly trend
            weekly_trend = await db.fetch(
                "SELECT * FROM weekly_activity_trend LIMIT 12"
            )
            
            # Response heatmap
            heatmap = await db.fetch(
                "SELECT * FROM response_heatmap"
            )
            
            # Playbook performance
            playbook_perf = await db.fetch(
                "SELECT * FROM playbook_performance"
            )
            
            return {
                'overall': dict(stats) if stats else {},
                'channel_performance': [dict(r) for r in channel_perf],
                'weekly_trend': [dict(r) for r in weekly_trend],
                'response_heatmap': [dict(r) for r in heatmap],
                'playbook_performance': [dict(r) for r in playbook_perf]
            }
    
    async def mark_delivered(self, followup_id: str) -> bool:
        """Mark follow-up as delivered"""
        async with get_db() as db:
            return await db.fetchval(
                "SELECT mark_followup_delivered($1)",
                followup_id
            )
    
    async def mark_opened(self, followup_id: str) -> bool:
        """Mark follow-up as opened"""
        async with get_db() as db:
            return await db.fetchval(
                "SELECT mark_followup_opened($1)",
                followup_id
            )
    
    async def mark_replied(self, followup_id: str) -> bool:
        """Mark follow-up as replied"""
        async with get_db() as db:
            return await db.fetchval(
                "SELECT mark_followup_replied($1)",
                followup_id
            )


# Singleton instance
followup_service = FollowUpService()
