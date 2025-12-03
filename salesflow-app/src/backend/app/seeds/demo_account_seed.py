"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DEMO ACCOUNT SEED                                                         ║
║  Erstellt einen Demo-Account mit vollständigen Sample-Daten                ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieser Demo-Account kann für Präsentationen, Tests und Demos verwendet werden.

Usage:
    python -c "from app.seeds.demo_account_seed import create_demo_account; create_demo_account()"
"""

import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from uuid import uuid4

try:
    from supabase import create_client, Client
except ImportError:
    print("⚠️ Supabase not installed. Run: pip install supabase")
    exit(1)


# =============================================================================
# DEMO ACCOUNT CONFIGURATION
# =============================================================================

DEMO_COMPANY = {
    "id": "demo-company-zinzino-001",
    "name": "Zinzino Demo Team",
    "vertical": "network_marketing",
    "sub_vertical": "health_supplements",
    "logo_url": None,
    "primary_color": "#22C55E",
    "plan": "team",
    "is_demo": True,
}

DEMO_USER = {
    "id": "demo-user-001",
    "email": "demo@salesflow.ai",
    "full_name": "Demo User",
    "role": "team_leader",
    "company_id": DEMO_COMPANY["id"],
}

DEMO_CONTACTS = [
    {
        "name": "Max Müller",
        "email": "max@example.com",
        "phone": "+49 170 1234567",
        "status": "warm_lead",
        "source": "referral",
        "notes": "Interessiert an Omega-3, skeptisch wegen MLM",
        "disc_profile": "C",  # Analytiker
        "tags": ["skeptiker", "daten-fokussiert"],
    },
    {
        "name": "Anna Schmidt",
        "email": "anna@example.com",
        "phone": "+49 171 2345678",
        "status": "hot_lead",
        "source": "social_media",
        "notes": "Sehr begeistert, will auch Business machen",
        "disc_profile": "I",  # Influencer
        "tags": ["enthusiastisch", "business-interesse"],
    },
    {
        "name": "Thomas Weber",
        "email": "thomas@example.com",
        "phone": "+49 172 3456789",
        "status": "cold_lead",
        "source": "cold_outreach",
        "notes": "Hat bereits Omega-3 von Amazon",
        "disc_profile": "D",  # Dominant
        "tags": ["preis-sensitiv", "konkurrenz"],
    },
    {
        "name": "Lisa Bauer",
        "email": "lisa@example.com",
        "phone": "+49 173 4567890",
        "status": "customer",
        "source": "event",
        "notes": "Zufriedene Kundin seit 6 Monaten, Balance verbessert",
        "disc_profile": "S",  # Steady
        "tags": ["bestandskunde", "zufrieden"],
    },
    {
        "name": "Peter Hoffmann",
        "email": "peter@example.com",
        "phone": "+49 174 5678901",
        "status": "partner",
        "source": "referral",
        "notes": "Aktiver Partner, baut Team auf",
        "disc_profile": "D",
        "tags": ["partner", "aktiv"],
    },
]

DEMO_ACTIVITIES = [
    {"type": "call", "contact": "Max Müller", "outcome": "callback_scheduled", "notes": "Will Studien sehen"},
    {"type": "message", "contact": "Anna Schmidt", "outcome": "positive_response", "notes": "Startet nächste Woche"},
    {"type": "call", "contact": "Thomas Weber", "outcome": "objection", "notes": "Zu teuer - Follow-up nötig"},
    {"type": "meeting", "contact": "Lisa Bauer", "outcome": "upsell", "notes": "Interesse an Zinobiotic"},
    {"type": "call", "contact": "Peter Hoffmann", "outcome": "team_support", "notes": "Braucht Hilfe bei Einwänden"},
]

DEMO_GOALS = {
    "monthly_revenue": 5000,
    "new_customers": 10,
    "new_partners": 2,
    "calls_per_day": 5,
    "follow_ups_per_day": 3,
}


# =============================================================================
# SEED FUNCTIONS
# =============================================================================

def get_supabase_client() -> Client:
    """Erstellt einen Supabase Client."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL und SUPABASE_KEY müssen gesetzt sein!")
    
    return create_client(url, key)


