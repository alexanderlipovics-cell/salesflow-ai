import json
import sys
from pathlib import Path
from typing import List, Dict
import logging

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from config import Settings
from supabase import create_client, Client
from ai_engine import AIEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KnowledgeImporter:
    """Import sales knowledge base into Supabase"""
    
    def __init__(self):
        settings = Settings()
        self.supabase: Client = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_KEY
        )
        self.ai_engine = AIEngine(self.supabase)
    
    def import_objections(self, objections_data: List[Dict]) -> int:
        """
        Import objections with embeddings into database
        
        Args:
            objections_data: List of objection dictionaries
            
        Returns:
            Number of objections imported
        """
        imported_count = 0
        
        for obj_data in objections_data:
            try:
                # Check if objection already exists
                existing = self.supabase.table('objection_library').select('id').eq(
                    'objection_text', obj_data['objection']
                ).execute()
                
                if existing.data:
                    logger.info(f"Skipping duplicate: {obj_data['objection'][:50]}...")
                    continue
                
                # Generate embedding for objection
                logger.info(f"Generating embedding for: {obj_data['objection'][:50]}...")
                embedding = self.ai_engine.generate_embedding(obj_data['objection'])
                
                # Calculate frequency and severity (defaults if not provided)
                frequency_score = obj_data.get('frequency_score', 50)
                severity = obj_data.get('severity', 5)
                
                # Insert objection
                result = self.supabase.table('objection_library').insert({
                    'category': obj_data['category'],
                    'objection_text': obj_data['objection'],
                    'psychology': obj_data['psychology'],
                    'industry': obj_data['industry'],
                    'frequency_score': frequency_score,
                    'severity': severity,
                    'source': obj_data.get('source', 'sales_flow_ai_internal_v1'),
                    'confidence_score': obj_data.get('confidence_score', 0.9),
                    'embedding': embedding
                }).execute()
                
                objection_id = result.data[0]['id']
                logger.info(f"✅ Imported objection: {obj_data['objection'][:50]}")
                
                # Import responses
                for response_data in obj_data.get('responses', []):
                    self.supabase.table('objection_responses').insert({
                        'objection_id': objection_id,
                        'technique': response_data['technique'],
                        'response_script': response_data['script'],
                        'success_rate': response_data.get('success_rate', 'medium'),
                        'tone': response_data.get('tone', 'empathetic'),
                        'when_to_use': response_data.get('when_to_use', '')
                    }).execute()
                
                logger.info(f"✅ Imported {len(obj_data.get('responses', []))} responses")
                imported_count += 1
                
            except Exception as e:
                logger.error(f"Error importing objection: {e}")
                continue
        
        return imported_count

def main():
    """Main import function"""
    if len(sys.argv) < 2:
        print("Usage: python import_knowledge.py <json_file_path>")
        sys.exit(1)
    
    json_file = sys.argv[1]
    
    if not Path(json_file).exists():
        print(f"Error: File {json_file} not found")
        sys.exit(1)
    
    # Load JSON data
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Initialize importer
    importer = KnowledgeImporter()
    
    # Import objections
    logger.info(f"Starting import of {len(data)} objections...")
    imported = importer.import_objections(data)
    
    logger.info(f"🎉 Import complete! Imported {imported}/{len(data)} objections")

if __name__ == "__main__":
    main()

