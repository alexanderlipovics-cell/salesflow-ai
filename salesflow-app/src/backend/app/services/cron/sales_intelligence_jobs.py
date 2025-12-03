"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES INTELLIGENCE CRON JOBS                                              ║
║  Scheduled Tasks für Daily Aggregation und A/B Test Management            ║
╚════════════════════════════════════════════════════════════════════════════╝

Jobs:
1. daily_effectiveness_aggregation - Täglich um 02:00 UTC
2. ab_test_winner_check - Stündlich
3. momentum_signal_cleanup - Wöchentlich
"""

import asyncio
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from supabase import Client
import math

# In Production: Use APScheduler or Celery
# from apscheduler.schedulers.asyncio import AsyncIOScheduler


# =============================================================================
# DAILY EFFECTIVENESS AGGREGATION
# =============================================================================

async def aggregate_daily_effectiveness(
    supabase: Client,
    target_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Aggregiert tägliche Effectiveness-Metriken für alle User.
    
    Sollte täglich um 02:00 UTC laufen für den Vortag.
    
    Args:
        supabase: Supabase Client
        target_date: Datum für Aggregation (default: gestern)
        
    Returns:
        Zusammenfassung der Aggregation
    """
    target = target_date or (date.today() - timedelta(days=1))
    
    results = {
        "date": target.isoformat(),
        "users_processed": 0,
        "frameworks_tracked": 0,
        "total_deals": 0,
        "errors": [],
    }
    
    try:
        # 1. Alle User mit Framework-Usage am Zieldatum finden
        usage_result = supabase.table("deal_framework_usage").select(
            "user_id"
        ).gte(
            "started_at", target.isoformat()
        ).lt(
            "started_at", (target + timedelta(days=1)).isoformat()
        ).execute()
        
        if not usage_result.data:
            results["message"] = "Keine Daten für diesen Tag"
            return results
        
        # Unique Users
        user_ids = list(set(row["user_id"] for row in usage_result.data))
        results["users_processed"] = len(user_ids)
        
        # 2. Für jeden User aggregieren
        for user_id in user_ids:
            try:
                # Framework Stats
                framework_usage = supabase.table("deal_framework_usage").select(
                    "framework, outcome, deal_value, days_to_close, buyer_type, industry"
                ).eq("user_id", user_id).gte(
                    "started_at", target.isoformat()
                ).lt(
                    "started_at", (target + timedelta(days=1)).isoformat()
                ).execute()
                
                if not framework_usage.data:
                    continue
                
                # Framework Stats aggregieren
                framework_stats = {}
                buyer_type_stats = {}
                industry_stats = {}
                
                total_deals = 0
                total_conversions = 0
                total_value = 0
                
                for row in framework_usage.data:
                    fw = row["framework"]
                    outcome = row["outcome"]
                    value = row.get("deal_value") or 0
                    days = row.get("days_to_close")
                    bt = row.get("buyer_type")
                    ind = row.get("industry")
                    
                    # Framework Stats
                    if fw not in framework_stats:
                        framework_stats[fw] = {
                            "uses": 0, "conversions": 0, 
                            "total_value": 0, "total_days": 0, "days_count": 0
                        }
                    
                    framework_stats[fw]["uses"] += 1
                    if outcome == "won":
                        framework_stats[fw]["conversions"] += 1
                        framework_stats[fw]["total_value"] += value
                        total_conversions += 1
                        total_value += value
                        if days:
                            framework_stats[fw]["total_days"] += days
                            framework_stats[fw]["days_count"] += 1
                    
                    total_deals += 1
                    
                    # Buyer Type Stats
                    if bt:
                        if bt not in buyer_type_stats:
                            buyer_type_stats[bt] = {"leads": 0, "conversions": 0}
                        buyer_type_stats[bt]["leads"] += 1
                        if outcome == "won":
                            buyer_type_stats[bt]["conversions"] += 1
                    
                    # Industry Stats
                    if ind:
                        if ind not in industry_stats:
                            industry_stats[ind] = {"deals": 0, "conversions": 0}
                        industry_stats[ind]["deals"] += 1
                        if outcome == "won":
                            industry_stats[ind]["conversions"] += 1
                
                # Averages berechnen
                for fw, stats in framework_stats.items():
                    if stats["conversions"] > 0:
                        stats["avg_value"] = stats["total_value"] / stats["conversions"]
                    else:
                        stats["avg_value"] = 0
                    
                    if stats["days_count"] > 0:
                        stats["avg_days"] = stats["total_days"] / stats["days_count"]
                    else:
                        stats["avg_days"] = 0
                    
                    # Cleanup
                    del stats["total_value"]
                    del stats["total_days"]
                    del stats["days_count"]
                
                # 3. In DB speichern (Upsert)
                supabase.table("framework_effectiveness_daily").upsert({
                    "user_id": user_id,
                    "date": target.isoformat(),
                    "framework_stats": framework_stats,
                    "buyer_type_stats": buyer_type_stats,
                    "industry_stats": industry_stats,
                    "total_deals": total_deals,
                    "total_conversions": total_conversions,
                    "total_value": total_value,
                }, on_conflict="user_id,date").execute()
                
                results["frameworks_tracked"] += len(framework_stats)
                results["total_deals"] += total_deals
                
            except Exception as e:
                results["errors"].append(f"User {user_id}: {str(e)}")
        
        results["success"] = True
        
    except Exception as e:
        results["success"] = False
        results["error"] = str(e)
    
    return results


