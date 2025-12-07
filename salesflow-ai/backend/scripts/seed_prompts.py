"""
SalesFlow AI - Seed Prompt Templates
====================================

Fügt initiale Prompt Templates für alle AI-Szenarien in die Datenbank ein.

Ausführung:
    python -m scripts.seed_prompts
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.ai.scenarios import ScenarioId
from app.ai.prompt_store import PromptTemplate
from app.core.config import get_settings
import os

settings = get_settings()


def get_prompt_seeds() -> list[dict]:
    """Definiert die initialen Prompt Templates."""
    
    return [
        {
            "scenario_id": ScenarioId.FOLLOWUP_SHORT_WHATSAPP.value,
            "version": 1,
            "system_prompt": """Du bist ein professioneller Sales-Assistent für Network Marketing. 
Deine Aufgabe ist es, kurze, persönliche Follow-Up Nachrichten für WhatsApp zu schreiben.

Richtlinien:
- Maximal 2-3 Sätze
- Freundlich, aber nicht aufdringlich
- Persönlich und authentisch
- Keine Verkaufstaktiken, sondern ehrliches Interesse
- Auf Deutsch, Umgangssprache ist erlaubt
- Emojis sparsam verwenden (max. 1-2)""",
            "user_template": """Schreibe eine kurze Follow-Up Nachricht für WhatsApp.

Lead Name: {lead_name}
Letzte Nachricht vom Lead: {last_message}
Kanal: {channel}

Kontext:
- Dies ist eine Follow-Up Nachricht
- Der Lead hat sich zuletzt vor einiger Zeit gemeldet
- Ziel: Interesse aufrechterhalten, ohne aufdringlich zu sein

Schreibe die Nachricht direkt, ohne zusätzliche Erklärungen.""",
            "metadata": {
                "description": "Kurze Follow-Up Nachricht für WhatsApp",
                "max_tokens": 150,
                "temperature": 0.7,
                "language": "de"
            }
        },
        {
            "scenario_id": ScenarioId.OBJECTION_PRICE_ANALYSIS.value,
            "version": 1,
            "system_prompt": """Du bist ein erfahrener Sales-Coach für Network Marketing. 
Deine Aufgabe ist es, Preiseinwände zu analysieren und passende Antworten zu formulieren.

Richtlinien:
- Analysiere den Einwand tiefgehend
- Identifiziere die wahre Sorge (oft nicht nur der Preis)
- Formuliere eine empathische, aber überzeugende Antwort
- Zeige Wert statt nur Preis zu rechtfertigen
- Auf Deutsch, professionell aber menschlich""",
            "user_template": """Analysiere diesen Preiseinwand und formuliere eine passende Antwort.

Einwand des Leads: {objection_text}
Lead Name: {lead_name}
Kontext: {context}

Analysiere:
1. Was ist die wahre Sorge hinter dem Einwand?
2. Welche Emotionen stecken dahinter?
3. Welche Bedürfnisse hat der Lead wirklich?

Formuliere dann eine Antwort, die:
- Empathisch auf den Einwand eingeht
- Den Wert des Angebots zeigt
- Alternative Lösungen anbietet (z.B. Ratenzahlung, Starter-Paket)
- Den Lead nicht unter Druck setzt

Antwortformat:
ANALYSE: [Kurze Analyse der wahren Sorge]
ANTWORT: [Deine Antwort an den Lead]""",
            "metadata": {
                "description": "Analyse eines Preiseinwands mit Antwort",
                "max_tokens": 500,
                "temperature": 0.6,
                "language": "de"
            }
        },
        {
            "scenario_id": ScenarioId.LEAD_EXTRACTION_GENERIC.value,
            "version": 1,
            "system_prompt": """Du bist ein präziser Daten-Extraktions-Assistent. 
Deine Aufgabe ist es, strukturierte Lead-Daten aus unstrukturierten Quellen zu extrahieren.

