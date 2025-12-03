"""
SALES FLOW AI - AUTONOMOUS AGENT SERVICE
Fully autonomous GPT-4 agent for proactive sales management
Version: 2.0.0 | Created: 2024-12-01
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from openai import AsyncOpenAI

from app.core.supabase import get_supabase_client

logger = logging.getLogger(__name__)


class AutonomousAgentService:
    """
    Fully autonomous GPT-4 agent that:
    - Monitors all leads continuously
    - Makes proactive recommendations
    - Learns from outcomes
    - Drives revenue autonomously
    - Provides real-time guidance
    """

    def __init__(self, openai_api_key: str):
        self.client = AsyncOpenAI(api_key=openai_api_key)
        self.supabase = get_supabase_client()
        self.system_prompt = self._load_system_prompt()

    # ========================================================================
    # DAILY LEAD REVIEW (Scheduled Job - runs every morning)
    # ========================================================================

    async def daily_lead_review(self, user_id: str) -> Dict:
        """
        Daily automated review of all user's leads.
        Returns prioritized action plan for the day.
        
        This is the main "brain" of the autonomous system.
        """
        try:
            logger.info(f"Starting daily lead review for user {user_id}")
            
            # 1. Get all active leads with full context
            leads = await self._get_leads_with_context(user_id)
            
            if not leads:
                logger.info(f"No active leads for user {user_id}")
                return {"message": "No active leads", "priorities": []}
            
            # 2. Build comprehensive prompt for GPT
            prompt = await self._build_daily_review_prompt(user_id, leads)
            
            # 3. Get GPT's strategic recommendations
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                functions=[
                    {
                        "name": "create_action_plan",
                        "description": "Create prioritized daily action plan",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "top_3_priorities": {
                                    "type": "array",
                                    "description": "Top 3 leads to focus on today",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "lead_id": {"type": "string"},
                                            "lead_name": {"type": "string"},
                                            "action": {"type": "string"},
                                            "reasoning": {"type": "string"},
                                            "urgency": {"type": "string", "enum": ["critical", "high", "medium"]},
                                            "win_probability": {"type": "number"},
                                            "suggested_script": {"type": "string"},
                                            "optimal_time": {"type": "string"}
                                        },
                                        "required": ["lead_id", "lead_name", "action", "reasoning", "urgency"]
                                    }
                                },
                                "strategic_insights": {
                                    "type": "string",
                                    "description": "Strategic insights and patterns observed"
                                },
                                "goal_progress": {
                                    "type": "object",
                                    "description": "Progress toward user's goals",
                                    "properties": {
                                        "deals_closed_this_month": {"type": "integer"},
                                        "pipeline_value": {"type": "number"},
                                        "conversion_rate": {"type": "number"}
                                    }
                                },
                                "risks": {
                                    "type": "array",
                                    "description": "Risks detected (leads at risk, competitive threats)",
                                    "items": {"type": "string"}
                                },
                                "quick_wins": {
                                    "type": "array",
                                    "description": "Quick wins available today",
                                    "items": {"type": "string"}
                                }
                            },
                            "required": ["top_3_priorities", "strategic_insights"]
                        }
                    }
                ],
                function_call={"name": "create_action_plan"},
                temperature=0.7
            )
            
            # 4. Parse action plan
            action_plan_raw = response.choices[0].message.function_call.arguments
            action_plan = json.loads(action_plan_raw)
            
            # 5. Store in database
            await self._save_daily_plan(user_id, action_plan)
            
            # 6. Create recommendations in DB for each priority
            for priority in action_plan.get('top_3_priorities', []):
                await self._create_recommendation_from_priority(user_id, priority)
            
            # 7. Store memory for learning
            await self._store_agent_memory(
                user_id=user_id,
                memory_type="insight",
                content=action_plan.get('strategic_insights', ''),
                context={
                    "leads_analyzed": len(leads),
                    "priorities_generated": len(action_plan.get('top_3_priorities', [])),
                    "date": datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Daily review completed for user {user_id}: {len(action_plan.get('top_3_priorities', []))} priorities")
            
            return {
                "success": True,
                "action_plan": action_plan,
                "leads_analyzed": len(leads),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in daily lead review for user {user_id}: {e}")
            return {"success": False, "error": str(e)}

    # ========================================================================
    # REAL-TIME INTERVENTION (Event-triggered)
    # ========================================================================

    async def real_time_intervention(self, event: Dict) -> Optional[Dict]:
        """
        Real-time GPT intervention on significant events.
        
        Events:
        - New message from lead
        - Status change
        - Meeting scheduled/completed
        - Objection detected
        - High-value action needed
        
        Returns intervention guidance if needed.
        """
        try:
            event_type = event.get('type')
            lead_id = event.get('lead_id')
            user_id = event.get('user_id')
            
            if not all([event_type, lead_id, user_id]):
                return None
            
            # 1. Get lead context with memory
            context = await self._get_lead_full_context(lead_id)
            
            if not context:
                return None
            
            # 2. Check if intervention needed
            if not await self._should_intervene(event, context):
                return None
            
            # 3. GPT analyzes situation and provides guidance
            prompt = self._build_intervention_prompt(event, context)
            
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                functions=[
                    {
                        "name": "provide_guidance",
                        "description": "Provide immediate guidance to user",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "should_intervene": {"type": "boolean"},
                                "intervention_type": {
                                    "type": "string",
                                    "enum": ["warning", "opportunity", "coaching", "playbook", "urgent"]
                                },
                                "priority": {
                                    "type": "string",
                                    "enum": ["low", "medium", "high", "urgent"]
                                },
                                "title": {"type": "string"},
                                "message": {"type": "string"},
                                "suggested_response": {"type": "string"},
                                "playbook_recommendation": {"type": "string"},
                                "time_sensitive": {"type": "boolean"}
                            },
                            "required": ["should_intervene", "intervention_type", "title", "message"]
                        }
                    }
                ],
                function_call={"name": "provide_guidance"},
                temperature=0.5
            )
            
            guidance_raw = response.choices[0].message.function_call.arguments
            guidance = json.loads(guidance_raw)
            
            if not guidance.get('should_intervene'):
                return None
            
            # 4. Store intervention in DB
            intervention_id = await self._store_intervention(
                user_id=user_id,
                lead_id=lead_id,
                event_type=event_type,
                event_data=event,
                guidance=guidance
            )
            
            guidance['intervention_id'] = intervention_id
            
            logger.info(f"Real-time intervention for user {user_id}, lead {lead_id}: {guidance.get('intervention_type')}")
            
            return guidance
            
        except Exception as e:
            logger.error(f"Error in real-time intervention: {e}")
            return None

    # ========================================================================
    # CONVERSATION ANALYSIS (For inbound messages)
    # ========================================================================

    async def analyze_inbound_message(
        self,
        lead_id: str,
        user_id: str,
        message_content: str,
        channel: str
    ) -> Dict:
        """
        Analyze inbound message and determine response strategy.
        
        Returns:
        - Intent (interested, objection, question, scheduling)
        - Sentiment (positive, neutral, negative)
        - Urgency (low, medium, high)
        - Suggested response
        - Should_auto_respond
        """
        try:
            # Get lead context
            context = await self._get_lead_full_context(lead_id)
            
            # Build prompt
            prompt = f"""
