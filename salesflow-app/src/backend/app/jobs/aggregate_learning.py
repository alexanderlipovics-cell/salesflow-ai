# backend/app/jobs/aggregate_learning.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AGGREGATE LEARNING JOB                                                    ║
║  Täglicher Cronjob für Learning-Aggregationen                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Aufgaben:
- Tägliche Aggregationen berechnen
- Template Performance Scores aktualisieren
- 30-Tage Rolling Stats updaten

Ausführung:
    python -m backend.app.jobs.aggregate_learning
    
Cronjob (täglich 2:00 Uhr):
    0 2 * * * cd /path/to/project && python -m backend.app.jobs.aggregate_learning
"""

import asyncio
from datetime import date, timedelta
from typing import Optional
import sys
import os

# Path setup für standalone Ausführung
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))


async def aggregate_learning_data(
    company_id: Optional[str] = None,
    days_back: int = 1,
) -> dict:
    """
    Führt die Aggregation der Learning-Daten durch.
    
    Args:
        company_id: Optional - nur diese Company. None = alle
        days_back: Wie viele Tage zurück aggregieren (default: 1 = gestern)
        
    Returns:
        Stats über die Aggregation
    """
    from ..db.supabase import get_supabase_client
    from ..services.learning.service import LearningService
    from ..services.analytics.top_templates import TopTemplatesService
    from ..api.schemas.learning import AggregateType
    
    db = get_supabase_client()
    learning_service = LearningService(db)
    templates_service = TopTemplatesService(db)
    
    stats = {
        "companies_processed": 0,
        "daily_aggregates_created": 0,
        "weekly_aggregates_created": 0,
        "template_scores_updated": 0,
        "errors": [],
    }
    
    # Companies laden
    if company_id:
        companies = [{"id": company_id}]
    else:
        result = db.table("companies").select("id").execute()
        companies = result.data or []
    
    today = date.today()
    
    for company in companies:
        cid = company["id"]
        
        try:
            # ─────────────────────────────────────────────────────────────
            # 1. Tägliche Aggregationen für die letzten N Tage
            # ─────────────────────────────────────────────────────────────
            for i in range(days_back):
                target_date = today - timedelta(days=i+1)  # Gestern, vorgestern, etc.
                
                await learning_service.compute_aggregate(
                    company_id=cid,
                    aggregate_type=AggregateType.daily,
                    period_start=target_date,
                    period_end=target_date,
                )
                stats["daily_aggregates_created"] += 1
            
            # ─────────────────────────────────────────────────────────────
            # 2. Wöchentliche Aggregation (jeden Montag)
            # ─────────────────────────────────────────────────────────────
            if today.weekday() == 0:  # Montag
                week_start = today - timedelta(days=7)
                week_end = today - timedelta(days=1)
                
                await learning_service.compute_aggregate(
                    company_id=cid,
                    aggregate_type=AggregateType.weekly,
                    period_start=week_start,
                    period_end=week_end,
                )
                stats["weekly_aggregates_created"] += 1
            
            # ─────────────────────────────────────────────────────────────
            # 3. Template Performance Scores aktualisieren
            # ─────────────────────────────────────────────────────────────
            updated = await templates_service.update_template_scores(cid)
            stats["template_scores_updated"] += updated
            
            # ─────────────────────────────────────────────────────────────
            # 4. 30-Tage Rolling Stats updaten
            # ─────────────────────────────────────────────────────────────
            await _update_30d_stats(db, cid)
            
            stats["companies_processed"] += 1
            
        except Exception as e:
            stats["errors"].append({
                "company_id": cid,
                "error": str(e),
            })
            print(f"Error processing company {cid}: {e}")
    
    return stats


async def _update_30d_stats(db, company_id: str):
    """
    Aktualisiert die 30-Tage Rolling Stats für alle Templates.
    """
    from datetime import datetime
    
    thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()
    
    # Templates der Company laden
    templates_result = db.table("templates").select("id").eq(
        "company_id", company_id
    ).eq("is_active", True).execute()
    
    for t in (templates_result.data or []):
        template_id = t["id"]
        
        # Events der letzten 30 Tage für dieses Template
        events_result = db.table("learning_events").select(
            "response_received, converted_to_next_stage"
        ).eq("template_id", template_id).gte(
            "created_at", thirty_days_ago
        ).execute()
        
        events = events_result.data or []
        
        if not events:
            continue
        
        uses = len(events)
        responses = sum(1 for e in events if e.get("response_received"))
        conversions = sum(1 for e in events if e.get("converted_to_next_stage"))
        
        response_rate = (responses / uses * 100) if uses > 0 else 0
        conversion_rate = (conversions / uses * 100) if uses > 0 else 0
        
        # Update template_performance
        db.table("template_performance").update({
            "uses_last_30d": uses,
            "responses_last_30d": responses,
            "conversions_last_30d": conversions,
            "response_rate_30d": round(response_rate, 2),
            "conversion_rate_30d": round(conversion_rate, 2),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("template_id", template_id).execute()


async def cleanup_old_aggregates(days_to_keep: int = 90):
    """
    Löscht alte tägliche Aggregationen.
    
    Wöchentliche/monatliche werden behalten.
    """
    from ..db.supabase import get_supabase_client
    
    db = get_supabase_client()
    cutoff = (date.today() - timedelta(days=days_to_keep)).isoformat()
    
    result = db.table("learning_aggregates").delete().eq(
        "aggregate_type", "daily"
    ).lt("period_end", cutoff).execute()
    
    return len(result.data or [])


# ═══════════════════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """CLI Entry Point für Cronjob."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Aggregate Learning Data")
    parser.add_argument("--company", type=str, help="Company ID (optional)")
    parser.add_argument("--days", type=int, default=1, help="Days to aggregate back")
    parser.add_argument("--cleanup", action="store_true", help="Cleanup old aggregates")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("SALES FLOW AI - LEARNING AGGREGATION JOB")
    print("=" * 60)
    print(f"Date: {date.today().isoformat()}")
    print(f"Company: {args.company or 'ALL'}")
    print(f"Days back: {args.days}")
    print()
    
    # Aggregation ausführen
    stats = asyncio.run(aggregate_learning_data(
        company_id=args.company,
        days_back=args.days,
    ))
    
    print("Results:")
    print(f"  - Companies processed: {stats['companies_processed']}")
    print(f"  - Daily aggregates: {stats['daily_aggregates_created']}")
    print(f"  - Weekly aggregates: {stats['weekly_aggregates_created']}")
    print(f"  - Template scores updated: {stats['template_scores_updated']}")
    
    if stats["errors"]:
        print(f"  - Errors: {len(stats['errors'])}")
        for err in stats["errors"]:
            print(f"    - {err['company_id']}: {err['error']}")
    
    # Cleanup wenn gewünscht
    if args.cleanup:
        print()
        print("Cleaning up old aggregates...")
        deleted = asyncio.run(cleanup_old_aggregates())
        print(f"  - Deleted {deleted} old daily aggregates")
    
    print()
    print("Done! ✅")


if __name__ == "__main__":
    main()
