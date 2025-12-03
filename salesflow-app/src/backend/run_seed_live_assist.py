"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SEED LIVE ASSIST DATA                                                     ║
║  Fügt Zinzino Quick Facts, Objection Responses und Vertical Knowledge ein ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    python run_seed_live_assist.py
"""

import sys
import os
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

# Import directly to avoid __init__ issues
import importlib.util
spec = importlib.util.spec_from_file_location(
    "zinzino_seed", 
    Path(__file__).parent / "app" / "seeds" / "zinzino_live_assist_seed.py"
)
zinzino_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(zinzino_module)

seed_zinzino_live_assist = zinzino_module.seed_zinzino_live_assist
seed_additional_verticals = zinzino_module.seed_additional_verticals

# Supabase Config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lncwvbhcafkdorypnpnz.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_KEY:
    # Fallback to anon key from code
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3d2YmhjYWZrZG9yeXBucG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTk5MDAsImV4cCI6MjA3OTc3NTkwMH0.6sXqb76w5DXBRz1O4DREbGNNIOVPPynlv6YoixQcMBY"


def main():
    print("=" * 60)
    print("🌱 LIVE ASSIST SEED DATA")
    print("=" * 60)
    print()
    
    # Create Supabase client
    print("🔌 Verbinde mit Supabase...")
    db = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Verbunden!")
    print()
    
    # Check if data already exists
    print("🔍 Prüfe bestehende Daten...")
    
    try:
        facts = db.table("quick_facts").select("id", count="exact").execute()
        objections = db.table("objection_responses").select("id", count="exact").execute()
        knowledge = db.table("vertical_knowledge").select("id", count="exact").execute()
        
        print(f"   Quick Facts: {facts.count or 0}")
        print(f"   Objection Responses: {objections.count or 0}")
        print(f"   Vertical Knowledge: {knowledge.count or 0}")
        
        if (facts.count or 0) > 0:
            print()
            print("⚠️  Daten existieren bereits. Überspringe Seed.")
            print("   (Lösche die Tabellen-Inhalte manuell, um neu zu seeden)")
            return
            
    except Exception as e:
        print(f"   Fehler beim Prüfen: {e}")
        # Continue anyway
    
    print()
    print("📝 Füge Zinzino-Daten ein...")
    
    # Seed Zinzino data (without company_id for demo)
    results = seed_zinzino_live_assist(db, company_id=None)
    
    print(f"   ✅ Quick Facts: {results['quick_facts']}")
    print(f"   ✅ Objection Responses: {results['objection_responses']}")
    print(f"   ✅ Vertical Knowledge: {results['vertical_knowledge']}")
    
    print()
    print("📝 Füge zusätzliche Verticals ein...")
    
    # Seed additional verticals
    additional = seed_additional_verticals(db)
    print(f"   ✅ Additional Knowledge: {additional['vertical_knowledge']}")
    
    print()
    print("=" * 60)
    print("✅ SEED ABGESCHLOSSEN!")
    print("=" * 60)
    
    # Show totals
    total = (
        results['quick_facts'] + 
        results['objection_responses'] + 
        results['vertical_knowledge'] + 
        additional['vertical_knowledge']
    )
    print(f"   Gesamt: {total} Einträge erstellt")
    print()


if __name__ == "__main__":
    main()