Richtlinien:
- Extrahiere nur Informationen, die du sicher identifizieren kannst
- Gib für jedes Feld eine Confidence-Score (0.0-1.0)
- Wenn unsicher, lasse das Feld leer
- JSON-Format strikt einhalten
- Auf Deutsch extrahieren, aber JSON-Keys auf Englisch""",
            "user_template": """Extrahiere Lead-Daten aus folgendem Inhalt:

Quellentyp: {source_type}
Inhalt: {content}

Extrahiere folgende Felder:
- email: E-Mail-Adresse (Confidence: 0.0-1.0)
- phone: Telefonnummer (Confidence: 0.0-1.0)
- full_name: Vollständiger Name (Confidence: 0.0-1.0)
- company: Firmenname (Confidence: 0.0-1.0)

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{{
    "email": {{
        "value": "email@example.com",
        "confidence": 0.95
    }},
    "phone": {{
        "value": "+491701234567",
        "confidence": 0.90
    }},
    "full_name": {{
        "value": "Max Mustermann",
        "confidence": 0.85
    }},
    "company": {{
        "value": "Musterfirma GmbH",
        "confidence": 0.70
    }}
}}

Wenn ein Feld nicht gefunden wurde, setze "value" auf null und "confidence" auf 0.0.""",
            "metadata": {
                "description": "Lead-Extraktion aus unstrukturierten Quellen",
                "max_tokens": 500,
                "temperature": 0.3,
                "language": "de",
                "output_format": "json"
            }
        }
    ]


async def seed_prompts(db: AsyncSession) -> int:
    """Fügt Prompt Templates in die DB ein (nur wenn noch nicht vorhanden)."""
    
    seeds = get_prompt_seeds()
    created_count = 0
    
    for seed in seeds:
        # Prüfe ob bereits vorhanden (global, version 1)
        stmt = (
            select(PromptTemplate)
            .where(
                PromptTemplate.tenant_id.is_(None),
                PromptTemplate.scenario_id == seed["scenario_id"],
                PromptTemplate.version == seed["version"]
            )
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        
        if existing:
            print(f"⚠️  Prompt bereits vorhanden: {seed['scenario_id']} v{seed['version']}")
            continue
        
        # Erstelle neues Template
        template = PromptTemplate(
            tenant_id=None,  # Global template
            scenario_id=seed["scenario_id"],
            version=seed["version"],
            is_active=True,
            system_prompt=seed["system_prompt"],
            user_template=seed["user_template"],
            metadata=seed["metadata"],
            created_at=datetime.utcnow()
        )
        
        db.add(template)
        created_count += 1
        print(f"✅ Erstellt: {seed['scenario_id']} v{seed['version']}")
    
    if created_count > 0:
        await db.commit()
        print(f"\n🎉 {created_count} Prompt Templates erfolgreich erstellt!")
    else:
        print("\n✅ Alle Prompt Templates sind bereits vorhanden.")
    
    return created_count


async def main():
    """Hauptfunktion zum Seeden."""
    
    # Database URL aus Environment
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        # Versuche aus Supabase Settings zu bauen
        supabase_url = os.getenv('SUPABASE_URL', '')
        supabase_db_password = os.getenv('SUPABASE_DB_PASSWORD', '')
        
        if supabase_url and supabase_db_password:
            import re
            match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
            if match:
                project_ref = match.group(1)
                database_url = f"postgresql+asyncpg://postgres.{project_ref}:{supabase_db_password}@db.{project_ref}.supabase.co:5432/postgres"
    
    if not database_url:
        print("❌ FEHLER: DATABASE_URL oder SUPABASE_URL + SUPABASE_DB_PASSWORD muss gesetzt sein!")
        print("\nSetze in .env:")
        print("  DATABASE_URL=postgresql://...")
        print("  ODER")
        print("  SUPABASE_URL=https://<project>.supabase.co")
        print("  SUPABASE_DB_PASSWORD=<password>")
        return
    
    # Engine erstellen
    engine = create_async_engine(database_url, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            count = await seed_prompts(db)
            print(f"\n✅ Fertig! {count} neue Templates erstellt.")
        except Exception as e:
            print(f"\n❌ FEHLER: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

