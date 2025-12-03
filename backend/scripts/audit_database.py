"""
Database Audit Script
Prüft welche Tabellen/Views/Functions existieren und erstellt Report
"""

import asyncio
import asyncpg
from typing import Dict, List, Set
import json
from datetime import datetime

# SOLL-ZUSTAND: Alle Tabellen die existieren MÜSSEN
REQUIRED_TABLES = {
    # CORE TABLES
    'users',
    'squads',
    'leads',
    'activities',
    'messages',
    'notes',
    
    # AI & KNOWLEDGE TABLES
    'lead_context_summaries',
    'lead_embeddings',
    'ai_recommendations',
    'ai_coaching_sessions',
    'compliance_logs',
    'bant_assessments',
    'personality_profiles',
    'success_patterns',
    'playbook_executions',
    'channel_performance_metrics',
    'knowledge_base',
    'objection_library',
    'products',
    'lead_product_interactions',
    'success_stories',
    
    # PREMIUM FEATURES
    'user_subscriptions',
    'subscription_tiers',
    'usage_tracking',
    'feature_access_log',
    'intelligent_chat_logs',
    'win_probability_cache',
    'optimal_contact_times',
    
    # SOCIAL MEDIA & LEAD GEN
    'social_media_accounts',
    'lead_generation_jobs',
    'auto_generated_leads',
    'social_media_interactions',
    'automation_rules',
    
    # NETWORK MARKETING
    'squad_hierarchy',
    'lead_relationships',
    'lead_content_references',
    
    # EMAIL INTEGRATION (NEW)
    'email_accounts',
    'email_messages',
    'email_threads',
    'email_sync_status',
    
    # IMPORT/EXPORT (NEW)
    'import_jobs',
    'export_jobs',
    'data_mappings',
    
    # GAMIFICATION (NEW)
    'user_achievements',
    'badges',
    'daily_streaks',
    'leaderboard_entries',
    'squad_challenges',
    
    # VIDEO CONFERENCING (NEW)
    'video_meetings',
    'meeting_recordings',
    'meeting_transcripts',
    
    # LEAD ENRICHMENT (NEW)
    'lead_enrichment_jobs',
    'enriched_data_cache',
    
    # COMPLIANCE & AUDIT
    'data_access_log',
    'data_deletion_requests',
    'data_export_requests',
    'user_consents',
    
    # DATA QUALITY
    'data_quality_metrics',
    'potential_duplicates',
}

REQUIRED_MATERIALIZED_VIEWS = {
    'view_leads_scored',
    'view_followups_scored',
    'view_conversion_microsteps',
    'view_personality_insights',
    'view_squad_performance',
    'view_user_activity_summary',
}

REQUIRED_FUNCTIONS = {
    'generate_disg_recommendations',
    'update_lead_memory',
    'log_ai_output_compliance',
    'recommend_followup_actions',
    'get_best_contact_window',
    'calculate_team_size',
    'get_lead_network',
    'find_common_connections',
    'recommend_leads_from_network',
    'search_knowledge_base',
    'find_objection_response',
    'recommend_upsells',
    'export_user_data',
    'anonymize_lead',
    'detect_duplicate_leads',
    'merge_leads',
    'calculate_lead_completeness_score',
    'check_lead_limit',
    'auto_link_email_to_lead',
    'calculate_badge_progress',
    'refresh_all_materialized_views',
}

REQUIRED_EXTENSIONS = {
    'uuid-ossp',
    'vector',  # pgvector for embeddings
}

async def audit_database(database_url: str) -> Dict:
    """
    Führt komplettes Database Audit durch.
    Returns: Dict mit allen Findings
    """
    conn = await asyncpg.connect(database_url)
    
    audit_results = {
        'timestamp': datetime.now().isoformat(),
        'tables': {},
        'materialized_views': {},
        'functions': {},
        'extensions': {},
        'missing': {
            'tables': [],
            'views': [],
            'functions': [],
            'extensions': [],
        }
    }
    
    try:
        # 1. Check Tables
        existing_tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """)
        existing_table_names = {row['table_name'] for row in existing_tables}
        
        audit_results['tables']['existing'] = sorted(existing_table_names)
        audit_results['tables']['count'] = len(existing_table_names)
        audit_results['missing']['tables'] = sorted(REQUIRED_TABLES - existing_table_names)
        
        # 2. Check Materialized Views
        existing_views = await conn.fetch("""
            SELECT matviewname 
            FROM pg_matviews 
            WHERE schemaname = 'public'
        """)
        existing_view_names = {row['matviewname'] for row in existing_views}
        
        audit_results['materialized_views']['existing'] = sorted(existing_view_names)
        audit_results['materialized_views']['count'] = len(existing_view_names)
        audit_results['missing']['views'] = sorted(REQUIRED_MATERIALIZED_VIEWS - existing_view_names)
        
        # 3. Check Functions
        existing_functions = await conn.fetch("""
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
        """)
        existing_function_names = {row['routine_name'] for row in existing_functions}
        
        audit_results['functions']['existing'] = sorted(existing_function_names)
        audit_results['functions']['count'] = len(existing_function_names)
        audit_results['missing']['functions'] = sorted(REQUIRED_FUNCTIONS - existing_function_names)
        
        # 4. Check Extensions
        existing_extensions = await conn.fetch("""
            SELECT extname FROM pg_extension
        """)
        existing_extension_names = {row['extname'] for row in existing_extensions}
        
        audit_results['extensions']['existing'] = sorted(existing_extension_names)
        audit_results['extensions']['count'] = len(existing_extension_names)
        audit_results['missing']['extensions'] = sorted(REQUIRED_EXTENSIONS - existing_extension_names)
        
        # 5. Table Details (for existing tables)
        for table_name in existing_table_names:
            columns = await conn.fetch(f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            """, table_name)
            
            audit_results['tables'][table_name] = [
                {
                    'name': col['column_name'],
                    'type': col['data_type'],
                    'nullable': col['is_nullable'] == 'YES'
                }
                for col in columns
            ]
        
    finally:
        await conn.close()
    
    return audit_results

