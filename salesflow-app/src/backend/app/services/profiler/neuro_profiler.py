"""
╔════════════════════════════════════════════════════════════════════════════╗
║  NEURO PROFILER SERVICE                                                    ║
║  DISG-Analyse für Kontakte basierend auf Kommunikationsmustern             ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from supabase import Client

from ..llm_client import LLMClient, get_llm_client

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# DISG TYPES DEFINITION
# ═══════════════════════════════════════════════════════════════════════════

DISG_TYPES = {
    "D": {
        "name": "Dominant",
        "traits": ["direkt", "entscheidungsfreudig", "ergebnisorientiert"],
        "communication": "Kurz, klar, auf den Punkt. Keine Smalltalk.",
        "approach": "Zeige ROI und Ergebnisse. Sei selbstbewusst.",
        "avoid": "Langatmige Erklärungen, zu viele Details"
    },
    "I": {
        "name": "Initiativ",
        "traits": ["enthusiastisch", "optimistisch", "kontaktfreudig"],
        "communication": "Freundlich, persönlich, begeisternd",
        "approach": "Baue Beziehung auf, zeige Vision und Möglichkeiten",
        "avoid": "Zu viele Zahlen, zu sachlich"
    },
    "S": {
        "name": "Stetig",
        "traits": ["geduldig", "loyal", "teamorientiert"],
        "communication": "Warm, unterstützend, nicht drängend",
        "approach": "Gib Sicherheit, zeige Support und Begleitung",
        "avoid": "Druck, schnelle Entscheidungen fordern"
    },
    "G": {
        "name": "Gewissenhaft",
        "traits": ["analytisch", "präzise", "qualitätsbewusst"],
        "communication": "Faktenbasiert, detailliert, logisch",
        "approach": "Liefere Daten, Beweise, Referenzen",
        "avoid": "Vage Aussagen, übertriebene Claims"
    }
}


# ═══════════════════════════════════════════════════════════════════════════
# DISG SIGNALS & PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

DISG_SIGNALS = {
    "D": {
        "keywords": [
            "schnell", "sofort", "jetzt", "ergebnis", "bottom line",
            "kurz", "knapp", "punkt", "ohne umschweife",
            "ich will", "ich brauche", "zeig mir", "was bringt",
            "komm zum punkt", "keine zeit", "schneller", "weiter"
        ],
        "patterns": [
            "was kostet", "was bringt mir", "wie schnell", "wann fertig",
            "kurz und knapp", "ohne blabla", "konkret bitte",
            "entscheidung jetzt", "deal oder nicht"
        ],
        "behaviors": [
            "short_messages",
            "interrupts",
            "demands_answers",
            "uses_imperatives"
        ]
    },
    "I": {
        "keywords": [
            "super", "toll", "cool", "mega", "krass", "geil", "wow",
            "fantastisch", "unglaublich", "genial",
            "leute", "freunde", "team", "zusammen", "gemeinsam",
            "erzähl", "story", "erlebnis", "letzte woche", "kennst du"
        ],
        "patterns": [
            "das ist ja", "stell dir vor", "weißt du was",
            "ich kenn jemanden", "ein freund von mir", "hab ich gehört",
            "so aufregend", "das musst du hören"
        ],
        "behaviors": [
            "long_messages",
            "uses_emojis",
            "tells_stories",
            "jumps_topics"
        ]
    },
    "S": {
        "keywords": [
            "team", "zusammen", "gemeinsam", "alle", "wir",
            "sicher", "stabil", "verlässlich", "vertrauen",
            "langsam", "schritt für schritt", "erstmal", "mal sehen",
            "in ruhe", "ohne stress"
        ],
        "patterns": [
            "lass mich überlegen", "ich schau mal", "kein stress",
            "alles in ruhe", "muss ich erst", "mit meinem team",
            "was meinen die anderen", "alle mitnehmen"
        ],
        "behaviors": [
            "asks_for_time",
            "avoids_conflict",
            "mentions_team",
            "seeks_consensus"
        ]
    },
    "G": {
        "keywords": [
            "daten", "zahlen", "fakten", "statistik", "prozent",
            "studie", "forschung", "beweis", "evidenz",
            "genau", "präzise", "detail", "spezifisch", "konkret",
            "aber", "jedoch", "allerdings", "wie genau", "warum genau"
        ],
        "patterns": [
            "wie funktioniert das genau", "zeig mir die zahlen",
            "welche studien", "wo steht das", "hast du daten",
            "was ist mit", "und wenn", "aber was passiert wenn"
        ],
        "behaviors": [
            "asks_many_questions",
            "requests_docs",
            "points_out_risks",
            "needs_time"
        ]
    }
}


# ═══════════════════════════════════════════════════════════════════════════
# RESPONSE TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class DISGProfile:
    """DISG-Profil eines Kontakts."""
    primary_type: str
    secondary_type: Optional[str]
    confidence: float
    scores: Dict[str, float]
    signals_detected: List[str]
    recommendations: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "primary_type": self.primary_type,
            "secondary_type": self.secondary_type,
            "confidence": self.confidence,
            "scores": self.scores,
            "signals_detected": self.signals_detected,
            "recommendations": self.recommendations,
        }


# ═══════════════════════════════════════════════════════════════════════════
# NEURO PROFILER SERVICE
# ═══════════════════════════════════════════════════════════════════════════

class NeuroProfiler:
    """
    Neuro-Profiler Service für DISG-Analyse von Kontakten.
    
    Analysiert Kommunikationsmuster, E-Mails, Nachrichten und Verhalten
    um den DISG-Typ eines Kontakts zu bestimmen.
    """
    
    def __init__(
        self,
        db: Client,
        llm_client: Optional[LLMClient] = None,
    ):
        self.db = db
        self.llm = llm_client or get_llm_client()
    
    async def analyze_contact(
        self,
        contact_id: str,
        user_id: str,
    ) -> DISGProfile:
        """
        Analysiert einen Kontakt basierend auf allen verfügbaren Daten.
        
        Args:
            contact_id: ID des Kontakts
            user_id: ID des Users (für Zugriffskontrolle)
            
        Returns:
            DISGProfile mit Analyse-Ergebnissen
        """
        try:
            # Kontakt-Daten laden
            contact_data = await self._load_contact_data(contact_id, user_id)
            
            # Alle Texte sammeln
            texts = []
            
            # E-Mails
            if contact_data.get("emails"):
                texts.extend([e.get("body", "") for e in contact_data["emails"]])
            
            # Nachrichten
            if contact_data.get("messages"):
                texts.extend([m.get("content", "") for m in contact_data["messages"]])
            
            # Notizen
            if contact_data.get("notes"):
                texts.append(contact_data["notes"])
            
            # Verhalten (Interaktionen)
            if contact_data.get("interactions"):
                for interaction in contact_data["interactions"]:
                    if interaction.get("description"):
                        texts.append(interaction["description"])
            
            # Analyse durchführen
            if texts:
                profile = await self.analyze_texts(texts)
            else:
                # Fallback: Basis-Profil
                profile = DISGProfile(
                    primary_type="S",
                    secondary_type=None,
                    confidence=0.3,
                    scores={"D": 0.25, "I": 0.25, "S": 0.25, "G": 0.25},
                    signals_detected=[],
                    recommendations=self.get_pitch_recommendations("S"),
                )
            
            # Profil in Datenbank speichern
            await self._save_profile(contact_id, user_id, profile)
            
            return profile
            
        except Exception as e:
            logger.error(f"Error analyzing contact {contact_id}: {e}")
            raise
    
    async def analyze_text(self, text: str) -> DISGProfile:
        """
        Analysiert einen einzelnen Text (z.B. E-Mail von Kunde).
        
        Args:
            text: Der zu analysierende Text
            
        Returns:
            DISGProfile mit Einschätzung
        """
        return await self.analyze_texts([text])
    
    async def analyze_texts(self, texts: List[str]) -> DISGProfile:
        """
        Analysiert mehrere Texte zusammen.
        
        Args:
            texts: Liste von Texten
            
        Returns:
            DISGProfile mit Analyse-Ergebnissen
        """
        if not texts:
            return DISGProfile(
                primary_type="S",
                secondary_type=None,
                confidence=0.0,
                scores={"D": 0.25, "I": 0.25, "S": 0.25, "G": 0.25},
                signals_detected=[],
                recommendations=self.get_pitch_recommendations("S"),
            )
        
        # Kombiniere alle Texte
        combined_text = " ".join(texts).lower()
        
        # Berechne Scores pro Typ
        scores = {}
        signals_found = []
        
        for disc_type, signals in DISG_SIGNALS.items():
            score = 0.0
            
            # Keyword-Matching
            keyword_matches = sum(1 for kw in signals["keywords"] if kw in combined_text)
            score += keyword_matches * 0.1
            
            # Pattern-Matching
            pattern_matches = sum(1 for p in signals["patterns"] if p in combined_text)
            score += pattern_matches * 0.15
            
            # Behavior-Analyse
            behavior_score = self._analyze_behaviors(texts, signals["behaviors"])
            score += behavior_score * 0.2
            
            # Normalisieren
            scores[disc_type] = min(score, 1.0)
            
            # Signale sammeln
            if keyword_matches > 0:
                signals_found.append(f"{disc_type}: {keyword_matches} keywords")
            if pattern_matches > 0:
                signals_found.append(f"{disc_type}: {pattern_matches} patterns")
        
        # Primären und sekundären Typ bestimmen
        sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        primary_type = sorted_types[0][0] if sorted_types else "S"
        secondary_type = None
        if len(sorted_types) > 1 and sorted_types[1][1] > 0.2:
            secondary_type = sorted_types[1][0]
        
        # Confidence berechnen
        max_score = sorted_types[0][1] if sorted_types else 0
        second_score = sorted_types[1][1] if len(sorted_types) > 1 else 0
        confidence = min(max_score * 2, 1.0) * (1 - (second_score / max(max_score, 0.01)) * 0.3)
        
        # Empfehlungen generieren
        recommendations = self.get_pitch_recommendations(primary_type)
        
        return DISGProfile(
            primary_type=primary_type,
            secondary_type=secondary_type,
            confidence=confidence,
            scores=scores,
            signals_detected=signals_found,
            recommendations=recommendations,
        )
    
    def _analyze_behaviors(self, texts: List[str], behaviors: List[str]) -> float:
        """Analysiert Verhaltensmerkmale in den Texten."""
        score = 0.0
        
        for text in texts:
            # Short messages (< 50 chars)
            if "short_messages" in behaviors and len(text) < 50:
                score += 0.1
            
            # Long messages (> 200 chars)
            if "long_messages" in behaviors and len(text) > 200:
                score += 0.1
            
            # Uses emojis
            if "uses_emojis" in behaviors:
                emoji_count = sum(1 for c in text if ord(c) > 127)
                if emoji_count > 0:
                    score += 0.05 * min(emoji_count, 5)
            
            # Uses imperatives
            if "uses_imperatives" in behaviors:
                imperatives = ["zeig", "gib", "sag", "mach", "schick"]
                if any(imp in text.lower() for imp in imperatives):
                    score += 0.1
            
            # Asks many questions
            if "asks_many_questions" in behaviors:
                question_count = text.count("?")
                if question_count >= 2:
                    score += 0.15
            
            # Asks for time
            if "asks_for_time" in behaviors:
                time_phrases = ["später", "überlegen", "zeit", "ruhe"]
                if any(tp in text.lower() for tp in time_phrases):
                    score += 0.1
        
        return min(score, 1.0)
    
    def get_pitch_recommendations(self, disg_type: str) -> Dict[str, Any]:
        """
        Gibt angepasste Pitch-Strategie für DISG-Typ zurück.
        
        Args:
            disg_type: DISG-Typ (D, I, S, G)
            
        Returns:
            Dictionary mit Empfehlungen
        """
        disc_info = DISG_TYPES.get(disg_type.upper(), DISG_TYPES["S"])
        
        return {
            "communication_style": disc_info["communication"],
            "approach": disc_info["approach"],
            "avoid": disc_info["avoid"],
            "opening_suggestions": self._get_opening_suggestions(disg_type),
            "pitch_structure": self._get_pitch_structure(disg_type),
            "closing_technique": self._get_closing_technique(disg_type),
        }
    
    def _get_opening_suggestions(self, disg_type: str) -> List[str]:
        """Gibt Opening-Vorschläge für DISG-Typ zurück."""
        suggestions = {
            "D": [
                "3 Zahlen, die für dich relevant sind...",
                "Bottom Line: Das bringt dir...",
                "Kurz und knapp: Hier ist was du brauchst...",
            ],
            "I": [
                "Ich hab letzte Woche mit einem Kunden gesprochen...",
                "Stell dir vor, du könntest...",
                "Das ist so aufregend, das musst du hören...",
            ],
            "S": [
                "Ich zeig dir erstmal in Ruhe, wie das funktioniert...",
                "Lass uns gemeinsam schauen, ob das zu dir passt...",
                "Kein Stress, wir gehen Schritt für Schritt...",
            ],
            "G": [
                "Die wichtigsten Zahlen im Überblick...",
                "Basierend auf diesen Daten...",
                "Hier sind die Fakten, die du brauchst...",
            ],
        }
        return suggestions.get(disg_type.upper(), suggestions["S"])
    
    def _get_pitch_structure(self, disg_type: str) -> List[str]:
        """Gibt Pitch-Struktur für DISG-Typ zurück."""
        structures = {
            "D": [
                "1. ROI/Ergebnis zuerst",
                "2. Konkrete Zahlen",
                "3. Nächste Schritte klar definieren",
            ],
            "I": [
                "1. Vision und Möglichkeiten",
                "2. Erfolgsgeschichten",
                "3. Begeisterung wecken",
            ],
            "S": [
                "1. Sicherheit und Stabilität",
                "2. Schritt-für-Schritt Erklärung",
                "3. Support und Begleitung betonen",
            ],
            "G": [
                "1. Daten und Fakten",
                "2. Detaillierte Erklärung",
                "3. Referenzen und Beweise",
            ],
        }
        return structures.get(disg_type.upper(), structures["S"])
    
    def _get_closing_technique(self, disg_type: str) -> str:
        """Gibt Closing-Technik für DISG-Typ zurück."""
        techniques = {
            "D": "Direktes Closing: 'Soll ich dir das jetzt zusammenstellen?'",
            "I": "Enthusiastisches Closing: 'Das ist so spannend! Lass uns starten!'",
            "S": "Sanftes Closing: 'Wenn du möchtest, können wir das Schritt für Schritt angehen.'",
            "G": "Faktenbasiertes Closing: 'Basierend auf diesen Daten, macht es Sinn für dich?'",
        }
        return techniques.get(disg_type.upper(), techniques["S"])
    
    async def _load_contact_data(self, contact_id: str, user_id: str) -> Dict[str, Any]:
        """Lädt alle verfügbaren Daten eines Kontakts."""
        try:
            # Kontakt laden
            contact = self.db.table("contacts").select("*").eq("id", contact_id).eq("user_id", user_id).single().execute()
            
            if not contact.data:
                raise ValueError(f"Contact {contact_id} not found")
            
            contact_data = {
                "id": contact.data.get("id"),
                "name": contact.data.get("name"),
                "email": contact.data.get("email"),
                "phone": contact.data.get("phone"),
                "notes": contact.data.get("notes"),
                "emails": [],
                "messages": [],
                "interactions": [],
            }
            
            # E-Mails laden (falls vorhanden)
            try:
                emails = self.db.table("emails").select("*").eq("contact_id", contact_id).order("created_at", desc=True).limit(10).execute()
                contact_data["emails"] = emails.data or []
            except:
                pass
            
            # Nachrichten laden (falls vorhanden)
            try:
                messages = self.db.table("messages").select("*").eq("contact_id", contact_id).order("created_at", desc=True).limit(20).execute()
                contact_data["messages"] = messages.data or []
            except:
                pass
            
            # Interaktionen laden (falls vorhanden)
            try:
                interactions = self.db.table("interactions").select("*").eq("contact_id", contact_id).order("created_at", desc=True).limit(10).execute()
                contact_data["interactions"] = interactions.data or []
            except:
                pass
            
            return contact_data
            
        except Exception as e:
            logger.error(f"Error loading contact data: {e}")
            return {}
    
    async def _save_profile(self, contact_id: str, user_id: str, profile: DISGProfile):
        """Speichert das Profil in der Datenbank."""
        try:
            self.db.table("contacts").update({
                "disc_type": profile.primary_type,
                "disc_secondary": profile.secondary_type,
                "disc_confidence": profile.confidence,
                "disc_scores": profile.scores,
                "disc_analyzed_at": "now()",
            }).eq("id", contact_id).eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Could not save profile: {e}")


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════

def get_profiler_service(db: Client) -> NeuroProfiler:
    """Factory Function für NeuroProfiler."""
    return NeuroProfiler(db)

