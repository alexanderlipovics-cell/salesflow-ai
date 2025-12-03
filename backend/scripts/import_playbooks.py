#!/usr/bin/env python3
"""
Import sales playbooks from JSON into Supabase - SAFE & IDEMPOTENT
Can be run multiple times without creating duplicates
"""
import json
import sys
from pathlib import Path
import logging

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from config import settings
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

def find_data_file(filename: str) -> Path:
    """
    Find data file in multiple possible locations
    Returns Path object or raises FileNotFoundError
    """
    possible_paths = [
        Path(__file__).parent.parent / "data" / filename,  # backend/data/
        Path(__file__).parent / filename,                   # backend/scripts/
        Path.cwd() / "data" / filename,                     # ./data/
        Path.cwd() / filename,                              # ./
        Path(__file__).parent.parent.parent / "outputs" / filename,  # ../outputs/
    ]
    
    for path in possible_paths:
        if path.exists():
            logger.info(f"📂 Found data file: {path}")
            return path
    
    logger.error(f"❌ Could not find '{filename}' in any of these locations:")
    for path in possible_paths:
        logger.error(f"   - {path}")
    raise FileNotFoundError(f"Data file not found: {filename}")

def import_playbooks(json_file_path: str = None) -> bool:
    """
    Import playbooks from JSON file into Supabase
    
    Args:
        json_file_path: Optional path to JSON file. If None, searches for default file.
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Find data file
        if json_file_path:
            data_file = Path(json_file_path)
            if not data_file.exists():
                logger.error(f"❌ File not found: {json_file_path}")
                return False
        else:
            data_file = find_data_file("playbooks_chatgpt.json")
        
        # Read JSON file
        logger.info(f"📖 Loading playbooks from: {data_file}")
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        playbooks = data.get('playbooks', [])
        logger.info(f"📊 Found {len(playbooks)} playbooks to import")
        
        # Connect to Supabase
        logger.info("🚀 Connecting to Supabase...")
        supabase = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        )
        
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, playbook in enumerate(playbooks, 1):
            try:
                playbook_name = playbook['playbook_name']
                
                # Check if playbook already exists (DUPLICATE CHECK!)
                existing = supabase.table('playbooks').select('id').eq(
                    'playbook_name', playbook_name
                ).execute()
                
                if existing.data:
                    logger.info(f"  ⏭️  [{idx}/{len(playbooks)}] Skipped (exists): {playbook_name}")
                    skipped_count += 1
                    continue
                
                # Prepare playbook data (handle JSONB fields)
                playbook_data = {
                    'playbook_name': playbook_name,
                    'description': playbook.get('description'),
                    'industry': playbook.get('industry', []),
                    'target_persona': playbook.get('target_persona'),
                    'sales_stage': playbook.get('sales_stage', 'discovery'),
                    'playbook_type': playbook.get('playbook_type', 'standard'),
                    'is_active': playbook.get('is_active', True),
                    'win_rate': playbook.get('win_rate', 0.0),
                    'avg_deal_size': playbook.get('avg_deal_size', 0.0),
                    'avg_time_to_close': playbook.get('avg_time_to_close', 0),
                }
                
                # Handle JSONB fields - ensure they're valid JSON
                if 'steps' in playbook:
                    playbook_data['steps'] = json.dumps(playbook['steps']) if isinstance(playbook['steps'], (list, dict)) else playbook['steps']
                
                if 'qualifying_questions' in playbook:
                    playbook_data['qualifying_questions'] = json.dumps(playbook['qualifying_questions']) if isinstance(playbook['qualifying_questions'], list) else playbook['qualifying_questions']
                
                if 'objection_handling' in playbook:
                    playbook_data['objection_handling'] = json.dumps(playbook['objection_handling']) if isinstance(playbook['objection_handling'], dict) else playbook['objection_handling']
                
                if 'success_metrics' in playbook:
                    playbook_data['success_metrics'] = json.dumps(playbook['success_metrics']) if isinstance(playbook['success_metrics'], dict) else playbook['success_metrics']
                
                # Insert playbook
                result = supabase.table('playbooks').insert(playbook_data).execute()
                
                if not result.data:
                    raise Exception("Failed to insert playbook")
                
                logger.info(f"  ✅ [{idx}/{len(playbooks)}] Imported: {playbook_name}")
                imported_count += 1
                
            except Exception as e:
                logger.error(f"  ❌ [{idx}/{len(playbooks)}] Error: {e}")
                error_count += 1
                continue
        
        # Summary
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 IMPORT COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"   ✅ New:      {imported_count}")
        logger.info(f"   ⏭️  Skipped:  {skipped_count} (already existed)")
        logger.info(f"   ❌ Errors:   {error_count}")
        logger.info(f"   📊 Total:    {len(playbooks)}")
        logger.info(f"{'='*60}")
        
        return error_count == 0
        
    except Exception as e:
        logger.error(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main entry point when run as script"""
    json_file = sys.argv[1] if len(sys.argv) > 1 else None
    success = import_playbooks(json_file)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
