"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GHOST BUSTER TEMPLATES SEED v2.1                                          ║
║  Bewährte Reaktivierungs-Texte für Ghosts                                  ║
║                                                                            ║
║  NEU v2.1:                                                                ║
║  - Soft vs Hard Ghost Tagging                                             ║
║  - Ghost-Typ-spezifische Templates                                        ║
║  - Erweiterte Targeting-Optionen                                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict, Any

# =============================================================================
# GHOST BUSTER TEMPLATES
# =============================================================================

GHOST_BUSTER_TEMPLATES: List[Dict[str, Any]] = [
    # ==========================================================================
    # HUMOR / PATTERN INTERRUPT - Für HARD Ghosts
    # ==========================================================================
    {
        "name": "Verschreckt?",
        "template_text": "Hey {name}, hab ich dich mit der letzten Nachricht komplett verschreckt? 😅",
        "template_text_short": "Hey, hab ich dich verschreckt?",
        "strategy": "ghost_buster",
        "tone": "humorous",
        "works_for_mood": ["positive", "neutral", "cautious"],
        "works_for_decision": ["undecided", "deferred"],
        "works_for_ghost_type": ["hard"],  # NEU v2.1
        "days_since_ghost": 3,
        "example_context": "Nach 2-3 Tagen Funkstille, wenn vorher Interesse da war. Pattern Interrupt für Hard Ghosts.",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Unter den Tisch gefallen",
        "template_text": "Hey {name}, ich glaub meine Nachricht ist unter den Tisch gefallen? 😊 Oder war ich zu aufdringlich?",
        "template_text_short": "Hey, ist meine Nachricht untergegangen?",
        "strategy": "ghost_buster",
        "tone": "humorous",
        "works_for_mood": ["positive", "neutral"],
        "works_for_decision": ["undecided", "deferred"],
        "works_for_ghost_type": ["soft", "hard"],  # NEU v2.1: Funktioniert für beide
        "days_since_ghost": 5,
        "example_context": "Nach 4-5 Tagen, selbstironisch",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "9-Word-Email",
        "template_text": "Hey {name}, bist du noch interessiert an {topic}?",
        "template_text_short": "Noch interessiert?",
        "strategy": "ghost_buster",
        "tone": "direct",
        "works_for_mood": ["neutral", "cautious", "stressed"],
        "works_for_decision": ["undecided", "leaning_no"],
        "works_for_ghost_type": ["hard"],  # NEU v2.1: Direkt für Hard Ghosts
        "days_since_ghost": 7,
        "example_context": "Klassiker - kurz, direkt, provoziert Ja/Nein. Ideal für Hard Ghosts.",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Lebenszeichen",
        "template_text": "Hey {name}! Lebst du noch? 😄 Wollte nur mal hören ob bei dir alles okay ist!",
        "template_text_short": "Lebst du noch?",
        "strategy": "ghost_buster",
        "tone": "humorous",
        "works_for_mood": ["positive", "neutral"],
        "works_for_decision": ["undecided", "deferred"],
        "works_for_ghost_type": ["hard"],  # NEU v2.1
        "days_since_ghost": 7,
        "example_context": "Nach einer Woche, lockerer Check-in. Pattern Interrupt für Hard Ghosts.",
        "is_system": True,
        "language": "de",
    },
    
    # ==========================================================================
    # TAKEAWAY / REVERSE PSYCHOLOGY - Für HARD Ghosts
    # ==========================================================================
    {
        "name": "Takeaway Soft",
        "template_text": "Hey {name}, ich merke das Timing passt gerade nicht. Kein Stress! Wenn sich was ändert, weißt du wo du mich findest 🙂",
        "template_text_short": "Timing passt nicht, meld dich wenn sich's ändert!",
        "strategy": "takeaway",
        "tone": "caring",
        "works_for_mood": ["stressed", "cautious"],
        "works_for_decision": ["deferred", "leaning_no"],
        "works_for_ghost_type": ["hard"],  # NEU v2.1: Takeaway für Hard Ghosts
        "days_since_ghost": 7,
        "example_context": "Druck rausnehmen bei Hard Ghosts, oft kommt dann doch eine Antwort",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Takeaway Direct",
        "template_text": "Hey {name}, ich will dich nicht nerven. Wenn's nichts für dich ist, sag einfach kurz Bescheid - ist völlig okay! 👍",
        "template_text_short": "Will nicht nerven, sag kurz Bescheid ob's passt",
        "strategy": "takeaway",
        "tone": "direct",
        "works_for_mood": ["neutral", "cautious", "skeptical"],
        "works_for_decision": ["undecided", "leaning_no"],
        "works_for_ghost_type": ["hard"],  # NEU v2.1
        "days_since_ghost": 10,
        "example_context": "Für Hard Ghosts die ewig schweigen - gibt ihnen einen Ausweg",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Letzter Versuch",
        "template_text": "Hey {name}, das ist wahrscheinlich meine letzte Nachricht 😊 Wenn du interessiert bist, meld dich - wenn nicht, alles gut! Wünsch dir alles Gute 🙏",
        "template_text_short": "Letzte Nachricht - meld dich wenn's passt!",
        "strategy": "takeaway",
        "tone": "caring",
        "works_for_mood": ["neutral", "cautious", "annoyed"],
        "works_for_decision": ["leaning_no", "rejected"],
        "works_for_ghost_type": ["hard"],  # NEU v2.1: Nur für Hard Ghosts
        "days_since_ghost": 14,
        "example_context": "Finale Nachricht für Hard Ghosts, würdevoller Abschluss",
        "is_system": True,
        "language": "de",
    },
    
    # ==========================================================================
    # VALUE ADD - Ideal für SOFT Ghosts
    # ==========================================================================
    {
        "name": "Mehrwert-Ping",
        "template_text": "Hey {name}, hab gerade an dich gedacht! Hier ein kurzer Artikel/Video zu {topic} der dir vielleicht hilft: {link}",
        "template_text_short": "Hab was Interessantes für dich gefunden!",
        "strategy": "value_add",
        "tone": "caring",
        "works_for_mood": ["positive", "neutral", "cautious"],
        "works_for_decision": ["undecided", "deferred"],
        "works_for_ghost_type": ["soft"],  # NEU v2.1: Ideal für Soft Ghosts
        "days_since_ghost": 5,
        "example_context": "Sanfter Ansatz für Soft Ghosts - Mehrwert ohne Verkaufsdruck, baut Vertrauen auf",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Success Story",
        "template_text": "Hey {name}, musste gerade an dich denken - ein Kunde von mir hatte genau die gleiche Situation wie du und hat jetzt {result}. Falls dich das interessiert, erzähl ich dir gern mehr! 😊",
        "template_text_short": "Hab ne Success Story die dich interessieren könnte!",
        "strategy": "value_add",
        "tone": "enthusiastic",
        "works_for_mood": ["positive", "neutral", "skeptical"],
        "works_for_decision": ["undecided", "leaning_no"],
        "works_for_ghost_type": ["soft", "hard"],  # NEU v2.1: Funktioniert für beide
        "days_since_ghost": 7,
        "example_context": "Social Proof ohne Druck - funktioniert bei beiden Ghost-Typen",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Quick Tip",
        "template_text": "Hey {name}! Kurzer Tipp der mir gerade eingefallen ist: {tip} - dachte das könnte dir helfen 💡",
        "template_text_short": "Kurzer Tipp für dich!",
        "strategy": "value_add",
        "tone": "helpful",
        "works_for_mood": ["positive", "neutral", "stressed"],
        "works_for_decision": ["undecided", "deferred"],
        "works_for_ghost_type": ["soft"],  # NEU v2.1: Ideal für Soft Ghosts
        "days_since_ghost": 4,
        "example_context": "Sanfter Ansatz für Soft Ghosts - Mehrwert, wirkt nicht verkäuferisch",
        "is_system": True,
        "language": "de",
    },
    
    # ==========================================================================
    # VOICE NOTE - Ideal für SOFT Ghosts
    # ==========================================================================
    {
        "name": "Voice Note Intro",
        "template_text": "[VOICE NOTE] Hey {name}, hier ist {my_name}! Wollte mich kurz persönlich melden weil ich gemerkt hab dass meine letzte Nachricht vielleicht untergegangen ist. Kein Stress, wollte nur hören ob bei dir alles klar ist und ob du noch Fragen hast. Meld dich einfach wenn du magst! Schönen Tag noch!",
        "template_text_short": "Kurze persönliche Sprachnachricht",
        "strategy": "voice_note",
        "tone": "warm",
        "works_for_mood": ["positive", "neutral", "stressed"],
        "works_for_decision": ["undecided", "deferred"],
        "works_for_ghost_type": ["soft"],  # NEU v2.1: Ideal für Soft Ghosts
        "days_since_ghost": 4,
        "example_context": "Voice Notes ideal für Soft Ghosts - persönlicher, sanfter Ansatz",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Voice Note Quick",
        "template_text": "[VOICE NOTE] Hey {name}! Kurze Sprachnachricht weil's persönlicher ist - wollte nur wissen ob du meine letzte Nachricht bekommen hast? Meld dich einfach kurz, würd mich freuen! 😊",
        "template_text_short": "Schnelle Voice Note",
        "strategy": "voice_note",
        "tone": "casual",
        "works_for_mood": ["positive", "neutral"],
        "works_for_decision": ["undecided"],
        "works_for_ghost_type": ["soft"],  # NEU v2.1: Ideal für Soft Ghosts
        "days_since_ghost": 3,
        "example_context": "Schneller Voice-Note Check-in für Soft Ghosts",
        "is_system": True,
        "language": "de",
    },
    
    # ==========================================================================
    # CROSS-CHANNEL - Funktioniert für beide Ghost-Typen
    # ==========================================================================
    {
        "name": "Instagram Comment",
        "template_text": "[COMMENT UNTER POST] Hey {name}! Hab dir eine DM geschickt, ist glaub ich im Spam gelandet 😅 Schau mal rein!",
        "template_text_short": "Kommentar: Check deine DMs!",
        "strategy": "cross_channel",
        "tone": "casual",
        "works_for_mood": ["unknown", "neutral"],
        "works_for_decision": ["undecided"],
        "works_for_ghost_type": ["soft", "hard"],  # NEU v2.1: Funktioniert für beide
        "days_since_ghost": 3,
        "example_context": "Wenn DM nicht gelesen wurde - Notification erzwingen (beide Ghost-Typen)",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Story Reply",
        "template_text": "[STORY REACTION] {reaction_to_story} - Übrigens, hab dir vor ein paar Tagen geschrieben, hast du's gesehen?",
        "template_text_short": "Story-Reaktion + DM-Reminder",
        "strategy": "story_reply",
        "tone": "casual",
        "works_for_mood": ["positive", "neutral"],
        "works_for_decision": ["undecided", "deferred"],
        "works_for_ghost_type": ["soft"],  # NEU v2.1: Sanfter Ansatz für Soft Ghosts
        "days_since_ghost": 4,
        "example_context": "Sanfter Ansatz für Soft Ghosts - erst auf Story eingehen, dann DM erinnern",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "LinkedIn Comment",
        "template_text": "[KOMMENTAR UNTER BEITRAG] Interessanter Punkt, {name}! Hab dir übrigens eine Nachricht geschickt 👋",
        "template_text_short": "LinkedIn Kommentar + Nachricht-Hinweis",
        "strategy": "cross_channel",
        "tone": "professional",
        "works_for_mood": ["neutral", "positive"],
        "works_for_decision": ["undecided"],
        "works_for_ghost_type": ["soft", "hard"],  # NEU v2.1: Funktioniert für beide
        "days_since_ghost": 5,
        "example_context": "Professioneller Cross-Channel auf LinkedIn (beide Ghost-Typen)",
        "is_system": True,
        "language": "de",
    },
    
    # ==========================================================================
    # DIRECT ASK - Für HARD Ghosts
    # ==========================================================================
    {
        "name": "Direkte Frage",
        "template_text": "Hey {name}, kurze direkte Frage: Ja oder Nein zu {topic}? Beides ist völlig okay 😊",
        "template_text_short": "Ja oder Nein?",
        "strategy": "direct_ask",
        "tone": "direct",
        "works_for_mood": ["neutral", "cautious"],
        "works_for_decision": ["undecided", "leaning_no"],
        "works_for_ghost_type": ["hard"],  # NEU v2.1: Direkt für Hard Ghosts
        "days_since_ghost": 7,
        "example_context": "Direkt für Hard Ghosts - erzwingt Entscheidung",
        "is_system": True,
        "language": "de",
    },
    {
        "name": "Klarheit schaffen",
        "template_text": "Hey {name}! Ich mag Klarheit - deshalb frag ich direkt: Passt das Thema {topic} gerade für dich oder nicht? Kein Druck, nur damit wir beide wissen woran wir sind 🙂",
        "template_text_short": "Passt es oder nicht? Klarheit.",
        "strategy": "direct_ask",
        "tone": "professional",
        "works_for_mood": ["neutral", "stressed", "cautious"],
        "works_for_decision": ["undecided", "deferred"],
        "works_for_ghost_type": ["hard"],  # NEU v2.1: Für Hard Ghosts
        "days_since_ghost": 10,
        "example_context": "Für Hard Ghosts die lange in der Pipeline hängen",
        "is_system": True,
        "language": "de",
    },
]

