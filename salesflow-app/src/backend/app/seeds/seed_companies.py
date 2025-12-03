"""
Company Seed Script - Angepasst an existierende DB-Struktur
Importiert Company-Daten in knowledge_items und templates
"""

import os
import sys
from typing import Dict, Any, List
from datetime import datetime

from supabase import create_client, Client

from .zinzino_seed import get_zinzino_seed_data
from .pm_international_seed import get_pm_international_seed_data
from .lr_health_seed import get_lr_health_seed_data
from .doterra_seed import get_doterra_seed_data


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL und SUPABASE_KEY müssen gesetzt sein")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def get_or_create_company(db: Client, company_data: Dict[str, Any]) -> str:
    """Erstellt oder holt Company aus der Datenbank"""
    existing = db.table("companies").select("id").eq("slug", company_data["slug"]).execute()
    
    if existing.data:
        company_id = existing.data[0]["id"]
        print(f"  ✅ Company '{company_data['name']}' existiert (ID: {company_id[:8]}...)")
        
        # Update brand_config und storybook_imported
        db.table("companies").update({
            "brand_config": company_data.get("brand_config", {}),
            "storybook_imported": True,
            "storybook_imported_at": datetime.utcnow().isoformat(),
        }).eq("id", company_id).execute()
        
        return company_id
    
    # Neue Company erstellen
    result = db.table("companies").insert({
        "name": company_data["name"],
        "slug": company_data["slug"],
        "vertical_id": company_data.get("vertical", "network_marketing"),
        "website_url": company_data.get("website"),
        "compliance_level": company_data.get("compliance_level", "normal"),
        "brand_config": company_data.get("brand_config", {}),
        "business_model": "network_marketing",
        "is_active": True,
        "storybook_imported": True,
        "storybook_imported_at": datetime.utcnow().isoformat(),
    }).execute()
    
    company_id = result.data[0]["id"]
    print(f"  ✨ Company '{company_data['name']}' erstellt (ID: {company_id[:8]}...)")
    return company_id


def seed_as_knowledge_items(db: Client, company_id: str, items: List[Dict], item_type: str) -> int:
    """Seedt Items als knowledge_items"""
    count = 0
    
    # Map zu erlaubten knowledge_type enum Werten
    type_map = {
        "story": "sales_script",      # Stories -> sales_script
        "product": "product_detail",   # Products -> product_detail
        "guardrail": "compliance_rule" # Guardrails -> compliance_rule
    }
    db_type = type_map.get(item_type, "best_practice")
    
    # Domain ist immer 'company' für firmenspezifisches Wissen
    db_domain = "company"
    
    for item in items:
        # Titel bestimmen
        title = item.get("title") or item.get("name") or f"{item_type}_{count}"
        
        # Check if exists
        existing = db.table("knowledge_items").select("id").eq(
            "company_id", company_id
        ).eq("title", title).eq("type", db_type).execute()
        
        if existing.data:
            continue
        
        # Content zusammenbauen
        if item_type == "story":
            content = (
                item.get("content_30s") or 
                item.get("content_1min") or 
                item.get("content_2min") or 
                item.get("content_full") or ""
            )
        elif item_type == "product":
            content = item.get("description_full") or item.get("description_short") or ""
        elif item_type == "guardrail":
            content = item.get("rule_description") or ""
        else:
            content = str(item)
        
        # Keywords
        keywords = item.get("tags", []) + item.get("key_benefits", [])
        if item.get("category"):
            keywords.append(item["category"])
        
        db.table("knowledge_items").insert({
            "company_id": company_id,
            "type": db_type,
            "domain": db_domain,
            "topic": item.get("story_type") or item.get("rule_name") or item.get("slug") or item_type,
            "subtopic": item.get("use_case"),
            "title": title,
            "content": content,
            "content_short": item.get("tagline") or item.get("description_short") or content[:200],
            "keywords": keywords[:10] if keywords else [],
            "language": "de",
            "is_active": True,
            "metadata": {
                "original_data": item,
                "seeded_at": datetime.utcnow().isoformat(),
            }
        }).execute()
        count += 1
    
    return count


