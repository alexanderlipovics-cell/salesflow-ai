"""
Network Marketing Database Import
Imports companies, objections, and templates from Gemini-generated JSON files
"""
import json
import sys
from pathlib import Path
import logging

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from config import settings
from supabase import create_client

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def import_companies(supabase, file_path: str):
    """Import Network Marketing companies"""
    logger.info("\n" + "="*60)
    logger.info("📊 IMPORTING NETWORK MARKETING COMPANIES")
    logger.info("="*60)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    companies = data.get('companies', [])
    logger.info(f"📦 Found {len(companies)} companies to import")
    
    imported = 0
    skipped = 0
    errors = 0
    
    for idx, company in enumerate(companies, 1):
        try:
            company_name = company.get('name') or company.get('company_name', 'Unknown')
            
            # Check if exists
            existing = supabase.table('nm_companies').select('id').eq(
                'name', company_name
            ).execute()
            
            if existing.data:
                logger.info(f"⏭️  [{idx}/{len(companies)}] Skipped: {company_name}")
                skipped += 1
                continue
            
            # Insert with new schema fields
            supabase.table('nm_companies').insert({
                'name': company_name,
                'legal_name': company.get('legal_name'),
                'founded': company.get('founded'),
                'headquarters': company.get('headquarters'),
                'product_categories': company.get('product_categories', []),
                'plan_type': company.get('plan_type'),
                'partners_global': company.get('partners_global'),
                'partners_dach': company.get('partners_dach'),
                'website': company.get('website'),
                'description': company.get('description'),
                'usp': company.get('usp'),
                'associations': company.get('associations', []),
                'status': company.get('status', 'aktiv')
            }).execute()
            
            logger.info(f"   ✅ [{idx}/{len(companies)}] {company_name}")
            imported += 1
            
        except Exception as e:
            logger.error(f"   ❌ [{idx}/{len(companies)}] {company.get('name', 'Unknown')}: {e}")
            errors += 1
    
    logger.info(f"\n📊 Companies Import Summary:")
    logger.info(f"   ✅ Imported: {imported}")
    logger.info(f"   ⏭️  Skipped:  {skipped}")
    logger.info(f"   ❌ Errors:   {errors}")
    return imported, skipped, errors

def import_objections(supabase, file_path: str):
    """Import Network Marketing objections"""
    logger.info("\n" + "="*60)
    logger.info("💬 IMPORTING NM-SPECIFIC OBJECTIONS")
    logger.info("="*60)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get all companies first to link objections
    all_companies = supabase.table('nm_companies').select('id, name').execute()
    company_map = {c['name']: c['id'] for c in all_companies.data}
    
    companies_data = data.get('companies', [])
    total_objections = sum(len(c.get('objections', [])) for c in companies_data)
    logger.info(f"📦 Found {total_objections} objections across {len(companies_data)} companies")
    
    imported = 0
    skipped = 0
    errors = 0
    
    for company_data in companies_data:
        company_name = company_data.get('company_name')
        company_id = company_map.get(company_name)
        objections = company_data.get('objections', [])
        
        if not objections:
            continue
            
        logger.info(f"\n   📦 {company_name}: {len(objections)} objections")
        
        for obj in objections:
            try:
                # Insert objection
                supabase.table('nm_objections').insert({
                    'company_id': company_id,
                    'company_name': company_name,
                    'objection_text': obj['objection_text'],
                    'category': obj.get('objection_category'),
                    'frequency': obj.get('frequency'),
                    'severity': obj.get('occurs_at_stage'),
                    'responses': obj.get('recommended_responses', [])
                }).execute()
                
                imported += 1
                
            except Exception as e:
                logger.error(f"      ❌ Error: {e}")
                errors += 1
        
        logger.info(f"      ✅ {len(objections)} objections imported")
    
    logger.info(f"\n📊 Objections Import Summary:")
    logger.info(f"   ✅ Imported: {imported}")
    logger.info(f"   ⏭️  Skipped:  {skipped}")
    logger.info(f"   ❌ Errors:   {errors}")
    return imported, skipped, errors