# =============================================================================
# CROSS-CHANNEL STRATEGIES
# =============================================================================

CROSS_CHANNEL_STRATEGIES: Dict[str, Dict[str, Any]] = {
    "instagram_dm": {
        "alternatives": [
            {
                "channel": "instagram_comment",
                "action": "Kommentiere unter letztem Post",
                "template": "Hey! Hab dir gerade eine DM geschickt, ist manchmal im Spam 😊",
            },
            {
                "channel": "instagram_story_reply",
                "action": "Reagiere auf Story + erwähne DM",
                "template": None,  # Dynamisch basierend auf Story
            },
        ],
        "timing": "Nach 48h ohne Öffnung",
    },
    "facebook_messenger": {
        "alternatives": [
            {
                "channel": "facebook_comment",
                "action": "Kommentiere unter Post",
                "template": "Hey {name}! Schau mal in deine Nachrichtenanfragen 🙂",
            },
        ],
        "timing": "Nach 48h ohne Öffnung",
    },
    "linkedin": {
        "alternatives": [
            {
                "channel": "linkedin_comment",
                "action": "Kommentiere unter Beitrag",
                "template": "Interessanter Punkt! Hab dir übrigens eine Nachricht geschickt 👋",
            },
            {
                "channel": "linkedin_endorsement",
                "action": "Bestätige Kenntnisse als Engagement-Signal",
                "template": None,
            },
        ],
        "timing": "Nach 72h ohne Öffnung",
    },
    "whatsapp": {
        "alternatives": [
            {
                "channel": "sms",
                "action": "SMS als Fallback",
                "template": "Hey {name}, hab dir auf WhatsApp geschrieben - hast du's gesehen?",
            },
        ],
        "timing": "Nach 24h ohne Öffnung",
    },
}