def create_demo_company(db: Client) -> Dict[str, Any]:
    """Erstellt die Demo-Company."""
    print("📦 Erstelle Demo-Company...")
    
    # Prüfen ob bereits existiert
    existing = db.table("companies").select("id").eq("id", DEMO_COMPANY["id"]).execute()
    if existing.data:
        print(f"   ✓ Company existiert bereits: {DEMO_COMPANY['id']}")
        return existing.data[0]
    
    result = db.table("companies").insert({
        "id": DEMO_COMPANY["id"],
        "name": DEMO_COMPANY["name"],
        "vertical": DEMO_COMPANY["vertical"],
        "sub_vertical": DEMO_COMPANY["sub_vertical"],
        "plan": DEMO_COMPANY["plan"],
        "settings": {
            "is_demo": True,
            "primary_color": DEMO_COMPANY["primary_color"],
        },
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    
    print(f"   ✓ Company erstellt: {DEMO_COMPANY['name']}")
    return result.data[0] if result.data else None


def create_demo_user(db: Client) -> Dict[str, Any]:
    """Erstellt den Demo-User."""
    print("👤 Erstelle Demo-User...")
    
    # Prüfen ob bereits existiert (in profiles)
    existing = db.table("profiles").select("id").eq("email", DEMO_USER["email"]).execute()
    if existing.data:
        print(f"   ✓ User existiert bereits: {DEMO_USER['email']}")
        return existing.data[0]
    
    # Profile erstellen (User in Auth muss separat erstellt werden!)
    result = db.table("profiles").insert({
        "id": str(uuid4()),  # Neue UUID da wir keinen Auth-User haben
        "email": DEMO_USER["email"],
        "full_name": DEMO_USER["full_name"],
        "role": DEMO_USER["role"],
        "company_id": DEMO_COMPANY["id"],
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    
    print(f"   ✓ User-Profil erstellt: {DEMO_USER['full_name']}")
    return result.data[0] if result.data else None


def create_demo_contacts(db: Client, user_id: str) -> int:
    """Erstellt Demo-Kontakte."""
    print("👥 Erstelle Demo-Kontakte...")
    
    count = 0
    for contact in DEMO_CONTACTS:
        try:
            db.table("contacts").insert({
                "id": str(uuid4()),
                "user_id": user_id,
                "company_id": DEMO_COMPANY["id"],
                "name": contact["name"],
                "email": contact["email"],
                "phone": contact["phone"],
                "status": contact["status"],
                "source": contact["source"],
                "notes": contact["notes"],
                "metadata": {
                    "disc_profile": contact.get("disc_profile"),
                    "tags": contact.get("tags", []),
                },
                "created_at": (datetime.utcnow() - timedelta(days=30 - count * 5)).isoformat(),
            }).execute()
            count += 1
            print(f"   ✓ Kontakt: {contact['name']}")
        except Exception as e:
            print(f"   ⚠️ Fehler bei {contact['name']}: {e}")
    
    return count


def create_demo_activities(db: Client, user_id: str) -> int:
    """Erstellt Demo-Aktivitäten."""
    print("📞 Erstelle Demo-Aktivitäten...")
    
    count = 0
    for i, activity in enumerate(DEMO_ACTIVITIES):
        try:
            db.table("activities").insert({
                "id": str(uuid4()),
                "user_id": user_id,
                "company_id": DEMO_COMPANY["id"],
                "activity_type": activity["type"],
                "outcome": activity["outcome"],
                "notes": f"{activity['contact']}: {activity['notes']}",
                "created_at": (datetime.utcnow() - timedelta(days=i)).isoformat(),
            }).execute()
            count += 1
            print(f"   ✓ Aktivität: {activity['type']} - {activity['contact']}")
        except Exception as e:
            print(f"   ⚠️ Fehler: {e}")
    
    return count


def create_demo_goals(db: Client, user_id: str) -> bool:
    """Erstellt Demo-Ziele."""
    print("🎯 Erstelle Demo-Ziele...")
    
    try:
        db.table("user_goals").insert({
            "id": str(uuid4()),
            "user_id": user_id,
            "company_id": DEMO_COMPANY["id"],
            "monthly_revenue_target": DEMO_GOALS["monthly_revenue"],
            "new_customers_target": DEMO_GOALS["new_customers"],
            "new_partners_target": DEMO_GOALS["new_partners"],
            "daily_calls_target": DEMO_GOALS["calls_per_day"],
            "daily_follow_ups_target": DEMO_GOALS["follow_ups_per_day"],
            "month": datetime.utcnow().strftime("%Y-%m"),
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
        print("   ✓ Ziele erstellt")
        return True
    except Exception as e:
        print(f"   ⚠️ Fehler bei Zielen: {e}")
        return False


def seed_demo_live_assist(db: Client) -> Dict[str, int]:
    """Lädt die Zinzino Live Assist Daten für den Demo-Account."""
    print("🤖 Lade Live Assist Daten...")
    
    try:
        from .zinzino_live_assist_seed import seed_zinzino_live_assist
        return seed_zinzino_live_assist(db, DEMO_COMPANY["id"])
    except Exception as e:
        print(f"   ⚠️ Fehler bei Live Assist Daten: {e}")
        return {"quick_facts": 0, "objection_responses": 0, "vertical_knowledge": 0}


# =============================================================================
# MAIN FUNCTION
# =============================================================================

def create_demo_account(
    seed_live_assist: bool = True,
    seed_contacts: bool = True,
    seed_activities: bool = True,
    seed_goals: bool = True,
) -> Dict[str, Any]:
    """
    Erstellt einen vollständigen Demo-Account.
    
    Args:
        seed_live_assist: Live Assist Daten seeden
        seed_contacts: Demo-Kontakte erstellen
        seed_activities: Demo-Aktivitäten erstellen
        seed_goals: Demo-Ziele erstellen
    
    Returns:
        Summary der erstellten Daten
    """
    print("\n" + "═" * 60)
    print("🚀 DEMO ACCOUNT SEED STARTEN")
    print("═" * 60 + "\n")
    
    results = {
        "company": None,
        "user": None,
        "contacts": 0,
        "activities": 0,
        "goals": False,
        "live_assist": {},
    }
    
    try:
        db = get_supabase_client()
        
        # 1. Company erstellen
        company = create_demo_company(db)
        results["company"] = company
        
        # 2. User erstellen
        user = create_demo_user(db)
        results["user"] = user
        user_id = user["id"] if user else None
        
        if not user_id:
            print("❌ User konnte nicht erstellt werden!")
            return results
        
        # 3. Kontakte erstellen
        if seed_contacts:
            results["contacts"] = create_demo_contacts(db, user_id)
        
        # 4. Aktivitäten erstellen
        if seed_activities:
            results["activities"] = create_demo_activities(db, user_id)
        
        # 5. Ziele erstellen
        if seed_goals:
            results["goals"] = create_demo_goals(db, user_id)
        
        # 6. Live Assist Daten
        if seed_live_assist:
            results["live_assist"] = seed_demo_live_assist(db)
        
        print("\n" + "═" * 60)
        print("✅ DEMO ACCOUNT ERSTELLT!")
        print("═" * 60)
        print(f"""
📧 Login:       {DEMO_USER['email']}
🏢 Company:     {DEMO_COMPANY['name']}
👥 Kontakte:    {results['contacts']}
📞 Aktivitäten: {results['activities']}
🎯 Ziele:       {'✓' if results['goals'] else '✗'}
🤖 Live Assist: {sum(results['live_assist'].values())} Einträge

Hinweis: Für echten Login muss ein Auth-User in Supabase erstellt werden!
""")
        
        return results
        
    except Exception as e:
        print(f"\n❌ FEHLER: {e}")
        return results


def delete_demo_account() -> bool:
    """Löscht den Demo-Account und alle zugehörigen Daten."""
    print("\n" + "═" * 60)
    print("🗑️ DEMO ACCOUNT LÖSCHEN")
    print("═" * 60 + "\n")
    
    try:
        db = get_supabase_client()
        
        # Reihenfolge wichtig wegen Foreign Keys!
        tables = [
            ("activities", "company_id"),
            ("contacts", "company_id"),
            ("user_goals", "company_id"),
            ("live_assist_sessions", "company_id"),
            ("live_assist_queries", "company_id"),
            ("quick_facts", "company_id"),
            ("objection_responses", "company_id"),
            ("profiles", "company_id"),
            ("companies", "id"),
        ]
        
        for table, column in tables:
            try:
                if table == "companies":
                    db.table(table).delete().eq(column, DEMO_COMPANY["id"]).execute()
                else:
                    db.table(table).delete().eq(column, DEMO_COMPANY["id"]).execute()
                print(f"   ✓ {table} gelöscht")
            except Exception as e:
                print(f"   ⚠️ {table}: {e}")
        
        print("\n✅ Demo-Account gelöscht!")
        return True
        
    except Exception as e:
        print(f"\n❌ FEHLER: {e}")
        return False


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--delete":
        delete_demo_account()
    else:
        create_demo_account()

