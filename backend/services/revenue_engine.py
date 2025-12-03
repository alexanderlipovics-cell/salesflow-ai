"""
Revenue Engine - Core Logic für Revenue Intelligence System
Deal Health, At-Risk Detection, Forecasting, Predictions
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
import json
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings
from supabase import create_client

logger = logging.getLogger(__name__)

class RevenueEngine:
    """Core engine for revenue intelligence and predictions"""
    
    def __init__(self):
        """Initialize Supabase connection and load framework"""
        self.supabase = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        )
        
        # Load revenue metrics framework
        framework_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'data',
            'revenue_metrics_framework.json'
        )
        
        try:
            with open(framework_path, 'r', encoding='utf-8') as f:
                self.framework = json.load(f)
            logger.info("✅ Revenue metrics framework loaded")
        except Exception as e:
            logger.warning(f"⚠️  Could not load framework: {e}")
            self.framework = {}
    
    def calculate_deal_health(self, deal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate comprehensive health score for a deal (0-100)
        
        Args:
            deal: Dictionary with lead data (status, deal_value, days_in_stage, etc.)
            
        Returns:
            Dictionary with health_score and risk_factors
        """
        try:
            health_score = 100
            risk_factors = []
            
            # Factor 1: Stagnation (days in stage)
            days_in_stage = deal.get('days_in_stage', 0)
            if days_in_stage > 60:
                penalty = (days_in_stage - 60) * 2
                health_score -= min(penalty, 40)
                risk_factors.append(f"Stagnant for {days_in_stage} days")
            elif days_in_stage > 30:
                risk_factors.append(f"In stage for {days_in_stage} days")
            
            # Factor 2: Overdue close date
            expected_close = deal.get('expected_close_date')
            if expected_close:
                if isinstance(expected_close, str):
                    expected_close = datetime.fromisoformat(expected_close.replace('Z', '+00:00'))
                
                if expected_close.date() < datetime.now().date():
                    health_score -= 20
                    risk_factors.append("Past expected close date")
            
            # Factor 3: Low engagement (lead score)
            score = deal.get('score', 50)
            deal_value = deal.get('deal_value', 0)
            if score is not None and score < 30 and deal_value > 5000:
                health_score -= 30
                risk_factors.append(f"Low engagement score ({score})")
            
            # Factor 4: Inactivity
            last_activity = deal.get('last_activity_date')
            if last_activity:
                if isinstance(last_activity, str):
                    last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                
                days_since_activity = (datetime.now() - last_activity).days
                if days_since_activity > 14:
                    health_score -= 25
                    risk_factors.append(f"No activity for {days_since_activity} days")
                elif days_since_activity > 7:
                    health_score -= 15
                    risk_factors.append(f"No activity for {days_since_activity} days")
            
            # Clamp to 0-100
            health_score = max(0, min(100, health_score))
            
            # Determine health category
            if health_score >= 80:
                health_category = "excellent"
            elif health_score >= 60:
                health_category = "good"
            elif health_score >= 40:
                health_category = "at_risk"
            else:
                health_category = "critical"
            
            return {
                "health_score": health_score,
                "health_category": health_category,
                "risk_factors": risk_factors,
                "requires_attention": health_score < 50
            }
            
        except Exception as e:
            logger.error(f"❌ Error calculating deal health: {e}")
            return {
                "health_score": 50,
                "health_category": "unknown",
                "risk_factors": ["Error calculating health"],
                "requires_attention": False
            }
    
    async def get_at_risk_deals(self, min_deal_value: float = 1000) -> List[Dict[str, Any]]:
        """
        Get high-value deals that need immediate attention
        
        Args:
            min_deal_value: Minimum deal value to consider (default: 1000)
            
        Returns:
            List of at-risk deals with health analysis
        """
        try:
            logger.info(f"📊 Fetching at-risk deals (min value: {min_deal_value})")
            
            # Use the at_risk_deals view
            result = self.supabase.table('at_risk_deals').select('*').execute()
            
            if not result.data:
                logger.info("✅ No at-risk deals found")
                return []
            
            # Enrich with detailed health analysis
            enriched_deals = []
            for deal in result.data:
                if deal.get('deal_value', 0) >= min_deal_value:
                    health_analysis = self.calculate_deal_health(deal)
                    
                    enriched_deals.append({
                        **deal,
                        "health_analysis": health_analysis
                    })
            
            # Sort by deal value (highest first) and health score (lowest first)
            enriched_deals.sort(
                key=lambda x: (-x.get('deal_value', 0), x['health_analysis']['health_score'])
            )
            
            logger.info(f"✅ Found {len(enriched_deals)} at-risk deals")
            
            return enriched_deals
            
        except Exception as e:
            logger.error(f"❌ Error fetching at-risk deals: {e}")
            return []
    
    def calculate_scenario(
        self, 
        current_pipeline: float, 
        inputs: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        What-If Scenario Calculator
        
        Args:
            current_pipeline: Current total pipeline value
            inputs: Dict with win_rate_increase, deal_size_increase, pipeline_growth
            
        Returns:
            Baseline vs. projected forecast with delta
        """
        try:
            # Get current metrics
            win_rate_change = inputs.get('win_rate_increase', 0.0)
            deal_size_change = inputs.get('deal_size_increase', 0.0)
            pipeline_growth = inputs.get('pipeline_growth', 0.0)
            
            # Baseline (current state)
            baseline_forecast = current_pipeline * 0.3  # Assume 30% avg win rate
            
            # Projected (with changes)
            new_pipeline = current_pipeline * (1 + pipeline_growth)
            new_win_rate = 0.3 * (1 + win_rate_change)
            new_deal_size_multiplier = (1 + deal_size_change)
            
            projected_forecast = new_pipeline * new_win_rate * new_deal_size_multiplier
            
            # Calculate delta
            delta_value = projected_forecast - baseline_forecast
            delta_percent = (delta_value / baseline_forecast * 100) if baseline_forecast > 0 else 0
            
            return {
                "baseline": {
                    "pipeline": current_pipeline,
                    "win_rate": 0.3,
                    "forecast": round(baseline_forecast, 2)
                },
                "projected": {
                    "pipeline": round(new_pipeline, 2),
                    "win_rate": round(new_win_rate, 3),
                    "deal_size_change": f"{deal_size_change * 100:+.1f}%",
                    "forecast": round(projected_forecast, 2)
                },
                "delta": {
                    "value": round(delta_value, 2),
                    "percent": round(delta_percent, 2)
                },
                "inputs_applied": inputs
            }
            
        except Exception as e:
            logger.error(f"❌ Error calculating scenario: {e}")
            raise
    
    def predict_deal_value(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict deal value using framework model
        
        Args:
            inputs: Dict with product_plan, num_users_planned, base_price, etc.
            
        Returns:
            Predicted value and confidence score
        """
        try:
            if not self.framework or 'deal_value_prediction_model' not in self.framework:
                raise Exception("Framework not loaded")
            
            model = self.framework['deal_value_prediction_model']
            
            # Base calculation
            base_value = (
                inputs.get('num_users_planned', 1) * 
                inputs.get('base_list_price_per_user', 0) * 
                (1 - inputs.get('discount_pct', 0)) * 
                inputs.get('contract_term_months', 12)
            )
            
            # Industry adjustment
            industry = inputs.get('industry', 'default')
            industry_factor = model['calculation']['industry_adjustment'].get(
                industry.lower(),
                model['calculation']['industry_adjustment']['default']
            )
            
            # Stage confidence
            stage = inputs.get('deal_stage', 'discovery')
            stage_factor = model['calculation']['stage_confidence_factor'].get(
                stage.lower(),
                0.5
            )
            
            # Calculate adjusted value
            adjusted_value = base_value * industry_factor * stage_factor
            
            # Blend with historical data
            historical_avg = inputs.get('similar_closed_deals_avg_acv', adjusted_value)
            blended = 0.7 * adjusted_value + 0.3 * historical_avg
            
            # Apply expansion potential
            expansion_factor = inputs.get('expansion_potential_factor', 1.0)
            final_value = blended * expansion_factor
            
            # Confidence based on stage
            confidence_score = stage_factor * 100
            
            return {
                "predicted_deal_value": round(final_value, 2),
                "confidence_score": round(confidence_score, 2),
                "breakdown": {
                    "base_value": round(base_value, 2),
                    "industry_factor": industry_factor,
                    "stage_factor": stage_factor,
                    "expansion_factor": expansion_factor
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error predicting deal value: {e}")
            raise
    
    def calculate_close_probability(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate close probability using framework
        
        Args:
            inputs: Dict with deal_stage, days_in_stage, lead_score, etc.
            
        Returns:
            Close probability (0-100) and key factors
        """
        try:
            if not self.framework or 'close_probability_calculator' not in self.framework:
                raise Exception("Framework not loaded")
            
            calc = self.framework['close_probability_calculator']['calculation']
            
            # Base probability by stage
            stage = inputs.get('deal_stage', 'discovery')
            base_prob = calc['base_probability_by_stage'].get(stage.lower(), 10)
            
            # Stage velocity penalty
            days_in_stage = inputs.get('days_in_stage', 0)
            expected_duration = calc['stage_velocity_penalty']['expected_duration_days'].get(
                stage.lower(), 14
            )
            
            velocity_penalty = 0
            if days_in_stage > expected_duration:
                velocity_penalty = (days_in_stage - expected_duration) * 2
            
            # Engagement boost
            lead_score = inputs.get('lead_score', 50)
            num_interactions = inputs.get('num_interactions', 0)
            num_objections = inputs.get('num_objections_handled', 0)
            
            engagement_boost = 0
            if lead_score > 50:
                engagement_boost += (lead_score - 50) * 0.3
            engagement_boost += min(num_interactions * 2, 20)
            engagement_boost += num_objections * 5
            
            # Qualification boost
            qualification_boost = 0
            if inputs.get('champion_identified'):
                qualification_boost += 15
            if inputs.get('budget_confirmed'):
                qualification_boost += 10
            if inputs.get('decision_maker_engaged'):
                qualification_boost += 10
            
            # Competition penalty
            competitors = inputs.get('competitors_mentioned', 0)
            competition_penalty = min(competitors * 5, 15)
            
            # Calculate final probability
            final_prob = base_prob + engagement_boost + qualification_boost - velocity_penalty - competition_penalty
            final_prob = max(0, min(100, int(final_prob)))
            
            # Determine confidence
            if inputs.get('champion_identified') and inputs.get('budget_confirmed'):
                confidence = "high"
            elif lead_score > 60:
                confidence = "medium"
            else:
                confidence = "low"
            
            # Key factors
            key_factors = []
            if velocity_penalty > 0:
                key_factors.append(f"Delayed in {stage} stage")
            if engagement_boost > 20:
                key_factors.append("Strong engagement")
            if qualification_boost > 20:
                key_factors.append("Well qualified")
            if competition_penalty > 0:
                key_factors.append(f"{competitors} competitors")
            
            return {
                "close_probability": final_prob,
                "confidence": confidence,
                "key_factors": key_factors,
                "breakdown": {
                    "base_probability": base_prob,
                    "engagement_boost": round(engagement_boost, 2),
                    "qualification_boost": qualification_boost,
                    "velocity_penalty": velocity_penalty,
                    "competition_penalty": competition_penalty
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error calculating close probability: {e}")
            raise
    
    def calculate_churn_risk(self, account: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate churn risk for an account
        
        Args:
            account: Dictionary with account data
            
        Returns:
            Churn risk score, level, and recommended actions
        """
        try:
            if not self.framework or 'churn_risk_indicators' not in self.framework:
                raise Exception("Framework not loaded")
            
            risk_factors_config = self.framework['churn_risk_indicators']['risk_factors']
            
            # Calculate risk score
            risk_score = 0
            active_risk_factors = []
            
            # Usage red flags
            days_since_login = account.get('days_since_last_login', 0)
            if days_since_login >= 30:
                risk_score += 30
                active_risk_factors.append("No login in 30+ days")
            
            usage_trend = account.get('usage_trend', 'stable')
            if usage_trend == 'decreasing':
                risk_score += 20
                active_risk_factors.append("Decreasing usage trend")
            
            feature_adoption = account.get('feature_adoption_rate', 0.5)
            if feature_adoption < 0.3:
                risk_score += 15
                active_risk_factors.append("Low feature adoption")
            
            # Support red flags
            support_tickets = account.get('support_tickets_last_30d', 0)
            if support_tickets > 5:
                risk_score += 15
                active_risk_factors.append("High support ticket volume")
            
            # Financial red flags
            payment_issues = account.get('payment_issues_count', 0)
            if payment_issues > 0:
                risk_score += 20
                active_risk_factors.append("Payment issues")
            
            # Sentiment red flags
            nps_score = account.get('nps_score', 0)
            if nps_score < 0:
                risk_score += 20
                active_risk_factors.append("Negative NPS")
            
            engagement_score = account.get('engagement_score', 50)
            if engagement_score < 30:
                risk_score += 10
                active_risk_factors.append("Low engagement")
            
            # Clamp to 0-100
            risk_score = min(risk_score, 100)
            
            # Determine risk level
            if risk_score >= 70:
                risk_level = "critical"
            elif risk_score >= 50:
                risk_level = "high"
            elif risk_score >= 30:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            # Recommended actions
            recommended_actions = []
            if days_since_login >= 30:
                recommended_actions.append("Schedule immediate check-in call")
            if usage_trend == 'decreasing':
                recommended_actions.append("Review product adoption and provide training")
            if payment_issues > 0:
                recommended_actions.append("Resolve billing issues urgently")
            if nps_score < 0:
                recommended_actions.append("Conduct satisfaction survey and address concerns")
            
            return {
                "churn_risk_score": risk_score,
                "risk_level": risk_level,
                "primary_risk_factors": active_risk_factors[:3],
                "recommended_actions": recommended_actions
            }
            
        except Exception as e:
            logger.error(f"❌ Error calculating churn risk: {e}")
            raise
    
    def calculate_expansion_score(self, account: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate expansion opportunity score for an account
        
        Args:
            account: Dictionary with account data
            
        Returns:
            Expansion score, opportunities, and estimated value
        """
        try:
            if not self.framework or 'expansion_opportunity_scores' not in self.framework:
                raise Exception("Framework not loaded")
            
            config = self.framework['expansion_opportunity_scores']
            
            # Base score calculation
            engagement_score = account.get('engagement_score', 50)
            nps_score = account.get('nps_score', 0)
            nps_normalized = (nps_score + 100) / 2  # Convert -100 to 100 → 0 to 100
            
            days_as_customer = account.get('days_as_customer', 0)
            if days_as_customer < 90:
                tenure_factor = 0.3
            elif days_as_customer < 180:
                tenure_factor = 0.6
            elif days_as_customer < 365:
                tenure_factor = 0.8
            else:
                tenure_factor = 1.0
            
            base_score = (engagement_score * 0.4 + nps_normalized * 0.3 + tenure_factor * 100 * 0.3)
            
            # Identify opportunities
            opportunities = []
            estimated_value = 0
            current_mrr = account.get('current_mrr', 0)
            
            # Seat expansion
            license_util = account.get('license_utilization_pct', 0)
            if license_util > 0.8:
                potential_value = current_mrr * 0.3
                opportunities.append({
                    "type": "seat_expansion",
                    "probability": "high" if license_util > 0.9 else "medium",
                    "estimated_value": round(potential_value * 12, 2),
                    "trigger": f"High license utilization ({license_util * 100:.0f}%)"
                })
                estimated_value += potential_value * 12
            
            # Plan upgrade
            if engagement_score > 70:
                potential_value = current_mrr * 0.5
                opportunities.append({
                    "type": "plan_upgrade",
                    "probability": "medium",
                    "estimated_value": round(potential_value * 12, 2),
                    "trigger": "High engagement suggests need for premium features"
                })
                estimated_value += potential_value * 12 * 0.5  # 50% probability
            
            # Apply multiplier to base score
            if opportunities:
                max_multiplier = max(
                    1.2 if any(o['type'] == 'seat_expansion' for o in opportunities) else 1.0,
                    1.5 if any(o['type'] == 'plan_upgrade' for o in opportunities) else 1.0
                )
                final_score = base_score * max_multiplier
            else:
                final_score = base_score
            
            final_score = min(100, int(final_score))
            
            # Recommended actions
            recommended_actions = []
            if license_util > 0.8:
                recommended_actions.append("Proactively offer seat expansion discount")
            if engagement_score > 70:
                recommended_actions.append("Present premium plan features and ROI")
            if opportunities:
                recommended_actions.append("Schedule account review meeting")
            
            return {
                "expansion_score": final_score,
                "top_opportunities": opportunities,
                "estimated_expansion_value": round(estimated_value, 2),
                "recommended_next_actions": recommended_actions,
                "breakdown": {
                    "base_score": round(base_score, 2),
                    "engagement_factor": engagement_score,
                    "nps_factor": nps_normalized,
                    "tenure_factor": tenure_factor
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error calculating expansion score: {e}")
            raise

# Singleton instance
revenue_engine = RevenueEngine()

