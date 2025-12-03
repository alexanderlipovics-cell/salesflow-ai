"""
A/B Test Engine Service
Handles A/B testing logic, variant assignment, and statistical analysis
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from supabase import Client
import logging
import random

logger = logging.getLogger(__name__)


class ABTestEngine:
    """
    Engine for managing A/B tests on message templates
    """
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    async def create_test(
        self,
        name: str,
        metric: str,
        variants: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a new A/B test with variants
        
        Args:
            name: Test name
            metric: Metric to optimize (open_rate, reply_rate, etc.)
            variants: List of variant configurations
            
        Returns:
            Created test record with variants
        """
        try:
            # Create test
            test_data = {
                "name": name,
                "metric": metric,
                "status": "draft",
                "confidence_level": 0.0
            }
            
            test_result = self.supabase.table("ab_tests")\
                .insert(test_data)\
                .execute()
            
            test = test_result.data[0]
            test_id = test["id"]
            
            # Create variants
            created_variants = []
            for variant in variants:
                variant_data = {
                    "test_id": test_id,
                    "name": variant["name"],
                    "template_id": variant["template_id"],
                    "traffic_split": variant.get("traffic_split", 50)
                }
                
                variant_result = self.supabase.table("ab_variants")\
                    .insert(variant_data)\
                    .execute()
                
                created_variants.append(variant_result.data[0])
            
            logger.info(f"Created A/B test {test_id} with {len(created_variants)} variants")
            
            return {
                "test": test,
                "variants": created_variants
            }
            
        except Exception as e:
            logger.error(f"Error creating A/B test: {repr(e)}")
            raise
    
    async def assign_variant(
        self,
        test_id: str,
        lead_id: str
    ) -> Dict[str, Any]:
        """
        Assign a lead to a variant using traffic split
        
        Args:
            test_id: UUID of the test
            lead_id: UUID of the lead
            
        Returns:
            Assigned variant with template details
        """
        try:
            # Get test variants
            variants_result = self.supabase.table("ab_variants")\
                .select("*")\
                .eq("test_id", test_id)\
                .execute()
            
            variants = variants_result.data
            
            if not variants:
                raise ValueError(f"No variants found for test {test_id}")
            
            # Calculate weighted random selection
            total_traffic = sum(v["traffic_split"] for v in variants)
            rand = random.randint(0, total_traffic - 1)
            
            cumulative = 0
            selected_variant = None
            
            for variant in variants:
                cumulative += variant["traffic_split"]
                if rand < cumulative:
                    selected_variant = variant
                    break
            
            if not selected_variant:
                selected_variant = variants[0]  # Fallback
            
            # Record assignment event
            event_data = {
                "test_id": test_id,
                "variant_id": selected_variant["id"],
                "lead_id": lead_id,
                "event_type": "assigned"
            }
            
            self.supabase.table("ab_events")\
                .insert(event_data)\
                .execute()
            
            # Increment sent count
            self.supabase.table("ab_variants")\
                .update({"sent_count": selected_variant["sent_count"] + 1})\
                .eq("id", selected_variant["id"])\
                .execute()
            
            logger.info(f"Assigned lead {lead_id} to variant {selected_variant['id']}")
            
            return selected_variant
            
        except Exception as e:
            logger.error(f"Error assigning variant: {repr(e)}")
            raise
    
    async def record_conversion(
        self,
        test_id: str,
        variant_id: str,
        lead_id: str
    ) -> Dict[str, Any]:
        """
        Record a conversion event for a variant
        
        Args:
            test_id: UUID of the test
            variant_id: UUID of the variant
            lead_id: UUID of the lead
            
        Returns:
            Updated variant with new conversion count
        """
        try:
            # Record conversion event
            event_data = {
                "test_id": test_id,
                "variant_id": variant_id,
                "lead_id": lead_id,
                "event_type": "converted"
            }
            
            self.supabase.table("ab_events")\
                .insert(event_data)\
                .execute()
            
            # Get current variant
            variant_result = self.supabase.table("ab_variants")\
                .select("*")\
                .eq("id", variant_id)\
                .single()\
                .execute()
            
            variant = variant_result.data
            
            # Increment conversion count
            new_count = variant["conversion_count"] + 1
            
            result = self.supabase.table("ab_variants")\
                .update({"conversion_count": new_count})\
                .eq("id", variant_id)\
                .execute()
            
            logger.info(f"Recorded conversion for variant {variant_id}")
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Error recording conversion: {repr(e)}")
            raise
    
    async def calculate_results(self, test_id: str) -> Dict[str, Any]:
        """
        Calculate test results and statistical significance
        
        Args:
            test_id: UUID of the test
            
        Returns:
            Test results with conversion rates and confidence
        """
        try:
            # Get variants with stats
            variants_result = self.supabase.table("ab_variants")\
                .select("*")\
                .eq("test_id", test_id)\
                .execute()
            
            variants = variants_result.data
            
            results = []
            for variant in variants:
                sent = variant["sent_count"]
                converted = variant["conversion_count"]
                
                conversion_rate = (converted / sent * 100) if sent > 0 else 0
                
                results.append({
                    "variant_id": variant["id"],
                    "variant_name": variant["name"],
                    "sent_count": sent,
                    "conversion_count": converted,
                    "conversion_rate": round(conversion_rate, 2)
                })
            
            # Sort by conversion rate
            results.sort(key=lambda x: x["conversion_rate"], reverse=True)
            
            # Simple confidence calculation (simplified chi-square test)
            # In production, use proper statistical libraries
            if len(results) >= 2 and results[0]["sent_count"] > 30:
                confidence = self._calculate_confidence(results[0], results[1])
            else:
                confidence = 0.0
            
            # Update test confidence
            self.supabase.table("ab_tests")\
                .update({"confidence_level": confidence})\
                .eq("id", test_id)\
                .execute()
            
            return {
                "test_id": test_id,
                "results": results,
                "confidence_level": round(confidence, 2),
                "winner": results[0]["variant_name"] if confidence > 95 else None
            }
            
        except Exception as e:
            logger.error(f"Error calculating results: {repr(e)}")
            raise
    
    def _calculate_confidence(
        self,
        variant_a: Dict[str, Any],
        variant_b: Dict[str, Any]
    ) -> float:
        """
        Calculate statistical confidence between two variants
        
        Simplified z-test for proportions
        In production, use scipy.stats or similar
        """
        try:
            n1 = variant_a["sent_count"]
            x1 = variant_a["conversion_count"]
            p1 = x1 / n1 if n1 > 0 else 0
            
            n2 = variant_b["sent_count"]
            x2 = variant_b["conversion_count"]
            p2 = x2 / n2 if n2 > 0 else 0
            
            # Pooled proportion
            p_pool = (x1 + x2) / (n1 + n2)
            
            # Standard error
            se = (p_pool * (1 - p_pool) * (1/n1 + 1/n2)) ** 0.5
            
            if se == 0:
                return 0.0
            
            # Z-score
            z = abs(p1 - p2) / se
            
            # Rough confidence mapping
            if z > 2.58:
                return 99.0
            elif z > 1.96:
                return 95.0
            elif z > 1.645:
                return 90.0
            else:
                return z * 50  # Rough approximation
            
        except Exception:
            return 0.0
    
    async def declare_winner(
        self,
        test_id: str,
        variant_id: str
    ) -> Dict[str, Any]:
        """
        Declare a winning variant and complete the test
        
        Args:
            test_id: UUID of the test
            variant_id: UUID of the winning variant
            
        Returns:
            Updated test record
        """
        try:
            # Update test
            test_result = self.supabase.table("ab_tests")\
                .update({
                    "status": "completed",
                    "winning_variant_id": variant_id,
                    "end_date": datetime.now().isoformat()
                })\
                .eq("id", test_id)\
                .execute()
            
            # Mark variant as winner
            self.supabase.table("ab_variants")\
                .update({"is_winner": True})\
                .eq("id", variant_id)\
                .execute()
            
            logger.info(f"Declared variant {variant_id} as winner for test {test_id}")
            
            return test_result.data[0] if test_result.data else None
            
        except Exception as e:
            logger.error(f"Error declaring winner: {repr(e)}")
            raise

