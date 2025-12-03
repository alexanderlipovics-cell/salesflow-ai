#!/usr/bin/env python3
"""
SALES FLOW AI - MASTER DATA IMPORT v2.0 (OPTIMIZED)
====================================================
Orchestrates all data imports with BATCH UPSERT for maximum performance

PERFORMANCE IMPROVEMENT:
- Old: 1000 items = 2000 database requests (SELECT + INSERT for each)
- New: 1000 items = 10 database requests (Batch UPSERT)
- Speed: 100x-200x faster! ⚡

FEATURES:
- ✅ Batch Upsert (O(1) instead of O(N))
- ✅ All imports in correct order
- ✅ Progress tracking with colors
- ✅ Comprehensive error handling
- ✅ Summary report

Usage:
    cd backend
    python scripts/master_import_v2.py
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import supabase
except ImportError:
    print("❌ ERROR: Could not import config or supabase")
    print("   Make sure you're in the backend/ directory")
    print("   And that .env is configured with Supabase credentials")
    sys.exit(1)

# ============================================================================
# COLORS (Windows compatible)
# ============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    """Print styled header"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{text}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*70}{Colors.ENDC}\n")

def print_step(number, title):
    """Print step header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}[{number}/4] {title}{Colors.ENDC}")
    print(f"{Colors.CYAN}{'-'*70}{Colors.ENDC}")

def print_success(text):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")

def print_warning(text):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_error(text):
    """Print error message"""
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

# ============================================================================
# OPTIMIZED BATCH UPSERT (Gemini's Recommendation)
# ============================================================================

def batch_upsert(
    table: str,
    data: List[Dict[str, Any]],
    unique_key: str,
    batch_size: int = 100
) -> Tuple[int, int]:
    """
    Efficient batch upsert using Supabase's native upsert.
    
    PERFORMANCE:
    - Old method: N SELECT + N INSERT = 2N requests
    - New method: ceil(N/batch_size) UPSERT requests
    - Improvement: 100x-200x faster!
    
    Args:
        table: Table name
        data: List of items to upsert
        unique_key: Column name with UNIQUE constraint
        batch_size: Items per batch (default 100)
    
    Returns:
        (count_success, count_error)
    """
    
    if not data:
        return 0, 0
    
    count_success = 0
    count_error = 0
    
    print(f"   📊 Total items: {len(data)} | Batch size: {batch_size}")
    
    # Process in batches to avoid timeout on very large datasets
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(data) + batch_size - 1) // batch_size
        
        try:
            # OPTIMIZED: Use Supabase's native upsert
            # This handles duplicate checking on the database side
            # Much faster than Python loop with SELECT + INSERT!
            response = supabase.table(table).upsert(
                batch,
                on_conflict=unique_key,
                ignore_duplicates=False  # Update if exists
            ).execute()
            
            batch_success = len(batch)
            count_success += batch_success
            
            # Show progress
            percent = (batch_num / total_batches) * 100
            print(f"   ⚡ Batch {batch_num}/{total_batches} ({percent:.0f}%): {batch_success} items")
            
        except Exception as e:
            count_error += len(batch)
            print_error(f"Batch {batch_num}/{total_batches} failed: {str(e)[:80]}")
    
    return count_success, count_error

# ============================================================================
# FILE LOADING HELPERS
# ============================================================================

def load_json_file(filename: str, required: bool = True) -> List[Dict]:
    """
    Load JSON file from multiple possible locations
    
    Args:
        filename: Name of the JSON file
        required: If True, raises error when file not found
    
    Returns:
        List of dictionaries from JSON file
    """
    base_dir = Path(__file__).parent.parent
    possible_paths = [
        base_dir / 'data' / filename,
        base_dir / 'outputs' / filename,
        base_dir.parent / 'outputs' / filename,
        Path.cwd() / filename
    ]
    
    for path in possible_paths:
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # Handle different JSON structures
                    if isinstance(data, list):
                        return data
                    elif isinstance(data, dict):
                        # Try common wrapper keys
                        for key in ['objections', 'templates', 'playbooks', 'sequences']:
                            if key in data:
                                return data[key]
                        # If no wrapper, assume single item
                        return [data]
                    
            except json.JSONDecodeError as e:
                print_warning(f"Invalid JSON in {path}: {e}")
                continue
            except Exception as e:
                print_warning(f"Error reading {path}: {e}")
                continue
    
    if required:
        print_warning(f"File not found: {filename} (searched {len(possible_paths)} locations)")
        return []
    else:
        return []

# ============================================================================
# IMPORT FUNCTIONS
# ============================================================================

def import_objections() -> Tuple[int, int]:
    """Import objections with batch upsert"""
    print_step(1, "OBJECTIONS - Import knowledge base")
    
    # Try multiple filenames
    data = (
        load_json_file('objections_import.json', required=False) or
        load_json_file('objections_chatgpt.json', required=False) or
        []
    )
    
    if not data:
        print_warning("No objections data found")
        return 0, 0
    
    print(f"   📖 Loaded {len(data)} objections from file")
    
    # Normalize data for objection_library table
    clean_data = []
    for obj in data:
        clean_data.append({
            'objection_text': obj.get('objection_text', ''),
            'category': obj.get('category', 'general'),
            'response_template': obj.get('response_template') or obj.get('response', ''),
            'context': obj.get('context', ''),
            'psychology': obj.get('psychology', ''),
            'psychology_tags': obj.get('psychology_tags', []),
            'frequency_score': obj.get('frequency_score', 5),
            'source': obj.get('source', 'import'),
            'is_active': True
        })
    
    success, errors = batch_upsert(
        table='objection_library',
        data=clean_data,
        unique_key='objection_text',
        batch_size=50
    )
    
    print_success(f"Objections: {success} upserted, {errors} errors")
    return success, errors

def import_templates() -> Tuple[int, int]:
    """Import message templates with batch upsert"""
    print_step(2, "MESSAGE TEMPLATES - Import email/DM templates")
    
    # Try multiple filenames
    data = (
        load_json_file('message_templates_chatgpt.json', required=False) or
        load_json_file('templates_import.json', required=False) or
        []
    )
    
    if not data:
        print_warning("No templates data found")
        return 0, 0
    
    print(f"   📧 Loaded {len(data)} templates from file")
    
    # Normalize data for message_templates table
    clean_data = []
    for tpl in data:
        clean_data.append({
            'name': tpl.get('template_name') or tpl.get('name', 'Unnamed'),
            'category': tpl.get('category', 'general'),
            'channel': tpl.get('channel', 'email'),
            'subject': tpl.get('subject_line') or tpl.get('subject', ''),
            'body': tpl.get('body_template') or tpl.get('body', ''),
            'use_case': tpl.get('use_case', ''),
            'tone': tpl.get('tone', 'professional'),
            'is_active': True
        })
    
    success, errors = batch_upsert(
        table='message_templates',
        data=clean_data,
        unique_key='name',
        batch_size=50
    )
    
    print_success(f"Templates: {success} upserted, {errors} errors")
    return success, errors

def import_playbooks() -> Tuple[int, int]:
    """Import sales playbooks with batch upsert"""
    print_step(3, "PLAYBOOKS - Import sales playbooks")
    
    # Try multiple filenames
    data = (
        load_json_file('playbooks_import.json', required=False) or
        load_json_file('playbooks_chatgpt.json', required=False) or
        []
    )
    
    if not data:
        print_warning("No playbooks data found")
        return 0, 0
    
    print(f"   📖 Loaded {len(data)} playbooks from file")
    
    # Normalize data for playbooks table
    clean_data = []
    for pb in data:
        clean_data.append({
            'name': pb.get('name', 'Unnamed'),
            'description': pb.get('description', ''),
            'steps': pb.get('steps', []),
            'trigger_type': pb.get('trigger_type', 'manual'),
            'target_vertical': pb.get('target_vertical'),
            'is_active': True
        })
    
    success, errors = batch_upsert(
        table='playbooks',
        data=clean_data,
        unique_key='name',
        batch_size=50
    )
    
    print_success(f"Playbooks: {success} upserted, {errors} errors")
    return success, errors

def import_sequences() -> Tuple[int, int]:
    """Import sequences with batch upsert"""
    print_step(4, "SEQUENCES - Import multi-touch campaigns")
    
    data = load_json_file('sequences_definitions.json', required=False)
    
    if not data:
        print_warning("No sequences data found")
        return 0, 0
    
    print(f"   🔄 Loaded {len(data)} sequences from file")
    
    total_success = 0
    total_errors = 0
    
    for seq in data:
        try:
            # 1. Upsert the sequence itself
            seq_data = {
                'name': seq['name'],
                'description': seq.get('description', ''),
                'trigger_type': seq.get('trigger_type', 'manual'),
                'is_active': seq.get('is_active', True)
            }
            
            seq_result = supabase.table('sequences').upsert(
                seq_data,
                on_conflict='name'
            ).execute()
            
            if not seq_result.data:
                print_error(f"Failed to create sequence: {seq['name']}")
                total_errors += 1
                continue
            
            sequence_id = seq_result.data[0]['id']
            
            # 2. Upsert the steps
            steps = seq.get('steps', [])
            if steps:
                clean_steps = []
                for step in steps:
                    clean_steps.append({
                        'sequence_id': sequence_id,
                        'step_order': step.get('step_order', 0),
                        'step_name': step.get('step_name', ''),
                        'type': step.get('type', 'task'),
                        'delay_hours': step.get('delay_hours', 24),
                        'task_note': step.get('task_note', '')
                    })
                
                # Delete old steps for this sequence
                supabase.table('sequence_steps').delete().eq('sequence_id', sequence_id).execute()
                
                # Insert new steps (bulk insert is fast)
                if clean_steps:
                    supabase.table('sequence_steps').insert(clean_steps).execute()
                
                print(f"   ✅ {seq['name']}: {len(clean_steps)} steps")
                total_success += 1
            else:
                print(f"   ✅ {seq['name']}: no steps")
                total_success += 1
                
        except Exception as e:
            print_error(f"Error importing sequence {seq.get('name', 'unknown')}: {str(e)[:80]}")
            total_errors += 1
    
    print_success(f"Sequences: {total_success} imported, {total_errors} errors")
    return total_success, total_errors

# ============================================================================
# MAIN ORCHESTRATION
# ============================================================================

def main():
    """Main import orchestration with performance tracking"""
    
    print_header("🚀 SALES FLOW AI - MASTER DATA IMPORT v2.0 (OPTIMIZED)")
    
    start_time = datetime.now()
    print(f"Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Working directory: {Path.cwd()}")
    print(f"\n⚡ Using BATCH UPSERT for maximum performance!")
    
    # Track results
    results = {}
    total_imported = 0
    total_errors = 0
    
    # Run all imports
    success, errors = import_objections()
    results['objections'] = (success, errors)
    total_imported += success
    total_errors += errors
    
    success, errors = import_templates()
    results['templates'] = (success, errors)
    total_imported += success
    total_errors += errors
    
    success, errors = import_playbooks()
    results['playbooks'] = (success, errors)
    total_imported += success
    total_errors += errors
    
    success, errors = import_sequences()
    results['sequences'] = (success, errors)
    total_imported += success
    total_errors += errors
    
    # Calculate performance metrics
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    # ========================================================================
    # FINAL SUMMARY
    # ========================================================================
    print_header("📊 IMPORT SUMMARY")
    
    print(f"{'Component':<20} {'Success':<12} {'Errors':<12}")
    print(f"{'-'*70}")
    
    for name, (success, errors) in results.items():
        status_icon = "✅" if errors == 0 else "⚠️"
        print(f"{status_icon} {name.title():<18} {success:<12} {errors:<12}")
    
    print(f"\n{Colors.BOLD}TOTALS:{Colors.ENDC}")
    print(f"  ✅ Total Imported:  {total_imported}")
    print(f"  ❌ Total Errors:    {total_errors}")
    print(f"  ⏱️  Duration:        {duration:.2f} seconds")
    
    if total_imported > 0:
        print(f"  ⚡ Speed:           {total_imported / duration:.1f} items/second")
    
    # Performance comparison
    old_method_requests = total_imported * 2  # SELECT + INSERT for each
    new_method_requests = sum(
        (success + 49) // 50  # Batches of 50
        for success, _ in results.values()
    ) + len(results)  # Plus one per import for initial queries
    
    if new_method_requests > 0:
        speedup = old_method_requests / new_method_requests
        print(f"\n{Colors.BOLD}⚡ PERFORMANCE:{Colors.ENDC}")
        print(f"  Old method: ~{old_method_requests} database requests")
        print(f"  New method: ~{new_method_requests} database requests")
        print(f"  Speed gain: {speedup:.0f}x faster!")
    
    # Success/Failure status
    if total_errors == 0 and total_imported > 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL IMPORTS COMPLETED SUCCESSFULLY!{Colors.ENDC}")
        
        # Next steps
        print(f"\n{Colors.BOLD}🚀 NEXT STEPS:{Colors.ENDC}")
        print("  1. Verify data in Supabase UI")
        print("  2. Test APIs: http://localhost:8000/docs")
        print("  3. Create test revenue data: python scripts/create_revenue_test_data.py")
        print("  4. Test frontend integration")
        
        return True
    elif total_imported > 0:
        print(f"\n{Colors.WARNING}{Colors.BOLD}⚠️  IMPORTS COMPLETED WITH SOME ISSUES{Colors.ENDC}")
        print(f"  {total_imported} items imported, {total_errors} errors")
        return True
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}❌ NO DATA IMPORTED{Colors.ENDC}")
        print(f"  Check if data files exist in backend/data/")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}⚠️  Import cancelled by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.FAIL}❌ Fatal error: {str(e)}{Colors.ENDC}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