# =============================================================================
# SEED FUNCTION
# =============================================================================

async def seed_ghost_buster_templates(supabase) -> Dict[str, int]:
    """
    Seeded die Ghost Buster Templates in die Datenbank.
    
    Returns:
        Dict mit Anzahl der eingefügten/aktualisierten Templates
    """
    inserted = 0
    updated = 0
    
    for template in GHOST_BUSTER_TEMPLATES:
        # Prüfe ob Template existiert
        existing = supabase.table("ghost_buster_templates")\
            .select("id")\
            .eq("name", template["name"])\
            .eq("is_system", True)\
            .execute()
        
        if existing.data:
            # Update
            supabase.table("ghost_buster_templates")\
                .update(template)\
                .eq("id", existing.data[0]["id"])\
                .execute()
            updated += 1
        else:
            # Insert
            supabase.table("ghost_buster_templates")\
                .insert(template)\
                .execute()
            inserted += 1
    
    # Seed Cross-Channel Strategies
    for primary_channel, config in CROSS_CHANNEL_STRATEGIES.items():
        for alt in config.get("alternatives", []):
            strategy_data = {
                "primary_channel": primary_channel,
                "alternative_channel": alt["channel"],
                "action_description": alt["action"],
                "template_text": alt.get("template"),
                "timing_description": config.get("timing"),
            }
            
            # Upsert
            existing = supabase.table("cross_channel_strategies")\
                .select("id")\
                .eq("primary_channel", primary_channel)\
                .eq("alternative_channel", alt["channel"])\
                .execute()
            
            if existing.data:
                supabase.table("cross_channel_strategies")\
                    .update(strategy_data)\
                    .eq("id", existing.data[0]["id"])\
                    .execute()
            else:
                supabase.table("cross_channel_strategies")\
                    .insert(strategy_data)\
                    .execute()
    
    return {
        "templates_inserted": inserted,
        "templates_updated": updated,
        "cross_channel_strategies": len(CROSS_CHANNEL_STRATEGIES),
    }


# =============================================================================
# CLI RUNNER
# =============================================================================

if __name__ == "__main__":
    import asyncio
    import os
    from supabase import create_client
    
    async def main():
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not url or not key:
            print("❌ SUPABASE_URL und SUPABASE_SERVICE_KEY müssen gesetzt sein")
            return
        
        supabase = create_client(url, key)
        result = await seed_ghost_buster_templates(supabase)
        
        print("✅ Ghost Buster Templates geseeded:")
        print(f"   - {result['templates_inserted']} Templates eingefügt")
        print(f"   - {result['templates_updated']} Templates aktualisiert")
        print(f"   - {result['cross_channel_strategies']} Cross-Channel Strategies")
    
    asyncio.run(main())

