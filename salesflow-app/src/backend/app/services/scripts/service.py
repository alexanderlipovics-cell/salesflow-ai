"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT LIBRARY SERVICE                                                     ║
║  Hauptservice für Script-Verwaltung und -Abruf                              ║
╚════════════════════════════════════════════════════════════════════════════╝

API-Integration:
    GET /api/v2/scripts?context=followup&disg=S&relationship=warm
"""

from typing import Optional, List, Dict, Any
from uuid import uuid4
from datetime import datetime

from .models import (
    Script,
    ScriptCategory,
    ScriptContext,
    RelationshipLevel,
    DISGType,
    ScriptPerformance,
)
from .disg_adapter import DISGScriptAdapter


class ScriptLibraryService:
    """
    Service für die Script Library.
    
    Ermöglicht:
    - Abruf von Scripts nach Kontext, DISG-Typ und Beziehungslevel
    - Dynamische DISG-Anpassung
    - Performance-Tracking
    - A/B Testing
    """
    
    def __init__(self, db=None):
        """
        Initialisiert den Service.
        
        Args:
            db: Supabase Client (optional, für DB-Integration)
        """
        self.db = db
        self.adapter = DISGScriptAdapter()
        self._script_cache: Dict[str, Script] = {}
    
    # =========================================================================
    # SCRIPT RETRIEVAL
    # =========================================================================
    
    def get_scripts(
        self,
        category: Optional[ScriptCategory] = None,
        context: Optional[ScriptContext] = None,
        relationship_level: Optional[RelationshipLevel] = None,
        disg_type: Optional[DISGType] = None,
        vertical: str = "network_marketing",
        language: str = "de",
        limit: int = 10,
        adapt_to_disg: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Holt Scripts basierend auf Filtern.
        
        Args:
            category: Kategorie (erstkontakt, follow_up, etc.)
            context: Spezifischer Kontext
            relationship_level: Beziehungslevel (kalt, warm, heiss)
            disg_type: DISG-Persönlichkeitstyp
            vertical: Branche (default: network_marketing)
            language: Sprache (default: de)
            limit: Max. Anzahl Scripts
            adapt_to_disg: Ob Scripts an DISG angepasst werden sollen
            
        Returns:
            Liste von Script-Dictionaries
        """
        # Zuerst aus DB versuchen
        if self.db:
            scripts = self._get_from_db(
                category=category,
                context=context,
                relationship_level=relationship_level,
                vertical=vertical,
                language=language,
                limit=limit,
            )
        else:
            # Fallback auf In-Memory Scripts
            scripts = self._get_from_memory(
                category=category,
                context=context,
                relationship_level=relationship_level,
                vertical=vertical,
                limit=limit,
            )
        
        # DISG-Anpassung wenn gewünscht
        if adapt_to_disg and disg_type:
            scripts = [
                self._adapt_script_dict(s, disg_type)
                for s in scripts
            ]
        
        return scripts
    
    def get_script_by_id(
        self,
        script_id: str,
        disg_type: Optional[DISGType] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Holt ein einzelnes Script per ID.
        """
        if self.db:
            result = self.db.table("scripts").select("*").eq("id", script_id).single().execute()
            if result.data:
                script = self._row_to_dict(result.data)
                if disg_type:
                    script = self._adapt_script_dict(script, disg_type)
                return script
        
        # Fallback auf Cache
        if script_id in self._script_cache:
            script = self._script_cache[script_id].to_dict()
            if disg_type:
                script = self._adapt_script_dict(script, disg_type)
            return script
        
        return None
    
    def get_script_by_number(
        self,
        number: int,
        disg_type: Optional[DISGType] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Holt ein Script anhand seiner Nummer (1-52).
        """
        if self.db:
            result = self.db.table("scripts").select("*").eq("number", number).single().execute()
            if result.data:
                script = self._row_to_dict(result.data)
                if disg_type:
                    script = self._adapt_script_dict(script, disg_type)
                return script
        
        # Fallback
        for script in self._script_cache.values():
            if script.number == number:
                s_dict = script.to_dict()
                if disg_type:
                    s_dict = self._adapt_script_dict(s_dict, disg_type)
                return s_dict
        
        return None
    
    def search_scripts(
        self,
        query: str,
        disg_type: Optional[DISGType] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Sucht Scripts nach Keywords.
        """
        query_lower = query.lower()
        
        if self.db:
            # Full-text search in DB
            result = self.db.table("scripts").select("*").ilike(
                "text", f"%{query}%"
            ).limit(limit).execute()
            scripts = [self._row_to_dict(r) for r in result.data] if result.data else []
        else:
            # In-memory search
            scripts = []
            for script in self._script_cache.values():
                if query_lower in script.text.lower() or query_lower in script.name.lower():
                    scripts.append(script.to_dict())
                if len(scripts) >= limit:
                    break
        
        if disg_type:
            scripts = [self._adapt_script_dict(s, disg_type) for s in scripts]
        
        return scripts
    
    # =========================================================================
    # SMART SUGGESTION
    # =========================================================================
    
    def suggest_script(
        self,
        situation_description: str,
        disg_type: Optional[DISGType] = None,
        relationship_level: Optional[RelationshipLevel] = None,
        previous_interactions: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Schlägt das beste Script für eine Situation vor.
        
        Analysiert die Beschreibung und wählt das passendste Script.
        """
        # Keyword-basierte Kontext-Erkennung
        context = self._detect_context(situation_description)
        category = self._detect_category(situation_description)
        
        scripts = self.get_scripts(
            category=category,
            context=context,
            relationship_level=relationship_level,
            disg_type=disg_type,
            limit=3,
        )
        
        if scripts:
            # Wähle das beste basierend auf Performance
            best_script = max(
                scripts,
                key=lambda s: (s.get("performance", {}) or {}).get("conversion_rate", 0)
            )
            return best_script
        
        return None
    
    def _detect_context(self, text: str) -> Optional[ScriptContext]:
        """Erkennt den Kontext aus einer Beschreibung."""
        text_lower = text.lower()
        
        context_keywords = {
            ScriptContext.KEINE_ZEIT: ["keine zeit", "zu beschäftigt", "später"],
            ScriptContext.KEIN_GELD: ["kein geld", "zu teuer", "kann mir nicht leisten"],
            ScriptContext.PARTNER_FRAGEN: ["partner fragen", "frau fragen", "mann fragen"],
            ScriptContext.MLM_PYRAMIDE: ["pyramide", "mlm", "schneeballsystem"],
            ScriptContext.GHOSTED: ["antwortet nicht", "ghost", "keine antwort"],
            ScriptContext.NACHDENKEN: ["überlegen", "nachdenken", "drüber schlafen"],
            ScriptContext.WARM_FAMILIE: ["familie", "bruder", "schwester", "mutter"],
            ScriptContext.WARM_FREUNDE: ["freund", "kumpel", "bekannter"],
        }
        
        for context, keywords in context_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return context
        
        return None
    
    def _detect_category(self, text: str) -> Optional[ScriptCategory]:
        """Erkennt die Kategorie aus einer Beschreibung."""
        text_lower = text.lower()
        
        category_keywords = {
            ScriptCategory.EINWAND: ["einwand", "sagt nein", "lehnt ab", "bedenken"],
            ScriptCategory.FOLLOW_UP: ["nachfassen", "follow up", "nochmal schreiben"],
            ScriptCategory.CLOSING: ["abschluss", "closing", "deal machen"],
            ScriptCategory.ERSTKONTAKT: ["erstkontakt", "neu ansprechen", "cold"],
            ScriptCategory.REAKTIVIERUNG: ["reaktivieren", "inaktiv", "lange nicht"],
            ScriptCategory.ONBOARDING: ["neues teammitglied", "onboarding", "willkommen"],
        }
        
        for category, keywords in category_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return category
        
        return None
    
    # =========================================================================
    # PERFORMANCE TRACKING
    # =========================================================================
    
    def log_script_usage(
        self,
        script_id: str,
        user_id: str,
        was_sent: bool = True,
        got_reply: bool = False,
        was_positive: bool = False,
        converted: bool = False,
        response_time_minutes: Optional[int] = None,
        channel: Optional[str] = None,
        disg_type: Optional[DISGType] = None,
    ) -> bool:
        """
        Loggt die Verwendung eines Scripts für Performance-Tracking.
        """
        if not self.db:
            return False
        
        try:
            self.db.table("script_usage_logs").insert({
                "id": str(uuid4()),
                "script_id": script_id,
                "user_id": user_id,
                "was_sent": was_sent,
                "got_reply": got_reply,
                "was_positive": was_positive,
                "converted": converted,
                "response_time_minutes": response_time_minutes,
                "channel": channel,
                "disg_type": disg_type.value if disg_type else None,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            
            # Update Script Performance
            self._update_script_performance(script_id)
            
            return True
        except Exception as e:
            print(f"Error logging script usage: {e}")
            return False
    
    def _update_script_performance(self, script_id: str):
        """Aktualisiert die aggregierten Performance-Metriken eines Scripts."""
        if not self.db:
            return
        
        # Aggregate logs
        result = self.db.table("script_usage_logs").select(
            "was_sent, got_reply, was_positive, converted, response_time_minutes, disg_type, channel"
        ).eq("script_id", script_id).execute()
        
        if not result.data:
            return
        
        logs = result.data
        total = len(logs)
        sent = sum(1 for l in logs if l.get("was_sent"))
        replies = sum(1 for l in logs if l.get("got_reply"))
        positive = sum(1 for l in logs if l.get("was_positive"))
        converted = sum(1 for l in logs if l.get("converted"))
        
        response_times = [l["response_time_minutes"] for l in logs if l.get("response_time_minutes")]
        avg_response = sum(response_times) / len(response_times) if response_times else 0
        
        # Find best DISG type
        disg_conversions = {}
        for l in logs:
            if l.get("converted") and l.get("disg_type"):
                disg_type = l["disg_type"]
                disg_conversions[disg_type] = disg_conversions.get(disg_type, 0) + 1
        best_disg = max(disg_conversions, key=disg_conversions.get) if disg_conversions else None
        
        # Find best channel
        channel_conversions = {}
        for l in logs:
            if l.get("converted") and l.get("channel"):
                channel = l["channel"]
                channel_conversions[channel] = channel_conversions.get(channel, 0) + 1
        best_channel = max(channel_conversions, key=channel_conversions.get) if channel_conversions else None
        
        # Update script
        self.db.table("scripts").update({
            "usage_count": total,
            "reply_rate": (replies / sent * 100) if sent > 0 else 0,
            "positive_rate": (positive / replies * 100) if replies > 0 else 0,
            "conversion_rate": (converted / total * 100) if total > 0 else 0,
            "avg_response_time": avg_response,
            "best_for_disg": best_disg,
            "best_for_channel": best_channel,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", script_id).execute()
    
    def get_top_scripts(
        self,
        category: Optional[ScriptCategory] = None,
        metric: str = "conversion_rate",
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Holt die Top-performing Scripts.
        """
        if not self.db:
            return []
        
        query = self.db.table("scripts").select("*").order(metric, desc=True).limit(limit)
        
        if category:
            query = query.eq("category", category.value)
        
        result = query.execute()
        return [self._row_to_dict(r) for r in result.data] if result.data else []
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _get_from_db(
        self,
        category: Optional[ScriptCategory] = None,
        context: Optional[ScriptContext] = None,
        relationship_level: Optional[RelationshipLevel] = None,
        vertical: str = "network_marketing",
        language: str = "de",
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Holt Scripts aus der Datenbank."""
        query = self.db.table("scripts").select("*")
        
        if category:
            query = query.eq("category", category.value)
        if context:
            query = query.eq("context", context.value)
        if relationship_level:
            query = query.eq("relationship_level", relationship_level.value)
        
        query = query.eq("vertical", vertical).eq("language", language).limit(limit)
        
        result = query.execute()
        return [self._row_to_dict(r) for r in result.data] if result.data else []
    
    def _get_from_memory(
        self,
        category: Optional[ScriptCategory] = None,
        context: Optional[ScriptContext] = None,
        relationship_level: Optional[RelationshipLevel] = None,
        vertical: str = "network_marketing",
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Holt Scripts aus dem In-Memory Cache."""
        scripts = []
        for script in self._script_cache.values():
            if category and script.category != category:
                continue
            if context and script.context != context:
                continue
            if relationship_level and script.relationship_level != relationship_level:
                continue
            if script.vertical != vertical:
                continue
            
            scripts.append(script.to_dict())
            if len(scripts) >= limit:
                break
        
        return scripts
    
    def _adapt_script_dict(
        self,
        script_dict: Dict[str, Any],
        disg_type: DISGType,
    ) -> Dict[str, Any]:
        """Passt ein Script-Dictionary an einen DISG-Typ an."""
        # Erstelle temporäres Script-Objekt
        script = Script(
            id=script_dict.get("id", ""),
            number=script_dict.get("number", 0),
            name=script_dict.get("name", ""),
            category=ScriptCategory(script_dict.get("category", "erstkontakt")),
            context=ScriptContext(script_dict.get("context", "warm_familie")),
            relationship_level=RelationshipLevel(script_dict.get("relationship_level", "warm")),
            text=script_dict.get("text", ""),
        )
        
        adapted_text = self.adapter.adapt_script(script, disg_type)
        
        # Kopiere dict und ersetze Text
        result = script_dict.copy()
        result["text"] = adapted_text
        result["adapted_for_disg"] = disg_type.value
        result["tone_recommendation"] = self.adapter.suggest_tone(disg_type)
        
        return result
    
    def _row_to_dict(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Konvertiert eine DB-Row in ein Dictionary."""
        return {
            "id": row.get("id"),
            "number": row.get("number"),
            "name": row.get("name"),
            "category": row.get("category"),
            "context": row.get("context"),
            "relationship_level": row.get("relationship_level"),
            "text": row.get("text"),
            "description": row.get("description"),
            "variables": row.get("variables", []),
            "vertical": row.get("vertical"),
            "language": row.get("language"),
            "tags": row.get("tags", []),
            "performance": {
                "usage_count": row.get("usage_count", 0),
                "reply_rate": row.get("reply_rate", 0),
                "positive_rate": row.get("positive_rate", 0),
                "conversion_rate": row.get("conversion_rate", 0),
                "avg_response_time": row.get("avg_response_time", 0),
                "best_for_disg": row.get("best_for_disg"),
                "best_for_channel": row.get("best_for_channel"),
            },
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }
    
    # =========================================================================
    # SCRIPT MANAGEMENT
    # =========================================================================
    
    def add_script(self, script: Script) -> bool:
        """Fügt ein Script hinzu (Cache und optional DB)."""
        self._script_cache[script.id] = script
        
        if self.db:
            try:
                self.db.table("scripts").insert(script.to_dict()).execute()
                return True
            except Exception as e:
                print(f"Error adding script to DB: {e}")
                return False
        
        return True
    
    def load_scripts_from_seed(self, scripts: List[Script]):
        """Lädt Scripts aus Seed-Daten in den Cache."""
        for script in scripts:
            self._script_cache[script.id] = script


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = ["ScriptLibraryService"]

