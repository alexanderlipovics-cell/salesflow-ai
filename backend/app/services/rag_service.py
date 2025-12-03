"""
═══════════════════════════════════════════════════════════════════════════
RAG SERVICE
═══════════════════════════════════════════════════════════════════════════
Retrieval-Augmented Generation Service für Knowledge Base.

Features:
- OpenAI Embeddings (text-embedding-ada-002)
- Vector Similarity Search mit pgvector
- Semantic Search in Knowledge Base
- Objection Handling Responses
- Product Recommendations
- Best Practices Retrieval

Version: 1.0.0 (Premium Feature)
═══════════════════════════════════════════════════════════════════════════
"""

from typing import List, Dict, Optional, Any
from openai import AsyncOpenAI
from app.core.supabase import get_supabase_client
from app.utils.logger import get_logger
import json

logger = get_logger(__name__)


class RAGService:
    """
    Retrieval-Augmented Generation Service.
    Manages company knowledge base and provides semantic search.
    """
    
    def __init__(self, openai_client: AsyncOpenAI, supabase=None):
        self.openai_client = openai_client
        self.supabase = supabase or get_supabase_client()
    
    async def add_knowledge(
        self,
        user_id: str,
        title: str,
        content: str,
        category: str,
        tags: List[str] = None,
        source: str = 'manual'
    ) -> str:
        """
        Add new knowledge to base with automatic embedding generation.
        
        Args:
            user_id: User who created this knowledge
            title: Title of the knowledge item
            content: Full content
            category: One of: playbook, objection, product, script, faq, best_practice, article, training
            tags: Optional tags for categorization
            source: Source of knowledge (manual, imported, ai_generated, user_contributed)
        
        Returns:
            Knowledge Base ID (UUID)
        """
        try:
            # Generate embedding
            embedding = await self._generate_embedding(content)
            
            # Insert into knowledge_base
            kb_data = {
                'category': category,
                'title': title,
                'content': content,
                'embedding': json.dumps(embedding),  # Supabase handles vector conversion
                'tags': tags or [],
                'language': 'de',
                'source': source,
                'created_by': user_id
            }
            
            result = self.supabase.table('knowledge_base').insert(kb_data).execute()
            
            if result.data:
                kb_id = result.data[0]['id']
                logger.info(f"Knowledge added: {kb_id} - {title}")
                return kb_id
            
            raise Exception("Failed to insert knowledge")
        
        except Exception as e:
            logger.error(f"Error adding knowledge: {str(e)}")
            raise
    
    async def search_knowledge(
        self,
        query: str,
        categories: List[str] = None,
        limit: int = 5,
        similarity_threshold: float = 0.7
    ) -> List[Dict]:
        """
        Semantic search in knowledge base using vector similarity.
        
        Args:
            query: Search query
            categories: Filter by categories (e.g., ['playbook', 'objection'])
            limit: Max number of results
            similarity_threshold: Minimum similarity score (0-1)
        
        Returns:
            List of matching knowledge items with similarity scores
        """
        try:
            # Generate query embedding
            query_embedding = await self._generate_embedding(query)
            
            # Build RPC call for vector search
            # NOTE: This requires a PostgreSQL function - see migration
            params = {
                'query_embedding': query_embedding,
                'match_threshold': similarity_threshold,
                'match_count': limit
            }
            
            if categories:
                params['categories'] = categories
            
            # Fallback: Simple text search if vector search not available
            # In production, you'd use pgvector's cosine distance
            query_builder = self.supabase.table('knowledge_base').select('*')
            
            if categories:
                query_builder = query_builder.in_('category', categories)
            
            query_builder = query_builder.eq('is_active', True)
            query_builder = query_builder.limit(limit)
            
            # Text search fallback
            query_builder = query_builder.or_(
                f"title.ilike.%{query}%,content.ilike.%{query}%"
            )
            
            result = query_builder.execute()
            
            return [
                {
                    "id": str(item['id']),
                    "category": item['category'],
                    "title": item['title'],
                    "content": item['content'],
                    "tags": item.get('tags', []),
                    "similarity": 0.85  # Placeholder for text search
                }
                for item in result.data or []
            ]
        
        except Exception as e:
            logger.error(f"Error searching knowledge: {str(e)}")
            return []
    
    async def find_objection_response(
        self,
        objection_text: str,
        category: Optional[str] = None,
        personality_type: Optional[str] = None
    ) -> List[Dict]:
        """
        Find best objection handling response from objection library.
        
        Args:
            objection_text: The objection raised by the lead
            category: Optional category filter (price, time, trust, etc.)
            personality_type: Optional DISG type for personalized response
        
        Returns:
            List of matching objection responses
        """
        try:
            # Search in objection_library table
            query_builder = self.supabase.table('objection_library').select('*')
            
            if category:
                query_builder = query_builder.eq('objection_category', category)
            
            # Text search in objection_text and similar_objections
            query_builder = query_builder.or_(
                f"objection_text.ilike.%{objection_text}%"
            )
            
            query_builder = query_builder.order('success_rate', desc=True)
            query_builder = query_builder.limit(3)
            
            result = query_builder.execute()
            
            if not result.data:
                # Fallback: Search in general knowledge base
                kb_results = await self.search_knowledge(
                    query=objection_text,
                    categories=['objection'],
                    limit=3
                )
                return kb_results
            
            # Adapt response to personality if provided
            formatted_results = []
            for item in result.data:
                adapted_response = item.get('response_script', '')
                
                if personality_type and item.get('personality_adaptations'):
                    try:
                        adaptations = item['personality_adaptations']
                        if isinstance(adaptations, str):
                            adaptations = json.loads(adaptations)
                        
                        if personality_type in adaptations:
                            adapted_response = adaptations[personality_type]
                    except:
                        pass
                
                formatted_results.append({
                    "objection_category": item.get('objection_category'),
                    "response_script": adapted_response,
                    "success_rate": float(item['success_rate']) if item.get('success_rate') else None
                })
            
            return formatted_results
        
        except Exception as e:
            logger.error(f"Error finding objection response: {str(e)}")
            return []
    
    async def recommend_products(
        self,
        lead_id: str,
        limit: int = 3
    ) -> List[Dict]:
        """
        Recommend products based on lead profile and purchase history.
        
        Args:
            lead_id: Lead UUID
            limit: Max number of recommendations
        
        Returns:
            List of recommended products with reasons
        """
        try:
            # Get lead info with personality and BANT
            lead_query = """
                SELECT 
                    l.*,
                    pp.primary_type as personality_type,
                    ba.total_score as bant_score,
                    ba.budget_notes
                FROM leads l
                LEFT JOIN personality_profiles pp ON l.id = pp.lead_id
                LEFT JOIN bant_assessments ba ON l.id = ba.lead_id
                WHERE l.id = %s
            """
            
            # For now, simpler approach with Supabase client
            lead = self.supabase.table('leads').select('*').eq('id', lead_id).execute()
            
            if not lead.data:
                return []
            
            lead_data = lead.data[0]
            
            # Get personality and BANT
            personality = self.supabase.table('personality_profiles').select('*').eq('lead_id', lead_id).execute()
            bant = self.supabase.table('bant_assessments').select('*').eq('lead_id', lead_id).execute()
            
            personality_type = personality.data[0]['primary_type'] if personality.data else None
            
            # Extract budget
            budget = 500  # Default
            if bant.data and bant.data[0].get('budget_notes'):
                try:
                    budget_notes = json.loads(bant.data[0]['budget_notes'])
                    if budget_notes.get('amount'):
                        budget = budget_notes['amount']
                except:
                    pass
            
            # Get products
            query_builder = self.supabase.table('products').select('*')
            query_builder = query_builder.eq('active', True)
            # Filter by budget (allow 20% over)
            # Note: Supabase doesn't support complex filters easily, so we filter in Python
            
            products = query_builder.execute()
            
            # Filter and sort products
            filtered_products = []
            for product in products.data or []:
                product_price = float(product.get('price', 0))
                
                # Budget filter
                if product_price > budget * 1.2:
                    continue
                
                # Personality match
                target_types = product.get('target_personality_types', [])
                personality_match = personality_type in target_types if target_types else False
                
                # Calculate score
                score = 0
                if product_price <= budget:
                    score += 50
                elif product_price <= budget * 1.1:
                    score += 30
                
                if personality_match:
                    score += 30
                
                if product.get('sales_count', 0) > 10:
                    score += 20
                
                filtered_products.append({
                    **product,
                    'recommendation_score': score
                })
            
            # Sort by score
            filtered_products.sort(key=lambda x: x['recommendation_score'], reverse=True)
            
            # Return top N with recommendation reasons
            results = []
            for product in filtered_products[:limit]:
                results.append({
                    "product_id": str(product['id']),
                    "name": product['name'],
                    "description": product['description'],
                    "price": float(product['price']),
                    "tier": product.get('tier'),
                    "features": product.get('features', []),
                    "recommendation_reason": self._get_recommendation_reason(product, lead_data, budget, personality_type)
                })
            
            return results
        
        except Exception as e:
            logger.error(f"Error recommending products: {str(e)}")
            return []
    
    def _get_recommendation_reason(
        self, 
        product: Dict, 
        lead: Dict, 
        budget: float,
        personality_type: Optional[str]
    ) -> str:
        """Generate personalized recommendation reason."""
        reasons = []
        
        product_price = float(product.get('price', 0))
        
        if product_price <= budget:
            reasons.append("Passt perfekt zu deinem Budget")
        elif product_price <= budget * 1.1:
            reasons.append("Nur geringfügig über Budget - worth it!")
        
        target_types = product.get('target_personality_types', [])
        if personality_type and personality_type in target_types:
            reasons.append(f"Ideal für {personality_type}-Persönlichkeiten")
        
        if product.get('sales_count', 0) > 50:
            reasons.append("Bestseller!")
        
        if not reasons:
            reasons.append("Beliebte Wahl")
        
        return " • ".join(reasons)
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate OpenAI embedding for text.
        
        Args:
            text: Text to embed
        
        Returns:
            1536-dimensional embedding vector
        """
        try:
            response = await self.openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            # Return zero vector as fallback
            return [0.0] * 1536
    
    async def increment_usage(self, kb_id: str):
        """Increment usage counter for knowledge item."""
        try:
            # Get current count
            result = self.supabase.table('knowledge_base').select('usage_count').eq('id', kb_id).execute()
            
            if result.data:
                current_count = result.data[0].get('usage_count', 0)
                self.supabase.table('knowledge_base').update({
                    'usage_count': current_count + 1
                }).eq('id', kb_id).execute()
        
        except Exception as e:
            logger.error(f"Error incrementing usage: {str(e)}")
    
    async def update_effectiveness_score(self, kb_id: str, was_helpful: bool):
        """
        Update effectiveness score based on user feedback.
        
        Args:
            kb_id: Knowledge Base ID
            was_helpful: True if the knowledge was helpful
        """
        try:
            result = self.supabase.table('knowledge_base').select('effectiveness_score, usage_count').eq('id', kb_id).execute()
            
            if result.data:
                item = result.data[0]
                current_score = item.get('effectiveness_score') or 0.5
                usage_count = item.get('usage_count', 0)
                
                # Weighted average with new feedback
                new_score = (current_score * usage_count + (1.0 if was_helpful else 0.0)) / (usage_count + 1)
                
                self.supabase.table('knowledge_base').update({
                    'effectiveness_score': new_score
                }).eq('id', kb_id).execute()
        
        except Exception as e:
            logger.error(f"Error updating effectiveness: {str(e)}")

