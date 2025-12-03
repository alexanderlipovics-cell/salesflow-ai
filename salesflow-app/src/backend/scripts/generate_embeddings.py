#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EMBEDDING GENERATION CLI                                                  ║
║  Generiert Embeddings für alle Knowledge Items ohne Embedding             ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    # Alle fehlenden Embeddings generieren
    python -m scripts.generate_embeddings

    # Limit auf 100 Items
    python -m scripts.generate_embeddings --limit 100

    # Nur für bestimmte Company
    python -m scripts.generate_embeddings --company zinzino
"""

import argparse
import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_client
from app.services.knowledge.embedding_service import EmbeddingService


def print_header():
    """Print CLI header."""
    print()
    print("╔" + "═" * 60 + "╗")
    print("║  🔮 SALES FLOW AI - Embedding Generation CLI               ║")
    print("╚" + "═" * 60 + "╝")
    print()


async def generate_embeddings(
    db,
    company_id: str = None,
    limit: int = None,
    verbose: bool = False,
):
    """Generate embeddings for knowledge items without them."""
    
    service = EmbeddingService(db)
    
    # Build query for items without embeddings
    query = db.table("knowledge_items").select(
        "id, title, content"
    ).eq("is_active", True).eq("is_current", True)
    
    if company_id:
        query = query.eq("company_id", company_id)
    
    if limit:
        query = query.limit(limit)
    
    # Get items
    result = query.execute()
    items = result.data or []
    
    print(f"📊 Gefunden: {len(items)} Items")
    
    if not items:
        print("✅ Keine Items zum Verarbeiten")
        return
    
    # Check which already have embeddings
    items_to_process = []
    for item in items:
        has_emb = service.has_embedding(item["id"])
        if not has_emb:
            items_to_process.append(item)
    
    print(f"🔄 Zu verarbeiten: {len(items_to_process)} Items (ohne Embedding)")
    print()
    
    if not items_to_process:
        print("✅ Alle Items haben bereits Embeddings")
        return
    
    # Generate embeddings
    success = 0
    failed = 0
    
    for idx, item in enumerate(items_to_process, 1):
        title = item.get("title", "")[:40]
        print(f"  [{idx}/{len(items_to_process)}] {title}...", end=" ")
        
        try:
            content = item.get("content", "")
            if not content:
                print("⚠️ Kein Content")
                continue
            
            result = await service.generate_and_store(
                knowledge_item_id=item["id"],
                content=content,
            )
            
            if result:
                print("✅")
                success += 1
            else:
                print("❌")
                failed += 1
                
        except Exception as e:
            print(f"❌ {e}")
            failed += 1
    
    print()
    print(f"📊 Ergebnis: {success} erfolgreich, {failed} fehlgeschlagen")


def main():
    parser = argparse.ArgumentParser(
        description="Sales Flow AI - Embedding Generation CLI",
    )
    
    parser.add_argument(
        '--company', '-c',
        type=str,
        default=None,
        help='Nur Items dieser Company verarbeiten'
    )
    
    parser.add_argument(
        '--limit', '-l',
        type=int,
        default=None,
        help='Maximale Anzahl Items'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Ausführliche Ausgabe'
    )
    
    args = parser.parse_args()
    
    print_header()
    
    # Get database client
    try:
        db = get_supabase_client()
        print("✅ Datenbankverbindung hergestellt")
    except Exception as e:
        print(f"❌ Datenbankverbindung fehlgeschlagen: {e}")
        sys.exit(1)
    
    # Check OpenAI API key
    import os
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY nicht gesetzt!")
        print("   Embeddings benötigen OpenAI API")
        sys.exit(1)
    
    print()
    
    # Run async
    asyncio.run(generate_embeddings(
        db=db,
        company_id=args.company,
        limit=args.limit,
        verbose=args.verbose,
    ))
    
    print()
    print("🎉 Fertig!")


if __name__ == '__main__':
    main()

