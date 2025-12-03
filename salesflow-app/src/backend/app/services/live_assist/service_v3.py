"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVE ASSIST SERVICE v3.3                                                  ║
║  Production-Ready mit Cache, Emotion Engine & Learning                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Performance-Ziele:
    - Cache-Hit: < 50ms
    - Cache-Hit + Formatting: < 100ms
    - Cache-Miss + LLM: < 500ms
    - Ziel: 90% aller Queries < 200ms
"""

from typing import Optional, Dict, Any, List, Tuple
from uuid import UUID
import json
import time
import os

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
from ...config.prompts.live_assist_prompt_v3 import (
    build_live_assist_prompt_v3,
)
from ...config.verticals import (
    get_vertical_config,
    get_vertical_prompt_additions,
    is_high_compliance_vertical,
)

from .cache import LiveAssistCache, get_cache
from .emotion import EmotionAnalysis, analyze_emotion, get_tone_instruction
from .intent_detection import (
    IntentResult,
    detect_intent,
    detect_language,
    record_intent_correction,
)

# 🆕 Security & Compliance Modules
from ...config.prompts.locked_block import (
    apply_locked_block,
    LOCKED_BLOCK_INSTRUCTIONS,
)
from ...config.prompts.liability_shield import (
    apply_liability_shield,
    get_compliance_score,
    LIABILITY_SHIELD_INSTRUCTIONS,
)
from .disc_profiler import profile_disc, get_disc_system_instruction


class LiveAssistServiceV3:
    """
    Live Assist Service v3.3 - Production Ready.
    
    Neuerungen:
    - Session-Cache für schnelle Responses
    - Emotion Engine für Tone Adaptation
    - Multi-Language Intent Detection
    - Learning from User Feedback
    """
    
    def __init__(self, db: Client, cache: Optional[LiveAssistCache] = None):
        """
        Initialisiert den Service.
        
        Args:
            db: Supabase Client
            cache: Optional Cache Instance (sonst Singleton)
        """
        self.db = db
        self.cache = cache or get_cache()
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
        Startet eine Live Assist Session mit Preloading.
        
        Macht ALLE DB-Calls JETZT, nicht bei jeder Query.
        """
        start_time = time.time()
        
        # Session erstellen (la_sessions = live assist sessions)
        result = self.db.table("la_sessions").insert({
            "user_id": user_id,
            "company_id": request.company_id,
            "vertical": request.vertical,
            "lead_id": request.lead_id,
        }).execute()
        
        if not result.data:
            raise ValueError("Fehler beim Erstellen der Session")
        
        session_id = result.data[0]["id"]
        
        # Company Info
        company_name = None
        if request.company_id:
            company_result = self.db.table("companies").select("name, vertical").eq(
                "id", request.company_id
            ).single().execute()
            if company_result.data:
                company_name = company_result.data.get("name")
        
        # Cache Preloading - DAS ist der Performance-Boost!
        vertical = request.vertical
        if not vertical and company_result and company_result.data:
            vertical = company_result.data.get("vertical")
        
        cached_data = self.cache.preload_session(
            session_id=session_id,
            company_id=request.company_id,
            vertical=vertical,
            db=self.db
        )
        
        # Key Facts für Response
        key_facts = [
            QuickFactItem(
                fact_key=f.get("fact_key", ""),
                fact_value=f.get("fact_value", ""),
                fact_short=f.get("fact_short"),
                fact_type=f.get("fact_type", "benefit"),
                is_key_fact=f.get("is_key_fact", False),
                source=f.get("source"),
            )
            for f in cached_data.get("quick_facts", [])[:10]
            if f.get("is_key_fact")
        ]
        
        # Products
        products = cached_data.get("products", [])
        
        preload_time = int((time.time() - start_time) * 1000)
        
        return StartSessionResponse(
            session_id=session_id,
            company_name=company_name,
            key_facts=key_facts,
            available_products=products,
            message=f"Live Assist für {company_name or 'allgemein'} aktiv ({preload_time}ms).",
        )
    
    def end_session(
        self,
        user_id: str,
        request: EndSessionRequest,
    ) -> Dict[str, Any]:
        """Beendet eine Live Assist Session."""
        
        # Update Session
        update_data = {
            "ended_at": "now()",
            "session_outcome": request.outcome.value if request.outcome else None,
            "user_rating": request.user_rating,
            "user_feedback": request.user_feedback,
        }
        
        self.db.table("la_sessions").update(update_data).eq(
            "id", request.session_id
        ).eq("user_id", user_id).execute()
        
        # Duration berechnen
        self.db.rpc("la_update_session_duration", {
            "p_session_id": request.session_id
        }).execute()
        
        # Cache invalidieren
        self.cache.invalidate_session(request.session_id)
        
        return {"success": True, "message": "Session beendet."}
    
    # =========================================================================
    # QUERY PROCESSING - Das Herzstück!
    # =========================================================================
    
    def process_query(
        self,
        user_id: str,
        request: LiveQueryRequest,
    ) -> LiveQueryResponse:
        """
        Verarbeitet eine Live-Anfrage mit Cache & Emotion Engine.
        
        Flow:
        1. Cache holen (kein DB-Call!)
        2. Intent Detection (schnell)
        3. Emotion Analyse (schnell)
        4. Response aus Cache suchen (kein DB-Call!)
        5. Nur wenn nötig: LLM-Call
        """
        start_time = time.time()
        
        # 1. Session Context aus Cache
        cached = self.cache.get_session_cache(request.session_id)
        
        if not cached:
            # Fallback: Session aus DB laden
            session = self.db.table("la_sessions").select(
                "company_id, vertical"
            ).eq("id", request.session_id).eq("user_id", user_id).single().execute()
            
            if not session.data:
                raise ValueError("Session nicht gefunden")
            
            # Cache neu laden
            cached = self.cache.preload_session(
                session_id=request.session_id,
                company_id=session.data.get("company_id"),
                vertical=session.data.get("vertical"),
                db=self.db
            )
        
        company_id = cached.get("company_id")
        vertical = cached.get("vertical")
        
        # 2. Sprache erkennen
        language = detect_language(request.query_text)
        
        # 2.5 🔒 LOCKED BLOCK™ - Security Check (mit Logging)
        should_block, deflection_response = apply_locked_block(
            query=request.query_text,
            user_id=user_id,
            session_id=request.session_id
        )
        if should_block:
            # Jailbreak/Manipulation-Versuch erkannt → Ablenkungs-Antwort
            response_time = int((time.time() - start_time) * 1000)
            return LiveQueryResponse(
                session_id=request.session_id,
                response_text=deflection_response,
                response_short=deflection_response,
                detected_intent=AssistIntent.quick_answer,
                confidence=1.0,
                source="locked_block",
                response_time_ms=response_time,
                contact_mood="neutral",
                tone_hint="neutral",
            )
        
        # 3. Intent Detection (Pattern-based, schnell!)
        intent_result = detect_intent(
            query=request.query_text,
            language=language,
            company_id=company_id,
            db=self.db,
            explicit_intent=request.explicit_intent.value if request.explicit_intent else None
        )
        
        intent = AssistIntent(intent_result.intent) if intent_result.intent in [e.value for e in AssistIntent] else AssistIntent.quick_answer
        objection_type = intent_result.objection_type
        
        # 4. Emotion Analyse (Pattern-based, schnell!)
        emotion = analyze_emotion(
            query=request.query_text,
            intent=intent.value,
            objection_type=objection_type,
            vertical=cached.get("vertical")
        )
        
        # 5. Response suchen - erst Cache, dann LLM
        response_text = None
        response_short = None
        source = "ai_generated"
        source_id = None
        follow_up = None
        technique = None
        related_facts: List[Dict[str, Any]] = []
        
        # 5a. Cache-basierte Response
        if intent == AssistIntent.objection and objection_type:
            cache_response = self._find_cached_objection_response(
                objection_type=objection_type,
                cached_data=cached,
                tone_hint=emotion.tone_hint
            )
            if cache_response:
                response_text = cache_response.get("response_text")
                response_short = cache_response.get("response_short")
                follow_up = cache_response.get("follow_up")
                technique = cache_response.get("technique")
                source = "objection_responses"
                source_id = cache_response.get("id")
        
        elif intent == AssistIntent.facts:
            cache_response = self._find_cached_facts(
                query=request.query_text,
                cached_data=cached
            )
            if cache_response:
                response_text = cache_response.get("response_text")
                response_short = cache_response.get("response_short")
                related_facts = cache_response.get("related_facts", [])
                source = "quick_facts"
        
        elif intent == AssistIntent.usp:
            cache_response = self._find_cached_usps(cached_data=cached)
            if cache_response:
                response_text = cache_response.get("response_text")
                response_short = cache_response.get("response_short")
                source = "quick_facts"
        
        elif intent == AssistIntent.product_info and request.product_id:
            cache_response = self._find_cached_product(
                product_id=request.product_id,
                cached_data=cached
            )
            if cache_response:
                response_text = cache_response.get("response_text")
                response_short = cache_response.get("response_short")
                source = "company_products"
                source_id = request.product_id
        
        # 5b. LLM Fallback (nur wenn nötig)
        if not response_text:
            response_text, response_short = self._generate_response_v3(
                query=request.query_text,
                intent=intent,
                emotion=emotion,
                cached_data=cached
            )
            source = "ai_generated"
        
        # 6. Response Time
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # 7. Query loggen (mit Emotion-Daten)
        self._log_query_v3(
            session_id=request.session_id,
            user_id=user_id,
            query_text=request.query_text,
            query_type=request.query_type.value,
            detected_intent=intent.value,
            objection_type=objection_type,
            response_text=response_text,
            response_source=source,
            response_time_ms=response_time_ms,
            emotion=emotion,
            product_id=request.product_id,
        )
        
        # 8. Session Stats updaten
        self._update_session_stats(
            request.session_id,
            intent,
            objection_type,
        )
        
        # 9. ⚖️ LIABILITY SHIELD™ - Compliance Check
        compliance_score = 100.0  # Default: 100% compliant
        compliance_issues = 0
        
        is_high_compliance = is_high_compliance_vertical(vertical)
        if response_text and (is_high_compliance or vertical in ("health_wellness", "financial_services")):
            corrected_text, issues, disclaimer = apply_liability_shield(response_text, vertical)
            compliance_issues = len(issues)
            # Score berechnen: -10% pro Issue, minimum 0%
            compliance_score = max(0.0, 100.0 - (compliance_issues * 10))
            
            if issues:
                response_text = corrected_text
                # Optional: Disclaimer anhängen bei High-Compliance
                if disclaimer and compliance_issues > 0:
                    response_text += f"\n\n{disclaimer.strip()}"
                # Auch short version korrigieren
                if response_short:
                    response_short, _, _ = apply_liability_shield(response_short, vertical)
        
        # 10. 🧠 DISC Profiler - Kunden-Typ erkennen (AKKUMULIERT über alle Nachrichten)
        disc_profile = None
        try:
            # Nachricht zur Historie hinzufügen
            self.cache.add_message_to_history(request.session_id, request.query_text, "user")
            
            # Alle User-Nachrichten der Session sammeln
            all_user_messages = self.cache.get_user_messages(request.session_id)
            
            # Falls keine Historie, nur aktuelle Nachricht nutzen
            if not all_user_messages:
                all_user_messages = [request.query_text]
            
            # DISC-Profil über ALLE Nachrichten berechnen
            disc_result = profile_disc(all_user_messages)
            
            if disc_result.confidence > 0.2:  # Niedrigere Schwelle für akkumuliertes Profil
                disc_profile = {
                    "primary_type": disc_result.primary_type.value,
                    "secondary_type": disc_result.secondary_type.value if disc_result.secondary_type else None,
                    "confidence": disc_result.confidence,
                    "scores": disc_result.scores,
                    "communication_style": disc_result.communication_style,
                    "tone_recommendation": disc_result.tone_recommendation,
                    "messages_analyzed": len(all_user_messages),
                }
                
                # Akkumuliertes Profil im Cache speichern
                self.cache.update_disc_profile(request.session_id, disc_profile)
        except Exception as e:
            print(f"DISC Profiler Error: {e}")
            # Fallback auf gecachtes Profil
            disc_profile = self.cache.get_disc_profile(request.session_id)
        
        return LiveQueryResponse(
            response_text=response_text,
            response_short=response_short,
            detected_intent=intent,
            confidence=intent_result.confidence,
            source=source,
            source_id=source_id,
            follow_up_question=follow_up,
            related_facts=related_facts,
            objection_type=objection_type,
            response_technique=technique,
            response_time_ms=response_time_ms,
            contact_mood=emotion.contact_mood,
            engagement_level=emotion.engagement_level,
            decision_tendency=emotion.decision_tendency,
            tone_hint=emotion.tone_hint,
            disc_profile=disc_profile,
            compliance_score=compliance_score,
            compliance_issues=compliance_issues,
        )
    
    # =========================================================================
    # CACHE-BASIERTE LOOKUPS
    # =========================================================================
    
    def _find_cached_objection_response(
        self,
        objection_type: str,
        cached_data: Dict,
        tone_hint: str = "neutral"
    ) -> Optional[Dict]:
        """Findet Einwand-Antwort aus Cache."""
        
        objection_responses = cached_data.get("objection_responses", [])
        
        # Suche nach passendem Typ
        for obj in objection_responses:
            if obj.get("objection_type") == objection_type:
                response_text = obj.get("response_full") or obj.get("response_short", "")
                response_short = obj.get("response_short")
                
                return {
                    "id": obj.get("id"),
                    "response_text": response_text,
                    "response_short": response_short,
                    "follow_up": obj.get("follow_up_question"),
                    "technique": obj.get("response_technique")
                }
        
        return None
    
    def _find_cached_facts(
        self,
        query: str,
        cached_data: Dict
    ) -> Optional[Dict]:
        """Findet relevante Facts aus Cache."""
        
        facts = cached_data.get("quick_facts", [])
        if not facts:
            return None
        
        # Keyword-Matching
        query_words = set(query.lower().split())
        scored_facts = []
        
        for fact in facts:
            fact_text = f"{fact.get('fact_key', '')} {fact.get('fact_value', '')}".lower()
            score = sum(1 for word in query_words if word in fact_text)
            if score > 0:
                scored_facts.append((score, fact))
        
        if not scored_facts:
            return None
        
        # Beste Facts
        scored_facts.sort(key=lambda x: -x[0])
        best_facts = [f[1] for f in scored_facts[:3]]
        
        response_text = " ".join([f.get("fact_value", "") for f in best_facts])
        response_short = best_facts[0].get("fact_short") if best_facts else None
        
        return {
            "response_text": response_text,
            "response_short": response_short,
            "related_facts": best_facts[1:4] if len(best_facts) > 1 else []
        }
    
    def _find_cached_usps(self, cached_data: Dict) -> Optional[Dict]:
        """Findet USPs aus Cache."""
        
        usp_facts = cached_data.get("usp_facts", [])
        if not usp_facts:
            return None
        
        response_text = " ".join([f.get("fact_value", "") for f in usp_facts[:3]])
        response_short = usp_facts[0].get("fact_short") if usp_facts else None
        
        return {
            "response_text": response_text,
            "response_short": response_short
        }
    
    def _find_cached_product(
        self,
        product_id: str,
        cached_data: Dict
    ) -> Optional[Dict]:
        """Findet Produkt aus Cache."""
        
        products = cached_data.get("products", [])
        
        for product in products:
            if product.get("id") == product_id:
                name = product.get("name", "Produkt")
                description = product.get("description", "")
                tagline = product.get("tagline")
                
                response_text = f"{name}: {description}"
                response_short = tagline or name
                
                return {
                    "response_text": response_text,
                    "response_short": response_short
                }
        
        return None
    
    # =========================================================================
    # LLM GENERATION
    # =========================================================================
    
    def _generate_response_v3(
        self,
        query: str,
        intent: AssistIntent,
        emotion: EmotionAnalysis,
        cached_data: Dict
    ) -> Tuple[str, Optional[str]]:
        """Generiert Response mit Claude und Emotion-Awareness."""
        
        # Company Name holen
        company_name = None
        company_id = cached_data.get("company_id")
        if company_id:
            result = self.db.table("companies").select("name, vertical").eq(
                "id", company_id
            ).single().execute()
            if result.data:
                company_name = result.data.get("name")
        
        # Guardrails holen
        guardrails = []
        if company_id:
            guardrails_result = self.db.table("la_company_guardrails").select(
                "content"
            ).eq("company_id", company_id).eq("is_active", True).limit(5).execute()
            guardrails = [g.get("content", "") for g in (guardrails_result.data or [])]
        
        # Prompt bauen mit Emotion-Context
        system_prompt = build_live_assist_prompt_v3(
            company_name=company_name,
            vertical=cached_data.get("vertical"),
            tone_hint=emotion.tone_hint,
            available_facts=cached_data.get("quick_facts", [])[:10],
            available_products=cached_data.get("products", [])[:5],
            objection_responses=cached_data.get("objection_responses", [])[:5],
            vertical_knowledge=cached_data.get("vertical_knowledge", [])[:5],
            guardrails=guardrails,
            contact_mood=emotion.contact_mood,
            decision_tendency=emotion.decision_tendency,
        )
        
        # Claude Call
        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,  # Kurz halten!
                system=system_prompt,
                messages=[{"role": "user", "content": query}]
            )
            
            response_text = response.content[0].text
            
            # Short Version generieren
            response_short = None
            if len(response_text) > 150:
                sentences = response_text.split('.')
                first_sentence = sentences[0] + '.' if sentences else response_text
                response_short = first_sentence if len(first_sentence) < 100 else response_text[:100] + '...'
            
            return response_text, response_short
            
        except Exception as e:
            print(f"Claude API error: {e}")
            return "Entschuldigung, ich konnte keine Antwort generieren. Versuch es nochmal.", None
    
    # =========================================================================
    # LOGGING
    # =========================================================================
    
    def _log_query_v3(
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
        emotion: EmotionAnalysis,
        product_id: Optional[str] = None,
    ):
        """Loggt Query mit Emotion-Daten."""
        
        self.db.table("la_queries").insert({
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
            # Emotion Fields (NEU in v3.3)
            "contact_mood": emotion.contact_mood,
            "engagement_level": emotion.engagement_level,
            "decision_tendency": emotion.decision_tendency,
            "tone_hint": emotion.tone_hint,
            "emotion_confidence": emotion.confidence,
        }).execute()
    
    def _update_session_stats(
        self,
        session_id: str,
        intent: AssistIntent,
        objection_type: Optional[str],
    ):
        """Aktualisiert Session-Stats."""
        
        session = self.db.table("la_sessions").select(
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
        
        self.db.table("la_sessions").update(update_data).eq(
            "id", session_id
        ).execute()
    
    # =========================================================================
    # FEEDBACK & LEARNING
    # =========================================================================
    
    def submit_query_feedback(
        self,
        query_id: str,
        user_id: str,
        was_helpful: bool,
        corrected_intent: Optional[str] = None,
        corrected_objection_type: Optional[str] = None,
        feedback_text: Optional[str] = None
    ) -> bool:
        """
        Speichert Feedback und triggert Learning.
        """
        try:
            update_data = {
                "was_helpful": was_helpful,
                "feedback_at": "now()"
            }
            
            if corrected_intent:
                update_data["user_corrected_intent"] = corrected_intent
            
            if corrected_objection_type:
                update_data["user_corrected_objection_type"] = corrected_objection_type
            
            if feedback_text:
                update_data["feedback_text"] = feedback_text
            
            self.db.table("la_queries").update(update_data).eq(
                "id", query_id
            ).eq("user_id", user_id).execute()
            
            # Learning triggern wenn Korrektur
            if corrected_intent:
                # Original Query holen
                query = self.db.table("la_queries").select(
                    "query_text, detected_intent, session_id"
                ).eq("id", query_id).single().execute()
                
                if query.data:
                    session = self.db.table("la_sessions").select(
                        "company_id"
                    ).eq("id", query.data.get("session_id")).single().execute()
                    
                    company_id = session.data.get("company_id") if session.data else None
                    
                    record_intent_correction(
                        query_text=query.data.get("query_text", ""),
                        detected_intent=query.data.get("detected_intent", ""),
                        correct_intent=corrected_intent,
                        company_id=company_id,
                        db=self.db
                    )
            
            return True
            
        except Exception as e:
            print(f"Feedback error: {e}")
            return False
    
    # =========================================================================
    # QUICK ACCESS (ohne Session) - Legacy-Kompatibilität
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
        
        query = self.db.table("la_quick_facts").select("*").eq("is_active", True)
        
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
        
        query = self.db.table("la_objection_responses").select("*").eq("is_active", True)
        
        if company_id:
            query = query.or_(f"company_id.eq.{company_id},company_id.is.null")
        
        if objection_type:
            query = query.eq("objection_type", objection_type)
        
        results = query.order("success_rate", desc=True).execute()
        
        return results.data or []


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "LiveAssistServiceV3",
]

