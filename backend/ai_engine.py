import os
from typing import List, Dict, Optional, Tuple
import openai
from supabase import Client
import logging

logger = logging.getLogger(__name__)

class AIEngine:
    """
    AI Engine for Sales Flow AI
    Handles embeddings, semantic search, and intelligent matching
    """
    
    def __init__(self, supabase_client: Client, openai_api_key: Optional[str] = None):
        self.supabase = supabase_client
        openai.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate OpenAI embedding for text
        Uses text-embedding-ada-002 model
        """
        try:
            response = openai.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    def match_objection(
        self, 
        user_objection: str, 
        industry: Optional[str] = None,
        top_k: int = 3
    ) -> List[Dict]:
        """
        Find matching objections using semantic search
        
        Args:
            user_objection: The objection text from user
            industry: Filter by industry (optional)
            top_k: Number of results to return
            
        Returns:
            List of matching objections with responses
        """
        try:
            # Generate embedding for user's objection
            query_embedding = self.generate_embedding(user_objection)
            
            # Call Supabase function for semantic search
            result = self.supabase.rpc(
                'search_objections',
                {
                    'query_embedding': query_embedding,
                    'match_threshold': 0.7,
                    'match_count': top_k
                }
            ).execute()
            
            # Fetch responses for each matched objection
            matches = []
            for obj in result.data:
                # Get responses
                responses = self.supabase.table('objection_responses').select('*').eq(
                    'objection_id', obj['id']
                ).order('success_rate', desc=True).limit(3).execute()
                
                matches.append({
                    'objection': obj,
                    'responses': responses.data,
                    'similarity_score': obj['similarity']
                })
            
            # Filter by industry if specified
            if industry:
                matches = [
                    m for m in matches 
                    if industry in m['objection']['industry']
                ]
            
            return matches
            
        except Exception as e:
            logger.error(f"Error matching objection: {e}")
            return []
    
    def get_best_response(
        self,
        user_objection: str,
        lead_context: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        Get the single best response for an objection
        
        Args:
            user_objection: The objection text
            lead_context: Additional context (industry, lead_stage, etc.)
            
        Returns:
            Best matching response with script
        """
        industry = lead_context.get('industry') if lead_context else None
        matches = self.match_objection(user_objection, industry, top_k=1)
        
        if not matches:
            return None
        
        best_match = matches[0]
        
        # Get highest success rate response
        responses = best_match['responses']
        if not responses:
            return None
            
        best_response = responses[0]  # Already sorted by success_rate
        
        return {
            'objection': best_match['objection']['objection_text'],
            'technique': best_response['technique'],
            'script': best_response['response_script'],
            'success_rate': best_response['success_rate'],
            'similarity': best_match['similarity_score'],
            'psychology': best_match['objection']['psychology']
        }
    
    def score_lead(self, lead_data: Dict) -> Tuple[int, str]:
        """
        Score a lead based on behavioral and demographic signals
        
        Args:
            lead_data: Dictionary with lead information
            
        Returns:
            Tuple of (score 0-100, reasoning)
        """
        score = 0
        reasons = []
        
        # Engagement signals (40 points max)
        if lead_data.get('opened_email'):
            score += 10
            reasons.append("Opened emails")
        if lead_data.get('clicked_link'):
            score += 15
            reasons.append("Clicked links")
        if lead_data.get('replied'):
            score += 15
            reasons.append("Replied to outreach")
        
        # Demographic signals (30 points max)
        if lead_data.get('job_title') and any(
            title in lead_data['job_title'].lower() 
            for title in ['ceo', 'founder', 'director', 'vp']
        ):
            score += 20
            reasons.append("Decision maker title")
        
        if lead_data.get('company_size', 0) >= 10:
            score += 10
            reasons.append("Company size 10+")
        
        # Timing signals (30 points max)
        if lead_data.get('recent_activity_days', 999) <= 7:
            score += 20
            reasons.append("Active in last 7 days")
        elif lead_data.get('recent_activity_days', 999) <= 30:
            score += 10
            reasons.append("Active in last 30 days")
        
        if lead_data.get('responded_quickly'):
            score += 10
            reasons.append("Quick responder")
        
        reasoning = f"Score: {score}/100. " + ", ".join(reasons) if reasons else "No signals detected"
        
        return min(score, 100), reasoning

