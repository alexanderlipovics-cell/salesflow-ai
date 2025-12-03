"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT LIBRARY SEED                                                        ║
║  Lädt alle 52 Network Marketing Scripts in die Datenbank                    ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    python -m app.seeds.scripts_seed
"""

import json
from uuid import uuid4

from ..db.supabase import get_supabase
from ..services.scripts.network_marketing_scripts import ALL_NETWORK_MARKETING_SCRIPTS


def seed_scripts(clear_existing: bool = False):
    """
    Lädt alle Scripts in die Datenbank.
    
    Args:
        clear_existing: Wenn True, werden bestehende Scripts gelöscht
    """
    db = get_supabase()
    
    print("📚 Script Library Seed")
    print("=" * 50)
    
    if clear_existing:
        print("🗑️  Lösche bestehende Scripts...")
        db.table("scripts").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print(f"📝 Lade {len(ALL_NETWORK_MARKETING_SCRIPTS)} Scripts...")
    
    success_count = 0
    error_count = 0
    
    for script in ALL_NETWORK_MARKETING_SCRIPTS:
        try:
            # Konvertiere zu DB-Format
            data = {
                "id": str(uuid4()),  # Neue ID für DB
                "number": script.number,
                "name": script.name,
                "category": script.category.value,
                "context": script.context.value,
                "relationship_level": script.relationship_level.value,
                "text": script.text,
                "description": script.description,
                "variables": json.dumps(script.variables),
                "variants": json.dumps([v.to_dict() for v in script.variants]),
                "vertical": script.vertical,
                "language": script.language,
                "tags": json.dumps(script.tags),
            }
            
            # Upsert basierend auf Nummer
            db.table("scripts").upsert(
                data,
                on_conflict="number"
            ).execute()
            
            success_count += 1
            print(f"  ✅ #{script.number}: {script.name}")
            
        except Exception as e:
            error_count += 1
            print(f"  ❌ #{script.number}: {script.name} - {e}")
    
    print("=" * 50)
    print(f"✅ Erfolgreich: {success_count}")
    print(f"❌ Fehler: {error_count}")
    print("📚 Script Library Seed abgeschlossen!")
    
    return success_count, error_count


def get_category_summary():
    """Gibt eine Zusammenfassung nach Kategorien aus."""
    from collections import Counter
    
    categories = Counter(s.category.value for s in ALL_NETWORK_MARKETING_SCRIPTS)
    contexts = Counter(s.context.value for s in ALL_NETWORK_MARKETING_SCRIPTS)
    
    print("\n📊 Script Library Übersicht")
    print("=" * 50)
    
    print("\n📁 Nach Kategorie:")
    for cat, count in categories.most_common():
        print(f"  • {cat}: {count} Scripts")
    
    print("\n🏷️  Nach Kontext:")
    for ctx, count in contexts.most_common(10):
        print(f"  • {ctx}: {count} Scripts")
    
    print(f"\n📚 Gesamt: {len(ALL_NETWORK_MARKETING_SCRIPTS)} Scripts")


if __name__ == "__main__":
    import sys
    
    # Zeige Zusammenfassung
    get_category_summary()
    
    # Frage nach Bestätigung
    if "--force" not in sys.argv:
        print("\n⚠️  Möchtest du die Scripts in die Datenbank laden?")
        print("   Füge '--force' hinzu um zu bestätigen.")
        print("   Füge '--clear' hinzu um bestehende Scripts zu löschen.")
        sys.exit(0)
    
    clear = "--clear" in sys.argv
    seed_scripts(clear_existing=clear)

