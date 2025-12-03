#!/usr/bin/env python3
"""
Import message templates from JSON into Supabase - SAFE & IDEMPOTENT
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

def import_templates(json_file_path: str = None) -> bool:
    """
    Import message templates from JSON file into Supabase
    
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
            data_file = find_data_file("message_templates_chatgpt.json")
        
        # Read JSON file
        logger.info(f"📖 Loading templates from: {data_file}")
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        templates = data.get('message_templates', [])
        logger.info(f"📊 Found {len(templates)} templates to import")
        
        # Connect to Supabase
        logger.info("🚀 Connecting to Supabase...")
        supabase = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        )
        
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, template in enumerate(templates, 1):
            try:
                template_name = template['template_name']
                
                # Check if template already exists (DUPLICATE CHECK!)
                existing = supabase.table('message_templates').select('id').eq(
                    'template_name', template_name
                ).execute()
                
                if existing.data:
                    logger.info(f"  ⏭️  [{idx}/{len(templates)}] Skipped (exists): {template_name}")
                    skipped_count += 1
                    continue
                
                # Prepare template data
                template_data = {
                    'template_name': template_name,
                    'category': template.get('category', 'general'),
                    'channel': template.get('channel', 'email'),
                    'language': template.get('language', 'de'),
                    'subject_line': template.get('subject_line'),
                    'body_text': template['body_text'],
                    'tone': template.get('tone', 'professional'),
                    'use_case': template.get('use_case'),
                    'personalization_tags': template.get('personalization_tags', []),
                    'industry': template.get('industry', []),
                    'conversion_rate': template.get('conversion_rate', 0.0),
                    'open_rate': template.get('open_rate', 0.0),
                    'is_active': template.get('is_active', True)
                }
                
                # Insert template
                result = supabase.table('message_templates').insert(template_data).execute()
                
                if not result.data:
                    raise Exception("Failed to insert template")
                
                logger.info(f"  ✅ [{idx}/{len(templates)}] Imported: {template_name}")
                imported_count += 1
                
            except Exception as e:
                logger.error(f"  ❌ [{idx}/{len(templates)}] Error: {e}")
                error_count += 1
                continue
        
        # Summary
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 IMPORT COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"   ✅ New:      {imported_count}")
        logger.info(f"   ⏭️  Skipped:  {skipped_count} (already existed)")
        logger.info(f"   ❌ Errors:   {error_count}")
        logger.info(f"   📊 Total:    {len(templates)}")
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
    success = import_templates(json_file)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
