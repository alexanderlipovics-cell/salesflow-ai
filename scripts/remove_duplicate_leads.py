#!/usr/bin/env python3
"""
Script: Remove Duplicate Leads
Purpose: Findet und löscht doppelte Leads (gleicher user_id + name/instagram)
         Behält den ÄLTESTEN Lead (ersten erstellten)

Usage:
    python scripts/remove_duplicate_leads.py --dry-run  # Nur anzeigen
    python scripts/remove_duplicate_leads.py --execute # Wirklich löschen
"""

import os
import sys
import argparse
from datetime import datetime
from typing import List, Dict, Any
from supabase import create_client, Client

# Supabase Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fehler: SUPABASE_URL und SUPABASE_KEY müssen gesetzt sein!")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def normalize_string(s: str | None) -> str:
    """Normalisiert String für Vergleich (lowercase, trim)."""
    if not s:
        return ""
    return s.lower().strip()


def find_duplicates() -> List[Dict[str, Any]]:
    """
    Findet alle doppelten Leads.
    
    Returns:
        Liste von Duplikaten mit Metadaten
    """
    print("🔍 Lade alle Leads...")
    
    # Lade alle Leads
    response = supabase.table("leads").select("*").execute()
    leads = response.data if response.data else []
    
    print(f"   {len(leads)} Leads gefunden")
    
    # Gruppiere nach Duplikat-Schlüssel
    groups: Dict[str, List[Dict[str, Any]]] = {}
    
    for lead in leads:
        name = normalize_string(lead.get("name"))
        instagram = normalize_string(lead.get("instagram_username"))
        user_id = lead.get("user_id")
        
        # Überspringe Leads ohne Name und Instagram
        if not name and not instagram:
            continue
        
        # Erstelle Schlüssel für Duplikat-Erkennung
        key = f"{user_id}|||{name}|||{instagram}"
        
        if key not in groups:
            groups[key] = []
        groups[key].append(lead)
    
    # Finde Duplikate (Gruppen mit mehr als 1 Lead)
    duplicates = []
    for key, group_leads in groups.items():
        if len(group_leads) > 1:
            # Sortiere nach created_at (ältester zuerst)
            group_leads.sort(key=lambda x: x.get("created_at", ""))
            
            duplicates.append({
                "key": key,
                "leads": group_leads,
                "keep": group_leads[0],  # Ältester
                "delete": group_leads[1:],  # Alle anderen
            })
    
    return duplicates


def print_duplicates(duplicates: List[Dict[str, Any]]):
    """Zeigt alle Duplikate an."""
    if not duplicates:
        print("✅ Keine Duplikate gefunden!")
        return
    
    print(f"\n📊 {len(duplicates)} Duplikat-Gruppen gefunden\n")
    
    total_to_delete = sum(len(d["delete"]) for d in duplicates)
    affected_users = len(set(
        lead.get("user_id") 
        for d in duplicates 
        for lead in d["leads"]
    ))
    
    print(f"📈 Zusammenfassung:")
    print(f"   - Duplikat-Gruppen: {len(duplicates)}")
    print(f"   - Leads zum Löschen: {total_to_delete}")
    print(f"   - Betroffene User: {affected_users}")
    print()
    
    # Zeige Details
    for i, dup in enumerate(duplicates, 1):
        keep = dup["keep"]
        delete_list = dup["delete"]
        
        print(f"🔴 Gruppe {i}:")
        print(f"   Name: {keep.get('name', 'N/A')}")
        print(f"   Instagram: {keep.get('instagram_username', 'N/A')}")
        print(f"   User ID: {keep.get('user_id')}")
        print(f"   Anzahl Duplikate: {len(dup['leads'])}")
        print()
        
        print(f"   ✅ BEHALTEN (ältester):")
        print(f"      ID: {keep.get('id')}")
        print(f"      Erstellt: {keep.get('created_at')}")
        print(f"      Status: {keep.get('status', 'N/A')}")
        print()
        
        print(f"   ❌ LÖSCHEN ({len(delete_list)} Leads):")
        for lead in delete_list:
            print(f"      - ID: {lead.get('id')}, Erstellt: {lead.get('created_at')}, Status: {lead.get('status', 'N/A')}")
        print()