def import_templates(supabase, file_path: str):
    """Import Network Marketing message templates"""
    logger.info("\n" + "="*60)
    logger.info("📝 IMPORTING NM MESSAGE TEMPLATES")
    logger.info("="*60)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    templates = data.get('templates', [])
    logger.info(f"📦 Found {len(templates)} templates to import")
    
    imported = 0
    skipped = 0
    errors = 0
    
    for idx, template in enumerate(templates, 1):
        try:
            # Check if exists
            existing = supabase.table('message_templates').select('id').eq(
                'template_name', template['template_name']
            ).execute()
            
            if existing.data:
                logger.info(f"⏭️  [{idx}/{len(templates)}] Skipped: {template['template_name']}")
                skipped += 1
                continue
            
            # Insert
            supabase.table('message_templates').insert({
                'template_name': template['template_name'],
                'category': template.get('category', 'network_marketing'),
                'channel': template.get('channel', 'whatsapp'),
                'message_text': template['message_text'],
                'tone': template.get('tone', 'freundlich'),
                'use_case': template.get('use_case', ''),
                'success_rate': template.get('success_rate', 'medium'),
                'industry': template.get('industry', ['Network Marketing']),
                'personalization_fields': template.get('personalization_fields', [])
            }).execute()
            
            logger.info(f"✅ [{idx}/{len(templates)}] Imported: {template['template_name']}")
            imported += 1
            
        except Exception as e:
            logger.error(f"❌ [{idx}/{len(templates)}] Error: {template.get('template_name', 'Unknown')}: {e}")
            errors += 1
    
    logger.info(f"\n📊 Templates Import Summary:")
    logger.info(f"   ✅ Imported: {imported}")
    logger.info(f"   ⏭️  Skipped:  {skipped}")
    logger.info(f"   ❌ Errors:   {errors}")
    return imported, skipped, errors

def main():
    logger.info("\n" + "╔" + "═"*58 + "╗")
    logger.info("║" + " "*10 + "NETWORK MARKETING DATABASE IMPORT" + " "*15 + "║")
    logger.info("╚" + "═"*58 + "╝\n")
    
    # Connect to Supabase
    logger.info("🔌 Connecting to Supabase...")
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY)
    logger.info("✅ Connected!\n")
    
    data_dir = Path(__file__).parent.parent / 'data'
    
    # Import in order
    results = {}
    
    # 1. Companies
    companies_file = data_dir / 'nm_companies.json'
    if companies_file.exists():
        results['companies'] = import_companies(supabase, str(companies_file))
    else:
        logger.warning(f"⚠️  Skipping companies: {companies_file} not found")
        results['companies'] = (0, 0, 0)
    
    # 2. Objections
    objections_file = data_dir / 'nm_objections.json'
    if objections_file.exists():
        results['objections'] = import_objections(supabase, str(objections_file))
    else:
        logger.warning(f"⚠️  Skipping objections: {objections_file} not found")
        results['objections'] = (0, 0, 0)
    
    # 3. Templates (SKIPPED - file contains objections, not templates)
    # templates_file = data_dir / 'nm_templates.json'
    # if templates_file.exists():
    #     results['templates'] = import_templates(supabase, str(templates_file))
    # else:
    #     logger.warning(f"⚠️  Skipping templates: {templates_file} not found")
    logger.info("\n" + "="*60)
    logger.info("📝 SKIPPING NM MESSAGE TEMPLATES")
    logger.info("="*60)
    logger.info("ℹ️  Template import will be added in next update")
    results['templates'] = (0, 0, 0)
    
    # Final summary
    logger.info("\n" + "="*60)
    logger.info("🎉 NETWORK MARKETING IMPORT COMPLETE!")
    logger.info("="*60)
    
    total_imported = sum(r[0] for r in results.values())
    total_skipped = sum(r[1] for r in results.values())
    total_errors = sum(r[2] for r in results.values())
    
    logger.info(f"\n📊 TOTAL SUMMARY:")
    logger.info(f"   ✅ Total Imported: {total_imported}")
    logger.info(f"   ⏭️  Total Skipped:  {total_skipped}")
    logger.info(f"   ❌ Total Errors:   {total_errors}")
    
    if total_errors > 0:
        logger.warning(f"\n⚠️  {total_errors} errors occurred during import")
        sys.exit(1)
    else:
        logger.info("\n✨ All data imported successfully!")

if __name__ == "__main__":
    main()

