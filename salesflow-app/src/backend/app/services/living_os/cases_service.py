"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LEARNING CASES SERVICE                                                    ║
║  Importiert und analysiert Gespräche als Trainingsmaterial                ║
╚════════════════════════════════════════════════════════════════════════════╝

Was passiert:
1. User importiert echtes Verkaufsgespräch (Copy-Paste)
2. System analysiert mit Claude:
   - Welche Techniken wurden verwendet?
   - Welche Einwände kamen?
   - Was hat funktioniert?
3. Extrahiert:
   - Wiederverwendbare Templates
   - Einwandbehandlungen
   - Verkäufer-Stil

Trainingsmaterial aus der ECHTEN WELT, nicht aus Lehrbüchern.
"""

from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
import os
import json
import re

from supabase import Client


class LearningCasesService:
    """
    Verarbeitet importierte Gespräche und extrahiert Learnings.
    
    Jedes importierte Gespräch wird zu wertvollem Trainingsmaterial
    für das persönliche KI-Modell des Users.
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    def import_case(
        self,
        user_id: str,
        company_id: Optional[str],
        raw_conversation: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Importiert ein Gespräch und bereitet es zur Verarbeitung vor.
        
        Args:
            user_id: User ID
            company_id: Company ID
            raw_conversation: Der rohe Gesprächstext
            metadata: Zusätzliche Infos (vertical, channel, outcome, etc.)
            
        Returns:
            Dict mit case_id und status
        """
        
        case_data = {
            "user_id": user_id,
            "company_id": company_id,
            "vertical": metadata.get("vertical"),
            "product_or_service": metadata.get("product_or_service"),
            "channel": metadata.get("channel"),
            "conversation_goal": metadata.get("conversation_goal"),
            "outcome": metadata.get("outcome"),
            "outcome_details": metadata.get("outcome_details"),
            "raw_conversation": raw_conversation,
            "source_type": metadata.get("source_type", "own"),
            "source_seller_name": metadata.get("source_seller_name"),
            "source_seller_skill_level": metadata.get("source_seller_skill_level"),
            "anonymized": metadata.get("anonymized", False),
            "processing_status": "pending",
        }
        
        result = self.db.table("learning_cases").insert(case_data).execute()
        
        if result.data:
            return {
                "case_id": result.data[0]["id"],
                "status": "pending",
            }
        
        raise Exception("Failed to import learning case")
    
    def process_case(self, case_id: str) -> Dict[str, Any]:
        """
        Verarbeitet ein Gespräch - extrahiert Templates und Learnings.
        
        Dies ist eine vereinfachte lokale Analyse. In Produktion 
        würde hier Claude für tiefe Analyse eingesetzt.
        """
        
        # Get case
        result = self.db.table("learning_cases").select("*").eq("id", case_id).execute()
        
        if not result.data:
            return {"error": "Case not found"}
        
        case = result.data[0]
        
        # Update status
        self.db.table("learning_cases").update({
            "processing_status": "processing"
        }).eq("id", case_id).execute()
        
        try:
            # Analyze conversation (lokale Analyse)
            analysis = self._analyze_conversation_local(
                case["raw_conversation"],
                case.get("vertical"),
                case.get("channel"),
                case.get("conversation_goal"),
                case.get("outcome"),
            )
            
            # Update case with analysis
            self.db.table("learning_cases").update({
                "extracted_data": analysis.get("extracted_data", {}),
                "extracted_templates": analysis.get("extracted_templates", []),
                "seller_style": analysis.get("seller_style", {}),
                "quality_score": analysis.get("quality_score", 0.5),
                "processing_status": "completed",
                "processed_at": datetime.utcnow().isoformat(),
            }).eq("id", case_id).execute()
            
            # Extract and save objections
            for objection in analysis.get("objections", []):
                self.db.table("extracted_objections").insert({
                    "learning_case_id": case_id,
                    "user_id": case["user_id"],
                    "objection_type": objection.get("type"),
                    "objection_text": objection.get("text"),
                    "objection_context": objection.get("context"),
                    "response_text": objection.get("response"),
                    "response_technique": objection.get("technique"),
                    "response_worked": objection.get("worked"),
                }).execute()
            
            return {
                "case_id": case_id,
                "status": "completed",
                "extracted_templates": len(analysis.get("extracted_templates", [])),
                "extracted_objections": len(analysis.get("objections", [])),
                "quality_score": analysis.get("quality_score"),
            }
            
        except Exception as e:
            self.db.table("learning_cases").update({
                "processing_status": "failed"
            }).eq("id", case_id).execute()
            
            return {"error": str(e)}
    
    def _analyze_conversation_local(
        self,
        conversation: str,
        vertical: Optional[str],
        channel: Optional[str],
        goal: Optional[str],
        outcome: Optional[str],
    ) -> Dict[str, Any]:
        """
        Lokale Analyse ohne LLM-Call.
        
        Für tiefe Analyse sollte Claude verwendet werden.
        """
        
        # Basic message parsing
        messages = self._parse_messages(conversation)
        
        # Count stats
        message_count = len(messages)
        seller_messages = [m for m in messages if m.get("role") == "seller"]
        customer_messages = [m for m in messages if m.get("role") == "customer"]
        
        # Detect objections
        objections = self._detect_objections(messages)
        
        # Extract potential templates
        templates = self._extract_templates(seller_messages, outcome)
        
        # Analyze style
        style = self._analyze_style(seller_messages)
        
        # Calculate quality score
        quality = self._calculate_quality_score(
            message_count=message_count,
            has_objections=len(objections) > 0,
            outcome=outcome,
            templates_found=len(templates),
        )
        
        return {
            "extracted_data": {
                "message_count": message_count,
                "seller_message_count": len(seller_messages),
                "customer_message_count": len(customer_messages),
                "key_objections": [o.get("type") for o in objections],
                "outcome": outcome,
            },
            "extracted_templates": templates,
            "seller_style": style,
            "objections": objections,
            "quality_score": quality,
        }
    
    def _parse_messages(self, conversation: str) -> List[Dict[str, Any]]:
        """Parst Gesprächstext in einzelne Nachrichten"""
        messages = []
        
        # Verschiedene Formate versuchen
        # Format 1: "Name: Nachricht"
        pattern1 = r'^([^:]+):\s*(.+?)(?=^[^:]+:|$)'
        # Format 2: Ich: / Du: / Kunde: / etc.
        pattern2 = r'^(Ich|Du|Kunde|Verkäufer|Seller|Customer):\s*(.+?)(?=^(?:Ich|Du|Kunde|Verkäufer|Seller|Customer):|$)'
        
        lines = conversation.strip().split('\n')
        current_role = None
        current_text = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for role indicator
            role_match = re.match(r'^(Ich|Du|Kunde|Verkäufer|Seller|Customer|[A-Z][a-z]+):\s*(.*)$', line)
            
            if role_match:
                # Save previous message
                if current_role and current_text:
                    messages.append({
                        "role": current_role,
                        "text": ' '.join(current_text),
                    })
                
                # Determine role
                role_indicator = role_match.group(1).lower()
                if role_indicator in ['ich', 'verkäufer', 'seller']:
                    current_role = 'seller'
                else:
                    current_role = 'customer'
                
                current_text = [role_match.group(2)] if role_match.group(2) else []
            else:
                # Continue current message
                current_text.append(line)
        
        # Save last message
        if current_role and current_text:
            messages.append({
                "role": current_role,
                "text": ' '.join(current_text),
            })
        
        return messages
    
    def _detect_objections(self, messages: List[Dict]) -> List[Dict[str, Any]]:
        """Erkennt Einwände in Kundennachrichten"""
        objections = []
        
        objection_patterns = {
            'price': ['zu teuer', 'kein budget', 'kostet zu viel', 'kann mir nicht leisten', 'preis'],
            'time': ['keine zeit', 'zu beschäftigt', 'busy', 'später', 'gerade nicht'],
            'think_about_it': ['überlegen', 'drüber nachdenken', 'think about', 'schauen'],
            'not_interested': ['kein interesse', 'interessiert mich nicht', 'nicht interessiert'],
            'competitor': ['andere option', 'vergleichen', 'konkurrenz', 'alternativen'],
        }
        
        for i, msg in enumerate(messages):
            if msg.get("role") != "customer":
                continue
            
            text_lower = msg.get("text", "").lower()
            
            for obj_type, patterns in objection_patterns.items():
                for pattern in patterns:
                    if pattern in text_lower:
                        # Find response (next seller message)
                        response = None
                        response_technique = None
                        for j in range(i + 1, len(messages)):
                            if messages[j].get("role") == "seller":
                                response = messages[j].get("text")
                                response_technique = self._detect_technique(response)
                                break
                        
                        # Check if it worked (conversation continued positively)
                        worked = i < len(messages) - 2  # Simple heuristic
                        
                        objections.append({
                            "type": obj_type,
                            "text": msg.get("text"),
                            "context": f"Message {i + 1}",
                            "response": response,
                            "technique": response_technique,
                            "worked": worked,
                        })
                        break
        
        return objections
    
    def _detect_technique(self, response: str) -> Optional[str]:
        """Erkennt verwendete Verkaufstechnik in einer Antwort"""
        if not response:
            return None
        
        response_lower = response.lower()
        
        if any(w in response_lower for w in ['verstehe', 'nachvollziehen', 'fühle']):
            return 'empathize'
        if '?' in response:
            return 'question'
        if any(w in response_lower for w in ['andere kunden', 'viele', 'erfahrung']):
            return 'social_proof'
        if any(w in response_lower for w in ['stell dir vor', 'wenn du', 'könnte']):
            return 'future_pacing'
        if any(w in response_lower for w in ['kein druck', 'kein stress', 'entspannt']):
            return 'pressure_off'
        
        return 'direct_response'
    
    def _extract_templates(
        self,
        seller_messages: List[Dict],
        outcome: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Extrahiert potenzielle Templates aus Verkäufernachrichten"""
        templates = []
        
        for i, msg in enumerate(seller_messages):
            text = msg.get("text", "")
            
            # Skip very short messages
            if len(text) < 30:
                continue
            
            # Determine use case based on position and content
            use_case = "general"
            if i == 0:
                use_case = "first_contact"
            elif '?' in text:
                use_case = "engagement_question"
            elif any(w in text.lower() for w in ['termin', 'call', 'treffen']):
                use_case = "appointment_booking"
            elif any(w in text.lower() for w in ['verstehe', 'nachvollziehen']):
                use_case = "objection_handler"
            
            # Only add as template if outcome was positive
            if outcome in ['success', 'pending']:
                templates.append({
                    "use_case": use_case,
                    "message": text,
                    "position": i + 1,
                    "effectiveness_indicators": ["from_successful_conversation"] if outcome == "success" else [],
                })
        
        return templates[:5]  # Max 5 templates per case
    
    def _analyze_style(self, seller_messages: List[Dict]) -> Dict[str, Any]:
        """Analysiert den Verkäufer-Stil"""
        if not seller_messages:
            return {}
        
        all_text = ' '.join(m.get("text", "") for m in seller_messages)
        
        # Emoji count
        emoji_count = sum(1 for c in all_text if ord(c) > 127000)
        emoji_usage = "none"
        if emoji_count > 10:
            emoji_usage = "high"
        elif emoji_count > 3:
            emoji_usage = "moderate"
        elif emoji_count > 0:
            emoji_usage = "low"
        
        # Message length
        avg_length = sum(len(m.get("text", "")) for m in seller_messages) / len(seller_messages)
        message_length = "short" if avg_length < 100 else "medium" if avg_length < 250 else "long"
        
        # Tone
        tone = "neutral"
        if any(w in all_text.lower() for w in ['😊', '💪', '🔥', 'super', 'mega', 'geil']):
            tone = "enthusiastic"
        elif any(w in all_text.lower() for w in ['verstehe', 'fühle', 'nachvollziehen']):
            tone = "empathetic"
        elif 'Sie' in all_text:
            tone = "formal"
        else:
            tone = "friendly_casual"
        
        # Pressure level
        pressure = "low"
        if any(w in all_text.lower() for w in ['nur heute', 'letzte chance', 'sofort']):
            pressure = "high"
        elif any(w in all_text.lower() for w in ['bald', 'diese woche', 'wann passt']):
            pressure = "medium"
        
        return {
            "tone": tone,
            "pressure_level": pressure,
            "emoji_usage": emoji_usage,
            "message_length": message_length,
        }
    
    def _calculate_quality_score(
        self,
        message_count: int,
        has_objections: bool,
        outcome: Optional[str],
        templates_found: int,
    ) -> float:
        """Berechnet Quality Score für das Case"""
        score = 0.5  # Base score
        
        # More messages = more valuable
        if message_count >= 5:
            score += 0.1
        if message_count >= 10:
            score += 0.1
        
        # Objections handled = very valuable
        if has_objections:
            score += 0.15
        
        # Successful outcome = most valuable
        if outcome == "success":
            score += 0.2
        elif outcome == "pending":
            score += 0.1
        
        # Templates found
        if templates_found >= 3:
            score += 0.05
        
        return min(1.0, score)
    
    def get_case(self, case_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Holt ein einzelnes Case"""
        result = self.db.table("learning_cases").select("*").eq(
            "id", case_id
        ).eq("user_id", user_id).execute()
        
        return result.data[0] if result.data else None
    
    def get_user_cases(
        self,
        user_id: str,
        status: Optional[str] = None,
        vertical: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Holt alle Cases eines Users"""
        query = self.db.table("learning_cases").select("*").eq("user_id", user_id)
        
        if status:
            query = query.eq("processing_status", status)
        if vertical:
            query = query.eq("vertical", vertical)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        return result.data or []
    
    def get_extracted_templates(
        self,
        user_id: str,
        use_case: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Holt extrahierte Templates aus allen Cases"""
        
        result = self.db.table("learning_cases").select(
            "id, extracted_templates, vertical, channel, quality_score"
        ).eq("user_id", user_id).eq("processing_status", "completed").execute()
        
        all_templates = []
        for row in (result.data or []):
            templates = row.get("extracted_templates") or []
            for t in templates:
                if use_case and t.get("use_case") != use_case:
                    continue
                t["case_id"] = row["id"]
                t["vertical"] = row.get("vertical")
                t["channel"] = row.get("channel")
                t["case_quality"] = row.get("quality_score")
                all_templates.append(t)
        
        # Sort by quality
        all_templates.sort(key=lambda x: x.get("case_quality", 0), reverse=True)
        
        return all_templates
    
    def get_objection_handlers(
        self,
        user_id: str,
        objection_type: Optional[str] = None,
        only_successful: bool = True,
    ) -> List[Dict[str, Any]]:
        """Holt extrahierte Einwandbehandlungen"""
        
        query = self.db.table("extracted_objections").select("*").eq("user_id", user_id)
        
        if objection_type:
            query = query.eq("objection_type", objection_type)
        
        if only_successful:
            query = query.eq("response_worked", True)
        
        result = query.order("created_at", desc=True).execute()
        
        return result.data or []
    
    def delete_case(self, case_id: str, user_id: str) -> bool:
        """Löscht ein Case"""
        result = self.db.table("learning_cases").delete().eq(
            "id", case_id
        ).eq("user_id", user_id).execute()
        
        return bool(result.data)

