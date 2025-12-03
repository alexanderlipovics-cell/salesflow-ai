#!/usr/bin/env python3
"""
Network Marketing Data Import Script
Imports companies, objections, and message templates from JSON files into Supabase
Handles both ChatGPT and Gemini JSON formats flexibly
"""

import os
import json
from supabase import create_client, Client
from typing import List, Dict, Any
from datetime import datetime

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def init_supabase() -> Client:
    """Initialize Supabase client"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set as environment variables")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def load_json_file(filepath: str) -> Dict[str, Any]:
    """Load JSON file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def import_companies(supabase: Client, companies: List[Dict]) -> int:
    """Import companies into network_marketing_companies table"""
    print(f"\n📊 Importing {len(companies)} companies...")
    
    imported = 0
    for company in companies:
        try:
            # Prepare company data
            company_data = {
                "name": company.get("name"),
                "legal_name": company.get("legal_name"),
                "founded_year": company.get("founded_year"),
                "headquarters_country": company.get("headquarters_country"),
                "headquarters_city": company.get("headquarters_city"),
                "industry": company.get("industry"),
                "product_category": company.get("product_category", []),
                "compensation_plan": company.get("compensation_plan"),
                "active_in_dach": company.get("active_in_dach", True),
                "active_countries": company.get("active_countries", []),
                "estimated_distributors": company.get("estimated_distributors"),
                "estimated_distributors_dach": company.get("estimated_distributors_dach"),
                "website_url": company.get("website_url"),
                "description": company.get("description"),
                "founded_by": company.get("founded_by"),
                "key_selling_points": company.get("key_selling_points", []),
                "target_customer_profile": company.get("target_customer_profile"),
                "member_of_associations": company.get("member_of_associations", []),
                "status": company.get("status", "active")
            }
            
            # Upsert (insert or update based on name)
            result = supabase.table("network_marketing_companies").upsert(
                company_data,
                on_conflict="name"
            ).execute()
            
            imported += 1
            print(f"  ✅ {company_data['name']}")
            
        except Exception as e:
            print(f"  ❌ Error importing {company.get('name', 'Unknown')}: {str(e)}")
    
    print(f"\n✅ Imported {imported}/{len(companies)} companies")
    return imported

def import_objections(supabase: Client, objections: List[Dict]) -> int:
    """Import objections into company_objections table"""
    print(f"\n📊 Importing {len(objections)} objections...")
    
    # First, get all company IDs
    companies = supabase.table("network_marketing_companies").select("id, name").execute()
    company_map = {c["name"]: c["id"] for c in companies.data}
    
    imported = 0
    for objection in objections:
        try:
            company_name = objection.get("company_name") or objection.get("company")
            if not company_name or company_name not in company_map:
                print(f"  ⚠️  Skipping objection - company '{company_name}' not found")
                continue
            
            objection_data = {
                "company_id": company_map[company_name],
                "objection_category": objection.get("objection_category") or objection.get("category"),
                "objection_text": objection.get("objection_text") or objection.get("objection"),
                "response_strategy": objection.get("response_strategy") or objection.get("response"),
                "additional_context": objection.get("additional_context") or objection.get("context"),
                "difficulty_level": objection.get("difficulty_level") or objection.get("difficulty", "medium"),
                "success_rate": objection.get("success_rate"),
                "tags": objection.get("tags", [])
            }
            
            result = supabase.table("company_objections").insert(objection_data).execute()
            imported += 1
            
        except Exception as e:
            print(f"  ❌ Error importing objection: {str(e)}")
    
    print(f"\n✅ Imported {imported}/{len(objections)} objections")
    return imported

def import_templates(supabase: Client, templates: List[Dict]) -> int:
    """Import message templates into company_message_templates table"""
    print(f"\n📊 Importing {len(templates)} message templates...")
    
    # Get all company IDs
    companies = supabase.table("network_marketing_companies").select("id, name").execute()
    company_map = {c["name"]: c["id"] for c in companies.data}
    
    imported = 0
    for template in templates:
        try:
            company_name = template.get("company_name") or template.get("company")
            
            # Handle templates without company_name (generic templates)
            company_id = None
            if company_name and company_name in company_map:
                company_id = company_map[company_name]
            
            template_data = {
                "company_id": company_id,
                "template_name": template.get("template_name") or template.get("name"),
                "category": template.get("category") or template.get("template_category", "general"),
                "channel": template.get("channel", "email"),
                "language": template.get("language", "de"),
                "subject_line": template.get("subject_line"),
                "body_text": template.get("body_text") or template.get("message_body"),
                "tone": template.get("tone"),
                "use_case": template.get("use_case") or template.get("description"),
                "personalization_tags": template.get("personalization_tags", []),
                "industry": template.get("industry", []),
                "open_rate": template.get("open_rate"),
                "conversion_rate": template.get("conversion_rate"),
                "is_active": template.get("is_active", True)
            }
            
            result = supabase.table("company_message_templates").insert(template_data).execute()
            imported += 1
            
        except Exception as e:
            print(f"  ❌ Error importing template: {str(e)}")
    
    print(f"\n✅ Imported {imported}/{len(templates)} templates")
    return imported

def main():
    """Main import function"""
    print("🚀 Starting Network Marketing Data Import...")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Initialize Supabase
    supabase = init_supabase()
    print("✅ Connected to Supabase\n")
    
    # Define file paths
    base_path = "/mnt/user-data/uploads"
    files = {
        "companies_complete": "/home/claude/nm_companies_complete.json",
        "objections_gemini": f"{base_path}/nm_objections_gemini.json",
        "templates_gpt": f"{base_path}/message_templates_chatgpt.json",
        "templates_gemini": f"{base_path}/nm_templates_gemini.json"
    }
    
    stats = {
        "companies": 0,
        "objections": 0,
        "templates": 0
    }
    
    # Import Companies
    all_companies = []
    if os.path.exists(files["companies_complete"]):
        data = load_json_file(files["companies_complete"])
        companies = data.get("companies", [])
        all_companies.extend(companies)
        print(f"📁 Loaded {len(companies)} companies from complete dataset")
    
    stats["companies"] = import_companies(supabase, all_companies)
    
    # Import Objections
    all_objections = []
    if os.path.exists(files["objections_gemini"]):
        data = load_json_file(files["objections_gemini"])
        objections = data.get("objections", data.get("companies", []))
        all_objections.extend(objections)
        print(f"📁 Loaded {len(objections)} objections from Gemini dataset")
    
    stats["objections"] = import_objections(supabase, all_objections)
    
    # Import Templates
    all_templates = []
    for key in ["templates_gpt", "templates_gemini"]:
        if os.path.exists(files[key]):
            data = load_json_file(files[key])
            templates = data.get("message_templates", data.get("templates", data.get("companies", [])))
            all_templates.extend(templates)
            print(f"📁 Loaded {len(templates)} templates from {key}")
    
    stats["templates"] = import_templates(supabase, all_templates)
    
    # Final Summary
    print("\n" + "="*60)
    print("🎉 IMPORT COMPLETED!")
    print("="*60)
    print(f"✅ Companies imported: {stats['companies']}")
    print(f"✅ Objections imported: {stats['objections']}")
    print(f"✅ Templates imported: {stats['templates']}")
    print(f"\n⏰ Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n💡 Next Steps:")
    print("1. Verify data in Supabase Dashboard")
    print("2. Re-enable RLS policies")
    print("3. Test API endpoints")
    print("="*60)

if __name__ == "__main__":
    main()