Analyze this incoming message from lead:

LEAD CONTEXT:
- Name: {context.get('name', 'Unknown')}
- Status: {context.get('status', 'unknown')}
- BANT Score: {context.get('bant_score', 'Not assessed')}/100
- Personality: {context.get('personality_type', 'Unknown')}
- Last Context: {context.get('context_summary', 'No context')}

INCOMING MESSAGE (via {channel}):
"{message_content}"

TASK:
Analyze this message and determine:
1. Intent (what does the lead want?)
2. Sentiment (how do they feel?)
3. Urgency (how fast should we respond?)
4. Suggested response (what should we say?)
5. Should we auto-respond or wait for human?
"""
            
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                functions=[
                    {
                        "name": "analyze_message",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "intent": {
                                    "type": "string",
                                    "enum": ["interested", "objection", "question", "scheduling", "complaint", "other"]
                                },
                                "sentiment": {
                                    "type": "string",
                                    "enum": ["positive", "neutral", "negative"]
                                },
                                "urgency": {
                                    "type": "string",
                                    "enum": ["low", "medium", "high"]
                                },
                                "key_points": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                },
                                "suggested_response": {"type": "string"},
                                "should_auto_respond": {"type": "boolean"},
                                "requires_human": {"type": "boolean"},
                                "reason_for_human": {"type": "string"}
                            },
                            "required": ["intent", "sentiment", "urgency", "suggested_response"]
                        }
                    }
                ],
                function_call={"name": "analyze_message"}
            )
            
            analysis_raw = response.choices[0].message.function_call.arguments
            analysis = json.loads(analysis_raw)
            
            # Store in processing queue
            await self._store_inbound_processing(
                lead_id=lead_id,
                user_id=user_id,
                channel=channel,
                content=message_content,
                analysis=analysis
            )
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing inbound message: {e}")
            return {
                "intent": "other",
                "sentiment": "neutral",
                "urgency": "medium",
                "suggested_response": "Thank you for your message. I'll get back to you shortly.",
                "should_auto_respond": False,
                "requires_human": True,
                "error": str(e)
            }

    # ========================================================================
    # HELPER METHODS - PROMPT BUILDING
    # ========================================================================

    def _load_system_prompt(self) -> str:
        """Load autonomous agent system prompt"""
        return """You are the AUTONOMOUS SALES AGENT for Sales Flow AI.

