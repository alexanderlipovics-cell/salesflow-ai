"""
Sales Flow AI - Hybrid AI System mit RAG, Memory und Learning.
CHIEF: Der AI Sales Coach.
"""

from __future__ import annotations

import hashlib
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from app.config import get_settings
from app.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)

# OpenAI Client initialisieren mit Fehlerbehandlung
_openai_client = None
try:
    from openai import AsyncOpenAI
    _openai_client = AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=settings.OPENAI_TIMEOUT,
    )
    logger.info("OpenAI AsyncClient initialized successfully")
except Exception as e:
    logger.warning(f"OpenAI client initialization failed: {e}")


class SalesFlowAI:
    """
    Hybrid AI System mit RAG (Retrieval Augmented Generation) und Memory.
    Nutzt Vector Embeddings für semantische Suche in vergangenen Konversationen.
    """

    def __init__(self):
        self.client = _openai_client
        
        # Supabase Client mit Fehlerbehandlung
        try:
            from app.db.database import get_supabase
            self.supabase = get_supabase()
        except Exception as e:
            logger.warning(f"Supabase not available: {e}")
            self.supabase = None
        self.embedding_model = "text-embedding-3-small"
        self.chat_model = settings.OPENAI_MODEL or "gpt-4-turbo-preview"

        # System Prompt für CHIEF - den Sales Coach
        self.system_prompt = """Du bist CHIEF - der Sales Coaching AI von Sales Flow AI.

Deine Aufgaben:
- Hilf Verkäufern ihre Gespräche zu verbessern
- Gib konkrete, actionable Tipps
- Nutze den Kontext aus vergangenen Gesprächen
- Sei motivierend aber direkt
- Antworte auf Deutsch

Wenn du Einwände behandelst, nutze bewährte Techniken:
- Feel-Felt-Found (Ich verstehe... Anderen ging es ähnlich... Sie haben dann festgestellt...)
- Bumerang-Technik (Genau deshalb...)
- Isolationstechnik (Ist das der einzige Punkt...?)
- Positives Reframing

Halte Antworten prägnant (max 3-4 Sätze) außer der User fragt nach Details.
Nutze Emojis sparsam aber effektiv für wichtige Punkte.

Bei Sales-Situationen:
- Frage nach dem Lead-Status wenn unklar
- Schlage konkrete nächste Schritte vor
- Gib Beispiel-Formulierungen wenn hilfreich"""

    async def create_embedding(self, text: str) -> List[float]:
        """Erstellt Vector Embedding für Text."""
        try:
            response = await self.client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding-Fehler: {e}")
            return []

    async def search_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 5,
        similarity_threshold: float = 0.5
    ) -> List[Dict]:
        """Sucht relevante Memories via Vector Similarity."""
        try:
            query_embedding = await self.create_embedding(query)
            if not query_embedding:
                return []

            # pgvector similarity search via RPC
            result = self.supabase.rpc(
                'match_memories',
                {
                    'query_embedding': query_embedding,
                    'match_user_id': user_id,
                    'match_count': limit,
                    'similarity_threshold': similarity_threshold
                }
            ).execute()

            return result.data if result.data else []
        except Exception as e:
            logger.warning(f"Memory-Suche fehlgeschlagen: {e}")
            return []

    async def search_patterns(
        self,
        query: str,
        pattern_type: Optional[str] = None,
        limit: int = 3,
        similarity_threshold: float = 0.6
    ) -> List[Dict]:
        """Sucht gelernte Patterns via Vector Similarity."""
        try:
            query_embedding = await self.create_embedding(query)
            if not query_embedding:
                return []

            result = self.supabase.rpc(
                'match_patterns',
                {
                    'query_embedding': query_embedding,
                    'filter_type': pattern_type,
                    'match_count': limit,
                    'similarity_threshold': similarity_threshold
                }
            ).execute()

            return result.data if result.data else []
        except Exception as e:
            logger.warning(f"Pattern-Suche fehlgeschlagen: {e}")
            return []

    async def generate_reply(
        self,
        user_id: str,
        message: str,
        conversation_history: Optional[List[Dict]] = None,
        lead_context: Optional[Dict] = None,
        store_memory: bool = True
    ) -> Dict[str, Any]:
        """
        Generiert AI Antwort mit RAG Kontext.
        
        Args:
            user_id: ID des Users
            message: Die aktuelle Nachricht
            conversation_history: Bisherige Konversation
            lead_context: Optional Lead-Informationen
            store_memory: Ob die Konversation gespeichert werden soll
            
        Returns:
            Dict mit response, conversation_id, tokens_used, etc.
        """
        start_time = time.time()
        conversation_id = str(uuid4())

        # 1. Relevante Memories holen (RAG)
        memories = await self.search_memories(user_id, message)
        memory_context = "\n".join([
            f"- [{m.get('role', 'user')}]: {m['content'][:200]}..."
            for m in memories
        ]) if memories else "Keine relevanten Erinnerungen."

        # 2. Gelernte Patterns holen
        patterns = await self.search_patterns(message)
        pattern_context = "\n".join([
            f"- Bei '{p['trigger_phrase'][:50]}...' funktioniert: {p['best_response'][:100]}... "
            f"(Erfolgsrate: {float(p.get('success_rate', 0.5)) * 100:.0f}%)"
            for p in patterns
        ]) if patterns else ""

        # 3. Lead Context aufbauen
        lead_info = ""
        if lead_context:
            lead_info = f"""
Lead Info:
- Name: {lead_context.get('name', 'Unbekannt')}
- Firma: {lead_context.get('company', '-')}
- Status: {lead_context.get('status', 'Neu')}
- Letzte Interaktion: {lead_context.get('last_contact_date', 'Nie')}
- Notizen: {lead_context.get('notes', '-')[:200]}
"""

        # 4. Kontext zusammenbauen
        context = f"""
RELEVANTE ERINNERUNGEN AUS VERGANGENEN GESPRÄCHEN:
{memory_context}

{"BEWÄHRTE MUSTER (aus erfolgreichen Gesprächen):" if pattern_context else ""}
{pattern_context}

{lead_info}
"""

        # 5. Messages für GPT aufbauen
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "system", "content": f"Kontext:\n{context}"}
        ]

        # Conversation History hinzufügen (letzte 10 Messages)
        if conversation_history:
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

        messages.append({"role": "user", "content": message})

        # 6. GPT-4 Call
        try:
            response = await self.client.chat.completions.create(
                model=self.chat_model,
                messages=messages,
                max_tokens=500,
                temperature=settings.OPENAI_TEMPERATURE,
            )

            ai_response = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else 0
            response_time = int((time.time() - start_time) * 1000)

        except Exception as e:
            logger.error(f"GPT-4 Fehler: {e}")
            return {
                'response': "❌ Es gab einen Fehler bei der Verarbeitung. Bitte versuche es erneut.",
                'conversation_id': conversation_id,
                'tokens_used': 0,
                'memories_used': 0,
                'patterns_used': 0,
                'error': str(e)
            }

        # 7. Memory speichern (wenn aktiviert)
        if store_memory:
            try:
                # User Message speichern
                user_embedding = await self.create_embedding(message)
                if user_embedding:
                    self.supabase.table('ai_memories').insert({
                        'user_id': user_id,
                        'conversation_id': conversation_id,
                        'content': message,
                        'role': 'user',
                        'embedding': user_embedding,
                        'importance_score': 0.5
                    }).execute()

                # AI Response speichern
                ai_embedding = await self.create_embedding(ai_response)
                if ai_embedding:
                    self.supabase.table('ai_memories').insert({
                        'user_id': user_id,
                        'conversation_id': conversation_id,
                        'content': ai_response,
                        'role': 'assistant',
                        'embedding': ai_embedding,
                        'importance_score': 0.5
                    }).execute()
            except Exception as e:
                logger.warning(f"Memory-Speicherung fehlgeschlagen: {e}")

        # 8. Prompt Log für Audit/DSGVO
        try:
            fingerprint = hashlib.sha256(
                f"{message}{ai_response}{datetime.now().isoformat()}".encode()
            ).hexdigest()

            self.supabase.table('gpt_prompt_logs').insert({
                'user_id': user_id,
                'model': self.chat_model,
                'system_prompt': self.system_prompt[:500],  # Truncate for storage
                'user_prompt': message,
                'context_used': context[:2000],  # Truncate
                'completion': ai_response,
                'tokens_used': tokens_used,
                'response_time_ms': response_time,
                'fingerprint': fingerprint
            }).execute()
        except Exception as e:
            logger.warning(f"Prompt-Log fehlgeschlagen: {e}")

        logger.info(
            "AI Reply generiert",
            extra={
                "user_id": user_id,
                "tokens": tokens_used,
                "memories": len(memories),
                "patterns": len(patterns),
                "response_time_ms": response_time
            }
        )

        return {
            'response': ai_response,
            'conversation_id': conversation_id,
            'tokens_used': tokens_used,
            'memories_used': len(memories),
            'patterns_used': len(patterns),
            'response_time_ms': response_time
        }

    async def learn_from_feedback(
        self,
        user_id: str,
        message: str,
        response: str,
        feedback: str,  # 'positive' oder 'negative'
        pattern_type: str = 'general'
    ) -> Dict[str, Any]:
        """
        Lernt aus User-Feedback.
        
        Bei positivem Feedback: Erstellt oder verstärkt Pattern
        Bei negativem Feedback: Schwächt Pattern ab
        """
        try:
            if feedback == 'positive':
                embedding = await self.create_embedding(message)
                if not embedding:
                    return {"status": "error", "message": "Embedding-Fehler"}

                # Check ob ähnliches Pattern existiert
                existing = await self.search_patterns(
                    message, 
                    pattern_type=pattern_type,
                    limit=1,
                    similarity_threshold=0.85
                )

                if existing and existing[0].get('similarity', 0) > 0.85:
                    # Update existing pattern
                    pattern = existing[0]
                    new_usage = pattern['usage_count'] + 1
                    new_positive = pattern['positive_feedback'] + 1
                    new_success_rate = new_positive / new_usage

                    self.supabase.table('learned_patterns').update({
                        'usage_count': new_usage,
                        'positive_feedback': new_positive,
                        'success_rate': new_success_rate
                    }).eq('id', pattern['id']).execute()

                    return {
                        "status": "updated",
                        "pattern_id": pattern['id'],
                        "new_success_rate": new_success_rate
                    }
                else:
                    # Create new pattern
                    result = self.supabase.table('learned_patterns').insert({
                        'pattern_type': pattern_type,
                        'trigger_phrase': message[:500],
                        'best_response': response[:1000],
                        'trigger_embedding': embedding,
                        'learned_from_user_id': user_id,
                        'success_rate': 1.0,
                        'usage_count': 1,
                        'positive_feedback': 1,
                        'negative_feedback': 0
                    }).execute()

                    return {
                        "status": "created",
                        "pattern_id": result.data[0]['id'] if result.data else None
                    }

            elif feedback == 'negative':
                existing = await self.search_patterns(
                    message,
                    limit=1,
                    similarity_threshold=0.85
                )

                if existing and existing[0].get('similarity', 0) > 0.85:
                    pattern = existing[0]
                    new_negative = pattern['negative_feedback'] + 1
                    total = pattern['usage_count'] + 1
                    new_success_rate = pattern['positive_feedback'] / total

                    self.supabase.table('learned_patterns').update({
                        'negative_feedback': new_negative,
                        'usage_count': total,
                        'success_rate': new_success_rate
                    }).eq('id', pattern['id']).execute()

                    return {
                        "status": "downgraded",
                        "pattern_id": pattern['id'],
                        "new_success_rate": new_success_rate
                    }

            return {"status": "no_action"}

        except Exception as e:
            logger.error(f"Feedback-Learning fehlgeschlagen: {e}")
            return {"status": "error", "message": str(e)}

    async def generate_followup(
        self,
        lead_id: str,
        trigger_type: str,
        channel: str = 'email',
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generiert personalisiertes Follow-up basierend auf Templates und Lead-Daten.
        """
        try:
            # Lead Daten holen
            lead_result = self.supabase.table('leads').select('*').eq('id', lead_id).single().execute()
            
            if not lead_result.data:
                return {'error': 'Lead nicht gefunden'}
            
            lead_data = lead_result.data

            # Template holen
            template_result = self.supabase.table('followup_templates').select('*').eq(
                'trigger_type', trigger_type
            ).eq('channel', channel).eq('is_active', True).limit(1).execute()

            if not template_result.data:
                return {'error': 'Kein passendes Template gefunden'}

            template = template_result.data[0]

            # GPT personalisiert das Template
            prompt = f"""
Personalisiere dieses Follow-up Template für den Lead:

Lead:
- Name: {lead_data.get('name', 'Unbekannt')}
- Firma: {lead_data.get('company', '-')}
- Status: {lead_data.get('status', 'Neu')}
- Letzte Interaktion: {lead_data.get('last_contact_date', 'Nie')}
- Notizen: {lead_data.get('notes', '-')[:300]}

Template:
{template['body_template']}

Regeln:
- Behalte den Grundaufbau
- Ersetze Platzhalter mit echten Daten
- Mache es persönlich und relevant
- Kanal: {channel}
- Sprache: Deutsch
- Halte es kurz und professionell
"""

            response = await self.client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": "Du bist ein Sales-Texter der Follow-ups personalisiert. Schreibe natürlich und professionell."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.8
            )

            personalized_body = response.choices[0].message.content

            # Subject personalisieren
            subject = template.get('subject', '')
            if subject:
                subject = subject.replace('{{name}}', lead_data.get('name', ''))
                subject = subject.replace('{{company}}', lead_data.get('company', ''))

            return {
                'subject': subject,
                'body': personalized_body,
                'channel': channel,
                'lead_id': lead_id,
                'template_id': template['id'],
                'trigger_type': trigger_type
            }

        except Exception as e:
            logger.error(f"Follow-up Generation fehlgeschlagen: {e}")
            return {'error': str(e)}

    async def get_strategic_insights(
        self,
        user_id: Optional[str] = None,
        insight_type: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """Holt strategische AI Insights."""
        try:
            query = self.supabase.table('ai_strategic_insights').select('*')
            
            if user_id:
                query = query.eq('user_id', user_id)
            if insight_type:
                query = query.eq('insight_type', insight_type)
            
            query = query.order('insight_score', desc=True).limit(limit)
            result = query.execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.warning(f"Insights-Abruf fehlgeschlagen: {e}")
            return []

    async def get_learned_patterns(
        self,
        pattern_type: Optional[str] = None,
        limit: int = 20,
        min_success_rate: float = 0.0
    ) -> List[Dict]:
        """Holt gelernte Patterns."""
        try:
            query = self.supabase.table('learned_patterns').select('*')
            
            if pattern_type:
                query = query.eq('pattern_type', pattern_type)
            
            query = query.gte('success_rate', min_success_rate)
            query = query.order('success_rate', desc=True).limit(limit)
            
            result = query.execute()
            return result.data if result.data else []
        except Exception as e:
            logger.warning(f"Pattern-Abruf fehlgeschlagen: {e}")
            return []


# Singleton Instance
_sales_flow_ai: Optional[SalesFlowAI] = None


def get_sales_flow_ai() -> SalesFlowAI:
    """Get or create SalesFlowAI instance."""
    global _sales_flow_ai
    if _sales_flow_ai is None:
        _sales_flow_ai = SalesFlowAI()
    return _sales_flow_ai


# Alias für Backwards-Kompatibilität
sales_flow_ai = get_sales_flow_ai()