# =============================================================================
# A/B TEST WINNER CHECK
# =============================================================================

def calculate_statistical_significance(
    n1: int, c1: int,
    n2: int, c2: int,
) -> float:
    """
    Berechnet statistische Signifikanz zwischen zwei Varianten.
    Vereinfachter Z-Test für Proportionen.
    
    Args:
        n1: Sample Size Variante A
        c1: Conversions Variante A
        n2: Sample Size Variante B
        c2: Conversions Variante B
        
    Returns:
        Signifikanz-Level (0-1)
    """
    if n1 < 10 or n2 < 10:
        return 0.0
    
    p1 = c1 / n1
    p2 = c2 / n2
    
    # Pooled Proportion
    p_pool = (c1 + c2) / (n1 + n2)
    
    # Standard Error
    if p_pool == 0 or p_pool == 1:
        return 0.0
    
    se = math.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
    
    if se == 0:
        return 0.0
    
    # Z-Score
    z = abs(p1 - p2) / se
    
    # Approximate p-value to confidence
    # Z = 1.96 → 95% confidence
    # Z = 2.58 → 99% confidence
    if z >= 2.58:
        return 0.99
    elif z >= 1.96:
        return 0.95
    elif z >= 1.645:
        return 0.90
    elif z >= 1.28:
        return 0.80
    else:
        return min(z / 1.96 * 0.80, 0.79)


async def check_ab_test_winners(
    supabase: Client,
    min_sample_size: int = 30,
    significance_threshold: float = 0.95,
) -> Dict[str, Any]:
    """
    Prüft laufende A/B Tests auf statistische Signifikanz und ermittelt Winner.
    
    Sollte stündlich laufen.
    
    Args:
        supabase: Supabase Client
        min_sample_size: Minimale Sample Size pro Variante
        significance_threshold: Signifikanz-Schwelle für Winner
        
    Returns:
        Zusammenfassung der Prüfung
    """
    results = {
        "tests_checked": 0,
        "winners_found": 0,
        "tests_completed": [],
        "errors": [],
    }
    
    try:
        # 1. Alle laufenden Tests laden
        running_tests = supabase.table("ab_tests").select("*").eq(
            "status", "running"
        ).execute()
        
        if not running_tests.data:
            results["message"] = "Keine laufenden Tests"
            return results
        
        results["tests_checked"] = len(running_tests.data)
        
        # 2. Jeden Test prüfen
        for test in running_tests.data:
            test_id = test["id"]
            
            n_a = test["variant_a_count"]
            c_a = test["variant_a_conversions"]
            n_b = test["variant_b_count"]
            c_b = test["variant_b_conversions"]
            
            # Minimum Sample Size prüfen
            if n_a < min_sample_size or n_b < min_sample_size:
                continue
            
            # Signifikanz berechnen
            significance = calculate_statistical_significance(n_a, c_a, n_b, c_b)
            
            # Rates berechnen
            rate_a = c_a / n_a if n_a > 0 else 0
            rate_b = c_b / n_b if n_b > 0 else 0
            
            # Winner bestimmen
            winner = None
            if significance >= significance_threshold:
                if abs(rate_a - rate_b) >= 0.05:  # Mindestens 5% Unterschied
                    winner = "a" if rate_a > rate_b else "b"
            
            # Update Test
            update_data = {
                "statistical_significance": significance,
                "updated_at": datetime.now().isoformat(),
            }
            
            if winner:
                update_data["winner"] = winner
                update_data["status"] = "completed"
                update_data["completed_at"] = datetime.now().isoformat()
                
                results["winners_found"] += 1
                results["tests_completed"].append({
                    "test_id": test_id,
                    "name": test["name"],
                    "winner": winner,
                    "winner_variant": test[f"variant_{winner}"],
                    "significance": significance,
                    "rate_a": rate_a,
                    "rate_b": rate_b,
                })
            
            try:
                supabase.table("ab_tests").update(update_data).eq(
                    "id", test_id
                ).execute()
            except Exception as e:
                results["errors"].append(f"Test {test_id}: {str(e)}")
        
        results["success"] = True
        
    except Exception as e:
        results["success"] = False
        results["error"] = str(e)
    
    return results


# =============================================================================
# MOMENTUM SIGNAL CLEANUP
# =============================================================================

