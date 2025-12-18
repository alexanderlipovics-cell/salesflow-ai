"""
Akquise-Gedächtnis Service für CHIEF.

CHIEF merkt sich wo der User akquiriert hat (Facebook Gruppen, Instagram Hashtags, etc.)
und erinnert ihn daran.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import re
import logging

logger = logging.getLogger(__name__)


class AkquiseMemory:
    """Service für Akquise-Gedächtnis - merkt sich Akquise-Quellen des Users."""
    
    def __init__(self, db, user_id: str):
        """
        Initialisiert den AkquiseMemory Service.
        
        Args:
            db: Supabase Client
            user_id: User UUID
        """
        self.db = db
        self.user_id = user_id
    
    async def check_source(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Prüft ob User diese Quelle schon kennt.
        
        Args:
            url: URL der Quelle
            
        Returns:
            Dict mit Source-Daten wenn gefunden, sonst None
        """
        try:
            normalized = self._normalize_url(url)
            
            result = self.db.table('akquise_sources').select('*').eq(
                'user_id', self.user_id
            ).eq(
                'source_url', normalized
            ).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.warning(f"Fehler beim Prüfen der Quelle: {e}")
            return None
    
    async def save_source(
        self, 
        url: str, 
        source_type: str, 
        name: str = None, 
        category: str = None
    ) -> tuple[Dict[str, Any], bool]:
        """
        Speichert eine neue Akquise-Quelle oder aktualisiert eine existierende.
        
        Args:
            url: URL der Quelle
            source_type: Typ (facebook_group, instagram_hashtag, etc.)
            name: Optionaler Name der Quelle
            category: Optionale Kategorie
            
        Returns:
            Tuple (source_data, is_new) - True wenn neu erstellt, False wenn aktualisiert
        """
        try:
            normalized = self._normalize_url(url)
            
            # Prüfe ob schon existiert
            existing = await self.check_source(url)
            
            if existing:
                # Update: times_used++, last_used_at
                now = datetime.utcnow().isoformat()
                result = self.db.table('akquise_sources').update({
                    'times_used': existing.get('times_used', 0) + 1,
                    'last_used_at': now,
                    'updated_at': now
                }).eq('id', existing['id']).execute()
                
                if result.data and len(result.data) > 0:
                    return result.data[0], False
                return existing, False
            
            # Neu erstellen
            extracted_name = name or self._extract_name(url)
            guessed_category = category or self._guess_category(url, extracted_name)
            tags = self._extract_tags(url, extracted_name)
            
            data = {
                'user_id': self.user_id,
                'source_type': source_type,
                'source_url': normalized,
                'source_name': extracted_name,
                'category': guessed_category,
                'tags': tags,
                'first_used_at': datetime.utcnow().isoformat(),
                'last_used_at': datetime.utcnow().isoformat(),
                'times_used': 1,
                'leads_found': 0,
                'leads_converted': 0,
                'is_exhausted': False,
            }
            
            result = self.db.table('akquise_sources').insert(data).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0], True
            
            # Fallback wenn insert keine Daten zurückgibt
            return data, True
            
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Quelle: {e}")
            raise
    
    async def get_similar_sources(self, category: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Findet ähnliche Quellen die der User noch nicht genutzt hat.
        
        TODO: Könnte auch aus einer globalen "beliebte Gruppen" DB kommen
        Oder CHIEF schlägt per Web-Search vor
        
        Args:
            category: Kategorie für Suche
            limit: Maximale Anzahl Ergebnisse
            
        Returns:
            Liste von ähnlichen Quellen
        """
        try:
            # Suche nach Quellen in derselben Kategorie
            result = self.db.table('akquise_sources').select('*').eq(
                'user_id', self.user_id
            ).eq(
                'category', category
            ).order('leads_found', desc=True).limit(limit).execute()
            
            return result.data or []
        except Exception as e:
            logger.warning(f"Fehler beim Suchen ähnlicher Quellen: {e}")
            return []
    
    async def get_user_stats(self) -> Dict[str, Any]:
        """
        Gibt Statistiken über User's Akquise zurück.
        
        Returns:
            Dict mit Statistiken
        """
        try:
            result = self.db.table('akquise_sources').select('*').eq(
                'user_id', self.user_id
            ).execute()
            
            sources = result.data or []
            
            if not sources:
                return {
                    'total_sources': 0,
                    'total_leads_found': 0,
                    'total_leads_converted': 0,
                    'best_source': None,
                    'last_active': None,
                }
            
            best_source = max(sources, key=lambda s: s.get('leads_found', 0)) if sources else None
            last_active = max(
                sources, 
                key=lambda s: s.get('last_used_at', '') or ''
            ) if sources else None
            
            return {
                'total_sources': len(sources),
                'total_leads_found': sum(s.get('leads_found', 0) for s in sources),
                'total_leads_converted': sum(s.get('leads_converted', 0) for s in sources),
                'best_source': best_source,
                'last_active': last_active,
            }
        except Exception as e:
            logger.warning(f"Fehler beim Laden der User-Statistiken: {e}")
            return {
                'total_sources': 0,
                'total_leads_found': 0,
                'total_leads_converted': 0,
                'best_source': None,
                'last_active': None,
            }
    
    async def increment_leads_found(self, source_url: str, count: int = 1):
        """
        Erhöht leads_found für eine Quelle.
        
        Args:
            source_url: URL der Quelle
            count: Anzahl zu erhöhen (default: 1)
        """
        try:
            source = await self.check_source(source_url)
            if source:
                current_count = source.get('leads_found', 0)
                self.db.table('akquise_sources').update({
                    'leads_found': current_count + count,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', source['id']).execute()
        except Exception as e:
            logger.warning(f"Fehler beim Erhöhen von leads_found: {e}")
    
    async def increment_leads_converted(self, source_url: str, count: int = 1):
        """
        Erhöht leads_converted für eine Quelle.
        
        Args:
            source_url: URL der Quelle
            count: Anzahl zu erhöhen (default: 1)
        """
        try:
            source = await self.check_source(source_url)
            if source:
                current_count = source.get('leads_converted', 0)
                self.db.table('akquise_sources').update({
                    'leads_converted': current_count + count,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', source['id']).execute()
        except Exception as e:
            logger.warning(f"Fehler beim Erhöhen von leads_converted: {e}")
    
    async def mark_exhausted(self, source_url: str, exhausted: bool = True):
        """
        Markiert eine Quelle als erschöpft oder nicht erschöpft.
        
        Args:
            source_url: URL der Quelle
            exhausted: True wenn erschöpft, False wenn wieder aktiv
        """
        try:
            source = await self.check_source(source_url)
            if source:
                self.db.table('akquise_sources').update({
                    'is_exhausted': exhausted,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', source['id']).execute()
        except Exception as e:
            logger.warning(f"Fehler beim Markieren als erschöpft: {e}")
    
    def _normalize_url(self, url: str) -> str:
        """
        Normalisiert URL für Vergleich.
        
        Args:
            url: Original URL
            
        Returns:
            Normalisierte URL
        """
        if not url:
            return ""
        
        url = url.lower().strip()
        # Entferne Protokoll
        url = re.sub(r'^https?://', '', url)
        # Entferne www.
        url = re.sub(r'^www\.', '', url)
        # Entferne trailing slash
        url = url.rstrip('/')
        # Entferne Query-Parameter und Fragmente
        url = url.split('?')[0].split('#')[0]
        
        return url
    
    def _extract_name(self, url: str) -> str:
        """
        Extrahiert Namen aus URL.
        
        Args:
            url: URL der Quelle
            
        Returns:
            Extrahierter Name
        """
        url_lower = url.lower()
        
        # Facebook Gruppen
        if 'facebook.com/groups/' in url_lower:
            parts = url_lower.split('groups/')
            if len(parts) > 1:
                name = parts[1].split('/')[0].split('?')[0]
                return name.replace('-', ' ').replace('_', ' ').title()
        
        # Instagram Hashtags
        if 'instagram.com/explore/tags/' in url_lower:
            parts = url_lower.split('tags/')
            if len(parts) > 1:
                tag = parts[1].split('/')[0].split('?')[0]
                return f'#{tag}'
        
        # LinkedIn Gruppen
        if 'linkedin.com/groups/' in url_lower:
            parts = url_lower.split('groups/')
            if len(parts) > 1:
                name = parts[1].split('/')[0].split('?')[0]
                return name.replace('-', ' ').replace('_', ' ').title()
        
        # Twitter/X Hashtags
        if 'twitter.com/hashtag/' in url_lower or 'x.com/hashtag/' in url_lower:
            parts = url_lower.split('hashtag/')
            if len(parts) > 1:
                tag = parts[1].split('/')[0].split('?')[0]
                return f'#{tag}'
        
        # Fallback: Letzter Teil der URL
        parts = url_lower.split('/')
        if len(parts) > 1:
            return parts[-1].split('?')[0].replace('-', ' ').replace('_', ' ').title()
        
        return url
    
    def _guess_category(self, url: str, name: str = None) -> str:
        """
        Rät die Kategorie basierend auf URL/Name.
        
        Args:
            url: URL der Quelle
            name: Optionaler Name
            
        Returns:
            Geschätzte Kategorie
        """
        text = f"{url} {name or ''}".lower()
        
        # Fitness & Sport
        if any(w in text for w in ['fitness', 'gym', 'workout', 'sport', 'training', 'bodybuilding']):
            return 'fitness'
        
        # Gesundheit & Wellness
        if any(w in text for w in ['health', 'gesund', 'wellness', 'ernährung', 'nutrition', 'biohack']):
            return 'health'
        
        # Business & Entrepreneurship
        if any(w in text for w in ['business', 'entrepreneur', 'unternehmer', 'startup', 'gründer']):
            return 'business'
        
        # Network Marketing / MLM
        if any(w in text for w in ['network', 'mlm', 'vertrieb', 'direct sales', 'multi level']):
            return 'network_marketing'
        
        # Immobilien
        if any(w in text for w in ['immobilien', 'real estate', 'property', 'wohnen', 'haus']):
            return 'real_estate'
        
        # Finance
        if any(w in text for w in ['finance', 'finanz', 'geld', 'investment', 'trading', 'krypto']):
            return 'finance'
        
        # Coaching
        if any(w in text for w in ['coaching', 'mentor', 'persönlichkeitsentwicklung', 'selbsthilfe']):
            return 'coaching'
        
        return 'other'
    
    def _extract_tags(self, url: str, name: str = None) -> List[str]:
        """
        Extrahiert Tags aus URL/Name.
        
        Args:
            url: URL der Quelle
            name: Optionaler Name
            
        Returns:
            Liste von Tags
        """
        text = f"{url} {name or ''}".lower()
        tags = []
        
        # Regionale Tags
        if any(w in text for w in ['dach', 'deutschland', 'germany', 'deutsch']):
            tags.append('dach')
        if any(w in text for w in ['österreich', 'austria', 'wien', 'vienna']):
            tags.append('österreich')
        if any(w in text for w in ['schweiz', 'switzerland', 'zürich', 'zurich']):
            tags.append('schweiz')
        
        # Kategorie-Tags
        keywords = ['fitness', 'health', 'business', 'network', 'mlm', 'finance', 'coaching']
        for kw in keywords:
            if kw in text:
                tags.append(kw)
        
        return tags
    
    def detect_source_type(self, url: str) -> Optional[str]:
        """
        Erkennt den Typ der Quelle aus der URL.
        
        Args:
            url: URL der Quelle
            
        Returns:
            source_type oder None
        """
        url_lower = url.lower()
        
        if 'facebook.com/groups/' in url_lower:
            return 'facebook_group'
        if 'instagram.com/explore/tags/' in url_lower:
            return 'instagram_hashtag'
        if 'linkedin.com/groups/' in url_lower:
            return 'linkedin_group'
        if 'twitter.com/hashtag/' in url_lower or 'x.com/hashtag/' in url_lower:
            return 'twitter_hashtag'
        if 'facebook.com/' in url_lower:
            return 'facebook_page'
        if 'instagram.com/' in url_lower:
            return 'instagram_profile'
        if 'linkedin.com/' in url_lower:
            return 'linkedin_profile'
        
        return None
    
    def is_social_group_url(self, url: str) -> bool:
        """
        Prüft ob URL eine Social Media Gruppe/Hashtag ist.
        
        Args:
            url: URL zum Prüfen
            
        Returns:
            True wenn es eine Social Media Gruppe/Hashtag ist
        """
        source_type = self.detect_source_type(url)
        return source_type in [
            'facebook_group',
            'instagram_hashtag',
            'linkedin_group',
            'twitter_hashtag'
        ]

