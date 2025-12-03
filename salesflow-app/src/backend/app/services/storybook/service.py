"""
Storybook Processing Service
Extrahiert Company Knowledge aus PDFs und Dokumenten
"""

from typing import Optional, Dict, Any, List
from uuid import UUID
import os
import json
import re

from sqlalchemy.orm import Session
from sqlalchemy import text
import anthropic


class StorybookService:
    """
    Verarbeitet Brand-Storybooks und extrahiert strukturierte Daten
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.anthropic = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    def process_storybook(
        self,
        company_id: UUID,
        content: str,  # Extrahierter Text aus PDF
        file_name: str,
    ) -> Dict[str, Any]:
        """
        Verarbeitet Storybook-Content und extrahiert strukturierte Daten
        """
        
        # Log import start
        import_id = self._log_import_start(company_id, file_name)
        
        try:
            # 1. Extract Stories
            stories = self._extract_stories(content)
            
            # 2. Extract Products
            products = self._extract_products(content)
            
            # 3. Extract Guardrails
            guardrails = self._extract_guardrails(content)
            
            # 4. Save to DB
            saved_stories = self._save_stories(company_id, stories, file_name)
            saved_products = self._save_products(company_id, products)
            saved_guardrails = self._save_guardrails(company_id, guardrails)
            
            # 5. Update company
            self.db.execute(
                text("""
                    UPDATE companies SET 
                        storybook_imported = true,
                        storybook_imported_at = NOW()
                    WHERE id = :company_id
                """),
                {"company_id": str(company_id)}
            )
            
            # 6. Log success
            self._log_import_complete(
                import_id,
                len(saved_stories),
                len(saved_products),
                len(saved_guardrails)
            )
            
            self.db.commit()
            
            return {
                "success": True,
                "import_id": str(import_id),
                "stories_extracted": len(saved_stories),
                "products_extracted": len(saved_products),
                "guardrails_extracted": len(saved_guardrails),
            }
            
        except Exception as e:
            self._log_import_failed(import_id, str(e))
            self.db.commit()
            return {"success": False, "error": str(e)}
    
    def _extract_stories(self, content: str) -> List[Dict[str, Any]]:
        """Extrahiert Stories aus Content"""
        
        # Limit content for token limits
        truncated_content = content[:15000]
        
        prompt = f"""Analysiere dieses Brand-Storybook und extrahiere alle Geschichten/Narratives.

CONTENT:
{truncated_content}

Extrahiere für jede gefundene Story:
- story_type: elevator_pitch, short_story, founder_story, product_story, why_story, success_story, science_story
- audience: consumer, business_partner, health_professional, skeptic
- title: Kurzer Titel
- content_30s: 30-Sekunden Version (wenn möglich)
- content_1min: 1-Minute Version
- content_2min: 2-Minuten Version (wenn länger)
- use_case: Wann diese Story nutzen?
- tags: Relevante Tags

Antworte NUR mit JSON:
```json
{{
    "stories": [
        {{
            "story_type": "...",
            "audience": "...",
            "title": "...",
            "content_30s": "...",
            "content_1min": "...",
            "content_2min": "...",
            "use_case": "...",
            "tags": ["..."]
        }}
    ]
}}
```"""
        
        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_content = response.content[0].text
            
            # Parse JSON
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_content)
            if json_match:
                data = json.loads(json_match.group(1))
                return data.get("stories", [])
            
            return []
            
        except Exception as e:
            print(f"Story extraction error: {e}")
            return []
    
    def _extract_products(self, content: str) -> List[Dict[str, Any]]:
        """Extrahiert Produkte aus Content"""
        
        truncated_content = content[:15000]
        
        prompt = f"""Analysiere dieses Brand-Storybook und extrahiere alle Produkt-Informationen.

CONTENT:
{truncated_content}

Extrahiere für jedes Produkt:
- name: Produktname
- slug: URL-freundlicher Name
- category: supplements, skincare, tests, bundles, etc.
- tagline: Kurz-Slogan
- description_short: 1-2 Sätze
- description_full: Vollständige Beschreibung
- key_benefits: Liste der Hauptvorteile
- science_summary: Wissenschaftliche Basis (wenn vorhanden)