def seed_knowledge_items(db: Client, company_id: str, items: List[Dict]) -> int:
    """Seedt Knowledge-Items mit bereits definierten Typen (company_overview, product_line, etc.)"""
    count = 0
    
    for item in items:
        title = item.get("title") or f"knowledge_{count}"
        db_type = item.get("type", "best_practice")
        db_domain = item.get("domain", "company")
        
        # Check if exists
        existing = db.table("knowledge_items").select("id").eq(
            "company_id", company_id
        ).eq("title", title).eq("type", db_type).execute()
        
        if existing.data:
            # Update existing
            db.table("knowledge_items").update({
                "content": item.get("content", ""),
                "content_short": item.get("content_short", ""),
                "keywords": item.get("keywords", [])[:10],
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", existing.data[0]["id"]).execute()
            continue
        
        db.table("knowledge_items").insert({
            "company_id": company_id,
            "type": db_type,
            "domain": db_domain,
            "topic": item.get("topic", "general"),
            "subtopic": item.get("subtopic"),
            "title": title,
            "content": item.get("content", ""),
            "content_short": item.get("content_short", ""),
            "keywords": item.get("keywords", [])[:10],
            "language": "de",
            "is_active": True,
            "metadata": {
                "seeded_at": datetime.utcnow().isoformat(),
            }
        }).execute()
        count += 1
    
    return count


def seed_chief_prompt_as_template(db: Client, company_id: str, prompt: str, company_name: str) -> bool:
    """Speichert CHIEF-Prompt als Template"""
    existing = db.table("templates").select("id").eq(
        "company_id", company_id
    ).eq("name", f"{company_name} Mode Prompt").execute()
    
    if existing.data:
        # Update
        db.table("templates").update({
            "content": prompt,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", existing.data[0]["id"]).execute()
        return True
    
    db.table("templates").insert({
        "company_id": company_id,
        "name": f"{company_name} Mode Prompt",
        "category": "custom",
        "content": prompt,
        "description": f"CHIEF System-Prompt für {company_name}",
        "is_active": True,
        "is_shared": True,
        "tags": ["system_prompt", "chief", "compliance"],
    }).execute()
    return True


def seed_all_company_data(db: Client, seed_data: Dict[str, Any]) -> Dict[str, Any]:
    """Seedt alle Daten für ein Unternehmen"""
    company_data = seed_data["company"]
    print(f"\n🏢 Seeding: {company_data['name']}")
    
    # 1. Company
    company_id = get_or_create_company(db, company_data)
    
    # 2. Stories als knowledge_items
    if seed_data.get("stories"):
        count = seed_as_knowledge_items(db, company_id, seed_data["stories"], "story")
        print(f"  📖 {count} Stories importiert")
    
    # 3. Products als knowledge_items
    if seed_data.get("products"):
        count = seed_as_knowledge_items(db, company_id, seed_data["products"], "product")
        print(f"  📦 {count} Produkte importiert")
    
    # 4. Knowledge Items (Company Info, Konzepte, etc.)
    if seed_data.get("knowledge"):
        count = seed_knowledge_items(db, company_id, seed_data["knowledge"])
        print(f"  📚 {count} Knowledge-Items importiert")
    
    # 5. Guardrails als knowledge_items
    if seed_data.get("guardrails"):
        count = seed_as_knowledge_items(db, company_id, seed_data["guardrails"], "guardrail")
        print(f"  🛡️ {count} Guardrails importiert")
    
    # 6. CHIEF Prompt als Template
    if seed_data.get("chief_prompt"):
        seed_chief_prompt_as_template(db, company_id, seed_data["chief_prompt"], company_data["name"])
        print(f"  🤖 CHIEF-Prompt importiert")
    
    return {"company_id": company_id, "name": company_data["name"]}


def run_seeding():
    """Führt das komplette Seeding aus"""
    print("=" * 60)
    print("🌱 COMPANY SEEDING STARTED")
    print("=" * 60)
    
    db = get_supabase()
    results = []
    
    seeds = [
        ("Zinzino", get_zinzino_seed_data),
        ("PM-International", get_pm_international_seed_data),
        ("LR Health & Beauty", get_lr_health_seed_data),
        ("doTERRA", get_doterra_seed_data),
    ]
    
    for name, get_data in seeds:
        try:
            data = get_data()
            result = seed_all_company_data(db, data)
            results.append(result)
        except Exception as e:
            print(f"  ❌ Fehler bei {name}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("✅ SEEDING COMPLETE")
    print("=" * 60)
    
    for r in results:
        print(f"  • {r['name']}")
    
    return results


def run_zinzino_only():
    """Seedt nur Zinzino-Daten (für schnelle Updates)"""
    print("=" * 60)
    print("🌱 ZINZINO SEEDING (v2)")
    print("=" * 60)
    
    db = get_supabase()
    data = get_zinzino_seed_data()
    result = seed_all_company_data(db, data)
    
    print("\n" + "=" * 60)
    print("✅ ZINZINO SEEDING COMPLETE")
    print("=" * 60)
    
    return result


if __name__ == "__main__":
    run_seeding()
