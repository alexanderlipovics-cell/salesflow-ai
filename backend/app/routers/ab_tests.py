"""
A/B Tests Router
API endpoints for A/B testing message templates
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import config
from supabase import create_client
from app.services.ab_test_engine import ABTestEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ab-tests", tags=["A/B Testing"])

# Initialize Supabase client
try:
    supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
    ab_engine = ABTestEngine(supabase)
except Exception as e:
    logger.warning(f"Supabase not configured: {repr(e)}")
    supabase = None
    ab_engine = None

# --- MODELS ---

class VariantCreate(BaseModel):
    """Variant configuration for test creation"""
    name: str
    template_id: str
    traffic_split: int = Field(default=50, ge=0, le=100)

class TestCreate(BaseModel):
    """Create A/B test request"""
    name: str
    metric: str = Field(..., pattern="^(open_rate|reply_rate|click_rate|booking_rate)$")
    variants: List[VariantCreate]

class VariantResult(BaseModel):
    """Variant with performance metrics"""
    variant_id: str
    variant_name: str
    sent_count: int
    conversion_count: int
    conversion_rate: float

class TestResults(BaseModel):
    """Complete test results"""
    test_id: str
    results: List[VariantResult]
    confidence_level: float
    winner: Optional[str] = None

class ConversionEvent(BaseModel):
    """Record a conversion"""
    variant_id: str
    lead_id: str

# --- ENDPOINTS ---

@router.post("/", status_code=201)
async def create_ab_test(test: TestCreate):
    """
    Create a new A/B test with variants
    
    Args:
        test: Test configuration with variants
        
    Returns:
        Created test with variants
    """
    if not ab_engine:
        raise HTTPException(status_code=503, detail="A/B test engine not available")
    
    try:
        # Validate traffic splits sum to 100
        total_split = sum(v.traffic_split for v in test.variants)
        if total_split != 100:
            raise HTTPException(
                status_code=400,
                detail=f"Traffic splits must sum to 100, got {total_split}"
            )
        
        # Create test
        result = await ab_engine.create_test(
            name=test.name,
            metric=test.metric,
            variants=[v.dict() for v in test.variants]
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating A/B test: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to create A/B test")


@router.get("/", response_model=List[Dict[str, Any]])
async def list_ab_tests(
    status: Optional[str] = Query(None, pattern="^(draft|running|completed|paused)$")
):
    """
    List all A/B tests with optional status filter
    
    Args:
        status: Filter by test status (optional)
        
    Returns:
        List of A/B tests
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        query = supabase.table("ab_tests").select("*")
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).execute()
        
        return result.data if result.data else []
        
    except Exception as e:
        logger.error(f"Error listing A/B tests: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to list A/B tests")


@router.get("/{test_id}")
async def get_ab_test(test_id: str):
    """
    Get detailed A/B test information with variants
    
    Args:
        test_id: UUID of the test
        
    Returns:
        Test details with variants
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Get test
        test_result = supabase.table("ab_tests")\
            .select("*")\
            .eq("id", test_id)\
            .single()\
            .execute()
        
        if not test_result.data:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Get variants
        variants_result = supabase.table("ab_variants")\
            .select("*")\
            .eq("test_id", test_id)\
            .execute()
        
        return {
            "test": test_result.data,
            "variants": variants_result.data if variants_result.data else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching A/B test: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch A/B test")


@router.post("/{test_id}/start")
async def start_ab_test(test_id: str):
    """
    Start an A/B test (change status from draft to running)
    
    Args:
        test_id: UUID of the test
        
    Returns:
        Updated test record
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        result = supabase.table("ab_tests")\
            .update({
                "status": "running",
                "start_date": datetime.now().isoformat()
            })\
            .eq("id", test_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Test not found")
        
        logger.info(f"Started A/B test {test_id}")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting A/B test: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to start A/B test")


@router.post("/{test_id}/assign/{lead_id}")
async def assign_variant(test_id: str, lead_id: str):
    """
    Assign a lead to a test variant
    
    Args:
        test_id: UUID of the test
        lead_id: UUID of the lead
        
    Returns:
        Assigned variant details
    """
    if not ab_engine:
        raise HTTPException(status_code=503, detail="A/B test engine not available")
    
    try:
        variant = await ab_engine.assign_variant(test_id, lead_id)
        
        return {
            "test_id": test_id,
            "lead_id": lead_id,
            "assigned_variant": variant
        }
        
    except Exception as e:
        logger.error(f"Error assigning variant: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to assign variant")


@router.post("/{test_id}/conversion")
async def record_conversion(test_id: str, event: ConversionEvent):
    """
    Record a conversion event for a variant
    
    Args:
        test_id: UUID of the test
        event: Conversion event details
        
    Returns:
        Updated variant statistics
    """
    if not ab_engine:
        raise HTTPException(status_code=503, detail="A/B test engine not available")
    
    try:
        result = await ab_engine.record_conversion(
            test_id=test_id,
            variant_id=event.variant_id,
            lead_id=event.lead_id
        )
        
        return {
            "status": "recorded",
            "variant": result
        }
        
    except Exception as e:
        logger.error(f"Error recording conversion: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to record conversion")


@router.get("/{test_id}/results", response_model=TestResults)
async def get_test_results(test_id: str):
    """
    Get test results with statistical analysis
    
    Args:
        test_id: UUID of the test
        
    Returns:
        Test results with conversion rates and confidence
    """
    if not ab_engine:
        raise HTTPException(status_code=503, detail="A/B test engine not available")
    
    try:
        results = await ab_engine.calculate_results(test_id)
        
        return TestResults(**results)
        
    except Exception as e:
        logger.error(f"Error calculating results: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate results")


@router.post("/{test_id}/complete")
async def complete_test(
    test_id: str,
    winning_variant_id: Optional[str] = Query(None, description="Declare a winner")
):
    """
    Complete a test and optionally declare a winner
    
    Args:
        test_id: UUID of the test
        winning_variant_id: Optional winner variant ID
        
    Returns:
        Updated test record
    """
    if not ab_engine:
        raise HTTPException(status_code=503, detail="A/B test engine not available")
    
    try:
        if winning_variant_id:
            result = await ab_engine.declare_winner(test_id, winning_variant_id)
        else:
            # Just mark as completed
            result = supabase.table("ab_tests")\
                .update({
                    "status": "completed",
                    "end_date": datetime.now().isoformat()
                })\
                .eq("id", test_id)\
                .execute()
            
            result = result.data[0] if result.data else None
        
        return result
        
    except Exception as e:
        logger.error(f"Error completing test: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete test")


@router.delete("/{test_id}")
async def delete_test(test_id: str):
    """
    Delete an A/B test (only if in draft status)
    
    Args:
        test_id: UUID of the test
        
    Returns:
        Deletion confirmation
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Check status first
        test_result = supabase.table("ab_tests")\
            .select("status")\
            .eq("id", test_id)\
            .single()\
            .execute()
        
        if not test_result.data:
            raise HTTPException(status_code=404, detail="Test not found")
        
        if test_result.data["status"] != "draft":
            raise HTTPException(
                status_code=400,
                detail="Can only delete tests in draft status"
            )
        
        # Delete test (cascades to variants and events)
        supabase.table("ab_tests")\
            .delete()\
            .eq("id", test_id)\
            .execute()
        
        logger.info(f"Deleted A/B test {test_id}")
        
        return {"status": "deleted", "test_id": test_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting test: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete test")
