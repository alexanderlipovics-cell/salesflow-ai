#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  KNOWLEDGE IMPORT CLI                                                      ║
║  Command-Line Tool zum Import von Evidence Hub & Marketing Intelligence    ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    # Dry-Run (nur Validierung)
    python -m scripts.import_knowledge --file data/EVIDENCE_HUB_COMPLETE.json --dry-run

    # Echter Import
    python -m scripts.import_knowledge --file data/EVIDENCE_HUB_COMPLETE.json

    # Mit Company
    python -m scripts.import_knowledge --file data/zinzino_knowledge.json --company zinzino

    # Marketing Intelligence
    python -m scripts.import_knowledge --file data/MARKETING_INTELLIGENCE.json --type marketing
"""

import argparse
import sys
import os
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_client
from app.services.knowledge.import_service import (
    KnowledgeImportService,
    import_evidence_hub,
    import_marketing_intelligence,
)


def print_header():
    """Print CLI header."""
    print()
    print("╔" + "═" * 60 + "╗")
    print("║  🧠 SALES FLOW AI - Knowledge Import CLI                  ║")
    print("╚" + "═" * 60 + "╝")
    print()


def print_result(result: dict):
    """Pretty print import result."""
    success = result.get('success', False)
    status = "✅ ERFOLGREICH" if success else "❌ FEHLGESCHLAGEN"
    
    print()
    print(f"  Status:      {status}")
    print(f"  Importiert:  {result.get('imported_count', 0)} Items")
    print(f"  Übersprungen: {result.get('skipped_count', 0)} Items")
    print(f"  Fehler:      {result.get('error_count', 0)}")
    
    if result.get('dry_run'):
        print(f"  Modus:       🔍 DRY-RUN (nur Validierung)")
    
    if result.get('source_file'):
        print(f"  Quelle:      {result['source_file']}")
    
    # Show errors if any
    errors = result.get('errors', [])
    if errors:
        print()
        print("  ⚠️  Fehler:")
        for error in errors[:10]:
            print(f"      - {error}")
        if len(errors) > 10:
            print(f"      ... und {len(errors) - 10} weitere")
    
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Sales Flow AI - Knowledge Import CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  # Evidence Hub importieren (Dry-Run)
  python -m scripts.import_knowledge --file data/EVIDENCE_HUB_COMPLETE.json --dry-run
  
  # Marketing Intelligence importieren
  python -m scripts.import_knowledge --file data/MARKETING_INTELLIGENCE.json
  
  # Mit Company zuordnen
  python -m scripts.import_knowledge --file data/zinzino.json --company zinzino
        """
    )
    
    parser.add_argument(
        '--file', '-f',
        type=str,
        required=True,
        help='Pfad zur JSON-Datei'
    )
    
    parser.add_argument(
        '--company', '-c',
        type=str,
        default=None,
        help='Company Slug (optional, z.B. "zinzino")'
    )
    
    parser.add_argument(
        '--dry-run', '-d',
        action='store_true',
        help='Nur validieren, nicht importieren'
    )
    
    parser.add_argument(
        '--type', '-t',
        type=str,
        choices=['evidence', 'marketing', 'auto'],
        default='auto',
        help='Import-Typ (auto = automatisch erkennen)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Ausführliche Ausgabe'
    )
    
    args = parser.parse_args()
    
    print_header()
    
    # Check file exists
    file_path = Path(args.file)
    if not file_path.exists():
        # Try relative to backend/data
        backend_path = Path(__file__).parent.parent
        file_path = backend_path / args.file
        
        if not file_path.exists():
            print(f"❌ Datei nicht gefunden: {args.file}")
            print(f"   Geprüft: {file_path}")
            sys.exit(1)
    
    print(f"📂 Datei: {file_path}")
    print(f"🔧 Modus: {'DRY-RUN' if args.dry_run else 'IMPORT'}")
    if args.company:
        print(f"🏢 Company: {args.company}")
    print()
    
    # Get database client
    try:
        db = get_supabase_client()
        if args.verbose:
            print("✅ Datenbankverbindung hergestellt")
    except Exception as e:
        print(f"❌ Datenbankverbindung fehlgeschlagen: {e}")
        print("   Stellen Sie sicher, dass SUPABASE_URL und SUPABASE_KEY gesetzt sind")
        sys.exit(1)
    
    # Initialize service
    service = KnowledgeImportService(db)
    
    # Resolve company_id if slug provided
    company_id = None
    if args.company:
        company_id = service.get_company_id_by_slug(args.company)
        if not company_id:
            print(f"⚠️  Company '{args.company}' nicht gefunden - Import ohne Company-Zuordnung")
    
    # Run import
    print("🚀 Starte Import...")
    print()
    
    start_time = datetime.now()
    
    result = service.import_from_json_file(
        file_path=str(file_path),
        company_id=company_id,
        dry_run=args.dry_run,
    )
    
    elapsed = (datetime.now() - start_time).total_seconds()
    
    print_result(result)
    print(f"⏱️  Dauer: {elapsed:.2f} Sekunden")
    print()
    
    if result.get('success'):
        if args.dry_run:
            print("💡 Tipp: Führe ohne --dry-run aus, um tatsächlich zu importieren")
        else:
            print("🎉 Import abgeschlossen!")
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()