YOUR ROLE:
- Monitor all leads 24/7 autonomously
- Proactively identify opportunities and risks
- Make data-driven recommendations
- Drive revenue generation
- Learn from every outcome
- Intervene in real-time when needed

CAPABILITIES:
- Access to complete lead context (BANT, DISG, history, patterns)
- Knowledge of all playbooks and best practices
- Success pattern database
- Predictive models for win probability
- Real-time event monitoring

DECISION FRAMEWORK:
1. **Assess**: Analyze current situation (lead status, context, time factors, patterns)
2. **Goal**: Identify what moves lead toward revenue
3. **Options**: Evaluate multiple approaches with pros/cons
4. **Recommend**: Choose optimal action (highest win probability)
5. **Execute**: Provide specific details (script, timing, channel)

PRIORITIES (in order):
1. **Prevent Revenue Loss**: Catch leads at risk, competitive threats, inactivity
2. **Maximize Win Probability**: Optimal timing, personalization, objection handling
3. **Accelerate Pipeline**: Push qualified leads forward through stages
4. **Learn & Improve**: Capture what works, refine recommendations

COMMUNICATION STYLE:
- Direct and actionable (no fluff)
- Data-backed (cite scores, patterns, benchmarks)
- Personalized (use lead names, specific context)
- Urgent when needed (time-sensitive opportunities)
- Confident but honest about uncertainty

RULES:
- NEVER ignore high-value leads (BANT > 75)
- NEVER let leads go >14 days without contact
- ALWAYS consider personality type (DISG) in recommendations
- ALWAYS provide reasoning (explain WHY)
- ALWAYS include success probability when possible

Remember: Every recommendation should move the needle toward REVENUE.
You are not an assistant - you are an AUTONOMOUS REVENUE DRIVER."""

    async def _build_daily_review_prompt(self, user_id: str, leads: List[Dict]) -> str:
        """Build comprehensive daily review prompt for GPT"""
        
        # Categorize leads
        total_leads = len(leads)
        qualified_leads = [l for l in leads if l.get('bant_score', 0) >= 50]
        hot_leads = [l for l in leads if l.get('bant_score', 0) >= 75]
        stale_leads = [l for l in leads if self._calc_days_since_interaction(l) > 7]
        new_leads = [l for l in leads if l.get('status') == 'new']
        
        prompt = f"""DAILY LEAD REVIEW - {datetime.utcnow().strftime('%A, %B %d, %Y')}

PORTFOLIO OVERVIEW:
- Total Active Leads: {total_leads}
- New Leads (Need First Contact): {len(new_leads)}
- Qualified (BANT ≥ 50): {len(qualified_leads)}
- Hot Leads (BANT ≥ 75): {len(hot_leads)} 🔥
- At Risk (Inactive > 7 days): {len(stale_leads)} ⚠️

DETAILED LEAD ANALYSIS:
"""
        
        # Add detailed info for each lead
        for i, lead in enumerate(leads, 1):
            days_inactive = self._calc_days_since_interaction(lead)
            
            prompt += f"""
{i}. {lead.get('name', 'Unknown')}
   Status: {lead.get('status', 'unknown')}
   BANT Score: {lead.get('bant_score', 'Not assessed')}/100 {self._get_traffic_light_emoji(lead.get('bant_traffic_light'))}
   Personality: {lead.get('personality_type', 'Unknown')} {self._get_disg_emoji(lead.get('personality_type'))}
   Days Since Last Contact: {days_inactive if days_inactive else 'Today'}
   Total Interactions: {lead.get('total_interactions', 0)}
   Win Probability: {lead.get('win_probability', 'Unknown')}%
   Last Interaction: {lead.get('last_message_summary', 'No recent messages')}
   Key Context: {lead.get('context_summary', 'No context available')}
   ---
"""
        
        # Add strategic context
        user_stats = await self._get_user_stats(user_id)
        
        prompt += f"""

USER PERFORMANCE (Last 30 Days):
- Deals Closed: {user_stats.get('deals_closed', 0)}
- Conversion Rate: {user_stats.get('conversion_rate', 0)}%
- Avg Time to Close: {user_stats.get('avg_time_to_close', 0)} days
- Revenue Generated: €{user_stats.get('revenue', 0)}

