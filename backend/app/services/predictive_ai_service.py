"""
═══════════════════════════════════════════════════════════════════════════
PREDICTIVE AI SERVICE
═══════════════════════════════════════════════════════════════════════════
AI-basierte Vorhersagen für Lead-Scoring und optimales Timing.

Features:
- Win Probability Calculation (0-100%)
- Optimal Contact Time Prediction
- Historical Pattern Analysis
- Factor-based Scoring (BANT, Engagement, Personality, Source, etc.)

Version: 1.0.0 (Premium Feature)
═══════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from app.core.supabase import get_supabase_client
from app.utils.logger import get_logger
import json

logger = get_logger(__name__)


class PredictiveAIService:
    """
    Predictive analytics for lead scoring and optimal timing.
    """
    
    def __init__(self, supabase=None):
        self.supabase = supabase or get_supabase_client()
    
    async def calculate_win_probability(self, lead_id: str) -> Dict:
        """
        Calculate probability of winning this lead (0-100%).
        
        Factors:
        - BANT score (40%)
        - Engagement level (20%)
        - Personality match (15%)
        - Source quality (10%)
        - Response speed (10%)
        - Historical patterns (5%)
        
        Returns:
        {
            "win_probability": 75,
            "confidence": "high",
            "factors": {"bant": 36, "engagement": 15, ...},
            "recommendations": [...]
        }
        """
        try:
            # Get lead data with all related info
            lead = self.supabase.table('leads').select('*').eq('id', lead_id).execute()
            
            if not lead.data:
                return {
                    "win_probability": 0,
                    "confidence": "low",
                    "factors": {},
                    "recommendations": ["Lead nicht gefunden"]
                }
            
            lead_data = lead.data[0]
            
            # Get BANT assessment
            bant = self.supabase.table('bant_assessments').select('*').eq('lead_id', lead_id).execute()
            bant_data = bant.data[0] if bant.data else None
            
            # Get personality profile
            personality = self.supabase.table('personality_profiles').select('*').eq('lead_id', lead_id).execute()
            personality_data = personality.data[0] if personality.data else None
            
            # Get activities count
            activities = self.supabase.table('activities').select('id').eq('lead_id', lead_id).execute()
            activity_count = len(activities.data) if activities.data else 0
            
            # Get messages count (if messages table exists)
            # For now, we'll skip this
            message_count = 0
            
            # Calculate factor scores
            scores = {}
            
            # 1. BANT Score (40%)
            bant_score = bant_data['total_score'] if bant_data else 0
            scores['bant'] = (bant_score / 100) * 40
            
            # 2. Engagement Level (20%)
            engagement_score = min((activity_count + message_count) / 10, 1) * 20
            scores['engagement'] = engagement_score
            
            # 3. Personality Match (15%)
            personality_confidence = personality_data['confidence_score'] if personality_data else 0
            scores['personality'] = personality_confidence * 15
            
            # 4. Source Quality (10%)
            source_scores = {
                'referral': 10,
                'linkedin': 8,
                'instagram': 6,
                'facebook': 6,
                'manual': 5,
                'cold_call': 3,
                'instagram_auto': 7,
                'linkedin_auto': 8
            }
            source = lead_data.get('source', 'manual')
            scores['source'] = source_scores.get(source, 5)
            
            # 5. Response Speed (10%)
            avg_response_time = await self._get_avg_response_time(lead_id)
            if avg_response_time:
                if avg_response_time < 3600:  # < 1 hour
                    scores['response_speed'] = 10
                elif avg_response_time < 86400:  # < 1 day
                    scores['response_speed'] = 7
                else:
                    scores['response_speed'] = 3
            else:
                scores['response_speed'] = 5
            
            # 6. Historical Patterns (5%)
            similar_wins = await self._find_similar_won_leads(lead_data, bant_data, personality_data)
            scores['historical'] = (min(similar_wins, 10) / 10) * 5
            
            # Calculate total win probability
            win_probability = int(sum(scores.values()))
            
            # Determine confidence level
            if bant_data and personality_data:
                confidence = "high"
            elif bant_data or personality_data:
                confidence = "medium"
            else:
                confidence = "low"
            
            # Generate recommendations
            recommendations = self._generate_recommendations(win_probability, lead_data, bant_data)
            
            # Cache result
            await self._cache_win_probability(
                lead_id=lead_id,
                win_probability=win_probability,
                confidence=confidence,
                factors=scores,
                recommendations=recommendations
            )
            
            return {
                "win_probability": win_probability,
                "confidence": confidence,
                "factors": scores,
                "recommendations": recommendations
            }
        
        except Exception as e:
            logger.error(f"Error calculating win probability: {str(e)}", exc_info=True)
            return {
                "win_probability": 0,
                "confidence": "low",
                "factors": {},
                "recommendations": ["Fehler bei der Berechnung"],
                "error": str(e)
            }
    
    async def get_optimal_contact_time(
        self,
        lead_id: str,
        user_id: str
    ) -> Dict:
        """
        Predict optimal time to contact lead based on historical patterns.
        
        Returns:
        {
            "optimal_day": "Tuesday",
            "optimal_hour": 19,
            "confidence": "high",
            "suggestion": "Best time: Tuesday around 19:00"
        }
        """
        try:
            # Check if we have cached prediction
            cached = self.supabase.table('optimal_contact_times').select('*').eq('lead_id', lead_id).execute()
            
            if cached.data:
                cached_data = cached.data[0]
                # If cached within last 7 days, return it
                calculated_at = datetime.fromisoformat(cached_data['calculated_at'].replace('Z', '+00:00'))
                if datetime.now() - calculated_at < timedelta(days=7):
                    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    return {
                        "optimal_day": day_names[cached_data['optimal_day_of_week']],
                        "optimal_hour": cached_data['optimal_hour'],
                        "confidence": cached_data['confidence'],
                        "suggestion": cached_data['suggestion']
                    }
            
            # Calculate new prediction
            # For now, return default best practice
            # TODO: Implement actual pattern analysis from message/activity history
            
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            optimal_day = 1  # Tuesday
            optimal_hour = 19  # 7 PM
            
            # Cache result
            await self._cache_optimal_time(
                lead_id=lead_id,
                user_id=user_id,
                optimal_day=optimal_day,
                optimal_hour=optimal_hour,
                confidence="medium",
                suggestion=f"Best time: {day_names[optimal_day]} around {optimal_hour}:00"
            )
            
            return {
                "optimal_day": day_names[optimal_day],
                "optimal_hour": optimal_hour,
                "confidence": "medium",
                "suggestion": f"Best time: {day_names[optimal_day]} around {optimal_hour}:00 (based on general best practices)"
            }
        
        except Exception as e:
            logger.error(f"Error getting optimal contact time: {str(e)}")
            return {
                "optimal_day": "Tuesday",
                "optimal_hour": 19,
                "confidence": "low",
                "suggestion": "Default: Tuesday evening (19:00-21:00)",
                "error": str(e)
            }
    
    async def _get_avg_response_time(self, lead_id: str) -> Optional[float]:
        """
        Calculate average response time in seconds.
        This is a simplified version - in production you'd track actual message timestamps.
        """
        try:
            # Get activities with timestamps
            activities = self.supabase.table('activities').select('created_at, activity_date').eq('lead_id', lead_id).order('activity_date').execute()
            
            if not activities.data or len(activities.data) < 2:
                return None
            
            # Calculate avg time between activities
            times = []
            for i in range(len(activities.data) - 1):
                time1 = datetime.fromisoformat(activities.data[i]['activity_date'].replace('Z', '+00:00'))
                time2 = datetime.fromisoformat(activities.data[i+1]['activity_date'].replace('Z', '+00:00'))
                diff = (time2 - time1).total_seconds()
                if diff > 0:  # Only positive diffs
                    times.append(diff)
            
            if times:
                return sum(times) / len(times)
            
            return None
        
        except Exception as e:
            logger.error(f"Error calculating avg response time: {str(e)}")
            return None
    
    async def _find_similar_won_leads(
        self,
        lead_data: Dict,
        bant_data: Optional[Dict],
        personality_data: Optional[Dict]
    ) -> int:
        """
        Find count of similar leads that were won.
        """
        try:
            query = self.supabase.table('leads').select('id').eq('status', 'won')
            
            # Filter by source
            if lead_data.get('source'):
                query = query.eq('source', lead_data['source'])
            
            result = query.execute()
            
            # For now, simple count
            # TODO: Add more sophisticated matching (personality type, BANT traffic light, etc.)
            
            return len(result.data) if result.data else 0
        
        except Exception as e:
            logger.error(f"Error finding similar won leads: {str(e)}")
            return 0
    
    def _generate_recommendations(
        self,
        win_probability: int,
        lead_data: Dict,
        bant_data: Optional[Dict]
    ) -> List[str]:
        """Generate action recommendations based on win probability."""
        recommendations = []
        
        if win_probability >= 80:
            recommendations.append("🔥 HOT LEAD! Priorität: Sofort Call buchen")
            recommendations.append("📄 Angebot vorbereiten")
            recommendations.append("⏰ Follow-up innerhalb 24h")
        elif win_probability >= 60:
            recommendations.append("👍 Guter Lead. Nächster Schritt: Qualifikation vertiefen")
            if not bant_data:
                recommendations.append("📊 DEAL-MEDIC durchführen")
            recommendations.append("📞 Follow-up in 2-3 Tagen")
        elif win_probability >= 40:
            recommendations.append("⚠️ Warm Lead. Needs warming up")
            recommendations.append("💬 Wertvolle Inhalte teilen (Nurture)")
            recommendations.append("🔍 Mehr über Bedürfnisse herausfinden")
        else:
            recommendations.append("❄️ Cold Lead. Long-term Nurture")
            recommendations.append("📧 Email-Sequenz starten")
            recommendations.append("🔄 Re-qualifizieren in 2 Wochen")
        
        return recommendations
    
    async def _cache_win_probability(
        self,
        lead_id: str,
        win_probability: int,
        confidence: str,
        factors: Dict,
        recommendations: List[str]
    ):
        """Cache win probability calculation."""
        try:
            cache_data = {
                'lead_id': lead_id,
                'win_probability': win_probability,
                'confidence': confidence,
                'factors': json.dumps(factors),
                'recommendations': recommendations,
                'last_calculated_at': datetime.now().isoformat()
            }
            
            self.supabase.table('lead_win_probability').upsert(cache_data, on_conflict='lead_id').execute()
        
        except Exception as e:
            logger.error(f"Error caching win probability: {str(e)}")
    
    async def _cache_optimal_time(
        self,
        lead_id: str,
        user_id: str,
        optimal_day: int,
        optimal_hour: int,
        confidence: str,
        suggestion: str
    ):
        """Cache optimal contact time."""
        try:
            cache_data = {
                'lead_id': lead_id,
                'user_id': user_id,
                'optimal_day_of_week': optimal_day,
                'optimal_hour': optimal_hour,
                'confidence': confidence,
                'based_on_pattern_count': 0,  # TODO: Actual count
                'suggestion': suggestion,
                'calculated_at': datetime.now().isoformat()
            }
            
            # Check if exists, then upsert
            existing = self.supabase.table('optimal_contact_times').select('id').eq('lead_id', lead_id).eq('user_id', user_id).execute()
            
            if existing.data:
                self.supabase.table('optimal_contact_times').update(cache_data).eq('id', existing.data[0]['id']).execute()
            else:
                self.supabase.table('optimal_contact_times').insert(cache_data).execute()
        
        except Exception as e:
            logger.error(f"Error caching optimal time: {str(e)}")
    
    async def get_lead_score_breakdown(self, lead_id: str) -> Dict:
        """
        Get detailed breakdown of lead scoring factors.
        Useful for understanding WHY a lead has a certain win probability.
        """
        try:
            win_prob = await self.calculate_win_probability(lead_id)
            
            # Get additional context
            lead = self.supabase.table('leads').select('*').eq('id', lead_id).execute()
            bant = self.supabase.table('bant_assessments').select('*').eq('lead_id', lead_id).execute()
            personality = self.supabase.table('personality_profiles').select('*').eq('lead_id', lead_id).execute()
            
            return {
                "lead_id": lead_id,
                "lead_name": lead.data[0]['name'] if lead.data else 'Unknown',
                "win_probability": win_prob['win_probability'],
                "confidence": win_prob['confidence'],
                "factors": win_prob['factors'],
                "recommendations": win_prob['recommendations'],
                "bant_status": bant.data[0]['traffic_light'] if bant.data else 'unknown',
                "personality_type": personality.data[0]['primary_type'] if personality.data else 'unknown',
                "lead_status": lead.data[0]['status'] if lead.data else 'unknown'
            }
        
        except Exception as e:
            logger.error(f"Error getting lead score breakdown: {str(e)}")
            return {
                "error": str(e)
            }