async def generate_missing_migrations(audit_results: Dict) -> str:
    """
    Generiert SQL Migration für alle fehlenden Komponenten.
    """
    sql_parts = []
    
    sql_parts.append("""
-- ╔════════════════════════════════════════════════════════════════╗
-- ║  AUTO-GENERATED MIGRATION                                      ║
-- ║  Created: {}                                                   ║
-- ╚════════════════════════════════════════════════════════════════╝

""".format(datetime.now().isoformat()))
    
    # Extensions
    if audit_results['missing']['extensions']:
        sql_parts.append("-- === EXTENSIONS ===\n")
        for ext in audit_results['missing']['extensions']:
            sql_parts.append(f"CREATE EXTENSION IF NOT EXISTS \"{ext}\";\n")
        sql_parts.append("\n")
    
    # Tables
    if audit_results['missing']['tables']:
        sql_parts.append("-- === MISSING TABLES ===\n")
        sql_parts.append("-- TODO: Add CREATE TABLE statements for:\n")
        for table in audit_results['missing']['tables']:
            sql_parts.append(f"--   - {table}\n")
        sql_parts.append("\n")
    
    # Views
    if audit_results['missing']['views']:
        sql_parts.append("-- === MISSING MATERIALIZED VIEWS ===\n")
        sql_parts.append("-- TODO: Add CREATE MATERIALIZED VIEW statements for:\n")
        for view in audit_results['missing']['views']:
            sql_parts.append(f"--   - {view}\n")
        sql_parts.append("\n")
    
    # Functions
    if audit_results['missing']['functions']:
        sql_parts.append("-- === MISSING FUNCTIONS ===\n")
        sql_parts.append("-- TODO: Add CREATE FUNCTION statements for:\n")
        for func in audit_results['missing']['functions']:
            sql_parts.append(f"--   - {func}\n")
        sql_parts.append("\n")
    
    return ''.join(sql_parts)

async def main():
    """Main execution"""
    import os
    
    # Get database URL from env
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set!")
        return
    
    print("🔍 Starting Database Audit...")
    
    # Run audit
    audit_results = await audit_database(database_url)
    
    # Save results
    with open('backend/database/audit_results.json', 'w') as f:
        json.dump(audit_results, f, indent=2)
    
    print(f"\n✅ Audit Complete!")
    print(f"\n📊 SUMMARY:")
    print(f"  Tables: {audit_results['tables']['count']} / {len(REQUIRED_TABLES)}")
    print(f"  Views: {audit_results['materialized_views']['count']} / {len(REQUIRED_MATERIALIZED_VIEWS)}")
    print(f"  Functions: {audit_results['functions']['count']} / {len(REQUIRED_FUNCTIONS)}")
    print(f"  Extensions: {audit_results['extensions']['count']} / {len(REQUIRED_EXTENSIONS)}")
    
    # Missing items
    total_missing = (
        len(audit_results['missing']['tables']) +
        len(audit_results['missing']['views']) +
        len(audit_results['missing']['functions']) +
        len(audit_results['missing']['extensions'])
    )
    
    if total_missing > 0:
        print(f"\n⚠️  MISSING COMPONENTS: {total_missing}")
        
        if audit_results['missing']['tables']:
            print(f"\n  Missing Tables ({len(audit_results['missing']['tables'])}):")
            for table in audit_results['missing']['tables'][:10]:  # Show first 10
                print(f"    - {table}")
            if len(audit_results['missing']['tables']) > 10:
                print(f"    ... and {len(audit_results['missing']['tables']) - 10} more")
        
        if audit_results['missing']['views']:
            print(f"\n  Missing Views ({len(audit_results['missing']['views'])}):")
            for view in audit_results['missing']['views']:
                print(f"    - {view}")
        
        if audit_results['missing']['functions']:
            print(f"\n  Missing Functions ({len(audit_results['missing']['functions'])}):")
            for func in audit_results['missing']['functions'][:10]:
                print(f"    - {func}")
            if len(audit_results['missing']['functions']) > 10:
                print(f"    ... and {len(audit_results['missing']['functions']) - 10} more")
        
        # Generate migration
        migration_sql = await generate_missing_migrations(audit_results)
        
        with open('backend/database/auto_migration.sql', 'w') as f:
            f.write(migration_sql)
        
        print(f"\n📝 Migration template created: backend/database/auto_migration.sql")
    else:
        print(f"\n✅ All required components present!")
    
    print(f"\n📄 Full audit results saved to: backend/database/audit_results.json")

if __name__ == '__main__':
    asyncio.run(main())

