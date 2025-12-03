"""
═══════════════════════════════════════════════════════════════════════════
KNOWLEDGE BASE SEEDER
═══════════════════════════════════════════════════════════════════════════
Initialisiert die Knowledge Base mit Standard-Content:
- Einwände & Responses
- Produkte
- Best Practices
- Success Stories
═══════════════════════════════════════════════════════════════════════════
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.supabase import get_supabase_client


class KnowledgeBaseSeeder:
    """Seeds initial Knowledge Base data"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.seeded_count = {
            'objections': 0,
            'products': 0,
            'knowledge_base': 0,
            'success_stories': 0,
            'keywords': 0
        }
    
    def run(self):
        """Führt alle Seed-Operationen aus"""
        print("🚀 Starting Knowledge Base Seeding...")
        print("=" * 70)
        
        self.seed_objections()
        self.seed_products()
        self.seed_knowledge_base()
        self.seed_success_stories()
        self.seed_social_keywords()
        
        print("\n" + "=" * 70)
        print("✅ Seeding completed!")
        print(f"   - Objections: {self.seeded_count['objections']}")
        print(f"   - Products: {self.seeded_count['products']}")
        print(f"   - Knowledge Base Entries: {self.seeded_count['knowledge_base']}")
        print(f"   - Success Stories: {self.seeded_count['success_stories']}")
        print(f"   - Social Keywords: {self.seeded_count['keywords']}")
    
    def seed_objections(self):
        """Seeds häufige Einwände mit Responses"""
        print("\n📝 Seeding Objections...")
        
        objections = [
            {
                "category": "Preis",
                "objection_text": "Das ist zu teuer",
                "psychology": "Preissorge - oft Vorwand für andere Bedenken",
                "industry": ["Network Marketing", "Immobilien", "Finanzberatung"],
                "frequency_score": 95,
                "severity": 7,
                "response_variants": [
                    "Ich verstehe deine Bedenken zu den Kosten. Lass uns gemeinsam ausrechnen, wie schnell sich die Investition amortisiert...",
                    "Viele unserer erfolgreichsten Partner hatten anfangs die gleiche Sorge. Lass mich dir zeigen, wie..."
                ],
                "personality_adaptations": {
                    "D": "Fakt ist: ROI in durchschnittlich 3 Monaten. Die Zahlen sprechen für sich. Möchtest du die Kalkulation sehen?",
                    "I": "Viele aus unserer Community haben genau das gedacht - und heute verdienen sie ein Vielfaches damit! Lass uns gemeinsam schauen...",
                    "S": "Ich möchte, dass du dich absolut sicher fühlst. Lass uns in Ruhe alle Optionen und Szenarien durchgehen...",
                    "C": "Hier ist eine detaillierte Kalkulation mit allen Zahlen: Investition, durchschnittliche Returns, Break-Even Point..."
                },
                "similar_objections": ["zu viel Geld", "kann mir das nicht leisten", "Budget reicht nicht"]
            },
            {
                "category": "Zeit",
                "objection_text": "Ich habe keine Zeit",
                "psychology": "Zeitdruck - oft Prioritätsfrage",
                "industry": ["Network Marketing", "Finanzberatung"],
                "frequency_score": 85,
                "severity": 6,
                "response_variants": [
                    "Zeit ist kostbar, absolut. Genau deshalb ist unser System so aufgebaut, dass du nur 5-10h/Woche brauchst...",
                    "Die meisten starten nebenbei und bauen dann Schritt für Schritt aus..."
                ],
                "personality_adaptations": {
                    "D": "Effizient aufgesetzt brauchst du nur 5h/Woche. System ist skalierbar. Time-to-Market: 2 Wochen.",
                    "I": "Die meisten arbeiten flexibel zwischendurch - beim Kaffee, abends auf der Couch. Macht sogar Spaß!",
                    "S": "Wir fangen ganz langsam an, in deinem eigenen Tempo. Kein Druck, keine Überforderung.",
                    "C": "Hier ist ein genauer Zeitplan: Woche 1-2 Setup (3h), ab Woche 3 ca. 5h/Woche für aktive Akquise..."
                },
                "similar_objections": ["zu beschäftigt", "kein Zeitfenster", "später vielleicht"]
            },
            {
                "category": "Vertrauen",
                "objection_text": "Klingt zu gut um wahr zu sein",
                "psychology": "Skepsis - Schutzreaktion vor Betrug",
                "industry": ["Network Marketing", "Finanzberatung"],
                "frequency_score": 70,
                "severity": 8,
                "response_variants": [
                    "Ich verstehe deine Skepsis total - und das ist auch gut so! Lass mich dir echte Zahlen und Erfahrungen zeigen...",
                    "Genau diese gesunde Skepsis macht dich zu einem perfekten Partner. Lass uns alles transparent durchgehen..."
                ],
                "personality_adaptations": {
                    "D": "Berechtigte Skepsis. Hier sind die Fakten: [konkrete Zahlen]. Alles transparent, alles nachprüfbar.",
                    "I": "Ich zeig dir gleich echte Success Stories von Leuten wie dir und mir. Keine Marketing-Versprechen, echte Menschen!",
                    "S": "Ich verstehe deine Vorsicht komplett. Lass uns alles in Ruhe durchgehen, ohne Druck, bis du dich wohlfühlst.",
                    "C": "Hier ist die vollständige Dokumentation: Geschäftsmodell, Compliance, Zahlen der letzten 5 Jahre, Audit-Reports..."
                },
                "similar_objections": ["klingt nach Betrug", "zu schön um wahr", "unseriös"]
            },
            {
                "category": "Network Marketing spezifisch",
                "objection_text": "Das ist doch ein Pyramidensystem",
                "psychology": "Vorurteil gegen MLM",
                "industry": ["Network Marketing"],
                "frequency_score": 80,
                "severity": 9,
                "response_variants": [
                    "Ich verstehe woher diese Sorge kommt. Lass mich dir den Unterschied erklären: Bei uns verdienst du durch echte Produktverkäufe, nicht durch reine Rekrutierung...",
                    "Pyramidensysteme sind illegal - wir sind ein registriertes, reguliertes Unternehmen. Der Unterschied ist..."
                ],
                "personality_adaptations": {
                    "D": "Pyramide = illegal, keine Produkte. Wir = legales Network Marketing, echte Produkte, reguliert. Klare Unterscheidung.",
                    "I": "Ich hatte anfangs die gleiche Sorge! Dann hab ich gemerkt: echte Produkte, echte Kunden, faires System.",
                    "S": "Lass uns gemeinsam Schritt für Schritt anschauen, wie unser Vergütungssystem funktioniert. Du wirst den Unterschied sehen...",
                    "C": "Hier ist die rechtliche Struktur, Registrierungen, Compliance-Zertifikate und die genaue Vergütungsstruktur..."
                },
                "similar_objections": ["MLM funktioniert nicht", "Schneeballsystem", "illegales Schema"]
            }
        ]
        
        for obj in objections:
            try:
                # Check if exists
                existing = self.supabase.table('objection_library').select('id').eq(
                    'objection_text', obj['objection_text']
                ).execute()
                
                if existing.data:
                    print(f"   ⏭️  Skipping existing: {obj['objection_text']}")
                    continue
                
                # Insert objection
                result = self.supabase.table('objection_library').insert({
                    'category': obj['category'],
                    'objection_text': obj['objection_text'],
                    'psychology': obj['psychology'],
                    'industry': obj['industry'],
                    'frequency_score': obj['frequency_score'],
                    'severity': obj['severity'],
                    'response_variants': obj.get('response_variants', []),
                    'personality_adaptations': obj.get('personality_adaptations', {}),
                    'similar_objections': obj.get('similar_objections', [])
                }).execute()
                
                if result.data:
                    self.seeded_count['objections'] += 1
                    print(f"   ✅ Added: {obj['objection_text']}")
                    
            except Exception as e:
                print(f"   ❌ Error adding {obj['objection_text']}: {e}")
    
    def seed_products(self):
        """Seeds Beispiel-Produkte"""
        print("\n🛍️  Seeding Products...")
        
        products = [
            {
                "name": "Starter Kit Bronze",
                "description": "Perfekter Einstieg für Newcomer im Network Marketing",
                "category": "starter_kit",
                "price": 199.00,
                "tier": "bronze",
                "features": [
                    "Basis-Produktsortiment",
                    "Zugang zur Community",
                    "Digitale Verkaufsunterlagen",
                    "E-Learning Kurse"
                ],
                "benefits": {
                    "D": "Schneller Start, minimales Investment, sofort einsatzbereit",
                    "I": "Tolle Community, Support von Anfang an, gemeinsam erfolgreich",
                    "S": "Schritt-für-Schritt Anleitung, keine Überforderung, im eigenen Tempo",
                    "C": "Vollständige Dokumentation, klarer ROI-Plan, Risikominimierung"
                },
                "target_personality_types": ["S", "C"],
                "target_industries": ["Network Marketing"]
            },
            {
                "name": "Business Pack Silver",
                "description": "Für ambitionierte Networker mit Wachstumsambitionen",
                "category": "premium_pack",
                "price": 499.00,
                "tier": "silver",
                "features": [
                    "Premium Produktsortiment",
                    "1-on-1 Mentoring (3 Monate)",
                    "Professionelle Marketing-Materialien",
                    "Zugang zu Master Classes",
                    "Persönlicher Success Coach"
                ],
                "benefits": {
                    "D": "Maximale Effizienz, schnellster Weg zum Erfolg, messbare Ergebnisse",
                    "I": "Direkter Zugang zu Top-Networkern, exklusive Events, VIP-Community",
                    "S": "Persönlicher Coach an deiner Seite, sichere Begleitung, kein Alleingang",
                    "C": "Strukturierter Erfolgsplan, bewährte Strategien, detaillierte Analysen"
                },
                "target_personality_types": ["D", "I"],
                "target_industries": ["Network Marketing"],
                "upsell_from": None  # Wird später verknüpft
            },
            {
                "name": "Sales Flow AI Pro",
                "description": "Vollständige KI-gestützte Sales-Automation",
                "category": "tools",
                "price": 149.00,
                "tier": "gold",
                "features": [
                    "KI-Lead-Scoring",
                    "Automatische Follow-ups",
                    "DISG-Personality-Profiling",
                    "Objection Handling AI",
                    "Team Dashboard"
                ],
                "benefits": {
                    "D": "10x Produktivität, automatisierte Prozesse, datengetriebene Entscheidungen",
                    "I": "Mehr Zeit für echte Gespräche, KI übernimmt Routine, fokussiert auf Menschen",
                    "S": "System unterstützt dich bei jedem Schritt, keine Überforderung, klare Führung",
                    "C": "Präzise Analytics, vollständige Transparenz, optimierte Workflows"
                },
                "target_personality_types": ["D", "C", "I", "S"],
                "target_industries": ["Network Marketing", "Immobilien", "Finanzberatung"]
            }
        ]
        
        for product in products:
            try:
                existing = self.supabase.table('products').select('id').eq(
                    'name', product['name']
                ).execute()
                
                if existing.data:
                    print(f"   ⏭️  Skipping existing: {product['name']}")
                    continue
                
                result = self.supabase.table('products').insert(product).execute()
                
                if result.data:
                    self.seeded_count['products'] += 1
                    print(f"   ✅ Added: {product['name']} (€{product['price']})")
                    
            except Exception as e:
                print(f"   ❌ Error adding {product['name']}: {e}")
    
    def seed_knowledge_base(self):
        """Seeds Knowledge Base Entries"""
        print("\n📚 Seeding Knowledge Base...")
        
        kb_entries = [
            {
                "category": "best_practice",
                "title": "Die 5 Prinzipien erfolgreicher Lead-Generierung",
                "content": """
                1. **Konsistenz schlägt Intensität**: Täglich 30 Min sind besser als 1x pro Woche 5 Stunden.
                2. **Qualität vor Quantität**: 10 qualifizierte Leads sind mehr wert als 100 unqualifizierte.
                3. **Follow-up ist King**: 80% der Sales passieren beim 5.-12. Kontakt.
                4. **Personalisierung gewinnt**: DISG-angepasste Kommunikation erhöht Conversion um 40%.
                5. **Tracke alles**: Was du nicht misst, kannst du nicht verbessern.
                """,
                "summary": "5 fundamentale Prinzipien für erfolgreiche Lead-Generierung im Network Marketing",
                "tags": ["lead-generation", "best-practice", "basics"],
                "language": "de"
            },
            {
                "category": "script",
                "title": "Cold Call Eröffnung - DISG-adaptiert",
                "content": """
                **Für D (Dominant):**
                "Hallo [Name], ich halte mich kurz: Ich habe eine Business-Opportunity die zu deinem Profil passt. 
                5 Minuten deiner Zeit für die Key Facts?"

                **Für I (Initiativ):**
                "Hi [Name]! Ich bin total begeistert - hab was entdeckt das perfekt zu dir passen könnte! 
                Hast du kurz Zeit für eine spannende Idee?"

                **Für S (Stetig):**
                "Guten Tag [Name], ich hoffe ich störe nicht? Ich würde mich gerne kurz vorstellen und 
                dir eine Möglichkeit zeigen, die vielleicht interessant für dich sein könnte..."

                **Für C (Gewissenhaft):**
                "Guten Tag [Name], ich kontaktiere Sie bezüglich einer strukturierten Business-Opportunity. 
                Hätten Sie Interesse an einer detaillierten Präsentation der Fakten?"
                """,
                "summary": "DISG-angepasste Cold Call Eröffnungen",
                "tags": ["cold-call", "scripts", "disg"],
                "language": "de"
            }
        ]
        
        for entry in kb_entries:
            try:
                existing = self.supabase.table('knowledge_base').select('id').eq(
                    'title', entry['title']
                ).execute()
                
                if existing.data:
                    print(f"   ⏭️  Skipping existing: {entry['title']}")
                    continue
                
                result = self.supabase.table('knowledge_base').insert(entry).execute()
                
                if result.data:
                    self.seeded_count['knowledge_base'] += 1
                    print(f"   ✅ Added: {entry['title']}")
                    
            except Exception as e:
                print(f"   ❌ Error adding {entry['title']}: {e}")
    
    def seed_success_stories(self):
        """Seeds Beispiel Success Stories"""
        print("\n🏆 Seeding Success Stories...")
        
        stories = [
            {
                "story_type": "first_sale",
                "title": "Mein erster Abschluss nach nur 2 Wochen!",
                "description": "Ich war super nervös, aber mit dem DISG-Profiling und den Objection-Handling-Tipps hat es geklappt! €1.200 Provision für meinen ersten Deal.",
                "metrics": {
                    "revenue": 1200,
                    "timeframe_days": 14,
                    "conversion_rate": 0.25
                },
                "tags": ["first_sale", "network_marketing", "newbie_success"],
                "visibility": "public",
                "is_featured": True
            },
            {
                "story_type": "milestone",
                "title": "100.000€ Umsatz im ersten Jahr erreicht!",
                "description": "Vor einem Jahr habe ich gestartet - heute habe ich ein 15-köpfiges Team und wir haben gemeinsam 100k Umsatz gemacht. Der Schlüssel: Konsequentes Follow-up und Team-Support.",
                "metrics": {
                    "revenue": 100000,
                    "timeframe_days": 365,
                    "team_size": 15
                },
                "tags": ["milestone", "team_building", "6_figures"],
                "visibility": "public",
                "is_featured": True
            }
        ]
        
        for story in stories:
            try:
                existing = self.supabase.table('success_stories').select('id').eq(
                    'title', story['title']
                ).execute()
                
                if existing.data:
                    print(f"   ⏭️  Skipping existing: {story['title']}")
                    continue
                
                result = self.supabase.table('success_stories').insert(story).execute()
                
                if result.data:
                    self.seeded_count['success_stories'] += 1
                    print(f"   ✅ Added: {story['title']}")
                    
            except Exception as e:
                print(f"   ❌ Error adding {story['title']}: {e}")
    
    def seed_social_keywords(self):
        """Seeds Social Listening Keywords"""
        print("\n🔍 Seeding Social Listening Keywords...")
        
        keywords = [
            {"keyword": "entrepreneur", "category": "industry", "weight": 1.5},
            {"keyword": "network marketing", "category": "industry", "weight": 2.0},
            {"keyword": "side hustle", "category": "opportunity", "weight": 1.8},
            {"keyword": "passive income", "category": "opportunity", "weight": 1.7},
            {"keyword": "financial freedom", "category": "opportunity", "weight": 1.6},
            {"keyword": "tired of 9-5", "category": "pain_point", "weight": 1.9},
            {"keyword": "need extra income", "category": "pain_point", "weight": 1.8},
            {"keyword": "looking for opportunity", "category": "qualification", "weight": 2.0}
        ]
        
        for kw in keywords:
            try:
                existing = self.supabase.table('social_listening_keywords').select('id').eq(
                    'keyword', kw['keyword']
                ).execute()
                
                if existing.data:
                    continue
                
                result = self.supabase.table('social_listening_keywords').insert(kw).execute()
                
                if result.data:
                    self.seeded_count['keywords'] += 1
                    
            except Exception as e:
                print(f"   ❌ Error adding keyword {kw['keyword']}: {e}")
        
        print(f"   ✅ Added {self.seeded_count['keywords']} keywords")


if __name__ == "__main__":
    seeder = KnowledgeBaseSeeder()
    seeder.run()

