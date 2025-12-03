#!/usr/bin/env python3
"""
PROFESSIONAL Test Data Creator for Revenue Intelligence System
- Creates realistic test leads with financial data
- Idempotent (safe to run multiple times)
- Proper error handling
- No system-wide package pollution
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add parent directory to path (safer than hardcoding)
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import supabase, logger
except ImportError:
    print("❌ ERROR: Could not import config. Make sure you're in a virtual environment!")
    print("   Run: python -m venv venv && .\\venv\\Scripts\\activate (Windows)")
    sys.exit(1)

# ============================================================================
# TEST DATA CONFIGURATION
# ============================================================================

VERTICALS = ["network", "real_estate", "finance"]
STAGES = ["discovery", "qualified", "proposal", "negotiation"]
CURRENCIES = ["EUR", "USD", "CHF"]

# Company names by vertical
COMPANIES = {
    "network": [
        "Healthy Life Network", "Premium Wellness GmbH", "Success Partners AG",
        "Team Excellence Network", "Growth Leaders Ltd", "Prosperity Network"
    ],
    "real_estate": [
        "Prime Properties GmbH", "Luxury Homes AG", "Urban Living Ltd",
        "Estate Masters", "Property Pros GmbH", "Dream Homes Network"
    ],
    "finance": [
        "Wealth Advisors AG", "Finance Solutions GmbH", "Investment Partners",
        "Capital Growth Ltd", "Financial Freedom GmbH", "Portfolio Experts"
    ]
}

CONTACT_NAMES = [
    "Michael Schmidt", "Sarah Weber", "Thomas Müller", "Laura Becker",
    "Markus Fischer", "Julia Wagner", "Stefan Hoffmann", "Anna Klein",
    "Christian Meyer", "Lisa Zimmermann", "Daniel Schulz", "Maria Krüger",
    "Andreas Wolf", "Sabrina Braun", "Patrick Schmitt", "Nina Hartmann"
]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_deal_value(stage: str) -> float:
    """Generate realistic deal value based on stage"""
    base_values = {
        "discovery": (2000, 8000),
        "qualified": (5000, 15000),
        "proposal": (8000, 25000),
        "negotiation": (10000, 50000)
    }
    min_val, max_val = base_values.get(stage, (1000, 10000))
    return round(random.uniform(min_val, max_val), 2)

def generate_win_probability(stage: str, score: int) -> int:
    """Generate realistic win probability"""
    base_probs = {
        "discovery": (10, 25),
        "qualified": (20, 40),
        "proposal": (40, 65),
        "negotiation": (60, 85)
    }
    min_prob, max_prob = base_probs.get(stage, (10, 30))
    
    # Adjust based on lead score
    if score > 70:
        min_prob += 10
        max_prob += 10
    elif score < 30:
        min_prob -= 10
        max_prob -= 10
    
    return max(0, min(100, random.randint(min_prob, max_prob)))

def generate_expected_close_date(stage: str) -> str:
    """Generate realistic close date based on stage"""
    days_ahead = {
        "discovery": (60, 120),
        "qualified": (30, 90),
        "proposal": (14, 45),
        "negotiation": (7, 30)
    }
    min_days, max_days = days_ahead.get(stage, (30, 60))
    
    # Some deals should be overdue for testing at-risk detection
    if random.random() < 0.2:  # 20% overdue
        days = random.randint(-30, -5)
    else:
        days = random.randint(min_days, max_days)
    
    future_date = datetime.now() + timedelta(days=days)
    return future_date.strftime("%Y-%m-%d")

def generate_days_in_stage(stage: str) -> int:
    """Generate days in stage (some stagnant for testing)"""
    normal_ranges = {
        "discovery": (1, 30),
        "qualified": (1, 25),
        "proposal": (1, 20),
        "negotiation": (1, 15)
    }
    
    # 30% chance of stagnation for testing
    if random.random() < 0.3:
        return random.randint(45, 90)  # Stagnant
    else:
        min_days, max_days = normal_ranges.get(stage, (1, 20))
        return random.randint(min_days, max_days)

def generate_last_activity_date(days_in_stage: int) -> str:
    """Generate last activity date"""
    # Some should be inactive for testing
    if days_in_stage > 60:
        days_ago = random.randint(20, 45)
    elif days_in_stage > 30:
        days_ago = random.randint(7, 20)
    else:
        days_ago = random.randint(0, 7)
    
    activity_date = datetime.now() - timedelta(days=days_ago)
    return activity_date.strftime("%Y-%m-%d")

def generate_lead_score() -> int:
    """Generate lead engagement score"""
    # Weighted towards medium scores, some high, some low
    weights = [0.1, 0.2, 0.4, 0.2, 0.1]  # low, below-avg, medium, above-avg, high
    score_ranges = [(0, 20), (21, 40), (41, 60), (61, 80), (81, 100)]
    
    chosen_range = random.choices(score_ranges, weights=weights)[0]
    return random.randint(*chosen_range)

# ============================================================================
# MAIN FUNCTIONS
# ============================================================================

def get_or_create_test_user():
    """Get or create a demo user for test data"""
    demo_user_id = "00000000-0000-0000-0000-000000000001"
    
    # Check if demo user exists
    existing = supabase.table("users").select("id").eq("id", demo_user_id).execute()
    
    if existing.data:
        print(f"  ✅ Using existing demo user: {demo_user_id}")
        return demo_user_id
    
    # Note: In real scenario, you'd create via auth.users
    # For now, just return the demo ID
    print(f"  📝 Using demo user ID: {demo_user_id}")
    return demo_user_id

def create_test_leads(num_leads: int = 30):
    """
    Create test leads with realistic revenue data
    IDEMPOTENT: Checks for existing test leads first
    """
    print(f"🚀 Creating {num_leads} test leads with revenue data...")
    
    # Get demo user
    user_id = get_or_create_test_user()
    
    # Check existing test leads
    existing = supabase.table("leads")\
        .select("id", count="exact")\
        .ilike("company", "%Test%")\
        .execute()
    
    existing_count = existing.count if hasattr(existing, 'count') else 0
    
    if existing_count > 0:
        print(f"  ⚠️  Found {existing_count} existing test leads")
        response = input(f"  ❓ Create {num_leads} more test leads? (y/n): ")
        if response.lower() != 'y':
            print("  ⏭️  Skipped - keeping existing data")
            return False
    
    created = 0
    errors = []
    
    for i in range(num_leads):
        try:
            # Generate data
            vertical = random.choice(VERTICALS)
            stage = random.choice(STAGES)
            score = generate_lead_score()
            days_in_stage = generate_days_in_stage(stage)
            
            lead_data = {
                "name": random.choice(CONTACT_NAMES),
                "company": f"[TEST] {random.choice(COMPANIES[vertical])}",
                "email": f"test.lead{i+1}@demo.salesflow.ai",
                "phone": f"+49 171 {random.randint(1000000, 9999999)}",
                "vertical": vertical,
                "status": stage,
                "score": score,
                "source": "test_data",
                "notes": f"Test lead for Revenue Intelligence System testing",
                
                # Revenue Intelligence Fields
                "deal_value": generate_deal_value(stage),
                "currency": random.choice(CURRENCIES),
                "expected_close_date": generate_expected_close_date(stage),
                "win_probability": generate_win_probability(stage, score),
                "deal_stage": stage,
                "days_in_stage": days_in_stage,
                "last_activity_date": generate_last_activity_date(days_in_stage),
                
                # Ownership
                "owner_id": user_id
            }
            
            # Insert
            result = supabase.table("leads").insert(lead_data).execute()
            
            if result.data:
                created += 1
                deal_value = lead_data['deal_value']
                win_prob = lead_data['win_probability']
                print(f"  ✅ #{i+1}: {lead_data['company']} - {stage} - €{deal_value:,.0f} ({win_prob}%)")
            else:
                errors.append(f"Lead {i+1}: No data returned")
        
        except Exception as e:
            error_msg = f"Lead {i+1}: {str(e)}"
            print(f"  ❌ {error_msg}")
            errors.append(error_msg)
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST DATA CREATION COMPLETE")
    print("="*70)
    print(f"✅ Created:  {created} leads")
    print(f"📊 Total:    {num_leads} requested")
    
    if errors:
        print(f"\n⚠️  Errors:   {len(errors)}")
        for error in errors[:3]:
            print(f"   - {error}")
        if len(errors) > 3:
            print(f"   ... and {len(errors) - 3} more")
    
    # Show stats
    if created > 0:
        print("\n📈 DATA STATISTICS:")
        
        # Pipeline by stage
        pipeline = supabase.table("leads")\
            .select("status, deal_value")\
            .ilike("company", "%Test%")\
            .execute()
        
        if pipeline.data:
            total_value = sum(lead.get('deal_value', 0) for lead in pipeline.data)
            print(f"   💰 Total Pipeline Value: €{total_value:,.2f}")
            
            stage_counts = {}
            for lead in pipeline.data:
                stage = lead.get('status', 'unknown')
                stage_counts[stage] = stage_counts.get(stage, 0) + 1
            
            print(f"   📊 Distribution by Stage:")
            for stage, count in sorted(stage_counts.items()):
                print(f"      - {stage}: {count} deals")
    
    print("\n🎯 NEXT STEPS:")
    print("   1. Test Dashboard: curl http://localhost:8000/api/revenue/dashboard")
    print("   2. Test At-Risk:   curl http://localhost:8000/api/revenue/alerts/at-risk")
    print("   3. Open Swagger UI: http://localhost:8000/docs")
    
    return created > 0

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("="*70)
    print("🧪 REVENUE INTELLIGENCE TEST DATA CREATOR")
    print("="*70)
    print()
    
    # Ask for number of leads
    try:
        num_str = input("📊 How many test leads to create? (default: 30): ").strip()
        num_leads = int(num_str) if num_str else 30
        
        if num_leads < 1 or num_leads > 100:
            print("⚠️  Number must be between 1 and 100")
            sys.exit(1)
    except ValueError:
        print("❌ Invalid number")
        sys.exit(1)
    
    success = create_test_leads(num_leads)
    sys.exit(0 if success else 1)