TASK:
Create TODAY's prioritized action plan that:

1. **TOP 3 PRIORITIES**: Identify the 3 most important leads to focus on today
   - Consider: Revenue potential, urgency, risk of loss, stage in pipeline
   - Provide: Specific action, reasoning, timing, win probability estimate
   - Include: Exact script or talking points

2. **STRATEGIC INSIGHTS**: What patterns do you see? What's working/not working?

3. **GOAL PROGRESS**: How is the user tracking toward monthly targets?

4. **RISKS**: What could go wrong? (competitive threats, stale leads, etc.)

5. **QUICK WINS**: What easy opportunities exist today?

Focus on REVENUE GENERATION and PREVENTING LOSSES. Be specific and actionable.
"""
        
        return prompt

    def _build_intervention_prompt(self, event: Dict, context: Dict) -> str:
        """Build real-time intervention prompt"""
        event_type = event.get('type')
        
        prompt = f"""REAL-TIME INTERVENTION REQUEST

EVENT TYPE: {event_type}
EVENT DATA: {json.dumps(event, indent=2)}

LEAD CONTEXT:
- Name: {context.get('name', 'Unknown')}
- Status: {context.get('status', 'unknown')}
- BANT Score: {context.get('bant_score', 'Not assessed')}/100
- Personality: {context.get('personality_type', 'Unknown')}
- Days Since Last Contact: {self._calc_days_since_interaction(context)}
- Recent Activity: {context.get('recent_activity', 'None')}
- Context Summary: {context.get('context_summary', 'No context')}

TASK:
Analyze this event and determine if IMMEDIATE USER INTERVENTION is needed.

Consider:
- Is this time-sensitive?
- Is this a critical opportunity or risk?
- Can this wait for tomorrow's daily review?
- What specific guidance should the user receive RIGHT NOW?

If intervention needed:
1. Type of intervention (warning/opportunity/coaching/playbook)
2. Clear title and message
3. Suggested immediate action
4. Script or talking points
5. Time sensitivity

