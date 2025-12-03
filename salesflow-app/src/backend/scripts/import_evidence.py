#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EVIDENCE HUB IMPORT SCRIPT                                                ║
║  CLI zum Import von Knowledge Items aus JSON-Dateien                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    # Dry Run (nur validieren)
    python scripts/import_evidence.py --dry-run
    
    # Evidence Hub importieren
    python scripts/import_evidence.py --file data/EVIDENCE_HUB_COMPLETE.json
    
    # Marketing Intelligence importieren
    python scripts/import_evidence.py --file data/MARKETING_INTELLIGENCE.json
    
    # Mit Embeddings generieren
    python scripts/import_evidence.py --generate-embeddings
    
    # Für eine spezifische Company
    python scripts/import_evidence.py --company-slug zinzino
    
    # Alles importieren (Evidence + Marketing)
    python scripts/import_evidence.py --all
"""

import argparse
import sys
import os
from pathlib import Path

# Add parent directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def get_supabase_client():
    """Erstellt den Supabase Client."""
    from supabase import create_client
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ Fehler: SUPABASE_URL und SUPABASE_SERVICE_KEY müssen gesetzt sein!")
        print("   Setze die Umgebungsvariablen oder erstelle eine .env Datei.")
        sys.exit(1)
    
    return create_client(url, key)


def import_file(db, file_path: str, company_id: str = None, dry_run: bool = False):
    """Importiert eine einzelne JSON-Datei."""
    from app.services.knowledge.import_service import KnowledgeImportService
    
    print(f"\n📥 Importiere: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"   ❌ Datei nicht gefunden: {file_path}")
        return None
    
    service = KnowledgeImportService(db)
    result = service.import_from_json_file(file_path, company_id, dry_run)
    
    return result


def print_result(result: dict, dry_run: bool = False):
    """Gibt das Import-Ergebnis formatiert aus."""
    if not result:
        return
    
    print(f"\n📊 Ergebnis:")
    print(f"   ✅ Importiert:  {result.get('imported_count', 0)}")
    print(f"   ⏭️  Übersprungen: {result.get('skipped_count', 0)}")
    print(f"   ❌ Fehler:      {result.get('error_count', 0)}")
    
    if result.get('errors'):
        print(f"\n⚠️  Fehlerliste:")
        for error in result['errors'][:5]:
            print(f"   - {error}")
        if len(result['errors']) > 5:
            print(f"   ... und {len(result['errors']) - 5} weitere Fehler")
    
    if dry_run:
        print(f"\n🔍 DRY RUN - Nichts wurde tatsächlich importiert.")


async def generate_embeddings(db, limit: int = 100):
    """Generiert Embeddings für alle Items ohne Embedding."""
    from app.services.knowledge.embedding_service import EmbeddingService
    
    print(f"\n🧠 Generiere Embeddings...")
    
    service = EmbeddingService(db)
    
    # Hole Items ohne Embeddings
    result = db.table("knowledge_items").select(
        "id, title, content, content_short"
    ).eq("is_active", True).limit(limit).execute()
    
    items = result.data or []
    
    if not items:
        print("   Keine Items gefunden.")
        return
    
    generated = 0
    errors = 0
    
    for item in items:
        # Check ob Embedding existiert
        if service.has_embedding(item['id']):
            continue
        
        # Generiere Text für Embedding
        text = f"{item['title']}\n\n{item.get('content_short') or item['content'][:1000]}"
        
        # Generiere und speichere
        success = await service.generate_and_store(item['id'], text)
        
        if success:
            generated += 1
            print(f"   ✓ {item['title'][:50]}...")
        else:
            errors += 1
    
    print(f"\n   ✅ Generiert: {generated}")
    print(f"   ❌ Fehler:    {errors}")


def main():
    """Hauptfunktion."""
    parser = argparse.ArgumentParser(
        description='Evidence Hub Import Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  # Nur validieren
  python scripts/import_evidence.py --dry-run
  
  # Evidence Hub importieren
  python scripts/import_evidence.py --file data/EVIDENCE_HUB_COMPLETE.json
  
  # Mit Embeddings
  python scripts/import_evidence.py --file data/EVIDENCE_HUB_COMPLETE.json --generate-embeddings
  
  # Für Company zuordnen
  python scripts/import_evidence.py --file data/EVIDENCE_HUB_COMPLETE.json --company-slug zinzino
        """
    )
    
    parser.add_argument(
        '--file', '-f',
        default='data/EVIDENCE_HUB_COMPLETE.json',
        help='Pfad zur JSON-Datei (default: data/EVIDENCE_HUB_COMPLETE.json)'
    )
    
    parser.add_argument(
        '--all', '-a',
        action='store_true',
        help='Importiert beide: Evidence Hub und Marketing Intelligence'
    )
    
    parser.add_argument(
        '--dry-run', '-n',
        action='store_true',
        help='Nur validieren, nicht importieren'
    )
    
    parser.add_argument(
        '--generate-embeddings', '-e',
        action='store_true',
        help='Generiert Embeddings nach dem Import'
    )
    
    parser.add_argument(
        '--company-slug', '-c',
        default=None,
        help='Company-Slug für Zuordnung (z.B. "zinzino")'
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=100,
        help='Limit für Embedding-Generierung (default: 100)'
    )
    
    args = parser.parse_args()
    
    # Header
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║  Sales Flow AI - Evidence Hub Import                          ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    
    # Load .env if exists
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        from dotenv import load_dotenv
        load_dotenv(env_path)
        print(f"   .env geladen: {env_path}")
    
    # Supabase Client
    try:
        db = get_supabase_client()
        print("   ✓ Supabase verbunden")
    except Exception as e:
        print(f"   ❌ Supabase-Verbindung fehlgeschlagen: {e}")
        sys.exit(1)
    
    # Company ID ermitteln
    company_id = None
    if args.company_slug:
        result = db.table("companies").select("id, name").eq(
            "slug", args.company_slug
        ).eq("is_active", True).single().execute()
        
        if result.data:
            company_id = result.data['id']
            print(f"   ✓ Company: {result.data['name']} ({company_id})")
        else:
            print(f"   ⚠️  Company '{args.company_slug}' nicht gefunden - Import ohne Zuordnung")
    
    # Base path
    base_path = Path(__file__).parent.parent
    
    # Import
    total_imported = 0
    total_skipped = 0
    total_errors = 0
    
    if args.all:
        # Beide Dateien importieren
        files = [
            base_path / 'data' / 'EVIDENCE_HUB_COMPLETE.json',
            base_path / 'data' / 'MARKETING_INTELLIGENCE.json',
        ]
        
        for file_path in files:
            result = import_file(db, str(file_path), company_id, args.dry_run)
            if result:
                print_result(result, args.dry_run)
                total_imported += result.get('imported_count', 0)
                total_skipped += result.get('skipped_count', 0)
                total_errors += result.get('error_count', 0)
        
        print(f"\n═══════════════════════════════════════════════════════════════")
        print(f"📊 GESAMT:")
        print(f"   ✅ Importiert:  {total_imported}")
        print(f"   ⏭️  Übersprungen: {total_skipped}")
        print(f"   ❌ Fehler:      {total_errors}")
    
    else:
        # Einzelne Datei
        file_path = base_path / args.file
        result = import_file(db, str(file_path), company_id, args.dry_run)
        print_result(result, args.dry_run)
    
    # Embeddings generieren
    if args.generate_embeddings and not args.dry_run:
        import asyncio
        asyncio.run(generate_embeddings(db, args.limit))
    
    # Fertig
    print(f"\n✨ Fertig!")


if __name__ == '__main__':
    main()


