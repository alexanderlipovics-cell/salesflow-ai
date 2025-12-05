"""
A/B Testing Service for Autopilot Engine V2

Manages template experiments and performance tracking.
"""

from __future__ import annotations

import logging
import random
from typing import Any, Dict, List, Optional

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# VARIANT SELECTION
# ============================================================================


async def select_ab_variant(
    experiment_id: str,
    db: Client
) -> Dict[str, Any]:
    """
    Select A/B test variant for a message.
    
    Algorithm V1: Weighted random selection
    Algorithm V2: Multi-Armed Bandit (Thompson Sampling)
    
    Args:
        experiment_id: Experiment UUID
        db: Supabase client
        
    Returns:
        Variant dict with id, template, etc.
    """
    try:
        # Load experiment
        result = db.table("ab_test_experiments")\
            .select("*")\
            .eq("id", experiment_id)\
            .eq("status", "active")\
            .execute()
        
        if not result.data:
            logger.warning(f"No active experiment found: {experiment_id}")
            return {"id": "default", "template": "{text}", "name": "Default"}
        
        experiment = result.data[0]
        variants = experiment["variants"]
        traffic_split = experiment.get("traffic_split", {})
        
        # Weighted random selection
        rand = random.random()
        cumulative = 0.0
        
        for variant in variants:
            variant_id = variant["id"]
            weight = traffic_split.get(variant_id, 1.0 / len(variants))
            cumulative += weight
            
            if rand <= cumulative:
                logger.debug(f"Selected variant {variant_id} for experiment {experiment_id}")
                return variant
        
        # Fallback: First variant
        return variants[0]
    
    except Exception as e:
        logger.error(f"Error selecting AB variant: {e}")
        return {"id": "default", "template": "{text}", "name": "Default"}


# ============================================================================
# RESULT TRACKING
# ============================================================================


async def track_ab_result(
    db: Client,
    experiment_id: str,
    variant_id: str,
    message_event_id: str,
    contact_id: str,
    metric_name: str,  # sent, opened, replied, converted
    metric_value: float = 1.0
):
    """
    Track A/B test metric.
    
    Metrics:
    - sent: Message was sent (1.0)
    - opened: Email was opened (1.0) or read receipt received
    - replied: Contact replied (1.0)
    - converted: Deal closed / goal achieved (1.0)
    
    Args:
        db: Supabase client
        experiment_id: Experiment UUID
        variant_id: Variant ID (A, B, C, etc.)
        message_event_id: Message event UUID
        contact_id: Contact UUID
        metric_name: Metric type
        metric_value: Metric value (default: 1.0)
    """
    try:
        data = {
            "experiment_id": experiment_id,
            "variant_id": variant_id,
            "message_event_id": message_event_id,
            "contact_id": contact_id,
            "metric_name": metric_name,
            "metric_value": metric_value,
            "metadata": {},
            "created_at": datetime.utcnow().isoformat()
        }
        
        db.table("ab_test_results").insert(data).execute()
        
        logger.debug(f"Tracked AB result: {experiment_id}/{variant_id} - {metric_name}")
    
    except Exception as e:
        logger.error(f"Error tracking AB result: {e}")


# ============================================================================
# WINNER CALCULATION
# ============================================================================


async def calculate_ab_winner(
    db: Client,
    experiment_id: str,
    min_sample_size: int = 30
) -> Optional[str]:
    """
    Calculate winner variant based on target metric.
    
    V1: Simple conversion rate
    V2: Statistical significance (Chi-Square test)
    
    Args:
        db: Supabase client
        experiment_id: Experiment UUID
        min_sample_size: Minimum samples per variant to declare winner
        
    Returns:
        Winner variant ID or None if insufficient data
    """
    try:
        # Load experiment
        exp_result = db.table("ab_test_experiments")\
            .select("*")\
            .eq("id", experiment_id)\
            .execute()
        
        if not exp_result.data:
            return None
        
        experiment = exp_result.data[0]
        target_metric = experiment["target_metric"]
        
        # Load all results for this experiment
        results = db.table("ab_test_results")\
            .select("variant_id, metric_name")\
            .eq("experiment_id", experiment_id)\
            .execute()
        
        if not results.data:
            return None
        
        # Aggregate stats per variant
        variant_stats: Dict[str, Dict[str, int]] = {}
        
        for result in results.data:
            variant_id = result["variant_id"]
            metric_name = result["metric_name"]
            
            if variant_id not in variant_stats:
                variant_stats[variant_id] = {
                    "sent": 0,
                    "opened": 0,
                    "replied": 0,
                    "converted": 0
                }
            
            variant_stats[variant_id][metric_name] = variant_stats[variant_id].get(metric_name, 0) + 1
        
        # Calculate scores
        variant_scores = {}
        
        for variant_id, stats in variant_stats.items():
            sent = stats["sent"]
            
            # Check minimum sample size
            if sent < min_sample_size:
                continue
            
            if sent == 0:
                variant_scores[variant_id] = 0.0
                continue
            
            # Calculate conversion rate based on target metric
            if target_metric == "reply_rate":
                variant_scores[variant_id] = stats["replied"] / sent
            elif target_metric == "conversion_rate":
                variant_scores[variant_id] = stats["converted"] / sent
            elif target_metric == "open_rate":
                variant_scores[variant_id] = stats["opened"] / sent
            else:
                variant_scores[variant_id] = stats["replied"] / sent  # Default
        
        # Find winner
        if variant_scores:
            winner = max(variant_scores.items(), key=lambda x: x[1])
            winner_id, winner_score = winner
            
            logger.info(
                f"AB test winner: {winner_id} with score {winner_score:.2%} "
                f"(experiment: {experiment_id})"
            )
            
            return winner_id
        
        return None
    
    except Exception as e:
        logger.error(f"Error calculating AB winner: {e}")
        return None


__all__ = [
    "check_content_safety",
    "detect_opt_out",
    "handle_opt_out",
    "select_ab_variant",
    "track_ab_result",
    "calculate_ab_winner",
    "CONFIDENCE_THRESHOLD",
]

