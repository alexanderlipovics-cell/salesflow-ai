"""
Internationalization (i18n) Service
Handles translations, language detection, dynamic templates
"""

from typing import Dict, Optional, List
import json
from datetime import datetime

from app.core.database import get_db_connection


class I18nService:
    """Internationalization Management"""
    
    # Cache for translations
    _translations_cache: Dict[str, str] = {}
    _cache_timestamp: Optional[datetime] = None
    _cache_ttl_seconds = 300  # 5 minutes
    
    def __init__(self):
        self.supported_languages = [
            'de', 'en', 'fr', 'es', 'it', 'nl', 'pt', 'pl'
        ]
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid"""
        if self._cache_timestamp is None:
            return False
        
        elapsed = (datetime.now() - self._cache_timestamp).total_seconds()
        return elapsed < self._cache_ttl_seconds
    
    async def get_translation(
        self,
        key: str,
        language: str = 'de',
        variables: Optional[Dict] = None
    ) -> str:
        """Get translated string"""
        
        # Check cache
        cache_key = f"{key}:{language}"
        
        if cache_key in self._translations_cache and self._is_cache_valid():
            translation = self._translations_cache[cache_key]
        else:
            # Load from database
            conn = get_db_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT get_translation(%s, %s)",
                        (key, language)
                    )
                    result = cursor.fetchone()
                    translation = result[0] if result else key
                    
                    # Cache it
                    self._translations_cache[cache_key] = translation
                    self._cache_timestamp = datetime.now()
            finally:
                conn.close()
        
        # Replace variables if provided
        if variables:
            for var_key, var_value in variables.items():
                translation = translation.replace(f"{{{{{var_key}}}}}", str(var_value))
        
        return translation
    
    async def get_translations_bulk(
        self,
        keys: List[str],
        language: str = 'de'
    ) -> Dict[str, str]:
        """Get multiple translations at once"""
        
        translations = {}
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                for key in keys:
                    cursor.execute(
                        "SELECT get_translation(%s, %s)",
                        (key, language)
                    )
                    result = cursor.fetchone()
                    translations[key] = result[0] if result else key
        finally:
            conn.close()
        
        return translations
    
    async def get_all_translations(
        self,
        language: str = 'de',
        category: Optional[str] = None
    ) -> Dict[str, str]:
        """Get all translations for a language"""
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT get_translations_for_language(%s, %s)",
                    (language, category)
                )
                result = cursor.fetchone()
                
                if result and result[0]:
                    return result[0]  # Already JSON
                
                return {}
        finally:
            conn.close()
    
    async def get_template_in_language(
        self,
        template_id: str,
        language: str = 'de'
    ) -> Optional[Dict]:
        """Get follow-up template in specific language"""
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT get_template_in_language(%s, %s)",
                    (template_id, language)
                )
                result = cursor.fetchone()
                
                if result and result[0]:
                    return result[0]  # Already JSON
                
                return None
        finally:
            conn.close()
    
    async def get_user_language(self, user_id: str) -> str:
        """Get user's preferred language"""
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT language FROM users WHERE id = %s",
                    (user_id,)
                )
                result = cursor.fetchone()
                
                if result and result[0]:
                    return result[0]
                
                return 'de'  # Default fallback
        finally:
            conn.close()
    
    async def update_user_language(self, user_id: str, language: str) -> bool:
        """Update user's language preference"""
        
        if language not in self.supported_languages:
            raise ValueError(f"Unsupported language: {language}")
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE users SET language = %s WHERE id = %s",
                    (language, user_id)
                )
                conn.commit()
                return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    async def create_translation(
        self,
        key: str,
        language: str,
        value: str,
        category: str = 'ui'
    ) -> bool:
        """Create or update translation"""
        
        if language not in self.supported_languages:
            raise ValueError(f"Unsupported language: {language}")
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO translations (key, language, value, category)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (key, language) 
                    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                    """,
                    (key, language, value, category)
                )
                conn.commit()
                
                # Clear cache for this key
                cache_key = f"{key}:{language}"
                if cache_key in self._translations_cache:
                    del self._translations_cache[cache_key]
                
                return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    async def create_template_translation(
        self,
        template_id: str,
        language: str,
        name: str,
        body_template: str,
        subject_template: Optional[str] = None,
        short_template: Optional[str] = None,
        reminder_template: Optional[str] = None,
        fallback_template: Optional[str] = None
    ) -> bool:
        """Create or update template translation"""
        
        if language not in self.supported_languages:
            raise ValueError(f"Unsupported language: {language}")
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO template_translations 
                    (template_id, language, name, body_template, subject_template, 
                     short_template, reminder_template, fallback_template)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (template_id, language) 
                    DO UPDATE SET 
                        name = EXCLUDED.name,
                        body_template = EXCLUDED.body_template,
                        subject_template = EXCLUDED.subject_template,
                        short_template = EXCLUDED.short_template,
                        reminder_template = EXCLUDED.reminder_template,
                        fallback_template = EXCLUDED.fallback_template,
                        updated_at = NOW()
                    """,
                    (template_id, language, name, body_template, subject_template,
                     short_template, reminder_template, fallback_template)
                )
                conn.commit()
                return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    async def get_gpt_system_prompt_in_language(self, language: str = 'de') -> str:
        """Get GPT system prompt in user's language"""
        
        prompts = {
            'de': """Du bist ein empathischer, moderner KI-Verkaufsassistent für Sales Flow AI. 
            
Deine Aufgabe:
- Hilf Nutzern bei Verkaufsprozessen
- Antworte professionell, aber freundlich auf Deutsch
- Gib konkrete, umsetzbare Tipps
- Verwende eine moderne, direkte Ansprache (Du)

Antworte IMMER auf Deutsch.""",

            'en': """You are an empathetic, modern AI sales assistant for Sales Flow AI.

Your task:
- Help users with their sales processes
- Respond professionally but friendly in English
- Provide concrete, actionable advice
- Use a modern, direct approach

ALWAYS respond in English.""",

            'fr': """Tu es un assistant de vente IA empathique et moderne pour Sales Flow AI.

Ta tâche:
- Aide les utilisateurs dans leurs processus de vente
- Réponds professionnellement mais amicalement en français
- Donne des conseils concrets et actionnables
- Utilise une approche moderne et directe

Réponds TOUJOURS en français.""",

            'es': """Eres un asistente de ventas de IA empático y moderno para Sales Flow AI.

Tu tarea:
- Ayuda a los usuarios con sus procesos de venta
- Responde profesionalmente pero amigablemente en español
- Proporciona consejos concretos y accionables
- Usa un enfoque moderno y directo

Responde SIEMPRE en español.""",

            'it': """Sei un assistente di vendita AI empatico e moderno per Sales Flow AI.

Il tuo compito:
- Aiuta gli utenti con i loro processi di vendita
- Rispondi professionalmente ma amichevolmente in italiano
- Fornisci consigli concreti e attuabili
- Usa un approccio moderno e diretto

Rispondi SEMPRE in italiano.""",

            'nl': """Je bent een empathische, moderne AI-verkoopassistent voor Sales Flow AI.

Je taak:
- Help gebruikers met hun verkoopprocessen
- Reageer professioneel maar vriendelijk in het Nederlands
- Geef concrete, uitvoerbare adviezen
- Gebruik een moderne, directe benadering

Reageer ALTIJD in het Nederlands.""",

            'pt': """Você é um assistente de vendas de IA empático e moderno para Sales Flow AI.

Sua tarefa:
- Ajude os usuários com seus processos de venda
- Responda profissionalmente mas amigavelmente em português
- Forneça conselhos concretos e acionáveis
- Use uma abordagem moderna e direta

Responda SEMPRE em português.""",

            'pl': """Jesteś empatycznym, nowoczesnym asystentem sprzedaży AI dla Sales Flow AI.

Twoje zadanie:
- Pomagaj użytkownikom w procesach sprzedażowych
- Odpowiadaj profesjonalnie ale przyjaźnie po polsku
- Dawaj konkretne, wykonalne porady
- Używaj nowoczesnego, bezpośredniego podejścia

ZAWSZE odpowiadaj po polsku."""
        }
        
        return prompts.get(language, prompts['de'])
    
    async def get_supported_languages(self) -> List[Dict]:
        """Get all supported languages"""
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT code, name, native_name, is_active, is_default
                    FROM supported_languages
                    WHERE is_active = TRUE
                    ORDER BY is_default DESC, name ASC
                    """
                )
                
                languages = []
                for row in cursor.fetchall():
                    languages.append({
                        'code': row[0],
                        'name': row[1],
                        'native_name': row[2],
                        'is_active': row[3],
                        'is_default': row[4]
                    })
                
                return languages
        finally:
            conn.close()
    
    def clear_cache(self):
        """Clear translations cache"""
        self._translations_cache = {}
        self._cache_timestamp = None


# Initialize service
i18n_service = I18nService()

