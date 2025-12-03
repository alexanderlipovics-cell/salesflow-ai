"""
Import sequences from JSON into Supabase
Usage: python scripts/import_sequences.py data/sequences_definitions.json
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

def find_template_id(supabase, template_ref: str) -> str:
    """
    Find template ID by fuzzy matching the name
    
    Args:
        supabase: Supabase client
        template_ref: Template reference name
        
    Returns:
        Template UUID or None
    """
    try:
        # Try exact match first
        result = supabase.table('message_templates').select('id').eq(
            'template_name', template_ref
        ).execute()
        
        if result.data:
            return result.data[0]['id']
        
        # Try fuzzy match (ILIKE)
        result = supabase.table('message_templates').select('id').ilike(
            'template_name', f'%{template_ref}%'
        ).limit(1).execute()
        
        if result.data:
            logger.info(f"   📎 Mapped '{template_ref}' → template {result.data[0]['id']}")
            return result.data[0]['id']
        
        logger.warning(f"   ⚠️  Template not found: '{template_ref}' - using NULL")
        return None
        
    except Exception as e:
        logger.warning(f"   ⚠️  Error mapping template '{template_ref}': {e}")
        return None

def import_sequences(json_file_path: str = None):
    """Import sequences from JSON file into Supabase"""
    
    # Read JSON file
    logger.info(f"📖 Reading {json_file_path}...")
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    sequences = data.get('sequences', [])
    logger.info(f"📦 Found {len(sequences)} sequences to import.")
    
    # Connect to Supabase
    logger.info("🚀 Connecting to Supabase...")
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY)
    
    imported_count = 0
    skipped_count = 0
    total_steps = 0
    
    for idx, seq in enumerate(sequences, 1):
        try:
            # Check if sequence already exists
            existing = supabase.table('sequences').select('id').eq(
                'name', seq['name']
            ).execute()
            
            if existing.data:
                logger.info(f"⏭️  [{idx}/{len(sequences)}] Skipped (exists): {seq['name']}")
                skipped_count += 1
                continue
            
            # Insert sequence
            sequence_data = {
                'name': seq['name'],
                'description': seq.get('description'),
                'trigger_type': seq.get('trigger_type', 'manual'),
                'is_active': seq.get('is_active', True)
            }
            
            sequence_result = supabase.table('sequences').insert(sequence_data).execute()
            
            if not sequence_result.data:
                raise Exception("Failed to create sequence")
            
            sequence_id = sequence_result.data[0]['id']
            
            # Insert steps
            steps = seq.get('steps', [])
            steps_created = 0
            
            for step in steps:
                # Map template_ref to template_id if provided
                template_id = None
                if step.get('template_ref'):
                    template_id = find_template_id(supabase, step['template_ref'])
                
                step_data = {
                    'sequence_id': sequence_id,
                    'step_order': step['step_order'],
                    'step_name': step['step_name'],
                    'type': step['type'],
                    'delay_hours': step.get('delay_hours', 24),
                    'template_id': template_id,
                    'task_note': step.get('task_note')
                }
                
                supabase.table('sequence_steps').insert(step_data).execute()
                steps_created += 1
            
            logger.info(f"✅ [{idx}/{len(sequences)}] Imported: {seq['name']} ({steps_created} steps)")
            imported_count += 1
            total_steps += steps_created
            
        except Exception as e:
            logger.error(f"❌ [{idx}/{len(sequences)}] Error importing '{seq.get('name', 'unknown')}': {e}")
            continue
    
    logger.info(f"\n{'='*60}")
    logger.info(f"🎉 IMPORT COMPLETE!")
    logger.info(f"{'='*60}")
    logger.info(f"   ✅ Imported: {imported_count} sequences")
    logger.info(f"   📋 Total Steps: {total_steps} steps")
    logger.info(f"   ⏭️  Skipped: {skipped_count}")
    logger.info(f"   📊 Total: {len(sequences)}")
    logger.info(f"{'='*60}")
    logger.info(f"\n🚀 Next steps:")
    logger.info(f"   1. Test API: http://localhost:8000/docs")
    logger.info(f"   2. View sequences: GET /api/sequences")
    logger.info(f"   3. Enroll a lead: POST /api/sequences/enroll")

def main():
    if len(sys.argv) < 2:
        print("❌ Usage: python scripts/import_sequences.py <json_file_path>")
        print("   Example: python scripts/import_sequences.py data/sequences_definitions.json")
        sys.exit(1)
    
    json_file = sys.argv[1]
    
    if not Path(json_file).exists():
        print(f"❌ Error: File '{json_file}' not found")
        sys.exit(1)
    
    import_sequences(json_file)

if __name__ == "__main__":
    main()