async def cleanup_old_momentum_signals(
    supabase: Client,
    days_to_keep: int = 90,
) -> Dict[str, Any]:
    """
    Löscht alte Momentum Signals.
    
    Sollte wöchentlich laufen.
    
    Args:
        supabase: Supabase Client
        days_to_keep: Tage die behalten werden sollen
        
    Returns:
        Zusammenfassung
    """
    results = {
        "deleted_count": 0,
        "cutoff_date": None,
    }
    
    try:
        cutoff = datetime.now() - timedelta(days=days_to_keep)
        results["cutoff_date"] = cutoff.isoformat()
        
        # Alte Signale löschen
        delete_result = supabase.table("deal_momentum_signals").delete().lt(
            "detected_at", cutoff.isoformat()
        ).execute()
        
        # Count ist nicht direkt verfügbar, aber wir können es abschätzen
        results["success"] = True
        results["message"] = f"Signale älter als {cutoff.date()} gelöscht"
        
    except Exception as e:
        results["success"] = False
        results["error"] = str(e)
    
    return results


# =============================================================================
# AUTO-ARCHIVE STALE AB TESTS
# =============================================================================

async def archive_stale_ab_tests(
    supabase: Client,
    inactive_days: int = 30,
) -> Dict[str, Any]:
    """
    Pausiert A/B Tests die länger als X Tage keine neuen Results haben.
    
    Sollte täglich laufen.
    
    Args:
        supabase: Supabase Client
        inactive_days: Tage ohne Activity
        
    Returns:
        Zusammenfassung
    """
    results = {
        "tests_archived": 0,
        "archived_ids": [],
    }
    
    try:
        cutoff = datetime.now() - timedelta(days=inactive_days)
        
        # Laufende Tests die seit X Tagen nicht updated wurden
        stale_tests = supabase.table("ab_tests").select("id, name").eq(
            "status", "running"
        ).lt(
            "updated_at", cutoff.isoformat()
        ).execute()
        
        if not stale_tests.data:
            results["message"] = "Keine stale Tests gefunden"
            return results
        
        # Pausieren
        for test in stale_tests.data:
            try:
                supabase.table("ab_tests").update({
                    "status": "paused",
                    "updated_at": datetime.now().isoformat(),
                }).eq("id", test["id"]).execute()
                
                results["tests_archived"] += 1
                results["archived_ids"].append(test["id"])
            except Exception as e:
                pass
        
        results["success"] = True
        
    except Exception as e:
        results["success"] = False
        results["error"] = str(e)
    
    return results


# =============================================================================
# JOB SCHEDULER (Example with APScheduler)
# =============================================================================

def setup_sales_intelligence_jobs(supabase: Client):
    """
    Richtet die Cron Jobs ein (Example mit APScheduler).
    
    In Production würde dies z.B. so konfiguriert:
    - Daily Aggregation: 02:00 UTC
    - AB Test Check: Jede Stunde
    - Momentum Cleanup: Sonntag 03:00 UTC
    - Stale Test Archive: 04:00 UTC
    """
    # Example APScheduler setup (commented out as APScheduler may not be installed)
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    
    scheduler = AsyncIOScheduler()
    
    # Daily Effectiveness Aggregation - 02:00 UTC
    scheduler.add_job(
        aggregate_daily_effectiveness,
        CronTrigger(hour=2, minute=0),
        args=[supabase],
        id="daily_effectiveness_aggregation",
        name="Daily Effectiveness Aggregation",
        replace_existing=True,
    )
    
    # A/B Test Winner Check - Every hour
    scheduler.add_job(
        check_ab_test_winners,
        CronTrigger(minute=0),  # Every hour at :00
        args=[supabase],
        id="ab_test_winner_check",
        name="A/B Test Winner Check",
        replace_existing=True,
    )
    
    # Momentum Signal Cleanup - Sunday 03:00 UTC
    scheduler.add_job(
        cleanup_old_momentum_signals,
        CronTrigger(day_of_week="sun", hour=3, minute=0),
        args=[supabase],
        id="momentum_signal_cleanup",
        name="Momentum Signal Cleanup",
        replace_existing=True,
    )
    
    # Archive Stale Tests - Daily 04:00 UTC
    scheduler.add_job(
        archive_stale_ab_tests,
        CronTrigger(hour=4, minute=0),
        args=[supabase],
        id="archive_stale_ab_tests",
        name="Archive Stale A/B Tests",
        replace_existing=True,
    )
    
    scheduler.start()
    return scheduler
    """
    pass


# =============================================================================
# MANUAL TRIGGER ENDPOINTS (for testing or manual runs)
# =============================================================================

async def run_all_jobs_manually(supabase: Client) -> Dict[str, Any]:
    """
    Führt alle Jobs manuell aus (für Testing).
    """
    results = {}
    
    results["effectiveness"] = await aggregate_daily_effectiveness(supabase)
    results["ab_tests"] = await check_ab_test_winners(supabase)
    results["cleanup"] = await cleanup_old_momentum_signals(supabase)
    results["archive"] = await archive_stale_ab_tests(supabase)
    
    return results


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "aggregate_daily_effectiveness",
    "check_ab_test_winners",
    "cleanup_old_momentum_signals",
    "archive_stale_ab_tests",
    "setup_sales_intelligence_jobs",
    "run_all_jobs_manually",
    "calculate_statistical_significance",
]

