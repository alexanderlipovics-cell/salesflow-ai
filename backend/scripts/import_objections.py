#!/usr/bin/env python3
"""
Import objections from JSON into Supabase - SAFE & IDEMPOTENT
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

def import_objections(json_file_path: str = None) -> bool:
    """
    Import objections from JSON file into Supabase
    
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
            data_file = find_data_file("objections_import.json")
        
        # Read JSON file
        logger.info(f"📖 Loading objections from: {data_file}")
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        objections = data.get('objections', [])
        logger.info(f"📊 Found {len(objections)} objections to import")
        
        # Connect to Supabase
        logger.info("🚀 Connecting to Supabase...")
        supabase = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        )
        
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, obj in enumerate(objections, 1):
            try:
                # Handle both 'objection' and 'objection_text_de' keys
                objection_text = obj.get('objection_text_de') or obj.get('objection')
                
                if not objection_text:
                    logger.error(f"  ❌ [{idx}/{len(objections)}] No objection text found")
                    error_count += 1
                    continue
                
                # Check if objection already exists (DUPLICATE CHECK!)
                existing = supabase.table('objection_library').select('id').eq(
                    'objection_text', objection_text
                ).execute()
                
                if existing.data:
                    logger.info(f"  ⏭️  [{idx}/{len(objections)}] Skipped (exists): {objection_text[:50]}...")
                    skipped_count += 1
                    continue
                
                # Prepare objection data for REAL schema
                # Handle psychology as TEXT (join array if needed)
                psychology_data = obj.get('psychology_tags') or obj.get('psychology', [])
                psychology_text = ', '.join(psychology_data) if isinstance(psychology_data, list) else str(psychology_data)
                
                objection_data = {
                    'category': obj['category'],
                    'objection_text': objection_text,
                    'psychology': psychology_text,
                    'industry': obj.get('industry', []),
                    'frequency_score': obj.get('frequency_score', 50),
                    'severity': obj.get('severity', 5)
                }
                
                # Insert objection
                result = supabase.table('objection_library').insert(objection_data).execute()
                
                if not result.data:
                    raise Exception("Failed to insert objection")
                
                objection_id = result.data[0]['id']
                
                # Insert responses
                responses_count = 0
                for response in obj.get('responses', []):
                    # Handle both 'script' and 'response_script' keys
                    script = response.get('response_script') or response.get('script')
                    
                    if not script:
                        logger.warning(f"     ⚠️  Response missing script, skipping")
                        continue
                    
                    response_data = {
                        'objection_id': objection_id,
                        'technique': response['technique'],
                        'response_script': script,
                        'success_rate': response.get('success_rate', 'medium'),
                        'tone': response.get('tone', 'consultative'),
                        'when_to_use': response.get('when_to_use')
                    }
                    
                    supabase.table('objection_responses').insert(response_data).execute()
                    responses_count += 1
                
                logger.info(f"  ✅ [{idx}/{len(objections)}] Imported: {objection_text[:50]}... ({responses_count} responses)")
                imported_count += 1
                
            except Exception as e:
                logger.error(f"  ❌ [{idx}/{len(objections)}] Error: {e}")
                error_count += 1
                continue
        
        # Summary
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 IMPORT COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"   ✅ New:      {imported_count}")
        logger.info(f"   ⏭️  Skipped:  {skipped_count} (already existed)")
        logger.info(f"   ❌ Errors:   {error_count}")
        logger.info(f"   📊 Total:    {len(objections)}")
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
    success = import_objections(json_file)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
