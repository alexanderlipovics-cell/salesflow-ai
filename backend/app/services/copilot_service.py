"""
Copilot Service for SalesFlow AI.

AI-powered assistance for sales teams including:
- Email drafting
- Lead summarization
- Next step recommendations
- Sentiment analysis
- Lead qualification
"""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID
import logging

from app.core.exceptions import (
    NotFoundError,
    ValidationError,
    BusinessRuleViolation
)
from app.services.base import (
    ServiceContext,
    require_permission,
)

logger = logging.getLogger(__name__)


class CopilotService:
    """AI-powered sales assistance service."""
    
    def __init__(
        self,
        lead_repo=None,
        contact_repo=None,
        deal_repo=None,
        message_repo=None,
        ai_client=None,
        event_publisher=None
    ):
        self._lead_repo = lead_repo
        self._contact_repo = contact_repo
        self._deal_repo = deal_repo
        self._message_repo = message_repo
        self._ai_client = ai_client
        self._event_publisher = event_publisher
    
    # ============= Email Drafting =============
    
    @require_permission("leads", "read")
    async def draft_email(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        purpose: str,
        tone: str = "professional",
        max_length: int = 500
    ) -> dict:
        """Generate an email draft for a lead."""
        # Get lead context
        lead = await self._get_lead(lead_id)
        
        # Get contact if available
        contact = None
        if self._contact_repo:
            contact = await self._contact_repo.get_primary_for_lead(lead_id)
        
        # Get recent messages for context
        recent_messages = []
        if self._message_repo:
            messages = await self._message_repo.get_by_lead(lead_id, limit=5)
            recent_messages = messages
        
        # Build context for AI
        context = self._build_email_context(lead, contact, recent_messages, purpose, tone)
        
        # Generate email
        draft = await self._generate_email(context, purpose, tone, max_length)
        
        # Log copilot usage
        await self._log_usage(ctx, "draft_email", {
            "lead_id": str(lead_id),
            "purpose": purpose
        })
        
        return draft
    
    async def _generate_email(
        self,
        context: dict,
        purpose: str,
        tone: str,
        max_length: int
    ) -> dict:
        """Generate email using AI client."""
        # If AI client is available, use it
        if self._ai_client:
            result = await self._ai_client.generate(
                prompt=self._build_email_prompt(context, purpose, tone),
                max_tokens=max_length
            )
            return {
                "subject": result.get("subject", ""),
                "body": result.get("body", ""),
                "confidence_score": result.get("confidence", 0.8),
                "warnings": result.get("warnings", [])
            }
        
        # Mock implementation for demonstration
        lead = context.get("lead", {})
        first_name = lead.get("first_name", "there")
        company = lead.get("company", "your company")
        
        return {
            "subject": f"Following up - {purpose}",
            "body": f"""Hi {first_name},

I hope this message finds you well. I wanted to reach out regarding {purpose}.

At SalesFlow AI, we help companies like {company} streamline their sales processes and close more deals.

Would you have 15 minutes this week for a quick call to discuss how we might help?

Best regards""",
            "suggested_send_time": datetime.utcnow().isoformat(),
            "confidence_score": 0.75,
            "warnings": ["This is a generated template - please personalize before sending"]
        }
    
    def _build_email_context(
        self,
        lead: dict,
        contact: Optional[dict],
        messages: list,
        purpose: str,
        tone: str
    ) -> dict:
        """Build context dictionary for email generation."""
        return {
            "lead": lead,
            "contact": contact,
            "recent_messages": messages,
            "purpose": purpose,
            "tone": tone
        }
    
    def _build_email_prompt(self, context: dict, purpose: str, tone: str) -> str:
        """Build prompt for AI email generation."""
        lead = context.get("lead", {})
        return f"""Generate a professional sales email with the following context:

Lead Information:
- Name: {lead.get('first_name')} {lead.get('last_name')}
- Company: {lead.get('company')}
- Title: {lead.get('title')}
- Status: {lead.get('status')}

Email Purpose: {purpose}
Tone: {tone}

Generate a subject line and email body."""
    
    # ============= Lead Summarization =============
    
    @require_permission("leads", "read")
    async def summarize_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        include_activity_history: bool = True,
        include_deal_info: bool = True
    ) -> dict:
        """Generate a comprehensive lead summary."""
        lead = await self._get_lead(lead_id)
        
        # Gather additional context
        contacts = []
        if self._contact_repo:
            result = await self._contact_repo.get_by_lead(lead_id, page=1, page_size=10)
            contacts = result.get("items", [])
        
        deals = []
        if include_deal_info and self._deal_repo:
            deals = await self._deal_repo.get_by_lead(lead_id)
        
        activity = []
        if include_activity_history and self._message_repo:
            activity = await self._message_repo.get_by_lead(lead_id, limit=20)
        
        # Generate summary
        summary = await self._generate_lead_summary(lead, contacts, deals, activity)
        
        # Log usage
        await self._log_usage(ctx, "summarize_lead", {"lead_id": str(lead_id)})
        
        return summary
    
    async def _generate_lead_summary(
        self,
        lead: dict,
        contacts: list,
        deals: list,
        activity: list
    ) -> dict:
        """Generate lead summary using AI or rules."""
        # Calculate engagement score
        engagement_score = self._calculate_engagement_score(lead, activity)
        
        # Generate key points
        key_points = []
        key_points.append(f"Lead status: {lead.get('status', 'unknown')}")
        key_points.append(f"Source: {lead.get('source', 'unknown')}")
        if lead.get("company"):
            key_points.append(f"Company: {lead.get('company')}")
        if contacts:
            key_points.append(f"{len(contacts)} contact(s) associated")
        if deals:
            total_value = sum(d.get("value", 0) for d in deals)
            key_points.append(f"{len(deals)} deal(s) worth ${total_value:,.0f}")
        
        # Generate recommendations
        recommendations = self._generate_recommendations(lead, activity)
        
        # Identify risk factors
        risk_factors = []
        if lead.get("score", 0) < 30:
            risk_factors.append("Low engagement score")
        if not lead.get("last_contacted_at"):
            risk_factors.append("Never contacted")
        if lead.get("status") == "new" and not activity:
            risk_factors.append("No activity since creation")
        
        # Identify opportunities
        opportunities = []
        if lead.get("score", 0) > 70:
            opportunities.append("High engagement - ready for advancement")
        if lead.get("priority") == "high":
            opportunities.append("Marked as high priority")
        if contacts and any(c.get("contact_type") == "decision_maker" for c in contacts):
            opportunities.append("Has decision maker contact")
        
        return {
            "summary": f"Lead {lead.get('first_name')} {lead.get('last_name')} from {lead.get('company', 'Unknown')} is currently in {lead.get('status', 'unknown')} status with an engagement score of {engagement_score:.0f}%.",
            "key_points": key_points,
            "engagement_score": engagement_score,
            "recommended_actions": recommendations,
            "risk_factors": risk_factors,
            "opportunities": opportunities
        }
    
    def _calculate_engagement_score(self, lead: dict, activity: list) -> float:
        """Calculate lead engagement score."""
        score = lead.get("score", 0)
        
        # Boost for recent activity
        if activity:
            score += min(len(activity) * 5, 20)
        
        # Boost for status progression
        status_scores = {
            "new": 0, "contacted": 10, "qualified": 25,
            "proposal": 40, "negotiation": 60, "won": 100
        }
        score += status_scores.get(lead.get("status"), 0)
        
        return min(score, 100)
    
    def _generate_recommendations(self, lead: dict, activity: list) -> list[str]:
        """Generate action recommendations for a lead."""
        recommendations = []
        status = lead.get("status")
        
        if status == "new":
            recommendations.append("Send introductory email")
            recommendations.append("Research company background")
        elif status == "contacted":
            recommendations.append("Schedule discovery call")
            recommendations.append("Send relevant case study")
        elif status == "qualified":
            recommendations.append("Prepare custom proposal")
            recommendations.append("Identify decision makers")
        elif status == "proposal":
            recommendations.append("Follow up on proposal")
            recommendations.append("Address any objections")
        elif status == "negotiation":
            recommendations.append("Finalize contract terms")
            recommendations.append("Get executive buy-in")
        
        # Activity-based recommendations
        if not activity:
            recommendations.insert(0, "Initiate first contact")
        elif len(activity) > 10 and status in ["new", "contacted"]:
            recommendations.append("Qualify or disqualify - many touchpoints with no progress")
        
        return recommendations[:5]  # Return top 5
    
    # ============= Next Steps =============
    
    @require_permission("leads", "read")
    async def suggest_next_steps(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        deal_id: UUID = None,
        recent_activity_count: int = 10
    ) -> dict:
        """Suggest next steps for a lead."""
        lead = await self._get_lead(lead_id)
        
        # Get deal if specified
        deal = None
        if deal_id and self._deal_repo:
            deal = await self._deal_repo.get_by_id(deal_id)
        
        # Get recent activity
        activity = []
        if self._message_repo:
            activity = await self._message_repo.get_by_lead(lead_id, limit=recent_activity_count)
        
        # Generate recommendations
        recommendations = self._generate_next_steps(lead, deal, activity)
        
        # Log usage
        await self._log_usage(ctx, "suggest_next_steps", {"lead_id": str(lead_id)})
        
        return {
            "recommendations": recommendations,
            "priority_action": recommendations[0]["action"] if recommendations else "Review lead status",
            "reasoning": "Based on current lead status and recent activity patterns",
            "estimated_impact": "Medium to High"
        }
    
    def _generate_next_steps(
        self,
        lead: dict,
        deal: Optional[dict],
        activity: list
    ) -> list[dict]:
        """Generate prioritized next steps."""
        steps = []
        status = lead.get("status")
        
        # Status-based steps
        if status == "new":
            steps.append({
                "action": "Send personalized outreach email",
                "priority": "high",
                "timing": "Within 24 hours",
                "reason": "New leads have highest response rate when contacted quickly"
            })
        elif status == "contacted":
            steps.append({
                "action": "Schedule discovery call",
                "priority": "high",
                "timing": "Within 48 hours",
                "reason": "Lead has shown interest, capitalize on momentum"
            })
        elif status == "qualified":
            steps.append({
                "action": "Send tailored proposal",
                "priority": "high",
                "timing": "Within 1 week",
                "reason": "Lead is qualified and ready for next stage"
            })
        
        # Deal-based steps
        if deal:
            stage = deal.get("stage")
            if stage == "proposal":
                steps.append({
                    "action": "Follow up on proposal",
                    "priority": "high",
                    "timing": "Within 3 days",
                    "reason": "Proposals go stale if not followed up promptly"
                })
            elif stage == "negotiation":
                steps.append({
                    "action": "Address remaining objections",
                    "priority": "high",
                    "timing": "ASAP",
                    "reason": "Close to the finish line"
                })
        
        # Activity-based steps
        if not activity:
            steps.insert(0, {
                "action": "Make initial contact",
                "priority": "urgent",
                "timing": "Today",
                "reason": "No previous activity recorded"
            })
        
        return steps
    
    # ============= Sentiment Analysis =============
    
    async def analyze_sentiment(
        self,
        ctx: ServiceContext,
        text: str
    ) -> dict:
        """Analyze sentiment of text."""
        # Use AI client if available
        if self._ai_client:
            result = await self._ai_client.analyze_sentiment(text)
            return result
        
        # Simple rule-based analysis (mock)
        text_lower = text.lower()
        
        # Simple keyword-based sentiment
        positive_words = ["great", "excellent", "happy", "interested", "love", "thanks", "appreciate"]
        negative_words = ["problem", "issue", "unhappy", "disappointed", "cancel", "expensive", "difficult"]
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        score = (positive_count - negative_count) / max(positive_count + negative_count, 1)
        
        if score > 0.3:
            sentiment = "positive"
        elif score < -0.3:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        return {
            "overall_sentiment": sentiment,
            "sentiment_score": score,
            "emotions": {
                "interest": 0.6 if positive_count > 0 else 0.3,
                "concern": 0.6 if negative_count > 0 else 0.2
            },
            "key_phrases": [],
            "concerns": [word for word in negative_words if word in text_lower],
            "positive_signals": [word for word in positive_words if word in text_lower]
        }
    
    # ============= Lead Qualification =============
    
    @require_permission("leads", "read")
    async def qualify_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        qualification_criteria: dict = None
    ) -> dict:
        """Analyze and score lead qualification."""
        lead = await self._get_lead(lead_id)
        
        # Default BANT criteria if not specified
        criteria = qualification_criteria or {
            "budget": {"weight": 25, "threshold": 50},
            "authority": {"weight": 25, "threshold": 50},
            "need": {"weight": 25, "threshold": 50},
            "timeline": {"weight": 25, "threshold": 50}
        }
        
        # Score each criterion
        criteria_scores = {}
        strengths = []
        weaknesses = []
        missing_info = []
        
        # Budget assessment
        if lead.get("estimated_value"):
            criteria_scores["budget"] = 80
            strengths.append("Budget information available")
        else:
            criteria_scores["budget"] = 30
            missing_info.append("Budget/estimated value not captured")
        
        # Authority assessment
        if self._contact_repo:
            contacts = await self._contact_repo.get_decision_makers(lead_id)
            if contacts:
                criteria_scores["authority"] = 90
                strengths.append("Decision maker contact identified")
            else:
                criteria_scores["authority"] = 40
                weaknesses.append("No decision maker contact")
        else:
            criteria_scores["authority"] = 50
            missing_info.append("Contact information not available")
        
        # Need assessment (based on engagement)
        if lead.get("score", 0) > 50:
            criteria_scores["need"] = 80
            strengths.append("High engagement indicates strong need")
        elif lead.get("score", 0) > 25:
            criteria_scores["need"] = 50
        else:
            criteria_scores["need"] = 30
            weaknesses.append("Low engagement - need unclear")
        
        # Timeline assessment
        if lead.get("next_follow_up"):
            criteria_scores["timeline"] = 70
            strengths.append("Follow-up scheduled")
        else:
            criteria_scores["timeline"] = 40
            missing_info.append("No timeline established")
        
        # Calculate overall score
        total_weight = sum(c["weight"] for c in criteria.values())
        weighted_score = sum(
            criteria_scores.get(k, 0) * v["weight"] / total_weight
            for k, v in criteria.items()
        )
        
        qualified = weighted_score >= 60
        
        # Generate recommendation
        if qualified:
            recommendation = "Lead is qualified. Proceed to proposal stage."
        elif weighted_score >= 40:
            recommendation = "Lead shows potential but needs more qualification. Focus on: " + ", ".join(missing_info[:2])
        else:
            recommendation = "Lead requires significant nurturing before qualification."
        
        # Log usage
        await self._log_usage(ctx, "qualify_lead", {
            "lead_id": str(lead_id),
            "score": weighted_score
        })
        
        return {
            "qualified": qualified,
            "score": int(weighted_score),
            "criteria_scores": criteria_scores,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "missing_info": missing_info,
            "recommendation": recommendation
        }
    
    # ============= Helper Methods =============
    
    async def _get_lead(self, lead_id: UUID) -> dict:
        """Get lead or raise NotFoundError."""
        if not self._lead_repo:
            raise BusinessRuleViolation("Lead repository not configured")
        
        lead = await self._lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError(
                message=f"Lead {lead_id} not found",
                resource_type="lead",
                resource_id=str(lead_id)
            )
        return lead
    
    async def _log_usage(
        self,
        ctx: ServiceContext,
        action: str,
        details: dict
    ) -> None:
        """Log copilot usage for analytics."""
        logger.info(
            f"Copilot: {action} by user {ctx.user_id}",
            extra={"details": details}
        )
        
        if self._event_publisher:
            await self._event_publisher.publish("copilot.used", {
                "action": action,
                "user_id": str(ctx.user_id),
                **details
            })


__all__ = ["CopilotService"]

