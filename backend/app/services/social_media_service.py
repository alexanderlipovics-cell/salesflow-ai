"""
═══════════════════════════════════════════════════════════════════════════
SOCIAL MEDIA SERVICE
═══════════════════════════════════════════════════════════════════════════
Automatischer Import und Qualifikation von Social Media Leads.
Unterstützt: Facebook, LinkedIn, Instagram, Twitter
═══════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from uuid import UUID
import re
import asyncpg
from app.core.supabase import get_supabase_client


class SocialMediaService:
    """
    Service für Social Media Integration und Lead-Generierung.
    """
    
    # MLM Keywords für Lead Scoring
    MLM_KEYWORDS = [
        'entrepreneur', 'network marketing', 'mlm', 'direct sales',
        'business owner', 'side hustle', 'passive income',
        'financial freedom', 'selbstständig', 'vertrieb',
        'networker', 'team builder', 'residual income',
        'work from home', 'be your own boss', 'home based business'
    ]
    
    PAIN_POINT_KEYWORDS = [
        'tired of 9-5', 'need extra income', 'want more time',
        'financial stress', 'job security', 'looking for opportunity',
        'career change', 'early retirement'
    ]
    
    def __init__(self, supabase=None):
        self.supabase = supabase or get_supabase_client()
    
    async def import_facebook_lead(
        self, 
        profile_data: Dict[str, Any],
        user_id: str,
        auto_approve_threshold: int = 75
    ) -> Dict[str, Any]:
        """
        Importiert einen Facebook Lead mit automatischer Qualifikation.
        
        Args:
            profile_data: {
                'id': 'fb_user_id',
                'name': 'Max Mustermann',
                'username': 'maxmuster',
                'profile_url': '...',
                'bio': '...',
                'interests': [...],
                'mutual_friends': 12,
                'location': 'Berlin'
            }
            user_id: User der den Import durchführt
            auto_approve_threshold: Score ab dem automatisch Lead erstellt wird
            
        Returns:
            Dict mit Status und Lead/Candidate ID
        """
        # 1. Check if already exists
        existing = self.supabase.table('social_accounts').select('*').eq(
            'platform', 'facebook'
        ).eq('platform_user_id', profile_data['id']).execute()
        
        if existing.data:
            return {
                "status": "duplicate",
                "social_account_id": existing.data[0]['id'],
                "lead_id": existing.data[0].get('lead_id'),
                "message": "Dieser Social Media Account ist bereits importiert"
            }
        
        # 2. Calculate qualification score
        score = self._calculate_lead_score(profile_data, 'facebook')
        
        # 3. Create candidate
        candidate_data = {
            'platform': 'facebook',
            'platform_user_id': profile_data['id'],
            'username': profile_data.get('username'),
            'display_name': profile_data.get('name'),
            'profile_url': profile_data.get('profile_url'),
            'bio': profile_data.get('bio'),
            'signals': profile_data,  # Full data as JSONB
            'qualification_score': score,
            'discovered_by': user_id,
            'status': 'pending'
        }
        
        candidate = self.supabase.table('social_lead_candidates').insert(
            candidate_data
        ).execute()
        
        if not candidate.data:
            return {"status": "error", "message": "Fehler beim Erstellen des Kandidaten"}
        
        candidate_id = candidate.data[0]['id']
        
        # 4. Auto-approve if score is high enough
        if score >= auto_approve_threshold:
            lead_id = await self._auto_create_lead_from_social(
                profile_data, 
                'facebook',
                user_id
            )
            
            # Update candidate
            self.supabase.table('social_lead_candidates').update({
                'auto_created_lead_id': lead_id,
                'status': 'imported',
                'reviewed_at': datetime.now().isoformat(),
                'reviewed_by': user_id
            }).eq('id', candidate_id).execute()
            
            return {
                "status": "auto_imported",
                "lead_id": lead_id,
                "candidate_id": candidate_id,
                "score": score,
                "message": f"Lead automatisch erstellt (Score: {score}/100)"
            }
        
        return {
            "status": "candidate_created",
            "candidate_id": candidate_id,
            "score": score,
            "message": f"Lead-Kandidat erstellt (Score: {score}/100) - Bitte manuell prüfen"
        }
    
    def _calculate_lead_score(self, profile_data: Dict, platform: str) -> int:
        """
        Berechnet Qualifikations-Score basierend auf Social Signals.
        
        Returns:
            Score zwischen 0-100
        """
        score = 0
        
        # Combine searchable text
        searchable_text = ' '.join([
            str(profile_data.get('bio', '')),
            str(profile_data.get('about', '')),
            str(profile_data.get('job_title', '')),
            ' '.join(profile_data.get('interests', []))
        ]).lower()
        
        # 1. MLM Keyword Matching (max 40 points)
        mlm_matches = sum(1 for kw in self.MLM_KEYWORDS if kw in searchable_text)
        score += min(mlm_matches * 10, 40)
        
        # 2. Pain Point Keywords (max 20 points)
        pain_matches = sum(1 for kw in self.PAIN_POINT_KEYWORDS if kw in searchable_text)
        score += min(pain_matches * 10, 20)
        
        # 3. Job Title Signals (20 points)
        job_title = profile_data.get('job_title', '').lower()
        if any(kw in job_title for kw in ['entrepreneur', 'owner', 'sales', 'consultant', 'coach']):
            score += 20
        elif any(kw in job_title for kw in ['manager', 'director', 'leader']):
            score += 10
        
        # 4. Connection Strength (max 15 points)
        mutual_friends = profile_data.get('mutual_friends', 0)
        if mutual_friends > 10:
            score += 15
        elif mutual_friends > 5:
            score += 10
        elif mutual_friends > 0:
            score += 5
        
        # 5. Activity Signals (10 points)
        if profile_data.get('recent_posts'):
            score += 5
        if profile_data.get('follower_count', 0) > 500:
            score += 5
        
        # 6. Platform-specific bonuses
        if platform == 'linkedin':
            score += 10  # LinkedIn profiles are generally higher quality
        elif platform == 'instagram' and profile_data.get('bio'):
            score += 5
        
        return min(score, 100)
    
    async def _auto_create_lead_from_social(
        self,
        profile_data: Dict,
        platform: str,
        user_id: str
    ) -> str:
        """
        Erstellt automatisch einen Lead aus Social Media Profil.
        
        Returns:
            Lead ID (UUID as string)
        """
        # Extract contact info
        name = profile_data.get('name') or profile_data.get('username', 'Unknown')
        email = profile_data.get('email')  # Often not available
        phone = profile_data.get('phone')
        
        # Create lead
        lead_data = {
            'user_id': user_id,
            'name': name,
            'email': email,
            'phone': phone,
            'status': 'new',
            'source': f'{platform}_import',
            'notes': f"Auto-importiert von {platform.title()}.\n\nProfil: {profile_data.get('bio', 'Keine Bio verfügbar')}",
            'metadata': {
                'social_import': True,
                'platform': platform,
                'import_date': datetime.now().isoformat(),
                'profile_url': profile_data.get('profile_url')
            }
        }
        
        lead = self.supabase.table('leads').insert(lead_data).execute()
        
        if not lead.data:
            raise Exception("Fehler beim Erstellen des Leads")
        
        lead_id = lead.data[0]['id']
        
        # Create social account link
        social_account_data = {
            'lead_id': lead_id,
            'user_id': user_id,
            'platform': platform,
            'platform_user_id': profile_data['id'],
            'username': profile_data.get('username'),
            'display_name': name,
            'bio': profile_data.get('bio'),
            'profile_url': profile_data.get('profile_url'),
            'follower_count': profile_data.get('follower_count', 0),
            'connection_type': 'auto_detected',
            'profile_data': profile_data
        }
        
        self.supabase.table('social_accounts').insert(social_account_data).execute()
        
        return lead_id
    
    async def track_social_interaction(
        self,
        lead_id: str,
        interaction_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Trackt Social Media Interaktion mit einem Lead.
        
        Args:
            lead_id: UUID des Leads
            interaction_data: {
                'social_account_id': 'uuid',
                'type': 'comment',  # post, comment, like, message, etc.
                'content': 'Great post!',
                'url': 'https://...',
                'sentiment': 'positive'  # optional, wird sonst via AI erkannt
            }
        """
        # TODO: Sentiment analysis via GPT-4 wenn nicht vorhanden
        sentiment = interaction_data.get('sentiment', 'unknown')
        
        data = {
            'lead_id': lead_id,
            'social_account_id': interaction_data.get('social_account_id'),
            'interaction_type': interaction_data['type'],
            'content': interaction_data.get('content'),
            'post_url': interaction_data.get('url'),
            'sentiment': sentiment,
            'created_at': datetime.now().isoformat()
        }
        
        result = self.supabase.table('social_interactions').insert(data).execute()
        
        return {
            "status": "tracked",
            "interaction_id": result.data[0]['id'] if result.data else None
        }
    
    async def get_lead_candidates(
        self,
        user_id: str,
        min_score: int = 50,
        status: str = 'pending',
        limit: int = 20
    ) -> List[Dict]:
        """
        Holt ausstehende Social Media Lead-Kandidaten.
        """
        query = self.supabase.table('social_lead_candidates').select('*')
        
        if status:
            query = query.eq('status', status)
        
        query = query.gte('qualification_score', min_score)
        query = query.order('qualification_score', desc=True)
        query = query.limit(limit)
        
        result = query.execute()
        return result.data or []
    
    async def approve_candidate(
        self,
        candidate_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Bestätigt einen Kandidaten und erstellt Lead.
        """
        # Get candidate
        candidate = self.supabase.table('social_lead_candidates').select('*').eq(
            'id', candidate_id
        ).execute()
        
        if not candidate.data:
            return {"status": "error", "message": "Kandidat nicht gefunden"}
        
        candidate_data = candidate.data[0]
        
        # Create lead
        lead_id = await self._auto_create_lead_from_social(
            candidate_data['signals'],
            candidate_data['platform'],
            user_id
        )
        
        # Update candidate
        self.supabase.table('social_lead_candidates').update({
            'auto_created_lead_id': lead_id,
            'status': 'approved',
            'reviewed_at': datetime.now().isoformat(),
            'reviewed_by': user_id
        }).eq('id', candidate_id).execute()
        
        return {
            "status": "approved",
            "lead_id": lead_id,
            "message": "Lead erfolgreich erstellt"
        }
    
    async def reject_candidate(
        self,
        candidate_id: str,
        user_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Lehnt einen Lead-Kandidaten ab.
        """
        self.supabase.table('social_lead_candidates').update({
            'status': 'rejected',
            'rejection_reason': reason,
            'reviewed_at': datetime.now().isoformat(),
            'reviewed_by': user_id
        }).eq('id', candidate_id).execute()
        
        return {"status": "rejected", "message": "Kandidat abgelehnt"}
    
    async def get_social_insights(
        self,
        lead_id: str
    ) -> Dict[str, Any]:
        """
        Liefert Social Media Insights für einen Lead.
        """
        # Get social accounts
        accounts = self.supabase.table('social_accounts').select('*').eq(
            'lead_id', lead_id
        ).execute()
        
        # Get interactions
        interactions = self.supabase.table('social_interactions').select('*').eq(
            'lead_id', lead_id
        ).order('created_at', desc=True).limit(10).execute()
        
        # Calculate stats
        total_interactions = len(interactions.data) if interactions.data else 0
        positive_sentiment = sum(
            1 for i in (interactions.data or []) 
            if i.get('sentiment') == 'positive'
        )
        
        return {
            "social_accounts": accounts.data or [],
            "recent_interactions": interactions.data or [],
            "total_interactions": total_interactions,
            "positive_sentiment_ratio": positive_sentiment / max(total_interactions, 1),
            "last_interaction": interactions.data[0] if interactions.data else None
        }

