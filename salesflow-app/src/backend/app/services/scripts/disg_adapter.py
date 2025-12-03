"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DISG SCRIPT ADAPTER                                                        ║
║  Passt Scripts dynamisch an DISG-Persönlichkeitstypen an                    ║
╚════════════════════════════════════════════════════════════════════════════╝

Anpassungs-Logik:
    D (Dominant) → Kürzer, direkter, ergebnisorientiert
    I (Initiativ) → Mehr Emojis, enthusiastisch, Stories
    S (Stetig) → Weniger Druck, Sicherheit, Beziehung
    G (Gewissenhaft) → Mehr Details, Fakten, Logik
"""

import re
from typing import Optional, Dict, Any, List
from .models import DISGType, Script, ScriptVariant, DISG_ADAPTATIONS


class DISGScriptAdapter:
    """
    Passt Scripts dynamisch an DISG-Persönlichkeitstypen an.
    """
    
    # Emoji-Sets für verschiedene Typen
    EMOJIS = {
        DISGType.D: ["✓", "→", "📊"],
        DISGType.I: ["🎉", "🚀", "💪", "😊", "🙌", "❤️", "✨", "🔥"],
        DISGType.S: ["🙂", "👍", "🤝", "💙"],
        DISGType.G: ["📋", "✅", "📈", "🔍"],
    }
    
    # Druck-reduzierende Phrasen für S-Typen
    REASSURING_PHRASES = [
        "Kein Druck",
        "In deinem Tempo",
        "Nimm dir Zeit",
        "Völlig okay",
        "Ganz in Ruhe",
        "Ohne Stress",
    ]
    
    # Urgency-Phrasen die bei S-Typen entfernt werden
    URGENCY_PHRASES = [
        "jetzt", "sofort", "heute noch", "schnell",
        "nur noch", "läuft ab", "letzte Chance",
        "nicht verpassen", "dringend",
    ]
    
    def __init__(self):
        self.adaptations = DISG_ADAPTATIONS
    
    def adapt_script(
        self,
        script: Script,
        disg_type: DISGType,
        contact_name: Optional[str] = None,
        variables: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Passt ein Script an einen DISG-Typ an.
        
        Args:
            script: Das Original-Script
            disg_type: Der Ziel-DISG-Typ
            contact_name: Optional der Name des Kontakts
            variables: Optional weitere Variablen zum Ersetzen
            
        Returns:
            Das angepasste Script als String
        """
        # Prüfe ob es eine vordefinierte Variante gibt
        variant = script.get_variant_for_disg(disg_type)
        if variant:
            text = variant.text
        else:
            # Dynamische Anpassung
            text = self._dynamically_adapt(script.text, disg_type)
        
        # Variablen ersetzen
        text = self._replace_variables(text, contact_name, variables)
        
        return text
    
    def _dynamically_adapt(self, text: str, disg_type: DISGType) -> str:
        """
        Führt dynamische DISG-Anpassungen durch.
        """
        adaptation = self.adaptations.get(disg_type, {})
        
        if disg_type == DISGType.D:
            text = self._adapt_for_dominant(text)
        elif disg_type == DISGType.I:
            text = self._adapt_for_initiative(text)
        elif disg_type == DISGType.S:
            text = self._adapt_for_steady(text)
        elif disg_type == DISGType.G:
            text = self._adapt_for_conscientious(text)
        
        return text
    
    def _adapt_for_dominant(self, text: str) -> str:
        """
        Anpassung für D-Typ (Dominant/Macher).
        → Kürzer, direkter, weniger Emojis
        """
        # Entferne übermäßige Emojis (behalte max 1)
        emoji_pattern = r'[\U0001F300-\U0001F9FF]'
        emojis = re.findall(emoji_pattern, text)
        if len(emojis) > 1:
            for emoji in emojis[1:]:
                text = text.replace(emoji, '', 1)
        
        # Entferne lange Einleitungen
        text = re.sub(
            r'^(Hey|Hi|Hallo)[^!]*![^\n]*\n\n',
            '',
            text,
            flags=re.MULTILINE
        )
        
        # Kürze redundante Phrasen
        redundant_phrases = [
            r'Ich weiß, das kommt jetzt vielleicht überraschend, aber ',
            r'bevor du jetzt denkst "[^"]*" - ',
            r'Völlig okay\. ',
            r'Kein Druck - ',
            r'Falls nicht, kein Problem! ',
        ]
        for phrase in redundant_phrases:
            text = re.sub(phrase, '', text, flags=re.IGNORECASE)
        
        # Ersetze weiche Formulierungen
        text = text.replace("Hättest du", "Hast du")
        text = text.replace("Würdest du", "Willst du")
        text = text.replace("vielleicht", "")
        text = text.replace("eventuell", "")
        
        return text.strip()
    
    def _adapt_for_initiative(self, text: str) -> str:
        """
        Anpassung für I-Typ (Initiativ/Entertainer).
        → Mehr Emojis, enthusiastischer, persönlicher
        """
        # Füge Emojis hinzu wenn wenige vorhanden
        emoji_pattern = r'[\U0001F300-\U0001F9FF]'
        emoji_count = len(re.findall(emoji_pattern, text))
        
        if emoji_count < 2:
            # Füge Emojis am Ende von Sätzen hinzu
            text = text.replace('!', ' 🎉', 1)
            text = text.replace('?', ' 😊?', 1)
        
        # Verstärke positive Worte
        replacements = {
            "gut": "super",
            "interessant": "mega spannend",
            "Möglichkeit": "krasse Chance",
            "funktioniert": "rockt",
            "Erfolg": "Mega-Erfolg",
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        # Füge enthusiastische Phrasen hinzu
        if not any(p in text.lower() for p in ["super", "toll", "krass", "mega"]):
            text = text.replace(
                ".",
                ". Ich bin echt excited! 🚀",
                1
            )
        
        return text.strip()
    
    def _adapt_for_steady(self, text: str) -> str:
        """
        Anpassung für S-Typ (Stetig/Teamplayer).
        → Weniger Druck, mehr Sicherheit, Beziehung betonen
        """
        # Entferne Urgency
        for phrase in self.URGENCY_PHRASES:
            text = re.sub(
                rf'\b{phrase}\b',
                '',
                text,
                flags=re.IGNORECASE
            )
        
        # Ersetze direkte Aufforderungen
        text = text.replace("Melde dich!", "Wenn du magst, melde dich gerne.")
        text = text.replace("Hast du Zeit?", "Wenn es dir passt, können wir sprechen.")
        text = text.replace("Deal?", "Wäre das okay für dich?")
        
        # Füge beruhigende Phrase hinzu
        if not any(p.lower() in text.lower() for p in self.REASSURING_PHRASES):
            text += "\n\nKein Druck - nimm dir die Zeit, die du brauchst. 🙂"
        
        # Betone Sicherheit
        text = text.replace(
            "probieren",
            "in Ruhe anschauen"
        )
        
        return text.strip()
    
    def _adapt_for_conscientious(self, text: str) -> str:
        """
        Anpassung für G-Typ (Gewissenhaft/Analytiker).
        → Mehr Fakten, Details, logischer Aufbau
        """
        # Entferne übermäßige Emojis
        emoji_pattern = r'[\U0001F300-\U0001F9FF]'
        text = re.sub(emoji_pattern, '', text)
        
        # Ersetze vage Aussagen
        vague_to_specific = {
            "viele Leute": "über 85% der Teilnehmer",
            "super Ergebnisse": "messbare Ergebnisse (durchschnittlich +30%)",
            "schnell": "innerhalb von 14 Tagen",
            "bald": "in den nächsten 7 Tagen",
            "oft": "in 8 von 10 Fällen",
        }
        for vague, specific in vague_to_specific.items():
            text = text.replace(vague, specific)
        
        # Füge strukturierte Elemente hinzu
        if "Fakt:" not in text and "Zahlen:" not in text:
            # Füge einen Fakten-Hinweis am Ende hinzu
            text += "\n\n📊 Ich kann dir gerne die genauen Zahlen und Studien zeigen."
        
        # Formellerer Ton
        text = text.replace("Hey", "Hallo")
        text = text.replace("geil", "hervorragend")
        text = text.replace("krass", "bemerkenswert")
        
        return text.strip()
    
    def _replace_variables(
        self,
        text: str,
        contact_name: Optional[str] = None,
        variables: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Ersetzt Variablen im Script-Text.
        """
        if contact_name:
            text = text.replace("[Name]", contact_name)
            text = text.replace("[NAME]", contact_name)
        
        if variables:
            for key, value in variables.items():
                text = text.replace(f"[{key}]", value)
                text = text.replace(f"[{key.upper()}]", value)
        
        return text
    
    def get_adaptation_hints(self, disg_type: DISGType) -> Dict[str, Any]:
        """
        Gibt Anpassungs-Hinweise für einen DISG-Typ zurück.
        """
        return self.adaptations.get(disg_type, {})
    
    def suggest_tone(self, disg_type: DISGType) -> str:
        """
        Empfiehlt den Ton für einen DISG-Typ.
        """
        tones = {
            DISGType.D: "direct",
            DISGType.I: "enthusiastic",
            DISGType.S: "reassuring",
            DISGType.G: "evidence_based",
        }
        return tones.get(disg_type, "neutral")


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = ["DISGScriptAdapter"]

