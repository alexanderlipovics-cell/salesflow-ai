"""
User Learning Service - Automatisches Lernen aus erfolgreichen Conversions

Dieser Service analysiert erfolgreiche Conversions und passt das User Learning Profile
automatisch an, basierend auf:
- Erfolgreichen Nachrichten/Strategien
- Conversion-Patterns
- User-Feedback
- Bearbeitete AI-Antworten
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ConversionEvent:
    """Ein erfolgreiches Conversion-Event"""
    user_id: str
    lead_id: Optional[str]
    conversion_type: str  # 'sale', 'meeting', 'signup', etc.
    channel: str  # 'whatsapp', 'email', 'dm', etc.
    message_template_id: Optional[str]
    message_text: Optional[str]
    conversion_value: Optional[float]
    occurred_at: datetime
    metadata: Dict[str, Any]


@dataclass
class LearningInsight:
    """Erkenntnis aus Conversions"""
    pattern_type: str  # 'tone', 'length', 'style', 'emoji', etc.
    successful_value: Any
    confidence: float  # 0.0-1.0
    sample_size: int


class UserLearningService:
    """Service für automatisches Lernen aus Conversions"""
    
    def __init__(self, db_client):
        self.db = db_client
    
    async def analyze_conversions(
        self,
        user_id: str,
        days_back: int = 30,
    ) -> List[LearningInsight]:
        """
        Analysiert erfolgreiche Conversions und extrahiert Patterns.
        
        Args:
            user_id: User ID
            days_back: Anzahl Tage zurück für Analyse
            
        Returns:
            Liste von Learning Insights
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Hole erfolgreiche Conversions
            conversions = await self._get_successful_conversions(user_id, cutoff_date)
            
            if not conversions:
                logger.info(f"No conversions found for user {user_id}")
                return []
            
            # Analysiere Patterns
            insights = []
            
            # 1. Channel-Analyse
            channel_insight = self._analyze_channels(conversions)
            if channel_insight:
                insights.append(channel_insight)
            
            # 2. Message-Length-Analyse
            length_insight = self._analyze_message_lengths(conversions)
            if length_insight:
                insights.append(length_insight)
            
            # 3. Emoji-Analyse
            emoji_insight = self._analyze_emoji_usage(conversions)
            if emoji_insight:
                insights.append(emoji_insight)
            
            # 4. Tone-Analyse (aus Message-Text)
            tone_insight = self._analyze_tone(conversions)
            if tone_insight:
                insights.append(tone_insight)
            
            logger.info(f"Generated {len(insights)} learning insights for user {user_id}")
            return insights
            
        except Exception as e:
            logger.warning(f"Could not analyze conversions: {e}")
            return []
    
    async def update_profile_from_conversions(
        self,
        user_id: str,
        days_back: int = 30,
        min_conversions: int = 5,
    ) -> bool:
        """
        Aktualisiert User Learning Profile basierend auf erfolgreichen Conversions.
        
        Args:
            user_id: User ID
            days_back: Anzahl Tage zurück für Analyse
            min_conversions: Minimum Conversions für Update
            
        Returns:
            True wenn Update erfolgreich
        """
        try:
            insights = await self.analyze_conversions(user_id, days_back)
            
            if not insights:
                return False
            
            # Prüfe Sample Size
            total_conversions = sum(i.sample_size for i in insights)
            if total_conversions < min_conversions:
                logger.info(f"Not enough conversions ({total_conversions} < {min_conversions})")
                return False
            
            # Baue Updates
            updates = {}
            
            for insight in insights:
                if insight.confidence < 0.6:  # Nur bei hoher Confidence
                    continue
                
                if insight.pattern_type == 'message_length':
                    updates['avg_message_length'] = int(insight.successful_value)
                elif insight.pattern_type == 'emoji_usage':
                    updates['emoji_usage_level'] = int(insight.successful_value)
                elif insight.pattern_type == 'tone':
                    updates['preferred_tone'] = insight.successful_value
                elif insight.pattern_type == 'formality':
                    updates['formality_score'] = float(insight.successful_value)
            
            if not updates:
                return False
            
            # Update Profile
            result = self.db.table("user_learning_profile").update(updates).eq("user_id", user_id).execute()
            
            logger.info(f"Updated user profile from conversions: {updates}")
            return True
            
        except Exception as e:
            logger.warning(f"Could not update profile from conversions: {e}")
            return False
    
    async def _get_successful_conversions(
        self,
        user_id: str,
        cutoff_date: datetime,
    ) -> List[ConversionEvent]:
        """Holt erfolgreiche Conversions aus der Datenbank"""
        try:
            # Suche nach Conversions in verschiedenen Tabellen
            conversions = []
            
            # 1. Leads mit Status 'customer' oder 'partner'
            leads_result = self.db.table("leads").select(
                "id, name, status, converted_at, last_contact, notes"
            ).eq("user_id", user_id).in_(
                "status", ["customer", "partner", "signed"]
            ).gte("converted_at", cutoff_date.isoformat()).execute()
            
            for lead in leads_result.data or []:
                conversions.append(ConversionEvent(
                    user_id=user_id,
                    lead_id=lead.get("id"),
                    conversion_type="sale",
                    channel="unknown",
                    message_template_id=None,
                    message_text=lead.get("notes"),
                    conversion_value=None,
                    occurred_at=datetime.fromisoformat(lead.get("converted_at") or lead.get("last_contact")),
                    metadata={"status": lead.get("status")},
                ))
            
            # 2. Message Events mit erfolgreichen Outcomes
            # (wenn message_events Tabelle Outcome-Tracking hat)
            try:
                events_result = self.db.table("message_events").select(
                    "id, contact_id, channel, normalized_text, created_at, raw_payload"
                ).eq("user_id", user_id).gte(
                    "created_at", cutoff_date.isoformat()
                ).execute()
                
                # Filtere nach erfolgreichen Outcomes (falls im raw_payload)
                for event in events_result.data or []:
                    payload = event.get("raw_payload") or {}
                    if payload.get("outcome") in ["converted", "meeting_scheduled", "positive_response"]:
                        conversions.append(ConversionEvent(
                            user_id=user_id,
                            lead_id=event.get("contact_id"),
                            conversion_type=payload.get("outcome", "converted"),
                            channel=event.get("channel", "unknown"),
                            message_template_id=payload.get("template_id"),
                            message_text=event.get("normalized_text"),
                            conversion_value=None,
                            occurred_at=datetime.fromisoformat(event.get("created_at")),
                            metadata=payload,
                        ))
            except Exception:
                pass  # Tabelle existiert möglicherweise nicht
            
            return conversions
            
        except Exception as e:
            logger.warning(f"Could not get conversions: {e}")
            return []
    
    def _analyze_channels(self, conversions: List[ConversionEvent]) -> Optional[LearningInsight]:
        """Analysiert welche Channels erfolgreich sind"""
        if not conversions:
            return None
        
        channel_counts = {}
        for conv in conversions:
            channel_counts[conv.channel] = channel_counts.get(conv.channel, 0) + 1
        
        if not channel_counts:
            return None
        
        # Finde erfolgreichsten Channel
        best_channel = max(channel_counts.items(), key=lambda x: x[1])
        total = len(conversions)
        confidence = best_channel[1] / total if total > 0 else 0
        
        return LearningInsight(
            pattern_type="channel",
            successful_value=best_channel[0],
            confidence=confidence,
            sample_size=total,
        )
    
    def _analyze_message_lengths(self, conversions: List[ConversionEvent]) -> Optional[LearningInsight]:
        """Analysiert erfolgreiche Nachrichtenlängen"""
        lengths = []
        for conv in conversions:
            if conv.message_text:
                lengths.append(len(conv.message_text))
        
        if not lengths:
            return None
        
        avg_length = sum(lengths) / len(lengths)
        confidence = min(len(lengths) / 10, 1.0)  # Mehr Conversions = höhere Confidence
        
        return LearningInsight(
            pattern_type="message_length",
            successful_value=avg_length,
            confidence=confidence,
            sample_size=len(lengths),
        )
    
    def _analyze_emoji_usage(self, conversions: List[ConversionEvent]) -> Optional[LearningInsight]:
        """Analysiert Emoji-Nutzung in erfolgreichen Nachrichten"""
        emoji_counts = []
        for conv in conversions:
            if conv.message_text:
                emoji_count = sum(1 for char in conv.message_text if ord(char) > 127 and char in "😀😁😂😃😄😅😆😇😈😉😊😋😌😍😎😏")
                emoji_counts.append(min(emoji_count, 5))  # Cap bei 5
        
        if not emoji_counts:
            return None
        
        avg_emoji = sum(emoji_counts) / len(emoji_counts)
        confidence = min(len(emoji_counts) / 10, 1.0)
        
        return LearningInsight(
            pattern_type="emoji_usage",
            successful_value=round(avg_emoji),
            confidence=confidence,
            sample_size=len(emoji_counts),
        )
    
    def _analyze_tone(self, conversions: List[ConversionEvent]) -> Optional[LearningInsight]:
        """Analysiert Ton aus erfolgreichen Nachrichten (vereinfacht)"""
        # Vereinfachte Analyse: Zähle "du" vs "Sie"
        du_count = 0
        sie_count = 0
        
        for conv in conversions:
            if conv.message_text:
                text_lower = conv.message_text.lower()
                if " du " in text_lower or "dich" in text_lower or "dir" in text_lower:
                    du_count += 1
                if " sie " in text_lower or "ihnen" in text_lower:
                    sie_count += 1
        
        if du_count + sie_count == 0:
            return None
        
        # Bestimme Tone
        if du_count > sie_count * 1.5:
            tone = "friendly"
            confidence = min(du_count / (du_count + sie_count), 1.0)
        elif sie_count > du_count * 1.5:
            tone = "formal"
            confidence = min(sie_count / (du_count + sie_count), 1.0)
        else:
            tone = "professional"
            confidence = 0.5
        
        return LearningInsight(
            pattern_type="tone",
            successful_value=tone,
            confidence=confidence,
            sample_size=du_count + sie_count,
        )

