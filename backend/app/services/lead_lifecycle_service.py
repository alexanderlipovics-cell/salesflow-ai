"""
SALES FLOW AI - LEAD LIFECYCLE SERVICE
Autonomous Lead Management & Status Transitions
Version: 2.0.0 | Created: 2024-12-01
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from app.core.supabase import get_supabase_client
from app.services.ki_intelligence_service import KIIntelligenceService

logger = logging.getLogger(__name__)


class LeadLifecycleService:
    """
    Manages autonomous lead lifecycle transitions and triggers.
    
    Responsibilities:
    - Auto-transition lead status based on events
    - Trigger appropriate actions per lifecycle stage
    - Monitor inactivity and intervene
    - Learn from successful patterns
    """

    def __init__(self, openai_api_key: str):
        self.supabase = get_supabase_client()
        self.ki_service = KIIntelligenceService(openai_api_key)

    # ========================================================================
    # LIFECYCLE ORCHESTRATION
    # ========================================================================

    async def check_and_trigger_actions(self, lead_id: str) -> List[Dict]:
        """
        Main orchestration function.
        Checks lead status and triggers appropriate automated actions.
        """
        try:
            actions_taken = []
            
            # Get lead with full context
            lead = await self._get_lead_with_context(lead_id)
            
            if not lead:
                return []
            
            # Status-specific actions
            status = lead.get('status', 'new')
            
            if status == 'new':
                actions_taken.extend(await self._handle_new_lead(lead))
            elif status == 'contacted':
                actions_taken.extend(await self._handle_contacted_lead(lead))
            elif status == 'qualified':
                actions_taken.extend(await self._handle_qualified_lead(lead))
            elif status == 'meeting_scheduled':
                actions_taken.extend(await self._handle_meeting_scheduled(lead))
            elif status == 'proposal_sent':
                actions_taken.extend(await self._handle_proposal_sent(lead))
            elif status == 'negotiation':
                actions_taken.extend(await self._handle_negotiation(lead))
            
            # Cross-status checks
            actions_taken.extend(await self._check_inactivity(lead))
            actions_taken.extend(await self._check_missing_data(lead))
            
            # Log actions
            await self._log_autonomous_actions(lead['id'], lead['user_id'], actions_taken)
            
            logger.info(f"Lifecycle check for lead {lead_id}: {len(actions_taken)} actions taken")
            return actions_taken
            
        except Exception as e:
            logger.error(f"Error in lifecycle check for {lead_id}: {e}")
            return []

    # ========================================================================
    # STATUS-SPECIFIC HANDLERS
    # ========================================================================

    async def _handle_new_lead(self, lead: Dict) -> List[Dict]:
        """Actions for NEW leads (just created, no contact yet)"""
        actions = []
        
        # 1. Initialize context summary
        memory_result = await self.ki_service.update_lead_memory(
            lead_id=lead['id'],
            user_id=lead['user_id']
        )
        if memory_result.get('success'):
            actions.append({
                "action": "context_summary_initialized",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # 2. Calculate initial priority
        priority_score = await self._calculate_lead_priority(lead)
        actions.append({
            "action": "priority_calculated",
            "priority_score": priority_score
        })
        
        # 3. Recommend initial outreach if > 24h old and no activity
        hours_since_created = (datetime.utcnow() - datetime.fromisoformat(lead['created_at'])).total_seconds() / 3600
        if hours_since_created > 24:
            await self._create_recommendation(
                lead_id=lead['id'],
                user_id=lead['user_id'],
                type="followup",
                priority="high",
                title=f"⏰ {lead['name']} waiting for first contact ({int(hours_since_created)}h)",
                description="Lead created but no outreach yet. First contact within 24h increases conversion by 50%.",
                reasoning="Time-based trigger: >24h since lead creation without contact",
                triggered_by="time_decay"
            )
            actions.append({"action": "first_contact_reminder_created"})
        
        return actions

    async def _handle_contacted_lead(self, lead: Dict) -> List[Dict]:
        """Actions for CONTACTED leads (initial outreach made)"""
        actions = []
        
        # 1. Track time-to-first-contact metric
        if lead.get('first_activity_at'):
            time_to_contact = (
                datetime.fromisoformat(lead['first_activity_at']) - 
                datetime.fromisoformat(lead['created_at'])
            ).total_seconds() / 3600
            
            await self._log_metric(
                "time_to_first_contact_hours",
                time_to_contact,
                {"lead_id": lead['id'], "user_id": lead['user_id']}
            )
            actions.append({
                "action": "metric_logged",
                "metric": "time_to_first_contact",
                "value": round(time_to_contact, 2)
            })
        
        # 2. Check if BANT assessment needed
        has_bant = await self._has_bant_assessment(lead['id'])
        days_since_contact = self._days_since_last_interaction(lead)
        
        if not has_bant and days_since_contact >= 3:
            await self._create_recommendation(
                lead_id=lead['id'],
                user_id=lead['user_id'],
                type="playbook",
                priority="high",
                title="🎯 Run DEAL-MEDIC to qualify this lead",
                description=f"Lead has been contacted {days_since_contact} days ago but not yet qualified. Run BANT assessment.",
                playbook_name="DEAL-MEDIC",
                reasoning=f"{days_since_contact} days since first contact without BANT assessment",
                triggered_by="interaction_threshold"
            )
            actions.append({"action": "bant_assessment_recommended"})
        
        # 3. Personality profiling if 5+ interactions
        interaction_count = await self._get_interaction_count(lead['id'])
        has_personality = await self._has_personality_profile(lead['id'])
        
        if not has_personality and interaction_count >= 5:
            await self._create_recommendation(
                lead_id=lead['id'],
                user_id=lead['user_id'],
                type="playbook",
                priority="medium",
                title="🧠 Run NEURO-PROFILER for personalized approach",
                description=f"You have {interaction_count} interactions. Enough data for personality analysis.",
                playbook_name="NEURO-PROFILER",
                reasoning=f"{interaction_count} interactions reached",
                triggered_by="interaction_threshold"
            )
            actions.append({"action": "personality_profiling_recommended"})
        
        return actions

    async def _handle_qualified_lead(self, lead: Dict) -> List[Dict]:
        """Actions for QUALIFIED leads (BANT assessment completed)"""
        actions = []
        
        # Get BANT data
        bant = await self._get_bant_assessment(lead['id'])
        if not bant:
            return actions
        
        traffic_light = bant.get('traffic_light')
        total_score = bant.get('total_score', 0)
        
        # 1. GREEN LIGHT → Push for meeting
        if traffic_light == 'green':
            await self._create_recommendation(
                lead_id=lead['id'],
                user_id=lead['user_id'],
                type="followup",
                priority="urgent",
                title=f"🟢 HOT LEAD: Schedule meeting with {lead['name']} NOW",
                description=f"Excellent BANT score ({total_score}/100). This lead is ready to close!",
                suggested_action={
                    "action": "schedule_meeting",
                    "optimal_time": await self._get_optimal_meeting_time(lead),
                    "script": "Meeting request script will be generated"
                },
                reasoning=f"Green light BANT score: {total_score}/100",
                triggered_by="high_bant_score",
                confidence_score=0.95
            )
            actions.append({"action": "meeting_push_urgent", "bant_score": total_score})
        
        # 2. YELLOW LIGHT → Improve weak areas
        elif traffic_light == 'yellow':
            weak_areas = self._identify_weak_bant_areas(bant)
            await self._create_recommendation(
                lead_id=lead['id'],
                user_id=lead['user_id'],
                type="playbook",
                priority="high",
                title=f"🟡 Improve BANT: Focus on {', '.join(weak_areas)}",
                description=f"Lead scored {total_score}/100. Work on weak areas to push to green.",
                suggested_action={
                    "playbook": "DEAL-MEDIC",
                    "focus_areas": weak_areas,
                    "tips": self._get_improvement_tips(weak_areas)
                },
                reasoning=f"Yellow light BANT, weak in: {', '.join(weak_areas)}",
                triggered_by="low_bant_score"
            )
            actions.append({"action": "bant_improvement_recommended", "weak_areas": weak_areas})
        
        # 3. RED LIGHT → Re-qualify or nurture
        elif traffic_light == 'red':
            await self._create_recommendation(
                lead_id=lead['id'],
                user_id=lead['user_id'],
                type="followup",
                priority="medium",
                title=f"🔴 Low qualification ({total_score}/100) - Re-assess or Nurture",
                description="Lead may not be ready. Consider nurture sequence or re-qualification.",
                suggested_action={
                    "options": [
                        "Move to nurture sequence",
                        "Re-run DEAL-MEDIC after addressing blockers",
                        "Mark as unqualified if no potential"
                    ]
                },
                reasoning=f"Red light BANT score: {total_score}/100",
                triggered_by="low_bant_score"
            )
            actions.append({"action": "nurture_or_disqualify_recommended"})
        
        return actions

    async def _handle_meeting_scheduled(self, lead: Dict) -> List[Dict]:
        """Actions for MEETING_SCHEDULED leads"""
        actions = []
        
        # 1. Pre-meeting prep reminder (24h before)
        next_meeting = await self._get_next_meeting(lead['id'])
        if next_meeting:
            hours_until = (
                datetime.fromisoformat(next_meeting['start_time']) - 
                datetime.utcnow()
            ).total_seconds() / 3600
            
            if 20 < hours_until < 28:  # 24h window
                await self._create_recommendation(
                    lead_id=lead['id'],
                    user_id=lead['user_id'],
                    type="followup",
                    priority="high",
                    title=f"📋 Prep for meeting with {lead['name']} tomorrow",
                    description="Review BANT, DISG profile, and objection history before meeting.",
                    suggested_action={
                        "checklist": [
                            "Review BANT scores",
                            "Check DISG profile for communication style",
                            "Review objection history",
                            "Prepare personalized demo",
                            "Confirm meeting reminder sent"
                        ]
                    },
                    reasoning="Meeting in ~24 hours",
                    triggered_by="time_based"
                )
                actions.append({"action": "meeting_prep_reminder"})
        
        # 2. Post-meeting follow-up (if meeting was today and no follow-up yet)
        # Implementation depends on meeting completion tracking
        
        return actions

    async def _handle_proposal_sent(self, lead: Dict) -> List[Dict]:
        """Actions for PROPOSAL_SENT leads"""
        actions = []
        
        # Get last proposal
        proposal = await self._get_latest_proposal(lead['id'])
        if not proposal:
            return actions
        
        # 1. Check if proposal was viewed
        if not proposal.get('viewed_at'):
            days_since_sent = (
                datetime.utcnow() - 
                datetime.fromisoformat(proposal['sent_at'])
            ).days
            
            if days_since_sent >= 2:
                await self._create_recommendation(
                    lead_id=lead['id'],
                    user_id=lead['user_id'],
                    type="followup",
                    priority="high",
                    title=f"📄 Follow up: {lead['name']} hasn't viewed proposal",
                    description=f"Proposal sent {days_since_sent} days ago but not opened. Call to confirm receipt.",
                    suggested_action={
                        "action": "call_to_confirm_receipt",
                        "script": "Hi, wanted to make sure you received the proposal..."
                    },
                    reasoning=f"Proposal sent {days_since_sent} days ago, not viewed",
                    triggered_by="time_decay"
                )
                actions.append({"action": "proposal_not_viewed_followup"})
        
        # 2. Viewed but no response
        elif proposal.get('viewed_at') and not proposal.get('accepted_at'):
            days_since_viewed = (
                datetime.utcnow() - 
                datetime.fromisoformat(proposal['viewed_at'])
            ).days
            
            if days_since_viewed >= 3:
                await self._create_recommendation(
                    lead_id=lead['id'],
                    user_id=lead['user_id'],
                    type="followup",
                    priority="urgent",
                    title=f"🔥 {lead['name']} viewed proposal {days_since_viewed} days ago - CLOSE NOW",
                    description="Proposal opened but no decision. Time to follow up and address concerns.",
                    suggested_action={
                        "action": "closing_call",
                        "questions_to_ask": [
                            "What questions do you have?",
                            "Is there anything holding you back?",
                            "When would you like to start?"
                        ]
                    },
                    reasoning=f"Proposal viewed {days_since_viewed} days ago without response",
                    triggered_by="time_decay"
                )
                actions.append({"action": "proposal_closing_push"})
        
        return actions

    async def _handle_negotiation(self, lead: Dict) -> List[Dict]:
        """Actions for NEGOTIATION leads"""
        actions = []
        
        # Monitor negotiation length
        days_in_negotiation = await self._days_in_current_status(lead['id'])
        
        if days_in_negotiation > 7:
            await self._create_recommendation(
                lead_id=lead['id'],
                user_id=lead['user_id'],
                type="followup",
                priority="urgent",
                title=f"⚠️ Negotiation with {lead['name']} dragging ({days_in_negotiation} days)",
                description="Extended negotiation = higher risk of losing deal. Push for decision.",
                suggested_action={
                    "action": "create_urgency",
                    "tactics": [
                        "Set deadline (limited-time offer)",
                        "Highlight competitor activity",
                        "CEO/Manager involvement"
                    ]
                },
                reasoning=f"Negotiation for {days_in_negotiation} days",
                triggered_by="time_decay"
            )
            actions.append({"action": "long_negotiation_warning"})
        
        return actions

    # ========================================================================
    # CROSS-STATUS CHECKS
    # ========================================================================

    async def _check_inactivity(self, lead: Dict) -> List[Dict]:
        """Check for inactivity across all statuses"""
        actions = []
        
        days_inactive = self._days_since_last_interaction(lead)
        if days_inactive is None:
            return actions
        
        # Critical inactivity (14+ days)
        if days_inactive >= 14:
            await self._create_recommendation(
                lead_id=lead['id'],
                user_id=lead['user_id'],
                type="followup",
                priority="urgent",
                title=f"🚨 URGENT: {lead['name']} inactive for {days_inactive} days",
                description="Critical inactivity period. High risk of losing this lead!",
                suggested_action={
                    "action": "re_engagement_call",
                    "script": "Re-engagement script will be generated",
                    "channel": await self._get_best_channel(lead)
                },
                reasoning=f"{days_inactive} days without contact",
                triggered_by="time_decay",
                confidence_score=0.9
            )
            actions.append({"action": "critical_inactivity_alert", "days": days_inactive})
        
        # High-value lead going stale (7+ days)
        elif days_inactive >= 7:
            bant_score = await self._get_bant_score(lead['id'])
            if bant_score and bant_score > 50:
                await self._create_recommendation(
                    lead_id=lead['id'],
                    user_id=lead['user_id'],
                    type="followup",
                    priority="high",
                    title=f"⏰ Qualified lead inactive: {lead['name']} ({days_inactive} days)",
                    description=f"BANT score {bant_score}/100 but no contact for {days_inactive} days.",
                    suggested_action={
                        "action": "check_in",
                        "optimal_time": await self._get_optimal_contact_window(lead)
                    },
                    reasoning=f"Qualified lead (BANT {bant_score}) inactive {days_inactive} days",
                    triggered_by="time_decay"
                )
                actions.append({"action": "qualified_lead_stale_warning", "days": days_inactive})
        
        return actions

    async def _check_missing_data(self, lead: Dict) -> List[Dict]:
        """Check for missing critical data points"""
        actions = []
        
        # Missing BANT (if status >= contacted and >5 days)
        if lead['status'] in ['contacted', 'qualified', 'meeting_scheduled']:
            has_bant = await self._has_bant_assessment(lead['id'])
            if not has_bant:
                days_in_status = await self._days_in_current_status(lead['id'])
                if days_in_status > 5:
                    actions.append({"action": "missing_bant_detected"})
        
        # Missing personality profile (if >10 interactions)
        interaction_count = await self._get_interaction_count(lead['id'])
        has_personality = await self._has_personality_profile(lead['id'])
        if not has_personality and interaction_count >= 10:
            actions.append({"action": "missing_personality_detected"})
        
        return actions

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    async def _get_lead_with_context(self, lead_id: str) -> Optional[Dict]:
        """Get lead with full context"""
        try:
            result = self.supabase.table("leads").select(
                "*, bant_assessments(*), personality_profiles(*), lead_context_summaries(*)"
            ).eq("id", lead_id).execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting lead context: {e}")
            return None

    async def _create_recommendation(
        self,
        lead_id: str,
        user_id: str,
        type: str,
        priority: str,
        title: str,
        description: str = None,
        suggested_action: Dict = None,
        playbook_name: str = None,
        reasoning: str = None,
        triggered_by: str = "manual",
        confidence_score: float = 0.7
    ):
        """Create AI recommendation"""
        try:
            data = {
                "lead_id": lead_id,
                "user_id": user_id,
                "type": type,
                "priority": priority,
                "title": title,
                "description": description,
                "suggested_action": suggested_action or {},
                "playbook_name": playbook_name,
                "reasoning": reasoning,
                "triggered_by": triggered_by,
                "confidence_score": confidence_score
            }
            
            self.supabase.table("ai_recommendations").insert(data).execute()
        except Exception as e:
            logger.error(f"Error creating recommendation: {e}")

    def _days_since_last_interaction(self, lead: Dict) -> Optional[int]:
        """Calculate days since last interaction"""
        last_interaction = lead.get('last_interaction_date')
        if not last_interaction:
            return None
        
        return (datetime.utcnow() - datetime.fromisoformat(last_interaction)).days

    async def _days_in_current_status(self, lead_id: str) -> int:
        """Get days in current status"""
        try:
            result = self.supabase.table("lead_status_history").select(
                "created_at"
            ).eq("lead_id", lead_id).order("created_at.desc").limit(1).execute()
            
            if result.data:
                return (datetime.utcnow() - datetime.fromisoformat(result.data[0]['created_at'])).days
            return 0
        except:
            return 0

    def _identify_weak_bant_areas(self, bant: Dict) -> List[str]:
        """Identify BANT areas scoring < 50"""
        weak_areas = []
        if bant.get('budget_score', 100) < 50:
            weak_areas.append('Budget')
        if bant.get('authority_score', 100) < 50:
            weak_areas.append('Authority')
        if bant.get('need_score', 100) < 50:
            weak_areas.append('Need')
        if bant.get('timeline_score', 100) < 50:
            weak_areas.append('Timeline')
        return weak_areas

    def _get_improvement_tips(self, weak_areas: List[str]) -> List[str]:
        """Get tips for improving weak BANT areas"""
        tips = {
            'Budget': 'Explore payment plans, ROI calculations, or value justification',
            'Authority': 'Identify decision-maker, schedule meeting with key stakeholder',
            'Need': 'Deep-dive into pain points, quantify impact of problem',
            'Timeline': 'Create urgency, limited-time offers, competitive pressure'
        }
        return [tips[area] for area in weak_areas if area in tips]

    async def _has_bant_assessment(self, lead_id: str) -> bool:
        """Check if lead has BANT assessment"""
        try:
            result = self.supabase.table("bant_assessments").select("id").eq(
                "lead_id", lead_id
            ).limit(1).execute()
            return len(result.data) > 0
        except:
            return False

    async def _has_personality_profile(self, lead_id: str) -> bool:
        """Check if lead has personality profile"""
        try:
            result = self.supabase.table("personality_profiles").select("id").eq(
                "lead_id", lead_id
            ).limit(1).execute()
            return len(result.data) > 0
        except:
            return False

    async def _get_interaction_count(self, lead_id: str) -> int:
        """Get total interaction count"""
        try:
            result = self.supabase.table("lead_context_summaries").select(
                "total_interactions"
            ).eq("lead_id", lead_id).execute()
            return result.data[0]['total_interactions'] if result.data else 0
        except:
            return 0

    async def _get_bant_assessment(self, lead_id: str) -> Optional[Dict]:
        """Get BANT assessment"""
        try:
            result = self.supabase.table("bant_assessments").select("*").eq(
                "lead_id", lead_id
            ).order("assessed_at.desc").limit(1).execute()
            return result.data[0] if result.data else None
        except:
            return None

    async def _get_bant_score(self, lead_id: str) -> Optional[int]:
        """Get BANT total score"""
        bant = await self._get_bant_assessment(lead_id)
        return bant.get('total_score') if bant else None

    async def _calculate_lead_priority(self, lead: Dict) -> int:
        """Calculate lead priority score (0-100)"""
        # Simple algorithm - can be enhanced
        score = 50  # Base score
        
        # Add points for recency
        days_since_created = (datetime.utcnow() - datetime.fromisoformat(lead['created_at'])).days
        if days_since_created < 1:
            score += 20
        elif days_since_created < 3:
            score += 10
        
        # Add points for source
        if lead.get('source') in ['referral', 'inbound']:
            score += 15
        
        return min(score, 100)

    async def _get_optimal_meeting_time(self, lead: Dict) -> Dict:
        """Get optimal meeting time for lead"""
        # Placeholder - integrate with channel_performance_metrics
        return {
            "suggested_day": "Tuesday or Thursday",
            "suggested_time": "10:00 AM or 2:00 PM",
            "timezone": "CET"
        }

    async def _get_optimal_contact_window(self, lead: Dict) -> Dict:
        """Get optimal contact window"""
        return {
            "best_hours": [9, 10, 11, 14, 15, 16],
            "best_days": [2, 3, 4],  # Tue, Wed, Thu
            "channel": await self._get_best_channel(lead)
        }

    async def _get_best_channel(self, lead: Dict) -> str:
        """Determine best contact channel for lead"""
        # Placeholder - analyze past engagement
        if lead.get('phone'):
            return 'call'
        elif lead.get('email'):
            return 'email'
        else:
            return 'whatsapp'

    async def _get_next_meeting(self, lead_id: str) -> Optional[Dict]:
        """Get next scheduled meeting"""
        try:
            result = self.supabase.table("events").select("*").eq(
                "lead_id", lead_id
            ).eq("type", "meeting").gte(
                "start_time", datetime.utcnow().isoformat()
            ).order("start_time").limit(1).execute()
            
            return result.data[0] if result.data else None
        except:
            return None

    async def _get_latest_proposal(self, lead_id: str) -> Optional[Dict]:
        """Get latest proposal"""
        try:
            result = self.supabase.table("dynamic_proposals").select("*").eq(
                "lead_id", lead_id
            ).order("created_at.desc").limit(1).execute()
            
            return result.data[0] if result.data else None
        except:
            return None

    async def _log_metric(self, metric_name: str, value: float, context: Dict):
        """Log metric for analytics"""
        try:
            # Placeholder - implement proper metrics storage
            logger.info(f"Metric: {metric_name} = {value}, context: {context}")
        except Exception as e:
            logger.error(f"Error logging metric: {e}")

    async def _log_autonomous_actions(self, lead_id: str, user_id: str, actions: List[Dict]):
        """Log all autonomous actions to database"""
        try:
            for action in actions:
                self.supabase.table("autonomous_actions").insert({
                    "lead_id": lead_id,
                    "user_id": user_id,
                    "action_type": action.get("action", "unknown"),
                    "action_details": action,
                    "trigger_type": "lifecycle_check",
                    "success": True
                }).execute()
        except Exception as e:
            logger.error(f"Error logging autonomous actions: {e}")

    # ========================================================================
    # BATCH OPERATIONS
    # ========================================================================

    async def check_all_leads_inactivity(self) -> Dict:
        """Check inactivity for all active leads (scheduled job)"""
        try:
            # Get all active leads
            result = self.supabase.table("leads").select("id, user_id").in_(
                "status", ['new', 'contacted', 'qualified', 'meeting_scheduled', 'proposal_sent', 'negotiation']
            ).execute()
            
            total_checked = len(result.data) if result.data else 0
            total_actions = 0
            
            for lead in (result.data or []):
                actions = await self.check_and_trigger_actions(lead['id'])
                total_actions += len(actions)
            
            logger.info(f"Inactivity check: {total_checked} leads checked, {total_actions} actions triggered")
            
            return {
                "leads_checked": total_checked,
                "actions_triggered": total_actions,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error in batch inactivity check: {e}")
            return {"error": str(e)}

