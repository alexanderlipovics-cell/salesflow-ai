"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVE ASSIST SERVICE                                                       ║
║  Core Logic für Echtzeit-Verkaufsassistenz                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Session Management (Start, End, Stats)
    - Intent Detection (Pattern + AI)
    - Knowledge Retrieval (Facts, Objections, Products)
    - AI Response Generation mit Claude
"""

from typing import Optional, Dict, Any, List, Tuple
from uuid import UUID
import json
import time
import os
import re

from supabase import Client
import anthropic

from ...api.schemas.live_assist import (
    StartSessionRequest,
    StartSessionResponse,
    LiveQueryRequest,
    LiveQueryResponse,
    EndSessionRequest,
    SessionStatsResponse,
    AssistIntent,
    QuickFactItem,
)
from ...config.prompts.live_assist_prompt import (
    build_live_assist_prompt,
    build_intent_detection_prompt,
)


class LiveAssistService:
    """
    Echtzeit-Verkaufsassistenz während Kundengesprächen.
    
    Das "Gehirn" hinter dem Live Assist Mode - schnell, präzise, überzeugend.
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.anthropic = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    # =========================================================================
    # SESSION MANAGEMENT
    # =========================================================================
    
    def start_session(
        self,
        user_id: str,
        request: StartSessionRequest,
    ) -> StartSessionResponse:
        """
        Startet eine Live Assist Session.
        
        Lädt Key Facts und Produkte vor für schnellen Zugriff.
        """
        
        # Create session
        result = self.db.table("live_assist_sessions").insert({
            "user_id": user_id,
            "company_id": request.company_id,
            "vertical": request.vertical,
            "lead_id": request.lead_id,
        }).execute()
        
        if not result.data:
            raise ValueError("Fehler beim Erstellen der Session")
        
        session_id = result.data[0]["id"]
        
        # Get company info
        company_name = None
        if request.company_id:
            company_result = self.db.table("companies").select("name").eq(
                "id", request.company_id
            ).single().execute()
            company_name = company_result.data.get("name") if company_result.data else None
        
        # Preload key facts
        key_facts = self._get_key_facts(request.company_id, request.vertical)
        
        # Preload products
        products = self._get_products(request.company_id)
        
        return StartSessionResponse(
            session_id=session_id,
            company_name=company_name,
            key_facts=key_facts,
            available_products=products,
            message=f"Live Assist für {company_name or 'allgemein'} aktiv. Frag mich was!",
        )
    
    def end_session(
        self,
        user_id: str,
        request: EndSessionRequest,
    ) -> Dict[str, Any]:
        """Beendet eine Live Assist Session mit optionalem Feedback."""
        
        # Calculate duration
        session_result = self.db.table("live_assist_sessions").select(
            "started_at"
        ).eq("id", request.session_id).eq("user_id", user_id).single().execute()
        
        if not session_result.data:
            raise ValueError("Session nicht gefunden")
        
        # Update session
        update_data = {
            "ended_at": "now()",
            "session_outcome": request.outcome.value if request.outcome else None,
            "user_rating": request.user_rating,
            "user_feedback": request.user_feedback,
        }
        
        self.db.table("live_assist_sessions").update(update_data).eq(
            "id", request.session_id
        ).eq("user_id", user_id).execute()
        
        # Calculate and update duration
        self.db.rpc("update_session_duration", {
            "p_session_id": request.session_id
        }).execute()
        
        return {"success": True, "message": "Session beendet."}
    
    def get_session_stats(
        self,
        user_id: str,
        session_id: str,
    ) -> SessionStatsResponse:
        """Holt Statistiken einer Session."""
        
        session = self.db.table("live_assist_sessions").select("*").eq(
            "id", session_id
        ).eq("user_id", user_id).single().execute()
        
        if not session.data:
            raise ValueError("Session nicht gefunden")
        
        data = session.data
        
        # Get most asked topics
        queries = self.db.table("live_assist_queries").select(
            "detected_intent, detected_objection_type"
        ).eq("session_id", session_id).execute()
        
        intent_counts: Dict[str, int] = {}
        objection_types: List[str] = []
        
        for q in queries.data or []:
            intent = q.get("detected_intent")
            if intent:
                intent_counts[intent] = intent_counts.get(intent, 0) + 1
            
            obj_type = q.get("detected_objection_type")
            if obj_type and obj_type not in objection_types:
                objection_types.append(obj_type)
        
        # Sort by count
        most_asked = sorted(intent_counts.keys(), key=lambda x: -intent_counts[x])[:5]
        
        return SessionStatsResponse(
            session_id=session_id,
            duration_seconds=data.get("duration_seconds", 0) or 0,
            queries_count=data.get("queries_count", 0) or 0,
            facts_served=data.get("facts_served", 0) or 0,
            objections_handled=data.get("objections_handled", 0) or 0,
            most_asked_topics=most_asked,
            objections_encountered=objection_types,
        )
    
    # =========================================================================
    # QUERY PROCESSING
    # =========================================================================
    
    def process_query(
        self,
        user_id: str,
        request: LiveQueryRequest,
    ) -> LiveQueryResponse:
        """
        Verarbeitet eine Live-Anfrage.
        
        Flow:
        1. Session validieren
        2. Intent erkennen
        3. Passende Antwort finden (DB first, dann AI)
        4. Response loggen
        """
        
        start_time = time.time()
        
        # Get session context
        session = self.db.table("live_assist_sessions").select(
            "company_id, vertical"
        ).eq("id", request.session_id).eq("user_id", user_id).single().execute()
        
        if not session.data:
            raise ValueError("Session nicht gefunden")
        
        company_id = session.data.get("company_id")
        vertical = session.data.get("vertical")
        
        # Detect intent
        intent, objection_type, product_id = self._detect_intent(
            request.query_text,
            request.explicit_intent,
        )
        
        # Find response based on intent
        response_text = None
        response_short = None
        source = "ai_generated"
        source_id = None
        follow_up = None
        technique = None
        related_facts: List[Dict[str, Any]] = []
        
        # Try to find from database first
        if intent == AssistIntent.objection and objection_type:
            db_response = self._find_objection_response(company_id, objection_type)
            if db_response:
                response_text = db_response.get("response_full") or db_response.get("response_short")
                response_short = db_response.get("response_short")
                follow_up = db_response.get("follow_up_question")
                technique = db_response.get("response_technique")
                source = "objection_responses"
                source_id = db_response.get("id")
        
        elif intent == AssistIntent.facts:
            facts = self._find_relevant_facts(company_id, request.query_text, vertical)
            if facts:
                response_text = " ".join([f.get("fact_value", "") for f in facts[:3]])
                response_short = facts[0].get("fact_short") if facts else None
                source = "quick_facts"
                related_facts = facts[1:4] if len(facts) > 1 else []
        
        elif intent == AssistIntent.usp:
            usp_facts = self._get_usp_facts(company_id)
            if usp_facts:
                response_text = " ".join([f.get("fact_value", "") for f in usp_facts[:2]])
                response_short = usp_facts[0].get("fact_short") if usp_facts else None
                source = "quick_facts"
        
        elif intent == AssistIntent.product_info and (request.product_id or product_id):
            product = self._get_product_info(request.product_id or product_id)
            if product:
                response_text = f"{product.get('name', 'Produkt')}: {product.get('description', '')}"
                response_short = product.get("tagline")
                source = "company_products"
                source_id = product.get("id")
        
        elif intent == AssistIntent.science:
            science_facts = self._get_science_facts(company_id, request.query_text)
            if science_facts:
                response_text = " ".join([f.get("fact_value", "") for f in science_facts[:2]])
                response_short = science_facts[0].get("fact_short") if science_facts else None
                source = "quick_facts"
        
        # If no DB response, generate with Claude
        if not response_text:
            response_text, response_short = self._generate_response(
                query=request.query_text,
                intent=intent,
                company_id=company_id,
                vertical=vertical,
            )
            source = "ai_generated"
        
        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Log query
        self._log_query(
            session_id=request.session_id,
            user_id=user_id,
            query_text=request.query_text,
            query_type=request.query_type.value,
            detected_intent=intent.value,
            objection_type=objection_type,
            response_text=response_text,
            response_source=source,
            response_time_ms=response_time_ms,
            product_id=request.product_id or product_id,
        )
        
        # Update session stats
        self._update_session_stats(
            request.session_id,
            intent,
            objection_type,
        )
        
        return LiveQueryResponse(
            response_text=response_text,
            response_short=response_short,
            detected_intent=intent,
            confidence=0.9,
            source=source,
            source_id=source_id,
            follow_up_question=follow_up,
            related_facts=related_facts,
            objection_type=objection_type,
            response_technique=technique,
            response_time_ms=response_time_ms,
        )
    
    # =========================================================================
    # INTENT DETECTION
    # =========================================================================
    
    def _detect_intent(
        self,
        query: str,
        explicit_intent: Optional[AssistIntent] = None,
    ) -> Tuple[AssistIntent, Optional[str], Optional[str]]:
        """
        Erkennt Intent der Anfrage.
        
        Returns:
            Tuple von (intent, objection_type, product_id)
        """
        
        if explicit_intent:
            return explicit_intent, None, None
        
        query_lower = query.lower()
        
        # Quick pattern matching first (fast path)
        
        # Check for "Kunde sagt" pattern - always objection
        if "kunde" in query_lower and any(kw in query_lower for kw in ["sagt", "meint", "fragt", "behauptet"]):
            obj_type = self._detect_objection_type(query_lower)
            return AssistIntent.objection, obj_type, None
        
        # Objection patterns (direct)
        objection_keywords = {
            "price": ["zu teuer", "kein budget", "kostet zu viel", "kann mir nicht leisten", "billiger", "günstiger"],
            "time": ["keine zeit", "zu beschäftigt", "später", "nicht jetzt"],
            "think_about_it": ["überlegen", "drüber schlafen", "nochmal nachdenken", "muss schauen"],
            "trust": ["skeptisch", "glaub nicht", "mlm", "pyramide", "zu schön", "zu gut um wahr"],
            "need": ["brauch nicht", "brauch ich nicht", "esse fisch", "gesund", "hab schon"],
            "competitor": ["andere firma", "schon was", "nehme bereits", "nutze schon"],
        }
        
        for obj_type, keywords in objection_keywords.items():
            for kw in keywords:
                if kw in query_lower:
                    return AssistIntent.objection, obj_type, None
        
        # USP patterns
        if any(kw in query_lower for kw in ["warum", "besonders", "unterschied", "einzigartig", "anders", "vorteil"]):
            return AssistIntent.usp, None, None
        
        # Facts patterns
        if any(kw in query_lower for kw in ["zahl", "statistik", "prozent", "wie viele", "daten", "fakt"]):
            return AssistIntent.facts, None, None
        
        # Science patterns
        if any(kw in query_lower for kw in ["studie", "wissenschaft", "bewiesen", "forschung", "evidenz", "belegt"]):
            return AssistIntent.science, None, None
        
        # Pricing patterns
        if any(kw in query_lower for kw in ["preis", "kostet", "kosten", "wie teuer", "was kostet"]):
            return AssistIntent.pricing, None, None
        
        # Comparison patterns
        if any(kw in query_lower for kw in ["vergleich", "besser als", "konkurrenz", "alternativ", "vs"]):
            return AssistIntent.comparison, None, None
        
        # Story patterns
        if any(kw in query_lower for kw in ["erzähl", "geschichte", "gründer", "angefangen", "story", "wie entstand"]):
            return AssistIntent.story, None, None
        
        # Product patterns
        if any(kw in query_lower for kw in ["was ist", "wie funktioniert", "erkläre", "produkt"]):
            return AssistIntent.product_info, None, None
        
        # Default: quick answer
        return AssistIntent.quick_answer, None, None
    
    def _detect_objection_type(self, query_lower: str) -> Optional[str]:
        """Erkennt den spezifischen Einwand-Typ."""
        
        objection_patterns = {
            "price": ["teuer", "budget", "geld", "kostet", "preis", "leisten"],
            "time": ["zeit", "beschäftigt", "stress", "später"],
            "think_about_it": ["überlegen", "nachdenken", "schauen", "schlafen"],
            "trust": ["skeptisch", "glaub", "mlm", "pyramide", "vertrauen"],
            "need": ["brauch", "nötig", "fisch", "gesund", "ernähr"],
            "competitor": ["andere", "schon", "bereits", "nutze"],
        }
        
        for obj_type, patterns in objection_patterns.items():
            if any(p in query_lower for p in patterns):
                return obj_type
        
        return "unknown"
    
    # =========================================================================
    # DATABASE LOOKUPS
    # =========================================================================
    
    def _find_objection_response(
        self,
        company_id: Optional[str],
        objection_type: str,
    ) -> Optional[Dict[str, Any]]:
        """Findet passende Einwand-Antwort aus der Datenbank."""
        
        query = self.db.table("objection_responses").select("*").eq(
            "objection_type", objection_type
        ).eq("is_active", True)
        
        if company_id:
            # Versuche zuerst firmenspezifische Antwort
            company_result = query.eq("company_id", company_id).order(
                "success_rate", desc=True
            ).limit(1).execute()
            
            if company_result.data:
                return company_result.data[0]
        
        # Fallback auf allgemeine Antwort
        general_result = self.db.table("objection_responses").select("*").eq(
            "objection_type", objection_type
        ).eq("is_active", True).is_("company_id", "null").order(
            "success_rate", desc=True
        ).limit(1).execute()
        
        return general_result.data[0] if general_result.data else None
    
    def _find_relevant_facts(
        self,
        company_id: Optional[str],
        query: str,
        vertical: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Findet relevante Quick Facts."""
        
        # Basis-Query
        db_query = self.db.table("quick_facts").select("*").eq("is_active", True)
        
        # Filter nach Company oder Vertical
        if company_id:
            db_query = db_query.or_(f"company_id.eq.{company_id},company_id.is.null")
        
        results = db_query.order("importance", desc=True).limit(10).execute()
        
        if not results.data:
            return []
        
        # Simple keyword matching für Relevanz
        query_words = set(query.lower().split())
        scored_facts = []
        
        for fact in results.data:
            fact_text = f"{fact.get('fact_key', '')} {fact.get('fact_value', '')}".lower()
            score = sum(1 for word in query_words if word in fact_text)
            scored_facts.append((score, fact))
        
        # Sort by relevance score
        scored_facts.sort(key=lambda x: -x[0])
        
        return [f[1] for f in scored_facts[:5]]
    
    def _get_key_facts(
        self,
        company_id: Optional[str],
        vertical: Optional[str],
    ) -> List[QuickFactItem]:
        """Holt Key Facts für Session-Start."""
        
        query = self.db.table("quick_facts").select(
            "fact_key, fact_value, fact_short, fact_type, is_key_fact, source"
        ).eq("is_active", True).eq("is_key_fact", True)
        
        if company_id:
            query = query.or_(f"company_id.eq.{company_id},company_id.is.null")
        elif vertical:
            query = query.or_(f"vertical.eq.{vertical},vertical.is.null")
        
        results = query.order("importance", desc=True).limit(10).execute()
        
        return [
            QuickFactItem(
                fact_key=r.get("fact_key", ""),
                fact_value=r.get("fact_value", ""),
                fact_short=r.get("fact_short"),
                fact_type=r.get("fact_type", "benefit"),
                is_key_fact=r.get("is_key_fact", False),
                source=r.get("source"),
            )
            for r in (results.data or [])
        ]
    
    def _get_usp_facts(self, company_id: Optional[str]) -> List[Dict[str, Any]]:
        """Holt USP-relevante Fakten."""
        
        query = self.db.table("quick_facts").select("*").eq(
            "fact_type", "differentiator"
        ).eq("is_active", True)
        
        if company_id:
            query = query.or_(f"company_id.eq.{company_id},company_id.is.null")
        
        results = query.order("importance", desc=True).limit(3).execute()
        
        return results.data or []
    
    def _get_science_facts(
        self, 
        company_id: Optional[str], 
        query: str
    ) -> List[Dict[str, Any]]:
        """Holt wissenschaftliche Fakten."""
        
        # Facts mit Studien-Bezug
        db_query = self.db.table("quick_facts").select("*").eq(
            "is_active", True
        ).not_.is_("source", "null")
        
        if company_id:
            db_query = db_query.or_(f"company_id.eq.{company_id},company_id.is.null")
        
        results = db_query.order("importance", desc=True).limit(5).execute()
        
        return results.data or []
    
    def _get_products(self, company_id: Optional[str]) -> List[Dict[str, Any]]:
        """Holt Produkte für Session."""
        
        if not company_id:
            return []
        
        results = self.db.table("company_products").select(
            "id, name, tagline, category, description"
        ).eq("company_id", company_id).eq("is_active", True).order(
            "sort_order"
        ).limit(10).execute()
        
        return results.data or []
    
    def _get_product_info(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Holt Produkt-Details."""
        
        result = self.db.table("company_products").select("*").eq(
            "id", product_id
        ).single().execute()
        
        return result.data
    
    # =========================================================================
    # AI GENERATION
    # =========================================================================
    
    def _generate_response(
        self,
        query: str,
        intent: AssistIntent,
        company_id: Optional[str],
        vertical: Optional[str],
    ) -> Tuple[str, Optional[str]]:
        """Generiert Antwort mit Claude."""
        
        # Get context
        facts = self._get_key_facts(company_id, vertical)
        products = self._get_products(company_id) if company_id else []
        
        # Get objection responses for context
        objection_responses = []
        if intent == AssistIntent.objection:
            obj_results = self.db.table("objection_responses").select(
                "objection_type, response_short"
            ).eq("is_active", True).limit(5).execute()
            objection_responses = obj_results.data or []
        
        # Get company name
        company_name = None
        if company_id:
            result = self.db.table("companies").select("name").eq(
                "id", company_id
            ).single().execute()
            company_name = result.data.get("name") if result.data else None
        
        # Get guardrails
        guardrails = []
        if company_id:
            guardrails_result = self.db.table("company_guardrails").select(
                "content"
            ).eq("company_id", company_id).eq("is_active", True).limit(5).execute()
            guardrails = [g.get("content", "") for g in (guardrails_result.data or [])]
        
        # Build prompt
        system_prompt = build_live_assist_prompt(
            company_name=company_name,
            available_facts=[f.model_dump() for f in facts],
            available_products=products,
            objection_responses=objection_responses,
            guardrails=guardrails,
        )
        
        # Call Claude
        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,  # Keep it short!
                system=system_prompt,
                messages=[{"role": "user", "content": query}]
            )
            
            response_text = response.content[0].text
            
            # Generate short version if response is long
            response_short = None
            if len(response_text) > 150:
                # Take first sentence or first 100 chars
                sentences = response_text.split('.')
                first_sentence = sentences[0] + '.' if sentences else response_text
                response_short = first_sentence if len(first_sentence) < 100 else response_text[:100] + '...'
            
            return response_text, response_short
            
        except Exception as e:
            print(f"Claude API error: {e}")
            return "Entschuldigung, ich konnte keine Antwort generieren. Versuch es nochmal.", None
    
    # =========================================================================
    # LOGGING & STATS
    # =========================================================================
    
    def _log_query(
        self,
        session_id: str,
        user_id: str,
        query_text: str,
        query_type: str,
        detected_intent: str,
        objection_type: Optional[str],
        response_text: str,
        response_source: str,
        response_time_ms: int,
        product_id: Optional[str] = None,
    ):
        """Loggt Query für Analytics."""
        
        self.db.table("live_assist_queries").insert({
            "session_id": session_id,
            "user_id": user_id,
            "query_text": query_text,
            "query_type": query_type,
            "detected_intent": detected_intent,
            "detected_objection_type": objection_type,
            "detected_product_id": product_id,
            "response_text": response_text,
            "response_source": response_source,
            "response_time_ms": response_time_ms,
        }).execute()
    
    def _update_session_stats(
        self,
        session_id: str,
        intent: AssistIntent,
        objection_type: Optional[str],
    ):
        """Aktualisiert Session-Stats."""
        
        # Get current stats
        session = self.db.table("live_assist_sessions").select(
            "queries_count, facts_served, objections_handled"
        ).eq("id", session_id).single().execute()
        
        if not session.data:
            return
        
        data = session.data
        
        update_data = {
            "queries_count": (data.get("queries_count") or 0) + 1,
        }
        
        if intent == AssistIntent.facts:
            update_data["facts_served"] = (data.get("facts_served") or 0) + 1
        
        if objection_type:
            update_data["objections_handled"] = (data.get("objections_handled") or 0) + 1
        
        self.db.table("live_assist_sessions").update(update_data).eq(
            "id", session_id
        ).execute()
    
    # =========================================================================
    # QUICK ACCESS (ohne Session)
    # =========================================================================
    
    def get_quick_facts(
        self,
        company_id: Optional[str] = None,
        vertical: Optional[str] = None,
        fact_type: Optional[str] = None,
        key_only: bool = False,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Holt Quick Facts ohne aktive Session."""
        
        query = self.db.table("quick_facts").select("*").eq("is_active", True)
        
        if company_id:
            query = query.or_(f"company_id.eq.{company_id},company_id.is.null")
        
        if vertical:
            query = query.or_(f"vertical.eq.{vertical},vertical.is.null")
        
        if fact_type:
            query = query.eq("fact_type", fact_type)
        
        if key_only:
            query = query.eq("is_key_fact", True)
        
        results = query.order("importance", desc=True).limit(limit).execute()
        
        return results.data or []
    
    def get_objection_responses(
        self,
        company_id: Optional[str] = None,
        objection_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Holt Einwand-Antworten ohne aktive Session."""
        
        query = self.db.table("objection_responses").select("*").eq("is_active", True)
        
        if company_id:
            query = query.or_(f"company_id.eq.{company_id},company_id.is.null")
        
        if objection_type:
            query = query.eq("objection_type", objection_type)
        
        results = query.order("success_rate", desc=True).execute()
        
        return results.data or []
    
    def get_vertical_knowledge(
        self,
        vertical: str,
        knowledge_type: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Holt Branchenwissen."""
        
        db_query = self.db.table("vertical_knowledge").select("*").eq(
            "vertical", vertical
        ).eq("is_active", True)
        
        if knowledge_type:
            db_query = db_query.eq("knowledge_type", knowledge_type)
        
        results = db_query.limit(limit).execute()
        
        if not results.data:
            return []
        
        # Filter by query if provided
        if query:
            query_words = set(query.lower().split())
            filtered = []
            for item in results.data:
                text = f"{item.get('topic', '')} {item.get('answer_short', '')}".lower()
                if any(word in text for word in query_words):
                    filtered.append(item)
            return filtered[:limit]
        
        return results.data