Antworte NUR mit JSON:
```json
{{
    "products": [
        {{
            "name": "...",
            "slug": "...",
            "category": "...",
            "tagline": "...",
            "description_short": "...",
            "description_full": "...",
            "key_benefits": ["..."],
            "science_summary": "..."
        }}
    ]
}}
```"""
        
        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=3000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_content = response.content[0].text
            
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_content)
            if json_match:
                data = json.loads(json_match.group(1))
                return data.get("products", [])
            
            return []
            
        except Exception as e:
            print(f"Product extraction error: {e}")
            return []
    
    def _extract_guardrails(self, content: str) -> List[Dict[str, Any]]:
        """Extrahiert Compliance-Regeln aus Content"""
        
        truncated_content = content[:15000]
        
        prompt = f"""Analysiere dieses Brand-Storybook und extrahiere alle Compliance- und Marketing-Regeln.

CONTENT:
{truncated_content}

Suche nach:
- Was darf NICHT gesagt werden?
- Welche Formulierungen sind verboten?
- Welche rechtlichen Hinweise gibt es?
- Welche Einkommensdarstellungen sind erlaubt/verboten?

Extrahiere für jede Regel:
- rule_name: Kurzer Name
- rule_description: Beschreibung der Regel
- severity: block (nie erlaubt), warn (Warnung), suggest (Vorschlag)
- trigger_patterns: Wörter/Phrasen die die Regel triggern
- example_bad: Beispiel was NICHT gesagt werden soll
- example_good: Bessere Alternative