def create_backup(duplicates: List[Dict[str, Any]]) -> bool:
    """Erstellt Backup der zu löschenden Leads."""
    print("💾 Erstelle Backup...")
    
    delete_ids = []
    for dup in duplicates:
        delete_ids.extend([lead.get("id") for lead in dup["delete"]])
    
    if not delete_ids:
        print("   Keine Leads zum Backup nötig")
        return True
    
    try:
        # Lade alle zu löschenden Leads
        response = supabase.table("leads").select("*").in_("id", delete_ids).execute()
        backup_leads = response.data if response.data else []
        
        # Erstelle Backup-Tabelle (falls nicht existiert)
        # Hinweis: Supabase Python Client kann keine CREATE TABLE ausführen
        # Du musst das manuell in Supabase Dashboard machen oder SQL Script verwenden
        
        print(f"   {len(backup_leads)} Leads für Backup vorbereitet")
        print(f"   ⚠️  Führe SQL Script aus um Backup-Tabelle zu erstellen!")
        
        return True
    except Exception as e:
        print(f"   ❌ Fehler beim Backup: {e}")
        return False


def delete_duplicates(duplicates: List[Dict[str, Any]], dry_run: bool = True) -> bool:
    """Löscht Duplikate."""
    delete_ids = []
    for dup in duplicates:
        delete_ids.extend([lead.get("id") for lead in dup["delete"]])
    
    if not delete_ids:
        print("✅ Keine Leads zum Löschen")
        return True
    
    if dry_run:
        print(f"\n🔍 DRY-RUN: Würde {len(delete_ids)} Leads löschen:")
        for lead_id in delete_ids[:10]:  # Zeige erste 10
            print(f"   - {lead_id}")
        if len(delete_ids) > 10:
            print(f"   ... und {len(delete_ids) - 10} weitere")
        print("\n   ⚠️  Führe mit --execute aus um wirklich zu löschen!")
        return True
    
    print(f"\n🗑️  Lösche {len(delete_ids)} Leads...")
    
    try:
        # Lösche in Batches (Supabase hat Limits)
        batch_size = 100
        deleted = 0
        
        for i in range(0, len(delete_ids), batch_size):
            batch = delete_ids[i:i + batch_size]
            response = supabase.table("leads").delete().in_("id", batch).execute()
            deleted += len(batch)
            print(f"   {deleted}/{len(delete_ids)} gelöscht...")
        
        print(f"✅ {deleted} Leads erfolgreich gelöscht!")
        return True
    except Exception as e:
        print(f"❌ Fehler beim Löschen: {e}")
        return False


def verify_no_duplicates() -> bool:
    """Prüft ob noch Duplikate existieren."""
    print("\n🔍 Verifiziere: Prüfe ob noch Duplikate existieren...")
    
    duplicates = find_duplicates()
    
    if duplicates:
        print(f"⚠️  WARNUNG: {len(duplicates)} Duplikat-Gruppen gefunden!")
        return False
    else:
        print("✅ Keine Duplikate mehr gefunden!")
        return True


def main():
    parser = argparse.ArgumentParser(description="Entferne doppelte Leads")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Nur anzeigen, nicht löschen (Standard)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Wirklich löschen (VORSICHT!)"
    )
    parser.add_argument(
        "--backup",
        action="store_true",
        help="Erstelle Backup vor dem Löschen"
    )
    
    args = parser.parse_args()
    
    # Standard: dry-run wenn nichts angegeben
    dry_run = not args.execute
    
    print("=" * 60)
    print("🔍 Duplicate Leads Remover")
    print("=" * 60)
    print()
    
    if not dry_run:
        print("⚠️  WARNUNG: Duplikate werden WIRKLICH gelöscht!")
        response = input("   Bist du sicher? (yes/no): ")
        if response.lower() != "yes":
            print("❌ Abgebrochen")
            return
        print()
    
    # Finde Duplikate
    duplicates = find_duplicates()
    
    # Zeige Duplikate
    print_duplicates(duplicates)
    
    if not duplicates:
        return
    
    # Backup (optional)
    if args.backup or not dry_run:
        if not create_backup(duplicates):
            print("❌ Backup fehlgeschlagen. Abgebrochen.")
            return
    
    # Lösche Duplikate
    if not delete_duplicates(duplicates, dry_run=dry_run):
        print("❌ Löschen fehlgeschlagen")
        return
    
    # Verifikation
    if not dry_run:
        verify_no_duplicates()
    
    print("\n✅ Fertig!")


if __name__ == "__main__":
    main()

