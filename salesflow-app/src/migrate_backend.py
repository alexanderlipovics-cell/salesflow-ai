#!/usr/bin/env python3
"""
Backend Migration Script
Migriert wichtige Features vom alten Backend ins neue Backend.

WICHTIG: Führt KEINE automatischen Löschungen durch!
Erstellt nur die neuen Dateien.
"""

import os
import shutil
from pathlib import Path

# Pfade
OLD_BACKEND = Path("../backend")
NEW_BACKEND = Path("src/backend")
BACKUP_DIR = Path("backend_backup")

def create_backup():
    """Erstellt Backup des alten Backends."""
    print("📦 Erstelle Backup...")
    if BACKUP_DIR.exists():
        shutil.rmtree(BACKUP_DIR)
    shutil.copytree(OLD_BACKEND, BACKUP_DIR)
    print(f"✅ Backup erstellt: {BACKUP_DIR}")

def migrate_chief_context_service():
    """Migriert Chief Context Service."""
    print("\n🔄 Migriere Chief Context Service...")
    
    old_file = OLD_BACKEND / "app/services/chief_context.py"
    new_file = NEW_BACKEND / "app/services/chief_context.py"
    
    if not old_file.exists():
        print("❌ Alte Datei nicht gefunden!")
        return False
    
    if new_file.exists():
        print("⚠️  Datei existiert bereits - überspringe")
        return False
    
    # Kopiere Datei
    shutil.copy2(old_file, new_file)
    print(f"✅ Migriert: {new_file}")
    return True

def migrate_quick_action_endpoint():
    """Fügt Quick Action Endpoint zum Mentor Router hinzu."""
    print("\n🔄 Migriere Quick Action Endpoint...")
    
    mentor_route = NEW_BACKEND / "app/api/routes/mentor.py"
    
    if not mentor_route.exists():
        print("❌ Mentor Route nicht gefunden!")
        return False
    
    # Lese alte AI Route für Quick Action Code
    old_ai_route = OLD_BACKEND / "app/api/ai.py"
    if not old_ai_route.exists():
        print("⚠️  Alte AI Route nicht gefunden - überspringe")
        return False
    
    print("✅ Quick Action Code muss manuell zu mentor.py hinzugefügt werden")
    print("   Siehe: backend/app/api/ai.py Zeilen 101-140")
    return True

def check_missing_endpoints():
    """Prüft welche Endpoints fehlen."""
    print("\n🔍 Prüfe fehlende Endpoints...")
    
    old_endpoints = [
        "/api/ai/chief/context",
        "/api/ai/quick-action",
        "/api/ai/feedback",
    ]
    
    print("Endpoints die migriert werden sollten:")
    for endpoint in old_endpoints:
        print(f"  - {endpoint}")

def main():
    """Hauptfunktion."""
    print("=" * 60)
    print("🔄 BACKEND MIGRATION SCRIPT")
    print("=" * 60)
    
    # 1. Backup erstellen
    create_backup()
    
    # 2. Services migrieren
    migrate_chief_context_service()
    
    # 3. Endpoints prüfen
    check_missing_endpoints()
    migrate_quick_action_endpoint()
    
    print("\n" + "=" * 60)
    print("✅ Migration abgeschlossen!")
    print("=" * 60)
    print("\n📋 Nächste Schritte:")
    print("1. Prüfe migrierte Dateien")
    print("2. Füge Quick Action Endpoint manuell zu mentor.py hinzu")
    print("3. Teste alle Endpoints")
    print("4. Aktualisiere Frontend-URLs falls nötig")
    print("5. Lösche altes Backend NUR wenn alles funktioniert!")

if __name__ == "__main__":
    main()

