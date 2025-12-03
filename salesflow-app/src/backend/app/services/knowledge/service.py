# backend/app/services/knowledge/service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  KNOWLEDGE SERVICE                                                         ║
║  Manages Evidence Hub & Company Knowledge                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- CRUD für Knowledge Items
- Hybrid Search (Semantic + Keyword)
- Company-aware Filtering mit Fallback-Logik
- CHIEF Integration für RAG Context
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import time

from supabase import Client

from app.api.schemas.knowledge import (
    KnowledgeItemCreate,
    KnowledgeItemUpdate,
    KnowledgeItemResponse,
    KnowledgeSearchQuery,
    KnowledgeSearchResult,
    KnowledgeSearchResponse,
    KnowledgeContextItem,
    KnowledgeDomain,
    EvidenceStrength,
    BulkImportRequest,
    BulkImportResponse,
)
from .embedding_service import EmbeddingService


class KnowledgeService:
    """Service für Knowledge Management."""
    
    def __init__(self, db: Client, embedding_service: EmbeddingService = None):
        self.db = db
        self.embedding_service = embedding_service or EmbeddingService(db)
    
    # =========================================================================
    # CRUD OPERATIONS
    # =========================================================================
    
    def create_item(self, item: KnowledgeItemCreate) -> Optional[KnowledgeItemResponse]:
        """
        Erstellt ein neues Knowledge Item.
        
        Args:
            item: Das zu erstellende Item
            
        Returns:
            Das erstellte Item oder None bei Fehler
        """
        try:
            data = {
                "company_id": item.company_id,
                "vertical_id": item.vertical_id,
                "language": item.language,
                "region": item.region,
                "domain": item.domain.value,
                "type": item.type.value,
                "topic": item.topic,
                "subtopic": item.subtopic,
                "title": item.title,
                "content": item.content,
                "content_short": item.content_short,
                "study_year": item.study_year,
                "study_authors": item.study_authors,
                "study_population": item.study_population,
                "study_type": item.study_type,
                "study_intervention": item.study_intervention,
                "study_outcomes": item.study_outcomes,
                "nutrients_or_factors": item.nutrients_or_factors,
                "health_outcome_areas": item.health_outcome_areas,
                "evidence_level": item.evidence_level.value if item.evidence_level else None,
                "source_type": item.source_type,
                "source_url": item.source_url,
                "source_reference": item.source_reference,
                "quality_score": item.quality_score,
                "compliance_level": item.compliance_level.value if item.compliance_level else "normal",
                "requires_disclaimer": item.requires_disclaimer,
                "disclaimer_text": item.disclaimer_text,
                "usage_notes_for_ai": item.usage_notes_for_ai,
                "keywords": item.keywords,
                "metadata": item.metadata or {},
            }
            
            # Remove None values
            data = {k: v for k, v in data.items() if v is not None}
            
            result = self.db.table("knowledge_items").insert(data).execute()
            
            if result.data and len(result.data) > 0:
                return self._map_to_response(result.data[0])
            return None
            
        except Exception as e:
            print(f"Error creating knowledge item: {e}")
            return None
    
    def get_item(self, item_id: str) -> Optional[KnowledgeItemResponse]:
        """Holt ein einzelnes Knowledge Item."""
        try:
            result = self.db.table("knowledge_items").select("*").eq(
                "id", item_id
            ).eq("is_active", True).single().execute()
            
            if result.data:
                return self._map_to_response(result.data)
            return None
            
        except Exception as e:
            print(f"Error getting knowledge item: {e}")
            return None
    
    def update_item(
        self,
        item_id: str,
        update: KnowledgeItemUpdate,
    ) -> Optional[KnowledgeItemResponse]:
        """Aktualisiert ein Knowledge Item."""
        try:
            data = update.model_dump(exclude_unset=True)
            
            # Convert enums to values
            if "compliance_level" in data and data["compliance_level"]:
                data["compliance_level"] = data["compliance_level"].value
            
            result = self.db.table("knowledge_items").update(data).eq(
                "id", item_id
            ).execute()
            
            if result.data and len(result.data) > 0:
                return self._map_to_response(result.data[0])
            return None
            
        except Exception as e:
            print(f"Error updating knowledge item: {e}")
            return None
    
    def delete_item(self, item_id: str) -> bool:
        """Soft-Delete eines Knowledge Items."""
        try:
            result = self.db.table("knowledge_items").update({
                "is_active": False,
            }).eq("id", item_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error deleting knowledge item: {e}")
            return False
    
    def list_items(
        self,
        company_id: Optional[str] = None,
        domain: Optional[str] = None,
        type_filter: Optional[str] = None,
        topic: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[KnowledgeItemResponse]:
        """Listet Knowledge Items mit Filtern."""
        try:
            query = self.db.table("knowledge_items").select("*").eq(
                "is_active", True
            ).eq("is_current", True)
            
            if company_id:
                query = query.eq("company_id", company_id)
            if domain:
                query = query.eq("domain", domain)
            if type_filter:
                query = query.eq("type", type_filter)
            if topic:
                query = query.eq("topic", topic)
            
            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
            result = query.execute()
            
            return [self._map_to_response(row) for row in (result.data or [])]
            
        except Exception as e:
            print(f"Error listing knowledge items: {e}")
            return []
    
    # =========================================================================
    # SEARCH OPERATIONS
    # =========================================================================
    
    def search(self, query: KnowledgeSearchQuery) -> KnowledgeSearchResponse:
        """
        Hybrid Search: Semantic + Keyword.
        Mit Company-aware Filtering und Fallback-Logik.
        
        Args:
            query: Die Suchanfrage
            
        Returns:
            Suchergebnisse mit Relevanz-Scores
        """
        start_time = time.time()
        
        # 1. Get company_id from slug if provided
        company_id = query.company_id
        if query.company_slug and not company_id:
            company_id = self._get_company_id_by_slug(query.company_slug)
        
        # 2. Semantic Search (wenn aktiviert und Embeddings verfügbar)
        semantic_results = []
        if query.use_semantic_search and self.embedding_service:
            semantic_results = self._semantic_search(
                query.query,
                company_id,
                query.vertical_id,
                query.domains,
                query.limit * 2,
                query.language,
            )
        
        # 3. Keyword Search
        keyword_results = []
        if query.use_keyword_search:
            keyword_results = self._keyword_search(
                query.query,
                company_id,
                query.vertical_id,
                query.domains,
                query.types,
                query.topics,
                query.limit * 2,
                query.language,
            )
        
        # 4. Merge & Dedupe
        merged = self._merge_results(semantic_results, keyword_results)
        
        # 5. Apply filters
        filtered = self._apply_filters(
            merged,
            query.min_quality_score,
            query.evidence_levels,
            query.language,
        )
        
        # 6. Limit results
        final_results = filtered[:query.limit]
        
        # 7. Update usage counts
        self._update_usage_counts([r.item.id for r in final_results])
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        # Determine search method used
        search_method = "hybrid"
        if not semantic_results:
            search_method = "keyword"
        elif not keyword_results:
            search_method = "semantic"
        
        return KnowledgeSearchResponse(
            query=query.query,
            results=final_results,
            total_found=len(filtered),
            search_time_ms=elapsed_ms,
            search_method=search_method,
        )
    
    def _semantic_search(
        self,
        query: str,
        company_id: Optional[str],
        vertical_id: Optional[str],
        domains: Optional[List[KnowledgeDomain]],
        limit: int,
        language: str,
    ) -> List[KnowledgeSearchResult]:
        """Vector similarity search via pgvector."""
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.generate_embedding_sync(query)
            if not query_embedding:
                return []
            
            # Use RPC for semantic search
            params = {
                "query_embedding": query_embedding,
                "p_company_id": company_id,
                "p_vertical_id": vertical_id,
                "p_domains": [d.value for d in domains] if domains else None,
                "p_language": language,
                "p_limit": limit,
            }
            
            result = self.db.rpc("search_knowledge_semantic", params).execute()
            
            results = []
            for row in (result.data or []):
                # Fetch full item
                item = self.get_item(row["item_id"])
                if item:
                    results.append(KnowledgeSearchResult(
                        item=item,
                        relevance_score=float(row.get("similarity", 0.5)),
                        match_type="semantic",
                    ))
            
            return results
            
        except Exception as e:
            print(f"Semantic search error: {e}")
            return []
    
    def _keyword_search(
        self,
        query: str,
        company_id: Optional[str],
        vertical_id: Optional[str],
        domains: Optional[List[KnowledgeDomain]],
        types: Optional[List[str]],
        topics: Optional[List[str]],
        limit: int,
        language: str,
    ) -> List[KnowledgeSearchResult]:
        """Full-text keyword search."""
        try:
            # Build query with filters
            db_query = self.db.table("knowledge_items").select("*").eq(
                "is_active", True
            ).eq("is_current", True)
            
            # Company filter (with fallback to generic)
            if company_id:
                db_query = db_query.or_(
                    f"company_id.eq.{company_id},company_id.is.null"
                )
            
            # Vertical filter
            if vertical_id:
                db_query = db_query.or_(
                    f"vertical_id.eq.{vertical_id},vertical_id.is.null"
                )
            
            # Domain filter
            if domains:
                domain_values = [d.value for d in domains]
                db_query = db_query.in_("domain", domain_values)
            
            # Type filter
            if types:
                db_query = db_query.in_("type", types)
            
            # Topic filter
            if topics:
                db_query = db_query.in_("topic", topics)
            
            # Language filter
            db_query = db_query.or_(f"language.eq.{language},language.eq.universal")
            
            # Text search (title, content, topic)
            search_pattern = f"%{query}%"
            db_query = db_query.or_(
                f"title.ilike.{search_pattern},"
                f"content.ilike.{search_pattern},"
                f"topic.ilike.{search_pattern}"
            )
            
            # Order and limit
            db_query = db_query.order("quality_score", desc=True, nullsfirst=False).limit(limit)
            
            result = db_query.execute()
            
            results = []
            for row in (result.data or []):
                item = self._map_to_response(row)
                
                # Calculate relevance based on match location
                relevance = 0.5
                if query.lower() in (row.get("title") or "").lower():
                    relevance = 1.0
                elif query.lower() in (row.get("topic") or "").lower():
                    relevance = 0.8
                elif query.lower() in (row.get("content") or "").lower():
                    relevance = 0.6
                
                results.append(KnowledgeSearchResult(
                    item=item,
                    relevance_score=relevance,
                    match_type="keyword",
                ))
            
            return results
            
        except Exception as e:
            print(f"Keyword search error: {e}")
            return []
    
    def _merge_results(
        self,
        semantic: List[KnowledgeSearchResult],
        keyword: List[KnowledgeSearchResult],
    ) -> List[KnowledgeSearchResult]:
        """Merge semantic and keyword results, dedupe, rerank."""
        seen_ids = set()
        merged = []
        
        # First, add semantic results
        for r in semantic:
            if r.item.id not in seen_ids:
                seen_ids.add(r.item.id)
                # Check if also in keyword results (hybrid match)
                if any(kr.item.id == r.item.id for kr in keyword):
                    r.relevance_score *= 1.2  # Boost hybrid matches
                    r.match_type = "hybrid"
                merged.append(r)
        
        # Then add keyword-only results
        for r in keyword:
            if r.item.id not in seen_ids:
                seen_ids.add(r.item.id)
                merged.append(r)
        
        # Sort by final relevance score
        merged.sort(key=lambda x: x.relevance_score, reverse=True)
        
        return merged
    
    def _apply_filters(
        self,
        results: List[KnowledgeSearchResult],
        min_quality: Optional[float],
        evidence_levels: Optional[List[EvidenceStrength]],
        language: str,
    ) -> List[KnowledgeSearchResult]:
        """Apply post-search filters."""
        filtered = results
        
        if min_quality:
            filtered = [
                r for r in filtered
                if r.item.quality_score and r.item.quality_score >= min_quality
            ]
        
        if evidence_levels:
            level_values = [e.value for e in evidence_levels]
            filtered = [
                r for r in filtered
                if r.item.evidence_level in level_values or r.item.evidence_level is None
            ]
        
        return filtered
    
    def _update_usage_counts(self, item_ids: List[str]) -> None:
        """Update usage statistics for items."""
        if not item_ids:
            return
        
        try:
            for item_id in item_ids:
                # Increment usage count
                self.db.rpc("increment_usage_count", {"item_id": item_id}).execute()
        except Exception as e:
            # Non-critical, just log
            print(f"Warning: Could not update usage counts: {e}")
    
    # =========================================================================
    # CHIEF INTEGRATION
    # =========================================================================
    
    def get_context_for_chief(
        self,
        query: str,
        company_slug: str,
        vertical_id: str = "network_marketing",
        max_items: int = 5,
        max_tokens: int = 2000,
    ) -> List[KnowledgeContextItem]:
        """
        Holt relevanten Knowledge-Context für CHIEF.
        
        Args:
            query: Die User-Frage
            company_slug: Company Slug
            vertical_id: Vertical ID
            max_items: Maximale Anzahl Items
            max_tokens: Maximale Token-Schätzung
            
        Returns:
            Liste von KnowledgeContextItems
        """
        search_result = self.search(KnowledgeSearchQuery(
            query=query,
            company_slug=company_slug,
            vertical_id=vertical_id,
            limit=max_items * 2,  # Fetch more, then trim by tokens
        ))
        
        context_items = []
        total_tokens = 0
        
        for result in search_result.results:
            item = result.item
            
            # Estimate tokens (rough: 4 chars = 1 token)
            item_tokens = len(item.content) // 4
            
            if total_tokens + item_tokens > max_tokens:
                # Try short version
                if item.content_short:
                    item_tokens = len(item.content_short) // 4
                    if total_tokens + item_tokens > max_tokens:
                        continue
                    content = item.content_short
                else:
                    continue
            else:
                content = item.content
            
            context_items.append(KnowledgeContextItem(
                id=item.id,
                title=item.title,
                content=content,
                source=item.source_url or item.source_reference,
                type=item.type,
                domain=item.domain,
                compliance_level=item.compliance_level,
                requires_disclaimer=item.requires_disclaimer,
                disclaimer=item.disclaimer_text,
                evidence_level=item.evidence_level,
                relevance=result.relevance_score,
            ))
            
            total_tokens += item_tokens
            
            if len(context_items) >= max_items:
                break
        
        return context_items
    
    # =========================================================================
    # BULK OPERATIONS
    # =========================================================================
    
    async def bulk_import(
        self,
        request: BulkImportRequest,
        user_id: str,
    ) -> BulkImportResponse:
        """
        Bulk-Import von Knowledge Items.
        
        Args:
            request: Die Import-Anfrage
            user_id: ID des importierenden Users
            
        Returns:
            Import-Ergebnis
        """
        imported = 0
        skipped = 0
        errors = []
        
        # Get company_id if slug provided
        company_id = None
        if request.company_slug:
            company_id = self._get_company_id_by_slug(request.company_slug)
        
        for item in request.items:
            try:
                # Set company_id if not in item
                if company_id and not item.company_id:
                    item.company_id = company_id
                
                # Check for duplicate
                if request.skip_duplicates:
                    exists = self._check_duplicate(item.title, item.company_id)
                    if exists:
                        skipped += 1
                        continue
                
                # Create item
                created = self.create_item(item)
                if created:
                    imported += 1
                    
                    # Generate embedding async (in background)
                    if request.auto_generate_embeddings and self.embedding_service:
                        await self.embedding_service.generate_and_store(
                            created.id,
                            item.content,
                        )
                else:
                    errors.append(f"Failed to create: {item.title}")
                    
            except Exception as e:
                errors.append(f"Error importing '{item.title}': {str(e)}")
        
        return BulkImportResponse(
            success=len(errors) == 0,
            imported_count=imported,
            skipped_count=skipped,
            error_count=len(errors),
            errors=errors[:10],  # Limit error list
            embedding_status="completed" if request.auto_generate_embeddings else "skipped",
        )
    
    # =========================================================================
    # COMPANY OPERATIONS
    # =========================================================================
    
    def get_company_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """Holt eine Company by Slug."""
        try:
            result = self.db.table("companies").select("*").eq(
                "slug", slug
            ).eq("is_active", True).single().execute()
            
            return result.data
            
        except Exception:
            return None
    
    def _get_company_id_by_slug(self, slug: str) -> Optional[str]:
        """Holt die Company ID anhand des Slugs."""
        company = self.get_company_by_slug(slug)
        return company["id"] if company else None
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _check_duplicate(self, title: str, company_id: Optional[str]) -> bool:
        """Prüft ob ein Item mit gleichem Titel existiert."""
        try:
            query = self.db.table("knowledge_items").select("id").eq(
                "title", title
            ).eq("is_active", True)
            
            if company_id:
                query = query.eq("company_id", company_id)
            else:
                query = query.is_("company_id", "null")
            
            result = query.limit(1).execute()
            return len(result.data) > 0
            
        except Exception:
            return False
    
    def _map_to_response(self, row: Dict[str, Any]) -> KnowledgeItemResponse:
        """Mappt eine DB-Row zu einem Response-Objekt."""
        return KnowledgeItemResponse(
            id=str(row["id"]),
            company_id=str(row["company_id"]) if row.get("company_id") else None,
            vertical_id=row.get("vertical_id"),
            language=row.get("language", "de"),
            region=row.get("region"),
            domain=row.get("domain", "generic"),
            type=row.get("type", "faq"),
            topic=row.get("topic", ""),
            subtopic=row.get("subtopic"),
            title=row.get("title", ""),
            content=row.get("content", ""),
            content_short=row.get("content_short"),
            study_year=row.get("study_year"),
            study_authors=row.get("study_authors"),
            study_type=row.get("study_type"),
            study_outcomes=row.get("study_outcomes"),
            nutrients_or_factors=row.get("nutrients_or_factors"),
            health_outcome_areas=row.get("health_outcome_areas"),
            evidence_level=row.get("evidence_level"),
            source_type=row.get("source_type"),
            source_url=row.get("source_url"),
            source_reference=row.get("source_reference"),
            compliance_level=row.get("compliance_level", "normal"),
            requires_disclaimer=row.get("requires_disclaimer", False),
            disclaimer_text=row.get("disclaimer_text"),
            quality_score=row.get("quality_score"),
            usage_count=row.get("usage_count", 0),
            last_used_at=row.get("last_used_at"),
            is_verified=row.get("is_verified", False),
            version=row.get("version", 1),
            is_active=row.get("is_active", True),
            created_at=row.get("created_at") or datetime.now(),
            updated_at=row.get("updated_at") or datetime.now(),
        )

