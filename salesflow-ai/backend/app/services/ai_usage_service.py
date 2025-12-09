from datetime import date
import logging

from ..core.deps import get_supabase

logger = logging.getLogger(__name__)


class AIUsageService:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.supabase = None

    async def _get_client(self):
        if self.supabase is None:
            self.supabase = await get_supabase()
        return self.supabase
    
    async def track_usage(self, model: str, input_tokens: int, output_tokens: int):
        """Track AI usage for billing and limits (best-effort, non-blocking)."""
        try:
            supabase = await self._get_client()
            cost = self._calculate_cost(model, input_tokens, output_tokens)
            today = date.today().isoformat()

            # Best-effort: if rpc or schema fails, do not block
            supabase.rpc('increment_ai_usage', {
                'p_user_id': self.user_id,
                'p_date': today,
                'p_model': model,
                'p_input_tokens': input_tokens,
                'p_output_tokens': output_tokens,
                'p_cost': cost
            }).execute()
        except Exception as e:
            logger.warning(f"Usage tracking failed (non-blocking): {e}")
    
    async def check_limits(self) -> dict:
        """Check if user is within their limits"""
        supabase = await self._get_client()

        # Get user's subscription tier
        profile_result = supabase.table('profiles').select('subscription_tier').eq('id', self.user_id).execute()
        profile = profile_result.data[0] if profile_result.data else {"subscription_tier": "free"}
        tier = profile.get('subscription_tier', 'free')
        
        # Get tier limits
        limits_result = supabase.table('subscription_limits').select('*').eq('tier', tier).execute()
        limits_data = (
            limits_result.data[0]
            if limits_result and limits_result.data
            else {'monthly_tokens': 50000, 'monthly_requests': 100, 'allowed_models': ['gpt-4o-mini']}
        )
        
        # Get current month usage
        month_start = date.today().replace(day=1).isoformat()
        try:
            usage = (
                supabase.table('ai_usage')
                .select('total_tokens, request_count')
                .eq('user_id', self.user_id)
                .gte('created_at', month_start)
                .execute()
            )
            total_tokens = sum(u.get('total_tokens', 0) for u in usage.data) if usage.data else 0
            total_requests = sum(u.get('request_count', 0) for u in usage.data) if usage.data else 0
        except Exception as e:
            # Fallback: erlauben, wenn Schema unerwartet ist
            logger.warning(f"Usage check failed (ai_usage): {e}")
            total_tokens = 0
            total_requests = 0
        
        return {
            'tier': tier,
            'tokens_used': total_tokens,
            'tokens_limit': limits_data['monthly_tokens'],
            'tokens_remaining': max(0, limits_data['monthly_tokens'] - total_tokens),
            'requests_used': total_requests,
            'requests_limit': limits_data['monthly_requests'],
            'allowed_models': limits_data['allowed_models'],
            'is_over_limit': total_tokens >= limits_data['monthly_tokens'] or total_requests >= limits_data['monthly_requests']
        }
    
    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate estimated cost based on model pricing"""
        pricing = {
            'gpt-4o-mini': {'input': 0.15, 'output': 0.60},  # per 1M tokens
            'gpt-4o': {'input': 5.00, 'output': 15.00},
            'claude-3-sonnet': {'input': 3.00, 'output': 15.00},
        }
        rates = pricing.get(model, pricing['gpt-4o-mini'])
        return (input_tokens * rates['input'] + output_tokens * rates['output']) / 1_000_000

