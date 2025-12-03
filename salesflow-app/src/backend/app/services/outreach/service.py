"""
Outreach Service - Tracking von Social Media Nachrichten
Spezialisiert auf MLM-Akquise über Instagram, Facebook, LinkedIn
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
import logging

from supabase import Client

logger = logging.getLogger(__name__)


class OutreachService:
    """Service für Outreach-Tracking und Ghost-Detection"""
    
    PLATFORMS = ['instagram', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'tiktok', 'email', 'other']
    STATUS_FLOW = ['sent', 'delivered', 'seen', 'replied', 'positive', 'negative', 'converted', 'blocked']
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    # =========================================================================
    # CRUD Operations
    # =========================================================================
    
    async def create_outreach(
        self,
        user_id: str,
        contact_name: str,
        platform: str,
        message_type: str = 'cold_dm',
        contact_handle: Optional[str] = None,
        contact_profile_url: Optional[str] = None,
        message_preview: Optional[str] = None,
        conversation_starter: Optional[str] = None,
        notes: Optional[str] = None,
        tags: Optional[List[str]] = None,
        lead_id: Optional[str] = None,
        template_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Erstelle neuen Outreach-Eintrag (Quick-Log)"""
        
        data = {
            'user_id': user_id,
            'contact_name': contact_name,
            'platform': platform,
            'message_type': message_type,
            'status': 'sent',
            'sent_at': datetime.utcnow().isoformat(),
        }
        
        if contact_handle:
            data['contact_handle'] = contact_handle
        if contact_profile_url:
            data['contact_profile_url'] = contact_profile_url
        if message_preview:
            data['message_preview'] = message_preview
        if conversation_starter:
            data['conversation_starter'] = conversation_starter
        if notes:
            data['notes'] = notes
        if tags:
            data['tags'] = tags
        if lead_id:
            data['lead_id'] = lead_id
        if template_id:
            data['message_template_id'] = template_id
        
        result = self.supabase.table('outreach_messages').insert(data).execute()
        
        # Update daily stats
        await self._update_daily_stats(user_id, platform, 'sent')
        
        logger.info(f"Outreach created: {contact_name} on {platform}")
        return result.data[0] if result.data else None
    
    async def update_status(
        self,
        outreach_id: str,
        new_status: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Aktualisiere Outreach-Status"""
        
        update_data = {'status': new_status}
        
        # Setze Zeitstempel je nach Status
        if new_status == 'delivered':
            update_data['delivered_at'] = datetime.utcnow().isoformat()
        elif new_status == 'seen':
            update_data['seen_at'] = datetime.utcnow().isoformat()
        elif new_status in ['replied', 'positive', 'negative']:
            update_data['replied_at'] = datetime.utcnow().isoformat()
            # Ghost-Status aufheben wenn Antwort kommt
            update_data['is_ghost'] = False
            update_data['next_followup_at'] = None
        elif new_status == 'converted':
            update_data['replied_at'] = update_data.get('replied_at') or datetime.utcnow().isoformat()
        
        result = self.supabase.table('outreach_messages')\
            .update(update_data)\
            .eq('id', outreach_id)\
            .eq('user_id', user_id)\
            .execute()
        
        # Update daily stats
        if result.data:
            platform = result.data[0].get('platform')
            await self._update_daily_stats(user_id, platform, new_status)
        
        return result.data[0] if result.data else None
    
    async def mark_as_seen(self, outreach_id: str, user_id: str) -> Dict[str, Any]:
        """Markiere Nachricht als gelesen (Ghost-Kandidat!)"""
        return await self.update_status(outreach_id, 'seen', user_id)
    
    async def mark_as_replied(self, outreach_id: str, user_id: str, is_positive: bool = None) -> Dict[str, Any]:
        """Markiere dass Antwort erhalten wurde"""
        status = 'positive' if is_positive == True else ('negative' if is_positive == False else 'replied')
        return await self.update_status(outreach_id, status, user_id)
    
    async def get_outreach(self, outreach_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Hole einzelnen Outreach-Eintrag"""
        result = self.supabase.table('outreach_messages')\
            .select('*')\
            .eq('id', outreach_id)\
            .eq('user_id', user_id)\
            .single()\
            .execute()
        return result.data
    
    async def get_user_outreach(
        self,
        user_id: str,
        platform: Optional[str] = None,
        status: Optional[str] = None,
        is_ghost: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
        date_from: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Hole Outreach-Liste für User mit Filtern"""
        
        query = self.supabase.table('outreach_messages')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('sent_at', desc=True)
        
        if platform:
            query = query.eq('platform', platform)
        if status:
            query = query.eq('status', status)
        if is_ghost is not None:
            query = query.eq('is_ghost', is_ghost)
        if date_from:
            query = query.gte('sent_at', date_from.isoformat())
        
        query = query.range(offset, offset + limit - 1)
        result = query.execute()
        
        return result.data or []
    
    # =========================================================================
    # Ghost Management
    # =========================================================================
    
    async def get_ghosts(
        self,
        user_id: str,
        platform: Optional[str] = None,
        min_ghost_hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Hole alle Ghost-Kontakte (gelesen aber keine Antwort)"""
        
        query = self.supabase.table('outreach_messages')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('is_ghost', True)\
            .is_('replied_at', 'null')\
            .order('seen_at', desc=False)  # Älteste Ghosts zuerst
        
        if platform:
            query = query.eq('platform', platform)
        
        result = query.execute()
        
        # Filtere nach min_ghost_hours
        ghosts = []
        cutoff = datetime.utcnow() - timedelta(hours=min_ghost_hours)
        
        for item in (result.data or []):
            seen_at = item.get('seen_at')
            if seen_at:
                seen_dt = datetime.fromisoformat(seen_at.replace('Z', '+00:00'))
                if seen_dt.replace(tzinfo=None) < cutoff:
                    # Berechne Ghost-Stunden
                    item['ghost_hours'] = int((datetime.utcnow() - seen_dt.replace(tzinfo=None)).total_seconds() / 3600)
                    ghosts.append(item)
        
        return ghosts
    
    async def get_followup_queue(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Hole anstehende Follow-ups aus der Queue"""
        
        result = self.supabase.table('ghost_followup_queue')\
            .select('*, outreach_messages(*)')\
            .eq('user_id', user_id)\
            .eq('status', 'pending')\
            .lte('scheduled_for', datetime.utcnow().isoformat())\
            .order('priority', desc=True)\
            .order('scheduled_for')\
            .limit(limit)\
            .execute()
        
        return result.data or []
    
    async def complete_followup(
        self,
        queue_id: str,
        user_id: str,
        sent: bool = True,
        skip_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Markiere Follow-up als erledigt oder übersprungen"""
        
        update_data = {
            'status': 'sent' if sent else 'skipped',
            'completed_at': datetime.utcnow().isoformat()
        }
        
        if skip_reason:
            update_data['skipped_reason'] = skip_reason
        
        result = self.supabase.table('ghost_followup_queue')\
            .update(update_data)\
            .eq('id', queue_id)\
            .eq('user_id', user_id)\
            .execute()
        
        # Wenn gesendet, update auch die outreach_message
        if sent and result.data:
            outreach_id = result.data[0].get('outreach_id')
            if outreach_id:
                self.supabase.table('outreach_messages')\
                    .update({
                        'ghost_followup_count': self.supabase.rpc('increment', {'x': 1}),
                        'next_followup_at': (datetime.utcnow() + timedelta(days=3)).isoformat()
                    })\
                    .eq('id', outreach_id)\
                    .execute()
        
        return result.data[0] if result.data else None
    
    async def snooze_followup(
        self,
        queue_id: str,
        user_id: str,
        snooze_hours: int = 24
    ) -> Dict[str, Any]:
        """Verschiebe Follow-up um X Stunden"""
        
        new_time = datetime.utcnow() + timedelta(hours=snooze_hours)
        
        result = self.supabase.table('ghost_followup_queue')\
            .update({'scheduled_for': new_time.isoformat()})\
            .eq('id', queue_id)\
            .eq('user_id', user_id)\
            .execute()
        
        return result.data[0] if result.data else None
    
    # =========================================================================
    # Templates
    # =========================================================================
    
    async def get_templates(
        self,
        user_id: str,
        platform: Optional[str] = None,
        message_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Hole verfügbare Templates"""
        
        query = self.supabase.table('outreach_templates')\
            .select('*')\
            .or_(f'user_id.eq.{user_id},is_system.eq.true')\
            .eq('is_active', True)\
            .order('reply_rate', desc=True)
        
        if platform:
            query = query.eq('platform', platform)
        if message_type:
            query = query.eq('message_type', message_type)
        
        result = query.execute()
        return result.data or []
    
    async def get_best_template(
        self,
        user_id: str,
        platform: str,
        message_type: str = 'follow_up_1'
    ) -> Optional[Dict[str, Any]]:
        """Hole das beste Template basierend auf Reply-Rate"""
        
        templates = await self.get_templates(user_id, platform, message_type)
        return templates[0] if templates else None
    
    async def record_template_usage(
        self,
        template_id: str,
        got_reply: bool = False,
        is_positive: bool = False
    ):
        """Erfasse Template-Nutzung für Performance-Tracking"""
        
        update = {'times_used': self.supabase.rpc('increment', {'x': 1})}
        
        if got_reply:
            update['reply_count'] = self.supabase.rpc('increment', {'x': 1})
        if is_positive:
            update['positive_count'] = self.supabase.rpc('increment', {'x': 1})
        
        self.supabase.table('outreach_templates')\
            .update(update)\
            .eq('id', template_id)\
            .execute()
    
    # =========================================================================
    # Statistics
    # =========================================================================
    
    async def get_stats(
        self,
        user_id: str,
        days: int = 7
    ) -> Dict[str, Any]:
        """Hole Outreach-Statistiken"""
        
        date_from = (datetime.utcnow() - timedelta(days=days)).date()
        
        # Daily Stats
        daily_result = self.supabase.table('outreach_daily_stats')\
            .select('*')\
            .eq('user_id', user_id)\
            .gte('date', date_from.isoformat())\
            .order('date', desc=True)\
            .execute()
        
        # Aggregate
        total_sent = sum(d.get('messages_sent', 0) for d in (daily_result.data or []))
        total_seen = sum(d.get('messages_seen', 0) for d in (daily_result.data or []))
        total_replied = sum(d.get('replies_received', 0) for d in (daily_result.data or []))
        total_positive = sum(d.get('positive_replies', 0) for d in (daily_result.data or []))
        total_ghosts = sum(d.get('new_ghosts', 0) for d in (daily_result.data or []))
        
        # Current Ghosts
        ghosts = await self.get_ghosts(user_id)
        
        return {
            'period_days': days,
            'daily_stats': daily_result.data or [],
            'totals': {
                'sent': total_sent,
                'seen': total_seen,
                'replied': total_replied,
                'positive': total_positive,
                'ghosts': total_ghosts
            },
            'rates': {
                'seen_rate': round(total_seen / total_sent * 100, 1) if total_sent > 0 else 0,
                'reply_rate': round(total_replied / total_sent * 100, 1) if total_sent > 0 else 0,
                'ghost_rate': round(total_ghosts / total_seen * 100, 1) if total_seen > 0 else 0,
                'positive_rate': round(total_positive / total_replied * 100, 1) if total_replied > 0 else 0
            },
            'current_ghosts': len(ghosts),
            'pending_followups': len(await self.get_followup_queue(user_id))
        }
    
    async def get_platform_breakdown(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Statistiken aufgeschlüsselt nach Plattform"""
        
        date_from = datetime.utcnow() - timedelta(days=days)
        
        result = self.supabase.table('outreach_messages')\
            .select('platform, status')\
            .eq('user_id', user_id)\
            .gte('sent_at', date_from.isoformat())\
            .execute()
        
        breakdown = {}
        for platform in self.PLATFORMS:
            platform_data = [r for r in (result.data or []) if r.get('platform') == platform]
            if platform_data:
                total = len(platform_data)
                replied = len([r for r in platform_data if r.get('status') in ['replied', 'positive', 'negative', 'converted']])
                positive = len([r for r in platform_data if r.get('status') in ['positive', 'converted']])
                
                breakdown[platform] = {
                    'total': total,
                    'replied': replied,
                    'positive': positive,
                    'reply_rate': round(replied / total * 100, 1) if total > 0 else 0,
                    'conversion_rate': round(positive / total * 100, 1) if total > 0 else 0
                }
        
        return breakdown
    
    async def _update_daily_stats(self, user_id: str, platform: str, event_type: str):
        """Update tägliche Statistiken"""
        
        today = datetime.utcnow().date().isoformat()
        
        # Upsert daily stats
        field_map = {
            'sent': 'messages_sent',
            'delivered': 'messages_delivered',
            'seen': 'messages_seen',
            'replied': 'replies_received',
            'positive': 'positive_replies',
            'converted': 'deals_closed'
        }
        
        field = field_map.get(event_type)
        if not field:
            return
        
        # Check if record exists
        existing = self.supabase.table('outreach_daily_stats')\
            .select('id')\
            .eq('user_id', user_id)\
            .eq('date', today)\
            .execute()
        
        if existing.data:
            # Update existing
            self.supabase.rpc('increment_outreach_stat', {
                'p_user_id': user_id,
                'p_date': today,
                'p_field': field
            }).execute()
        else:
            # Insert new
            data = {
                'user_id': user_id,
                'date': today,
                field: 1
            }
            self.supabase.table('outreach_daily_stats').insert(data).execute()

