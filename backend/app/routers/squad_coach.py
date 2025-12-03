"""
TEAM-CHIEF Squad Coaching Router
AI-powered squad coaching insights for Network Marketing team leaders
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Literal, Optional
from datetime import datetime
import os
import json
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/squad", tags=["Squad Coaching"])

# Import system prompt
from app.prompts.team_chief import TEAM_CHIEF_SYSTEM_PROMPT

# ─────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────

class CoachingAction(BaseModel):
    target_type: Literal["member", "squad"]
    target_name: str
    reason: str
    suggested_action: str
    tone_hint: Literal["empathisch", "klar", "motiviert", "fordernd"]

class SuggestedMessages(BaseModel):
    to_squad: str
    to_underperformer_template: str
    to_top_performer_template: str

class SquadCoachingOutput(BaseModel):
    summary: str
    highlights: List[str]
    risks: List[str]
    priorities: List[str]
    coaching_actions: List[CoachingAction]
    celebrations: List[str]
    suggested_messages: SuggestedMessages

class SquadCoachRequest(BaseModel):
    squad_id: str
    # Optional: For testing - direct input data
    test_input: Optional[dict] = None

# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────

def get_supabase():
    """Dependency injection for Supabase client"""
    from config import config
    if not config.SUPABASE_URL or not config.SUPABASE_KEY:
        return None
    
    from supabase import create_client
    return create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

def get_current_user_id() -> str:
    """
    Get current user ID from auth token.
    TODO: Implement actual auth extraction from request headers
    """
    # For now, return a placeholder - replace with actual auth logic
    return "current-user-id"

def check_leader_permission(
    supabase_client,
    squad_id: str,
    user_id: str
) -> bool:
    """Check if user is leader or co-leader of the squad"""
    try:
        result = supabase_client.table('squad_members').select('role').eq(
            'squad_id', squad_id
        ).eq('user_id', user_id).eq('is_active', True).single().execute()
        
        if not result.data:
            return False
        
        return result.data.get('role') in ('leader', 'co_leader')
    except Exception as e:
        logger.error(f"Error checking leader permission: {repr(e)}")
        return False

async def fetch_squad_coaching_data(supabase_client, user_id: str, squad_id: str) -> dict:
    """
    Fetch all data needed for coaching analysis
    Returns dict in format expected by AI prompt
    """
    try:
        # 1. Verify user is squad leader
        if not check_leader_permission(supabase_client, squad_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only squad leaders can access coaching"
            )
        
        # 2. Fetch squad info
        squad_result = supabase_client.table('squads').select('id, name').eq(
            'id', squad_id
        ).single().execute()
        
        if not squad_result.data:
            raise HTTPException(status_code=404, detail="Squad not found")
        
        squad = squad_result.data
        
        # 3. Fetch active challenge
        challenge_result = supabase_client.table('squad_challenges').select(
            'id, title, start_date, end_date, target_points'
        ).eq('squad_id', squad_id).eq('is_active', True).order(
            'start_date', desc=True
        ).limit(1).execute()
        
        if not challenge_result.data:
            raise HTTPException(status_code=404, detail="No active challenge found")
        
        challenge = challenge_result.data[0]
        
        # 4. Fetch leader info
        leader_result = supabase_client.table('profiles').select('id, full_name').eq(
            'id', user_id
        ).single().execute()
        
        leader = leader_result.data if leader_result.data else {
            'id': user_id,
            'full_name': 'Leader'
        }
        
        # 5. Fetch leaderboard (via RPC or direct query)
        # For now, we'll fetch from speed_hunter_actions aggregated
        leaderboard_result = supabase_client.table('speed_hunter_actions').select(
            'user_id, points'
        ).gte('created_at', challenge['start_date']).lte(
            'created_at', challenge['end_date']
        ).execute()
        
        # Aggregate leaderboard
        leaderboard_map = {}
        for action in (leaderboard_result.data or []):
            user_id = action.get('user_id')
            points = action.get('points', 0)
            if user_id:
                leaderboard_map[user_id] = leaderboard_map.get(user_id, 0) + points
        
        # Get user names
        user_ids = list(leaderboard_map.keys())
        if user_ids:
            profiles_result = supabase_client.table('profiles').select(
                'id, full_name'
            ).in_('id', user_ids).execute()
            
            profiles_map = {
                p['id']: p.get('full_name', 'Unknown')
                for p in (profiles_result.data or [])
            }
        else:
            profiles_map = {}
        
        # Build leaderboard sorted by points
        leaderboard = [
            {
                'rank': idx + 1,
                'user_id': uid,
                'name': profiles_map.get(uid, 'Unknown'),
                'points': points
            }
            for idx, (uid, points) in enumerate(
                sorted(leaderboard_map.items(), key=lambda x: x[1], reverse=True)
            )
        ]
        
        # 6. Fetch member stats
        # Get all squad members
        members_result = supabase_client.table('squad_members').select(
            'user_id'
        ).eq('squad_id', squad_id).eq('is_active', True).execute()
        
        member_ids = [m['user_id'] for m in (members_result.data or [])]
        
        member_stats = []
        active_user_ids = set()
        
        for member_id in member_ids:
            # Get actions for this member in challenge period
            member_actions = supabase_client.table('speed_hunter_actions').select(
                'points, created_at, action_type'
            ).eq('user_id', member_id).gte(
                'created_at', challenge['start_date']
            ).lte('created_at', challenge['end_date']).execute()
            
            actions = member_actions.data or []
            
            total_points = sum(a.get('points', 0) for a in actions)
            total_contacts = len([a for a in actions if a.get('action_type') in ('call', 'message')])
            active_days = len(set(
                a['created_at'][:10] for a in actions if 'created_at' in a
            ))
            
            last_active = max(
                (a['created_at'] for a in actions if 'created_at' in a),
                default=None
            )
            
            if total_points > 0 or total_contacts > 0:
                active_user_ids.add(member_id)
            
            # Get member name
            profile_result = supabase_client.table('profiles').select(
                'full_name'
            ).eq('id', member_id).single().execute()
            
            member_name = profile_result.data.get('full_name', 'Unknown') if profile_result.data else 'Unknown'
            
            member_stats.append({
                'user_id': member_id,
                'name': member_name,
                'points': total_points,
                'contacts': total_contacts,
                'active_days': active_days,
                'last_active_at': last_active or ''
            })
        
        # 7. Calculate summary
        summary = {
            'total_points': sum(m['points'] for m in member_stats),
            'total_contacts': sum(m['contacts'] for m in member_stats),
            'member_count': len(member_stats),
            'active_members': len(active_user_ids),
            'inactive_members': len(member_stats) - len(active_user_ids),
            'period_from': challenge['start_date'],
            'period_to': challenge['end_date']
        }
        
        return {
            'leader': {
                'user_id': leader['id'],
                'name': leader.get('full_name', 'Leader')
            },
            'squad': {
                'id': squad['id'],
                'name': squad.get('name', 'Squad')
            },
            'challenge': {
                'id': challenge['id'],
                'title': challenge['title'],
                'start_date': challenge['start_date'],
                'end_date': challenge['end_date'],
                'target_points': challenge['target_points']
            },
            'leaderboard': leaderboard,
            'member_stats': member_stats,
            'summary': summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching squad coaching data: {repr(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch squad coaching data: {str(e)}"
        )

def get_ai_coaching_insights(input_data: dict) -> SquadCoachingOutput:
    """Call OpenAI to get coaching insights"""
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        # Return demo/mock response if no API key
        logger.warning("OPENAI_API_KEY not configured, returning mock coaching insights")
        return SquadCoachingOutput(
            summary="Demo-Modus: Konfiguriere OPENAI_API_KEY für echte Coaching-Insights.",
            highlights=["Squad ist aktiv", "Gute Beteiligung"],
            risks=["Keine Risiken erkannt"],
            priorities=["Weiter so!", "Team motivieren"],
            coaching_actions=[],
            celebrations=["Alle Mitglieder machen einen guten Job"],
            suggested_messages=SuggestedMessages(
                to_squad="Hallo Team! Ihr macht einen großartigen Job. Weiter so!",
                to_underperformer_template="Hey [Name], wie geht es dir? Brauchst du Unterstützung?",
                to_top_performer_template="Hey [Name], du rockst! 🚀"
            )
        )
    
    try:
        client = OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": TEAM_CHIEF_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(input_data, ensure_ascii=False, indent=2)}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content
        parsed = json.loads(raw_content)
        
        # Validate and convert to Pydantic model
        return SquadCoachingOutput(**parsed)
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI JSON response: {repr(e)}")
        raise HTTPException(
            status_code=500,
            detail="AI response format invalid"
        )
    except Exception as e:
        logger.error(f"OpenAI API error: {repr(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI coaching generation failed: {str(e)}"
        )

# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/coach", response_model=SquadCoachingOutput)
async def get_squad_coaching(
    request: SquadCoachRequest,
    user_id: str = Depends(get_current_user_id),
    supabase_client = Depends(get_supabase)
):
    """
    Get AI coaching insights for squad leader
    
    Requires:
    - User must be leader or co-leader of the squad
    - Squad must have an active challenge
    
    Returns:
    - AI-generated coaching insights with actionable recommendations
    """
    if not supabase_client:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )
    
    try:
        # For testing: Use direct input if provided
        if request.test_input:
            coaching_input = request.test_input
        else:
            # Fetch coaching data from database
            coaching_input = await fetch_squad_coaching_data(
                supabase_client,
                user_id,
                request.squad_id
            )
        
        # Get AI insights
        coaching_output = get_ai_coaching_insights(coaching_input)
        
        # Optional: Store coaching session in database
        try:
            supabase_client.table('coaching_sessions').insert({
                'user_id': user_id,
                'squad_id': request.squad_id,
                'insights': coaching_output.dict(),
                'created_at': datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            # Non-critical error, log but continue
            logger.warning(f"Failed to store coaching session: {repr(e)}")
        
        return coaching_output
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in squad coaching endpoint: {repr(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate coaching insights: {str(e)}"
        )

