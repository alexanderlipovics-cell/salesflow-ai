"""
Quick Test Script for Follow-up System
Tests all major components
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.services.followup_service import followup_service
from app.core.supabase import get_supabase_client


async def test_database_setup():
    """Test 1: Database Tables & Playbooks"""
    print("\n🧪 TEST 1: Database Setup")
    print("-" * 50)
    
    try:
        supabase = get_supabase_client()
        
        # Check tables exist
        tables = ['follow_ups', 'message_tracking', 'followup_playbooks']
        for table in tables:
            response = supabase.table(table).select('*', count='exact').limit(1).execute()
            print(f"✅ Table '{table}' exists (count: {response.count})")
        
        # Check playbooks
        playbooks = await followup_service.get_playbooks()
        print(f"\n📚 Loaded {len(playbooks)} playbooks:")
        for pb in playbooks[:3]:
            print(f"   - {pb['id']}: {pb['name']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_rpc_functions():
    """Test 2: RPC Functions"""
    print("\n🧪 TEST 2: RPC Functions")
    print("-" * 50)
    
    try:
        supabase = get_supabase_client()
        
        # Test get_leads_needing_followup
        response = supabase.rpc('get_leads_needing_followup', {'days_threshold': 3}).execute()
        leads = response.data or []
        print(f"✅ get_leads_needing_followup: {len(leads)} leads found")
        
        if leads:
            lead = leads[0]
            print(f"   Example: {lead.get('lead_name')} - {lead.get('recommended_playbook')}")
        
        # Test select_best_channel (if we have a lead)
        if leads:
            response = supabase.rpc('select_best_channel', {'p_lead_id': leads[0]['lead_id']}).execute()
            channel = response.data
            print(f"✅ select_best_channel: {channel}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_analytics():
    """Test 3: Analytics & Materialized Views"""
    print("\n🧪 TEST 3: Analytics")
    print("-" * 50)
    
    try:
        supabase = get_supabase_client()
        
        # Check materialized views
        views = ['channel_performance', 'weekly_activity_trend', 'response_heatmap']
        
        for view in views:
            response = supabase.from_(view).select('*', count='exact').limit(5).execute()
            print(f"✅ View '{view}' accessible (rows: {response.count or 0})")
        
        # Test analytics service
        analytics = await followup_service.get_followup_analytics(days=30)
        print(f"\n📊 Analytics loaded:")
        print(f"   - Channel Performance: {len(analytics['channel_performance'])} channels")
        print(f"   - Weekly Activity: {len(analytics['weekly_activity'])} weeks")
        print(f"   - Response Heatmap: {len(analytics['response_heatmap'])} data points")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_followup_generation():
    """Test 4: Follow-up Message Generation"""
    print("\n🧪 TEST 4: Message Generation")
    print("-" * 50)
    
    try:
        supabase = get_supabase_client()
        
        # Get a sample lead
        response = supabase.rpc('get_leads_needing_followup', {'days_threshold': 3}).execute()
        leads = response.data or []
        
        if not leads:
            print("⏭️  Skipped: No leads needing follow-up")
            return True
        
        lead = leads[0]
        playbook_id = lead.get('recommended_playbook')
        
        if not playbook_id:
            print("⏭️  Skipped: No recommended playbook")
            return True
        
        # Generate message
        message_data = await followup_service.generate_followup(
            lead_id=lead['lead_id'],
            playbook_id=playbook_id
        )
        
        if message_data:
            print(f"✅ Message generated for {lead['lead_name']}")
            print(f"   Playbook: {playbook_id}")
            print(f"   Message: {message_data['message'][:100]}...")
            print(f"   Channels: {message_data['preferred_channels']}")
        else:
            print("❌ Failed to generate message")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_full_system():
    """Test 5: Full System Check"""
    print("\n🧪 TEST 5: Full System Check (Dry Run)")
    print("-" * 50)
    
    try:
        results = await followup_service.check_and_trigger_followups()
        
        print(f"✅ System check completed:")
        print(f"   📋 Checked: {results['checked']} leads")
        print(f"   📤 Would trigger: {results['triggered']} follow-ups")
        print(f"   ❌ Failed: {results['failed']}")
        print(f"   ⏭️  Skipped: {results['skipped']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def run_all_tests():
    """Run all tests"""
    print("=" * 50)
    print("🚀 FOLLOW-UP SYSTEM TEST SUITE")
    print("=" * 50)
    
    tests = [
        test_database_setup,
        test_rpc_functions,
        test_analytics,
        test_followup_generation,
        test_full_system
    ]
    
    results = []
    for test in tests:
        result = await test()
        results.append(result)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    passed = sum(results)
    total = len(results)
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! System is ready! ✅")
    else:
        print("\n⚠️  Some tests failed. Check errors above.")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)

