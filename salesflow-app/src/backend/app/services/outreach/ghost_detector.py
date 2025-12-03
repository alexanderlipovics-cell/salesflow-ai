"""
Ghost Detector - Erkennt "Gelesen aber keine Antwort" und generiert Follow-ups
Speziell für MLM Social Media Akquise
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging
import anthropic

from supabase import Client

logger = logging.getLogger(__name__)


class GhostDetector:
    """
    Erkennt Ghost-Kontakte und generiert intelligente Follow-up Vorschläge
    """
    
    # Standard Ghost-Schwellen
    GHOST_THRESHOLDS = {
        'instagram': 24,   # 24h ohne Antwort nach "Gesehen"
        'facebook': 24,
        'linkedin': 48,    # LinkedIn ist langsamer
        'whatsapp': 12,    # WhatsApp erwartet schnellere Antworten
        'telegram': 12,
        'default': 24
    }
    
    # Follow-up Intervalle
    FOLLOWUP_INTERVALS = [
        {'hours': 24, 'step': 1, 'tone': 'soft'},
        {'hours': 72, 'step': 2, 'tone': 'value'},
        {'hours': 168, 'step': 3, 'tone': 'direct'},  # 7 Tage
    ]
    
    def __init__(self, supabase: Client, anthropic_key: Optional[str] = None):
        self.supabase = supabase
        self.anthropic = anthropic.Anthropic(api_key=anthropic_key) if anthropic_key else None
    
    async def detect_new_ghosts(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Finde alle Nachrichten die neu als Ghost markiert werden sollten
        """
        
        query = self.supabase.table('outreach_messages')\
            .select('*')\
            .eq('is_ghost', False)\
            .not_.is_('seen_at', 'null')\
            .is_('replied_at', 'null')\
            .not_.in_('status', ['replied', 'positive', 'negative', 'converted', 'blocked'])
        
        if user_id:
            query = query.eq('user_id', user_id)
        
        result = query.execute()
        
        new_ghosts = []
        now = datetime.utcnow()
        
        for msg in (result.data or []):
            seen_at_str = msg.get('seen_at')
            if not seen_at_str:
                continue
            
            seen_at = datetime.fromisoformat(seen_at_str.replace('Z', '+00:00')).replace(tzinfo=None)
            platform = msg.get('platform', 'default')
            threshold = self.GHOST_THRESHOLDS.get(platform, self.GHOST_THRESHOLDS['default'])
            
            hours_since_seen = (now - seen_at).total_seconds() / 3600
            
            if hours_since_seen >= threshold:
                msg['ghost_hours'] = int(hours_since_seen)
                msg['threshold_hours'] = threshold
                new_ghosts.append(msg)
        
        return new_ghosts
    
    async def mark_ghosts_and_queue_followups(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Markiere neue Ghosts und erstelle Follow-up Queue Einträge
        Sollte als Cron-Job alle 15-30 Minuten laufen
        """
        
        new_ghosts = await self.detect_new_ghosts(user_id)
        
        marked_count = 0
        queued_count = 0
        
        for ghost in new_ghosts:
            # Markiere als Ghost
            self.supabase.table('outreach_messages')\
                .update({
                    'is_ghost': True,
                    'ghost_since': ghost.get('seen_at'),
                    'status': 'no_response',
                    'next_followup_at': (datetime.utcnow() + timedelta(hours=24)).isoformat()
                })\
                .eq('id', ghost['id'])\
                .execute()
            
            marked_count += 1
            
            # Erstelle Queue-Eintrag (wenn nicht schon vorhanden)
            existing = self.supabase.table('ghost_followup_queue')\
                .select('id')\
                .eq('outreach_id', ghost['id'])\
                .eq('status', 'pending')\
                .execute()
            
            if not existing.data:
                # Generiere Vorschlag
                suggested_message = await self.generate_followup_message(ghost, step=1)
                
                self.supabase.table('ghost_followup_queue').insert({
                    'user_id': ghost['user_id'],
                    'outreach_id': ghost['id'],
                    'scheduled_for': datetime.utcnow().isoformat(),
                    'priority': 8,  # Erstes Follow-up hat hohe Prio
                    'suggested_message': suggested_message,
                    'context': {
                        'platform': ghost.get('platform'),
                        'contact_name': ghost.get('contact_name'),
                        'contact_handle': ghost.get('contact_handle'),
                        'original_message': ghost.get('message_preview'),
                        'ghost_hours': ghost.get('ghost_hours'),
                        'followup_step': 1
                    }
                }).execute()
                
                queued_count += 1
            
            # Update daily stats
            self.supabase.rpc('increment_outreach_stat', {
                'p_user_id': ghost['user_id'],
                'p_date': datetime.utcnow().date().isoformat(),
                'p_field': 'new_ghosts'
            }).execute()
        
        logger.info(f"Ghost detection completed: {marked_count} marked, {queued_count} queued")
        
        return {
            'new_ghosts_marked': marked_count,
            'followups_queued': queued_count,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    async def generate_followup_message(
        self,
        outreach: Dict[str, Any],
        step: int = 1,
        custom_context: Optional[str] = None
    ) -> str:
        """
        Generiere plattform-spezifische Follow-up Nachricht mit CHIEF/Claude
        """
        
        platform = outreach.get('platform', 'instagram')
        contact_name = outreach.get('contact_name', 'du')
        first_name = contact_name.split()[0] if contact_name else 'du'
        original_message = outreach.get('message_preview', '')
        ghost_hours = outreach.get('ghost_hours', 24)
        
        # Plattform-spezifische Tonalität
        platform_tone = {
            'instagram': 'casual, mit Emojis, kurz und direkt, Duzen',
            'facebook': 'freundlich, persönlich, Duzen',
            'linkedin': 'professionell aber persönlich, Sie oder Du je nach Kontext',
            'whatsapp': 'sehr casual, wie mit einem Bekannten, kurz',
            'telegram': 'casual, direkt',
        }
        
        tone = platform_tone.get(platform, 'freundlich und direkt')
        
        # Step-spezifische Strategie
        step_strategies = {
            1: "Sanftes Nachfassen. Nicht aufdringlich, eher 'hab gesehen du hast gelesen - alles gut?'",
            2: "Value Drop. Teile etwas Interessantes/Nützliches ohne direkt zu fragen.",
            3: "Direkte Frage. Höflich aber klar: 'Interesse ja oder nein?' um Klarheit zu bekommen."
        }
        
        strategy = step_strategies.get(step, step_strategies[1])
        
        # Fallback wenn kein AI verfügbar
        if not self.anthropic:
            return self._get_fallback_message(platform, first_name, step)
        
        prompt = f"""Schreibe eine Follow-up Nachricht für Social Media (MLM-Akquise).

KONTEXT:
- Plattform: {platform}
- Kontakt: {first_name}
- Ursprüngliche Nachricht (Auszug): {original_message[:200] if original_message else 'Kaltakquise'}
- Gelesen vor: {ghost_hours} Stunden, keine Antwort
- Follow-up Nummer: {step}
{f'- Zusätzlicher Kontext: {custom_context}' if custom_context else ''}

STRATEGIE für Follow-up #{step}:
{strategy}

TONALITÄT:
{tone}

WICHTIGE REGELN:
1. NUR die Nachricht selbst, keine Erklärungen
2. Maximal 3-4 Sätze
3. Kein "Ich hoffe es geht dir gut" oder ähnliche Floskeln
4. Keine Entschuldigung fürs Nachfassen
5. Authentisch und nicht wie Copy-Paste
6. Name am Anfang einbauen

Nachricht:"""

        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return response.content[0].text.strip()
            
        except Exception as e:
            logger.error(f"Error generating follow-up: {e}")
            return self._get_fallback_message(platform, first_name, step)
    
    def _get_fallback_message(self, platform: str, name: str, step: int) -> str:
        """Fallback-Templates wenn AI nicht verfügbar"""
        
        templates = {
            'instagram': {
                1: f"Hey {name}! 👋 Hab gesehen du hast meine Nachricht gelesen - alles gut wenn gerade viel los ist! Falls du doch mal schauen willst, sag einfach Bescheid 😊",
                2: f"Nochmal ich 😄 Wollte dir kurz was zeigen was bei mir gerade mega läuft - wenn's dich interessiert, schick mir einfach ein 👍",
                3: f"Hey {name}, letzte Nachricht von mir zu dem Thema 😊 Interesse ja oder nein? Dann weiß ich Bescheid und nerve nicht weiter ✌️"
            },
            'linkedin': {
                1: f"Hallo {name}, ich wollte kurz nachfassen - haben Sie meine letzte Nachricht gesehen? Falls das Timing gerade nicht passt, verstehe ich das vollkommen.",
                2: f"Noch ein kurzer Gedanke, {name}: {name}'s Background passt gut zu dem was wir machen. Wäre ein 15-Min Call interessant?",
                3: f"Hallo {name}, ich möchte respektvoll nachfragen: Ist das Thema 'zusätzliches Einkommen' aktuell relevant für Sie? Falls nein, kein Problem - dann streiche ich Sie von meiner Liste."
            },
            'whatsapp': {
                1: f"Hey {name}! Alles klar bei dir? Hatte dir letztens geschrieben 😊",
                2: f"{name}, kurze Frage: Hast du 5 Min diese Woche? Will dir was zeigen 💡",
                3: f"Hey! Ja oder nein - was meinst du? 😄"
            }
        }
        
        platform_templates = templates.get(platform, templates['instagram'])
        return platform_templates.get(step, platform_templates[1])
    
    async def get_ghost_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Zusammenfassung der Ghost-Situation für Dashboard
        """
        
        # Aktuelle Ghosts
        ghosts_result = self.supabase.table('outreach_messages')\
            .select('platform, ghost_since, ghost_followup_count')\
            .eq('user_id', user_id)\
            .eq('is_ghost', True)\
            .execute()
        
        ghosts = ghosts_result.data or []
        
        # Nach Plattform gruppieren
        by_platform = {}
        for g in ghosts:
            p = g.get('platform', 'other')
            by_platform[p] = by_platform.get(p, 0) + 1
        
        # Anstehende Follow-ups
        queue_result = self.supabase.table('ghost_followup_queue')\
            .select('scheduled_for, priority')\
            .eq('user_id', user_id)\
            .eq('status', 'pending')\
            .execute()
        
        queue = queue_result.data or []
        urgent = [q for q in queue if q.get('priority', 0) >= 7]
        
        # Konvertierte Ghosts (letzte 7 Tage)
        week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        converted_result = self.supabase.table('outreach_messages')\
            .select('id')\
            .eq('user_id', user_id)\
            .gte('replied_at', week_ago)\
            .not_.is_('ghost_since', 'null')\
            .execute()
        
        return {
            'total_ghosts': len(ghosts),
            'by_platform': by_platform,
            'pending_followups': len(queue),
            'urgent_followups': len(urgent),
            'ghosts_converted_this_week': len(converted_result.data or []),
            'oldest_ghost_hours': max(
                [(datetime.utcnow() - datetime.fromisoformat(g['ghost_since'].replace('Z', '+00:00')).replace(tzinfo=None)).total_seconds() / 3600 
                 for g in ghosts if g.get('ghost_since')],
                default=0
            )
        }
    
    async def bulk_generate_followups(
        self,
        user_id: str,
        platform: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Generiere Follow-up Vorschläge für mehrere Ghosts auf einmal
        """
        
        query = self.supabase.table('outreach_messages')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('is_ghost', True)\
            .is_('replied_at', 'null')\
            .order('seen_at')\
            .limit(limit)
        
        if platform:
            query = query.eq('platform', platform)
        
        result = query.execute()
        
        suggestions = []
        for ghost in (result.data or []):
            step = (ghost.get('ghost_followup_count', 0) or 0) + 1
            if step > 3:
                continue  # Max 3 Follow-ups
            
            message = await self.generate_followup_message(ghost, step=step)
            
            suggestions.append({
                'outreach_id': ghost['id'],
                'contact_name': ghost.get('contact_name'),
                'contact_handle': ghost.get('contact_handle'),
                'platform': ghost.get('platform'),
                'ghost_hours': int((datetime.utcnow() - datetime.fromisoformat(ghost['seen_at'].replace('Z', '+00:00')).replace(tzinfo=None)).total_seconds() / 3600),
                'followup_step': step,
                'suggested_message': message,
                'original_message_preview': ghost.get('message_preview', '')[:100]
            })
        
        return suggestions

