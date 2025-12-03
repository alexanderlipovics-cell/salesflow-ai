#!/usr/bin/env python
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PRODUCT KNOWLEDGE SEEDING SCRIPT                                          ║
║  Importiert Zinzino, PM-International etc. in die Datenbank                ║
╚════════════════════════════════════════════════════════════════════════════╝

Ausführung:
  cd backend
  python -m scripts.seed_product_knowledge

Oder:
  python scripts/seed_product_knowledge.py
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env
from dotenv import load_dotenv
load_dotenv()

# Run seeding
from app.seeds import run_seeding

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🌱 PRODUCT KNOWLEDGE SEEDER")
    print("=" * 60)
    
    # Prüfe Umgebungsvariablen
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not supabase_url:
        print("❌ SUPABASE_URL nicht gesetzt!")
        print("   Bitte in .env Datei setzen.")
        sys.exit(1)
    
    if not supabase_key:
        print("❌ SUPABASE_KEY nicht gesetzt!")
        print("   Bitte in .env Datei setzen.")
        sys.exit(1)
    
    print(f"📦 Supabase URL: {supabase_url[:30]}...")
    print()
    
    # Bestätigung
    confirm = input("Starte Seeding? (j/n): ").strip().lower()
    if confirm != "j":
        print("Abgebrochen.")
        sys.exit(0)
    
    # Seeding ausführen
    try:
        results = run_seeding()
        print(f"\n✅ {len(results)} Companies erfolgreich importiert!")
    except Exception as e:
        print(f"\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