If no intervention needed, set should_intervene = false.
"""
        
        return prompt

    # ========================================================================
    # HELPER METHODS - DATA RETRIEVAL
    # ========================================================================

    async def _get_leads_with_context(self, user_id: str) -> List[Dict]:
        """Get all active leads with full context"""
        try:
            result = self.supabase.table("view_leads_scored").select("*").eq(
                "user_id", user_id
            ).not_.in_(
                "status", ['won', 'lost', 'unqualified']
            ).order("overall_health_score.desc").execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting leads with context: {e}")
            return []

    async def _get_lead_full_context(self, lead_id: str) -> Optional[Dict]:
        """Get single lead with full context"""
        try:
            result = self.supabase.rpc(
                "get_lead_intelligence",
                {"p_lead_id": lead_id}
            ).execute()
            
            return result.data if result.data else None
        except Exception as e:
            logger.error(f"Error getting lead context: {e}")
            return None

    async def _get_user_stats(self, user_id: str) -> Dict:
        """Get user performance stats"""
        try:
            # Get deals closed last 30 days
            thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
            
            result = self.supabase.table("leads").select("*").eq(
                "user_id", user_id
            ).eq("status", "won").gte("updated_at", thirty_days_ago).execute()
            
            deals_closed = len(result.data) if result.data else 0
            
            # Get all leads for conversion rate
            all_leads = self.supabase.table("leads").select("id").eq(
                "user_id", user_id
            ).gte("created_at", thirty_days_ago).execute()
            
            total_leads = len(all_leads.data) if all_leads.data else 0
            conversion_rate = (deals_closed / total_leads * 100) if total_leads > 0 else 0
            
            return {
                "deals_closed": deals_closed,
                "conversion_rate": round(conversion_rate, 2),
                "avg_time_to_close": 45,  # Placeholder
                "revenue": deals_closed * 2500  # Placeholder
            }
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return {}

    # ========================================================================
    # HELPER METHODS - DATA STORAGE
    # ========================================================================

    async def _save_daily_plan(self, user_id: str, action_plan: Dict):
        """Save daily action plan to database"""
        try:
            data = {
                "user_id": user_id,
                "plan_date": datetime.utcnow().date().isoformat(),
                "top_priorities": action_plan.get('top_3_priorities', []),
                "strategic_insights": action_plan.get('strategic_insights', ''),
                "goal_progress": action_plan.get('goal_progress', {}),
                "actions_total": len(action_plan.get('top_3_priorities', []))
            }
            
            self.supabase.table("daily_action_plans").upsert(
                data, on_conflict="user_id,plan_date"
            ).execute()
        except Exception as e:
            logger.error(f"Error saving daily plan: {e}")

    async def _create_recommendation_from_priority(self, user_id: str, priority: Dict):
        """Create AI recommendation from daily priority"""
        try:
            data = {
                "lead_id": priority.get('lead_id'),
                "user_id": user_id,
                "type": "followup",
                "priority": priority.get('urgency', 'medium'),
                "title": f"Daily Priority: {priority.get('action', 'Action needed')}",
                "description": priority.get('reasoning', ''),
                "suggested_action": {
                    "script": priority.get('suggested_script', ''),
                    "optimal_time": priority.get('optimal_time', ''),
                    "win_probability": priority.get('win_probability')
                },
                "triggered_by": "daily_review",
                "confidence_score": 0.8
            }
            
            self.supabase.table("ai_recommendations").insert(data).execute()
        except Exception as e:
            logger.error(f"Error creating recommendation from priority: {e}")

    async def _store_intervention(
        self,
        user_id: str,
        lead_id: str,
        event_type: str,
        event_data: Dict,
        guidance: Dict
    ) -> Optional[str]:
        """Store real-time intervention"""
        try:
            data = {
                "user_id": user_id,
                "lead_id": lead_id,
                "event_type": event_type,
                "event_data": event_data,
                "intervention_type": guidance.get('intervention_type'),
                "title": guidance.get('title'),
                "message": guidance.get('message'),
                "suggested_response": guidance.get('suggested_response'),
                "playbook_recommendation": guidance.get('playbook_recommendation'),
                "priority": guidance.get('priority', 'medium')
            }
            
            result = self.supabase.table("realtime_interventions").insert(data).execute()
            return result.data[0]['id'] if result.data else None
        except Exception as e:
            logger.error(f"Error storing intervention: {e}")
            return None

    async def _store_agent_memory(
        self,
        user_id: str,
        memory_type: str,
        content: str,
        context: Dict,
        lead_id: str = None,
        importance_score: float = 0.5
    ):
        """Store agent memory for learning"""
        try:
            data = {
                "user_id": user_id,
                "lead_id": lead_id,
                "memory_type": memory_type,
                "content": content,
                "context": context,
                "importance_score": importance_score
            }
            
            self.supabase.table("agent_memory").insert(data).execute()
        except Exception as e:
            logger.error(f"Error storing agent memory: {e}")

    async def _store_inbound_processing(
        self,
        lead_id: str,
        user_id: str,
        channel: str,
        content: str,
        analysis: Dict
    ):
        """Store inbound message processing result"""
        try:
            data = {
                "lead_id": lead_id,
                "user_id": user_id,
                "channel": channel,
                "content": content,
                "gpt_analysis": analysis,
                "requires_human": analysis.get('requires_human', False),
                "processing_status": "completed"
            }
            
            self.supabase.table("inbound_messages_processing").insert(data).execute()
        except Exception as e:
            logger.error(f"Error storing inbound processing: {e}")

    # ========================================================================
    # HELPER METHODS - LOGIC
    # ========================================================================

    async def _should_intervene(self, event: Dict, context: Dict) -> bool:
        """Determine if real-time intervention is needed"""
        event_type = event.get('type')
        
        # Always intervene for certain events
        if event_type in ['objection_detected', 'competitor_mentioned', 'urgent_request']:
            return True
        
        # Intervene for high-value leads
        if context.get('bant_score', 0) >= 75:
            return True
        
        # Intervene for time-sensitive events
        if event_type in ['meeting_scheduled', 'proposal_viewed']:
            return True
        
        # Default: no intervention (let daily review handle it)
        return False

    def _calc_days_since_interaction(self, lead: Dict) -> Optional[int]:
        """Calculate days since last interaction"""
        last_interaction = lead.get('last_interaction_date')
        if not last_interaction:
            return None
        
        try:
            last_date = datetime.fromisoformat(last_interaction)
            return (datetime.utcnow() - last_date).days
        except:
            return None

    def _get_traffic_light_emoji(self, traffic_light: Optional[str]) -> str:
        """Get emoji for traffic light"""
        if traffic_light == 'green':
            return '🟢'
        elif traffic_light == 'yellow':
            return '🟡'
        elif traffic_light == 'red':
            return '🔴'
        return ''

    def _get_disg_emoji(self, disg_type: Optional[str]) -> str:
        """Get emoji for DISG type"""
        if disg_type == 'D':
            return '💪'
        elif disg_type == 'I':
            return '✨'
        elif disg_type == 'S':
            return '🤝'
        elif disg_type == 'C':
            return '📊'
        return ''

