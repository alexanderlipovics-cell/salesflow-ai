#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  WORKFLOW AUTOMATION JOB                                                   ║
║  Automatisierte Workflows für wiederkehrende Aufgaben                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Automatisierungen:
1. Recurring Transactions - Wiederkehrende Buchungen erstellen
2. Snooze Reactivation - Gesnoozete Actions reaktivieren
3. Payment Check Reminders - Zahlungsprüfungs-Erinnerungen
4. Inactive Lead Alerts - Inaktive Leads markieren
5. Daily Flow Generation - Tägliche Actions generieren

Ausführung:
    # Alle Workflows (täglich um 00:05)
    5 0 * * * cd /path/to/backend && python -m app.jobs.workflow_automation all
    
    # Einzelne Workflows
    python -m app.jobs.workflow_automation recurring
    python -m app.jobs.workflow_automation snooze
    python -m app.jobs.workflow_automation payments
"""

import asyncio
from datetime import datetime, date, timedelta
import sys
import os
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.db.supabase import get_supabase


# =============================================================================
# RECURRING TRANSACTIONS
# =============================================================================

async def process_recurring_transactions():
    """
    Erstellt Transaktionen aus wiederkehrenden Buchungen.
    
    Prüft finance_recurring Tabelle und erstellt Transaktionen
    wenn next_run <= heute und is_active = true.
    """
    
    db = get_supabase()
    today = date.today()
    
    print(f"[Recurring] Processing for {today}")
    
    try:
        # Fällige Recurring-Einträge holen
        result = db.table("finance_recurring").select("*").eq(
            "is_active", True
        ).lte("next_run", today.isoformat()).execute()
        
        if not result.data:
            print("[Recurring] No due recurring transactions")
            return 0
        
        created = 0
        
        for recurring in result.data:
            try:
                # Transaction erstellen
                tx_data = {
                    "user_id": recurring["user_id"],
                    "amount": recurring["amount"],
                    "transaction_type": recurring["transaction_type"],
                    "category": recurring.get("category", "other_income" if recurring["transaction_type"] == "income" else "other_expense"),
                    "title": recurring["name"],
                    "transaction_date": today.isoformat(),
                    "period_month": today.month,
                    "period_year": today.year,
                    "source": "recurring",
                    "status": "confirmed",
                    "description": f"Auto-generiert aus: {recurring['name']}",
                }
                
                db.table("finance_transactions").insert(tx_data).execute()
                
                # Next Run berechnen
                frequency = recurring.get("frequency", "monthly")
                if frequency == "monthly":
                    next_run = today + timedelta(days=30)
                elif frequency == "quarterly":
                    next_run = today + timedelta(days=91)
                elif frequency == "yearly":
                    next_run = today + timedelta(days=365)
                else:
                    next_run = today + timedelta(days=30)
                
                # Recurring aktualisieren
                db.table("finance_recurring").update({
                    "last_run": today.isoformat(),
                    "next_run": next_run.isoformat(),
                }).eq("id", recurring["id"]).execute()
                
                created += 1
                print(f"  ✓ Created: {recurring['name']} ({recurring['amount']}€)")
                
            except Exception as e:
                print(f"  ✗ Error for {recurring['name']}: {e}")
        
        print(f"[Recurring] Created {created} transactions")
        return created
        
    except Exception as e:
        print(f"[Recurring] Error: {e}")
        return 0


# =============================================================================
# SNOOZE REACTIVATION
# =============================================================================

async def reactivate_snoozed_actions():
    """
    Reaktiviert gesnoozete Pending Actions wenn snoozed_until erreicht.
    """
    
    db = get_supabase()
    today = date.today()
    
    print(f"[Snooze] Processing for {today}")
    
    try:
        # Gesnoozete Actions mit erreichtem Datum
        result = db.table("lead_pending_actions").update({
            "status": "pending",
        }).eq("status", "snoozed").lte(
            "snoozed_until", today.isoformat()
        ).execute()
        
        count = len(result.data) if result.data else 0
        print(f"[Snooze] Reactivated {count} actions")
        return count
        
    except Exception as e:
        print(f"[Snooze] Error: {e}")
        return 0


# =============================================================================
# PAYMENT CHECK REMINDERS
# =============================================================================

async def create_payment_check_reminders():
    """
    Erstellt automatische Zahlungsprüfungs-Actions für Leads
    mit deal_state = 'pending_payment' die noch keine offene Action haben.
    """
    
    db = get_supabase()
    today = date.today()
    
    print(f"[Payments] Processing for {today}")
    
    try:
        # Leads mit pending_payment ohne offene check_payment Action
        leads_result = db.table("leads").select(
            "id, user_id, first_name, last_name, payment_expected_date, deal_amount"
        ).eq("deal_state", "pending_payment").execute()
        
        if not leads_result.data:
            print("[Payments] No pending payment leads")
            return 0
        
        created = 0
        
        for lead in leads_result.data:
            lead_id = lead["id"]
            user_id = lead["user_id"]
            
            # Prüfe ob bereits offene Action existiert
            existing = db.table("lead_pending_actions").select("id").eq(
                "lead_id", lead_id
            ).eq("action_type", "check_payment").eq("status", "pending").limit(1).execute()
            
            if existing.data:
                continue  # Bereits vorhanden
            
            # Berechne due_date
            if lead.get("payment_expected_date"):
                due_date = datetime.strptime(lead["payment_expected_date"], "%Y-%m-%d").date()
                # 2 Tage nach erwartetem Datum prüfen
                due_date = due_date + timedelta(days=2)
            else:
                # Default: heute + 3 Tage
                due_date = today + timedelta(days=3)
            
            # Nur erstellen wenn due_date in der Zukunft oder heute
            if due_date < today:
                due_date = today
            
            lead_name = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or "Lead"
            
            db.table("lead_pending_actions").insert({
                "lead_id": lead_id,
                "user_id": user_id,
                "action_type": "check_payment",
                "action_reason": f"Zahlung prüfen für {lead_name}",
                "due_date": due_date.isoformat(),
                "priority": 1,  # Hohe Priorität
                "status": "pending",
            }).execute()
            
            created += 1
            print(f"  ✓ Created check_payment for {lead_name} (due: {due_date})")
        
        print(f"[Payments] Created {created} payment check actions")
        return created
        
    except Exception as e:
        print(f"[Payments] Error: {e}")
        return 0


# =============================================================================
# INACTIVE LEAD ALERTS
# =============================================================================

async def mark_inactive_leads():
    """
    Markiert Leads als inaktiv wenn kein Kontakt seit X Tagen.
    Erstellt Reactivation-Actions.
    """
    
    db = get_supabase()
    today = date.today()
    inactive_threshold = today - timedelta(days=30)  # 30 Tage ohne Kontakt
    
    print(f"[Inactive] Processing for {today}")
    
    try:
        # Leads mit letztem Kontakt > 30 Tage, die noch nicht inaktiv sind
        leads_result = db.table("leads").select(
            "id, user_id, first_name, last_name, last_contact_at, status"
        ).lt(
            "last_contact_at", inactive_threshold.isoformat()
        ).not_.eq("status", "lost").not_.eq("status", "customer").execute()
        
        if not leads_result.data:
            print("[Inactive] No inactive leads found")
            return 0
        
        processed = 0
        
        for lead in leads_result.data:
            lead_id = lead["id"]
            user_id = lead["user_id"]
            
            # Prüfe ob bereits Reactivation-Action existiert
            existing = db.table("lead_pending_actions").select("id").eq(
                "lead_id", lead_id
            ).eq("action_type", "reactivation").eq("status", "pending").limit(1).execute()
            
            if existing.data:
                continue
            
            lead_name = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or "Lead"
            
            # Erstelle Reactivation-Action
            db.table("lead_pending_actions").insert({
                "lead_id": lead_id,
                "user_id": user_id,
                "action_type": "reactivation",
                "action_reason": f"Kein Kontakt seit 30+ Tagen",
                "due_date": today.isoformat(),
                "priority": 3,  # Niedrigere Priorität
                "status": "pending",
                "suggested_message": f"Hey {lead.get('first_name', '')}! Lange nichts gehört – wollte nur kurz nachfragen, wie es dir geht? 😊",
            }).execute()
            
            processed += 1
            print(f"  ✓ Created reactivation for {lead_name}")
        
        print(f"[Inactive] Created {processed} reactivation actions")
        return processed
        
    except Exception as e:
        print(f"[Inactive] Error: {e}")
        return 0


# =============================================================================
# DAILY FLOW PREPARATION
# =============================================================================

async def prepare_daily_flow():
    """
    Bereitet den Daily Flow für den nächsten Tag vor.
    
    - Erstellt Daily Flow Plan basierend auf Zielen
    - Priorisiert Leads für Aktionen
    - Generiert vorbereitete Actions
    """
    
    db = get_supabase()
    tomorrow = date.today() + timedelta(days=1)
    
    print(f"[DailyFlow] Preparing for {tomorrow}")
    
    try:
        # Hole alle aktiven User mit Goals
        users_result = db.table("company_goal_configs").select(
            "user_id, company_id, daily_new_contacts, daily_followups, daily_reactivations"
        ).eq("is_active", True).execute()
        
        if not users_result.data:
            print("[DailyFlow] No active goal configs")
            return 0
        
        prepared = 0
        
        for config in users_result.data:
            user_id = config["user_id"]
            company_id = config.get("company_id")
            
            try:
                # Prüfe ob Plan für morgen existiert
                existing = db.table("daily_flow_plans").select("id").eq(
                    "user_id", user_id
                ).eq("plan_date", tomorrow.isoformat()).limit(1).execute()
                
                if existing.data:
                    continue  # Bereits vorhanden
                
                # Erstelle Plan
                plan_data = {
                    "user_id": user_id,
                    "company_id": company_id,
                    "plan_date": tomorrow.isoformat(),
                    "planned_new_contacts": config.get("daily_new_contacts", 5),
                    "planned_followups": config.get("daily_followups", 10),
                    "planned_reactivations": config.get("daily_reactivations", 2),
                    "planned_actions_total": (
                        config.get("daily_new_contacts", 5) +
                        config.get("daily_followups", 10) +
                        config.get("daily_reactivations", 2)
                    ),
                    "status": "planned",
                }
                
                db.table("daily_flow_plans").insert(plan_data).execute()
                
                prepared += 1
                print(f"  ✓ Prepared plan for user {user_id}")
                
            except Exception as e:
                print(f"  ✗ Error for user {user_id}: {e}")
        
        print(f"[DailyFlow] Prepared {prepared} daily flow plans")
        return prepared
        
    except Exception as e:
        print(f"[DailyFlow] Error: {e}")
        return 0


# =============================================================================
# TAX RESERVE WARNINGS
# =============================================================================

async def check_tax_reserve_warnings():
    """
    Prüft ob Steuer-Reserve-Warnungen gesendet werden sollten.
    
    - Bei hohem Gewinn ohne ausreichende Reserve
    - Quartalsende-Erinnerungen
    """
    
    db = get_supabase()
    today = date.today()
    current_month = today.month
    
    # Quartalsende-Monate
    is_quarter_end = current_month in [3, 6, 9, 12] and today.day >= 25
    
    print(f"[TaxReserve] Processing for {today}")
    
    if not is_quarter_end:
        print("[TaxReserve] Not quarter end, skipping")
        return 0
    
    try:
        # User mit Steuerprofil holen
        profiles_result = db.table("finance_tax_profiles").select(
            "user_id, country, reserve_percentage"
        ).execute()
        
        if not profiles_result.data:
            print("[TaxReserve] No tax profiles")
            return 0
        
        warnings_sent = 0
        
        for profile in profiles_result.data:
            user_id = profile["user_id"]
            
            # Profit für aktuelles Jahr berechnen
            year_start = date(today.year, 1, 1)
            
            transactions = db.table("finance_transactions").select(
                "amount, transaction_type"
            ).eq("user_id", user_id).gte(
                "transaction_date", year_start.isoformat()
            ).eq("status", "confirmed").execute()
            
            if not transactions.data:
                continue
            
            income = sum(t["amount"] for t in transactions.data if t["transaction_type"] == "income")
            expenses = sum(t["amount"] for t in transactions.data if t["transaction_type"] == "expense")
            profit = income - expenses
            
            if profit > 5000:  # Nur bei relevantem Gewinn
                reserve_pct = profile.get("reserve_percentage", 25)
                recommended_reserve = profit * reserve_pct / 100
                
                # TODO: Push Notification senden
                print(f"  ⚠️ User {user_id}: Profit {profit:.0f}€, empfohlene Reserve: {recommended_reserve:.0f}€")
                warnings_sent += 1
        
        print(f"[TaxReserve] Sent {warnings_sent} warnings")
        return warnings_sent
        
    except Exception as e:
        print(f"[TaxReserve] Error: {e}")
        return 0


# =============================================================================
# MAIN RUNNER
# =============================================================================

async def run_all_workflows():
    """Führt alle Workflows aus."""
    
    print("=" * 60)
    print("SALES FLOW AI - WORKFLOW AUTOMATION")
    print("=" * 60)
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    results = {}
    
    # 1. Recurring Transactions
    print("\n[1/6] RECURRING TRANSACTIONS")
    print("-" * 40)
    results["recurring"] = await process_recurring_transactions()
    
    # 2. Snooze Reactivation
    print("\n[2/6] SNOOZE REACTIVATION")
    print("-" * 40)
    results["snooze"] = await reactivate_snoozed_actions()
    
    # 3. Payment Checks
    print("\n[3/6] PAYMENT CHECK REMINDERS")
    print("-" * 40)
    results["payments"] = await create_payment_check_reminders()
    
    # 4. Inactive Leads
    print("\n[4/6] INACTIVE LEAD ALERTS")
    print("-" * 40)
    results["inactive"] = await mark_inactive_leads()
    
    # 5. Daily Flow Prep
    print("\n[5/6] DAILY FLOW PREPARATION")
    print("-" * 40)
    results["daily_flow"] = await prepare_daily_flow()
    
    # 6. Tax Reserve Warnings
    print("\n[6/6] TAX RESERVE WARNINGS")
    print("-" * 40)
    results["tax_reserve"] = await check_tax_reserve_warnings()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for key, value in results.items():
        print(f"  {key}: {value}")
    print("=" * 60)
    
    return results


def main():
    """CLI Entry Point."""
    
    if len(sys.argv) < 2:
        print("Usage: python workflow_automation.py [all|recurring|snooze|payments|inactive|daily|tax]")
        sys.exit(1)
    
    mode = sys.argv[1].lower()
    
    if mode == "all":
        asyncio.run(run_all_workflows())
    elif mode == "recurring":
        asyncio.run(process_recurring_transactions())
    elif mode == "snooze":
        asyncio.run(reactivate_snoozed_actions())
    elif mode == "payments":
        asyncio.run(create_payment_check_reminders())
    elif mode == "inactive":
        asyncio.run(mark_inactive_leads())
    elif mode == "daily":
        asyncio.run(prepare_daily_flow())
    elif mode == "tax":
        asyncio.run(check_tax_reserve_warnings())
    else:
        print(f"Unknown mode: {mode}")
        sys.exit(1)


if __name__ == "__main__":
    main()