Antworte NUR mit JSON:
```json
{{
    "guardrails": [
        {{
            "rule_name": "...",
            "rule_description": "...",
            "severity": "block|warn|suggest",
            "trigger_patterns": ["..."],
            "example_bad": "...",
            "example_good": "..."
        }}
    ]
}}
```"""
        
        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_content = response.content[0].text
            
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_content)
            if json_match:
                data = json.loads(json_match.group(1))
                return data.get("guardrails", [])
            
            return []
            
        except Exception as e:
            print(f"Guardrail extraction error: {e}")
            return []
    
    def _save_stories(
        self,
        company_id: UUID,
        stories: List[Dict],
        source_doc: str,
    ) -> List[UUID]:
        """Speichert extrahierte Stories"""
        
        saved_ids = []
        for story in stories:
            result = self.db.execute(
                text("""
                    INSERT INTO company_stories (
                        company_id, story_type, audience, title,
                        content_30s, content_1min, content_2min,
                        use_case, tags, source_document
                    ) VALUES (
                        :company_id, :story_type::story_type, :audience::story_audience, :title,
                        :c30, :c1min, :c2min,
                        :use_case, :tags, :source
                    )
                    ON CONFLICT DO NOTHING
                    RETURNING id
                """),
                {
                    "company_id": str(company_id),
                    "story_type": story.get("story_type", "short_story"),
                    "audience": story.get("audience", "consumer"),
                    "title": story.get("title", "Untitled"),
                    "c30": story.get("content_30s"),
                    "c1min": story.get("content_1min"),
                    "c2min": story.get("content_2min"),
                    "use_case": story.get("use_case"),
                    "tags": story.get("tags", []),
                    "source": source_doc,
                }
            )
            row = result.fetchone()
            if row:
                saved_ids.append(row[0])
        
        return saved_ids
    
    def _save_products(
        self,
        company_id: UUID,
        products: List[Dict],
    ) -> List[UUID]:
        """Speichert extrahierte Produkte"""
        
        saved_ids = []
        for i, product in enumerate(products):
            slug = product.get("slug") or product.get("name", "").lower().replace(" ", "_")
            result = self.db.execute(
                text("""
                    INSERT INTO company_products (
                        company_id, name, slug, category,
                        tagline, description_short, description_full,
                        key_benefits, science_summary, sort_order
                    ) VALUES (
                        :company_id, :name, :slug, :category,
                        :tagline, :desc_short, :desc_full,
                        :benefits, :science, :sort
                    )
                    ON CONFLICT (company_id, slug) DO UPDATE SET
                        description_short = EXCLUDED.description_short,
                        description_full = EXCLUDED.description_full,
                        key_benefits = EXCLUDED.key_benefits
                    RETURNING id
                """),
                {
                    "company_id": str(company_id),
                    "name": product.get("name"),
                    "slug": slug,
                    "category": product.get("category"),
                    "tagline": product.get("tagline"),
                    "desc_short": product.get("description_short"),
                    "desc_full": product.get("description_full"),
                    "benefits": product.get("key_benefits", []),
                    "science": product.get("science_summary"),
                    "sort": i,
                }
            )
            row = result.fetchone()
            if row:
                saved_ids.append(row[0])
        
        return saved_ids
    
    def _save_guardrails(
        self,
        company_id: UUID,
        guardrails: List[Dict],
    ) -> List[UUID]:
        """Speichert extrahierte Guardrails"""
        
        saved_ids = []
        for guardrail in guardrails:
            result = self.db.execute(
                text("""
                    INSERT INTO company_guardrails (
                        company_id, rule_name, rule_description, severity,
                        trigger_patterns, example_bad, example_good
                    ) VALUES (
                        :company_id, :name, :desc, :severity::guardrail_severity,
                        :patterns, :bad, :good
                    )
                    ON CONFLICT DO NOTHING
                    RETURNING id
                """),
                {
                    "company_id": str(company_id),
                    "name": guardrail.get("rule_name"),
                    "desc": guardrail.get("rule_description"),
                    "severity": guardrail.get("severity", "warn"),
                    "patterns": guardrail.get("trigger_patterns", []),
                    "bad": guardrail.get("example_bad"),
                    "good": guardrail.get("example_good"),
                }
            )
            row = result.fetchone()
            if row:
                saved_ids.append(row[0])
        
        return saved_ids
    
    def _log_import_start(self, company_id: UUID, file_name: str) -> UUID:
        """Loggt Import-Start"""
        result = self.db.execute(
            text("""
                INSERT INTO storybook_imports (company_id, file_name, status)
                VALUES (:company_id, :file_name, 'processing')
                RETURNING id
            """),
            {"company_id": str(company_id), "file_name": file_name}
        )
        return result.fetchone()[0]
    
    def _log_import_complete(
        self,
        import_id: UUID,
        stories: int,
        products: int,
        guardrails: int,
    ):
        """Loggt erfolgreichen Import"""
        self.db.execute(
            text("""
                UPDATE storybook_imports SET
                    status = 'completed',
                    extracted_stories = :stories,
                    extracted_products = :products,
                    extracted_guardrails = :guardrails,
                    completed_at = NOW()
                WHERE id = :id
            """),
            {
                "id": str(import_id),
                "stories": stories,
                "products": products,
                "guardrails": guardrails,
            }
        )
    
    def _log_import_failed(self, import_id: UUID, error: str):
        """Loggt fehlgeschlagenen Import"""
        self.db.execute(
            text("""
                UPDATE storybook_imports SET
                    status = 'failed',
                    error_message = :error
                WHERE id = :id
            """),
            {"id": str(import_id), "error": error}
        )
    
    # =========================================================================
    # QUERY METHODS
    # =========================================================================
    
    def get_stories(
        self,
        company_id: UUID,
        story_type: Optional[str] = None,
        audience: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Holt Stories für eine Company"""
        
        conditions = ["company_id = :company_id", "is_active = true"]
        params: Dict[str, Any] = {"company_id": str(company_id)}
        
        if story_type:
            conditions.append("story_type = :story_type::story_type")
            params["story_type"] = story_type
        
        if audience:
            conditions.append("audience = :audience::story_audience")
            params["audience"] = audience
        
        rows = self.db.execute(
            text(f"""
                SELECT * FROM company_stories
                WHERE {' AND '.join(conditions)}
                ORDER BY story_type, created_at
            """),
            params
        ).fetchall()
        
        return [dict(row._mapping) for row in rows]
    
    def get_products(
        self,
        company_id: UUID,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Holt Produkte für eine Company"""
        
        conditions = ["company_id = :company_id", "is_active = true"]
        params: Dict[str, Any] = {"company_id": str(company_id)}
        
        if category:
            conditions.append("category = :category")
            params["category"] = category
        
        rows = self.db.execute(
            text(f"""
                SELECT * FROM company_products
                WHERE {' AND '.join(conditions)}
                ORDER BY sort_order
            """),
            params
        ).fetchall()
        
        return [dict(row._mapping) for row in rows]
    
    def get_guardrails(
        self,
        company_id: Optional[UUID] = None,
        vertical: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Holt Guardrails (company-spezifisch + generisch)"""
        
        conditions = ["is_active = true"]
        params: Dict[str, Any] = {}
        
        if company_id:
            conditions.append("(company_id = :company_id OR company_id IS NULL)")
            params["company_id"] = str(company_id)
        
        if vertical:
            conditions.append("(vertical = :vertical OR vertical IS NULL)")
            params["vertical"] = vertical
        
        rows = self.db.execute(
            text(f"""
                SELECT * FROM company_guardrails
                WHERE {' AND '.join(conditions)}
                ORDER BY severity DESC, rule_name
            """),
            params
        ).fetchall()
        
        return [dict(row._mapping) for row in rows]
    
    def check_compliance(
        self,
        text_to_check: str,
        company_id: Optional[UUID] = None,
        vertical: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Prüft Text gegen Guardrails und gibt Verstöße zurück
        """
        
        guardrails = self.get_guardrails(company_id, vertical)
        violations = []
        
        for guardrail in guardrails:
            patterns = guardrail.get("trigger_patterns", [])
            if not patterns:
                continue
                
            for pattern in patterns:
                try:
                    if re.search(pattern, text_to_check, re.IGNORECASE):
                        violations.append({
                            "rule_name": guardrail["rule_name"],
                            "severity": guardrail["severity"],
                            "description": guardrail["rule_description"],
                            "example_bad": guardrail.get("example_bad"),
                            "example_good": guardrail.get("example_good"),
                            "matched_pattern": pattern,
                        })
                        break  # One match per rule is enough
                except re.error:
                    pass  # Invalid regex, skip
        
        return violations
    
    def get_story_for_context(
        self,
        company_id: UUID,
        context_type: str,
        audience: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Findet die beste Story für einen bestimmten Kontext
        
        context_type: 'intro', 'objection', 'close', 'follow_up'
        """
        
        # Map context to story type
        context_to_story_type = {
            "intro": "elevator_pitch",
            "objection": "objection_story",
            "why": "why_story",
            "product": "product_story",
            "founder": "founder_story",
            "science": "science_story",
            "success": "success_story",
        }
        
        story_type = context_to_story_type.get(context_type, "short_story")
        
        stories = self.get_stories(
            company_id=company_id,
            story_type=story_type,
            audience=audience,
        )
        
        if stories:
            return stories[0]
        
        # Fallback: Any story for this audience
        all_stories = self.get_stories(company_id=company_id, audience=audience)
        return all_stories[0] if all_stories else None
    
    def get_product_info(
        self,
        company_id: UUID,
        product_slug: Optional[str] = None,
        product_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Holt Produkt-Informationen für CHIEF
        """
        
        if product_slug:
            result = self.db.execute(
                text("""
                    SELECT * FROM company_products
                    WHERE company_id = :company_id 
                      AND slug = :slug 
                      AND is_active = true
                """),
                {"company_id": str(company_id), "slug": product_slug}
            ).fetchone()
        elif product_name:
            result = self.db.execute(
                text("""
                    SELECT * FROM company_products
                    WHERE company_id = :company_id 
                      AND LOWER(name) LIKE LOWER(:name)
                      AND is_active = true
                """),
                {"company_id": str(company_id), "name": f"%{product_name}%"}
            ).fetchone()
        else:
            return None
        
        return dict(result._mapping) if result else None
    
    def get_company_context_for_chief(
        self,
        company_id: UUID,
    ) -> Dict[str, Any]:
        """
        Holt alle relevanten Company-Daten für CHIEF Kontext
        """
        
        # Get company
        company = self.db.execute(
            text("SELECT * FROM companies WHERE id = :id"),
            {"id": str(company_id)}
        ).fetchone()
        
        if not company:
            return {}
        
        company_dict = dict(company._mapping)
        
        # Get stories (limit to most useful)
        stories = self.get_stories(company_id)[:5]
        
        # Get products
        products = self.get_products(company_id)
        
        # Get guardrails
        guardrails = self.get_guardrails(company_id)
        
        return {
            "company": {
                "name": company_dict.get("name"),
                "vertical": company_dict.get("vertical"),
                "compliance_level": company_dict.get("compliance_level"),
                "brand_config": company_dict.get("brand_config", {}),
            },
            "stories": stories,
            "products": products,
            "guardrails": guardrails,
        }

