"""
╔════════════════════════════════════════════════════════════════════════════╗
║  KNOWLEDGE BASE UPLOAD API                                                  ║
║  Firmeneigene Dokumente hochladen und verarbeiten                          ║
║  PDF, DOCX, TXT → Vektorisiert für RAG                                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST   /knowledge/upload         - Dokument hochladen
- GET    /knowledge/documents      - Alle Dokumente auflisten
- DELETE /knowledge/documents/{id} - Dokument löschen
- POST   /knowledge/search         - Semantische Suche in KB
- GET    /knowledge/stats          - KB Statistiken
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
import os

from ...core.security import get_current_user
from ...core.database import get_db

router = APIRouter(prefix="/knowledge", tags=["knowledge-base"])


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class DocumentUploadResponse(BaseModel):
    """Response nach Document Upload."""
    id: str
    filename: str
    file_type: str
    size_bytes: int
    chunks_created: int
    status: str  # processing, ready, error
    created_at: str


class DocumentListItem(BaseModel):
    """Ein Dokument in der Liste."""
    id: str
    filename: str
    file_type: str
    size_bytes: int
    chunks_count: int
    status: str
    created_at: str
    category: Optional[str]


class DocumentListResponse(BaseModel):
    """Liste aller Dokumente."""
    documents: List[DocumentListItem]
    total: int
    total_chunks: int


class SearchRequest(BaseModel):
    """Request für semantische Suche."""
    query: str = Field(..., min_length=3)
    top_k: int = Field(5, ge=1, le=20)
    category: Optional[str] = None
    min_score: float = Field(0.5, ge=0, le=1)


class SearchResultItem(BaseModel):
    """Ein Suchergebnis."""
    chunk_id: str
    document_id: str
    document_name: str
    content: str
    score: float
    metadata: Dict[str, Any]


class SearchResponse(BaseModel):
    """Suchergebnisse."""
    results: List[SearchResultItem]
    query: str
    total_found: int


class KnowledgeStatsResponse(BaseModel):
    """KB Statistiken."""
    total_documents: int
    total_chunks: int
    total_size_mb: float
    documents_by_type: Dict[str, int]
    documents_by_category: Dict[str, int]
    last_updated: str


# ═══════════════════════════════════════════════════════════════════════════
# ALLOWED FILE TYPES
# ═══════════════════════════════════════════════════════════════════════════

ALLOWED_EXTENSIONS = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ═══════════════════════════════════════════════════════════════════════════
# MOCK DATA (Replace with actual DB operations)
# ═══════════════════════════════════════════════════════════════════════════

MOCK_DOCUMENTS = [
    {
        "id": "doc-001",
        "filename": "Produktkatalog_2024.pdf",
        "file_type": "pdf",
        "size_bytes": 2_500_000,
        "chunks_count": 45,
        "status": "ready",
        "created_at": "2024-11-15T10:30:00Z",
        "category": "products",
    },
    {
        "id": "doc-002",
        "filename": "Preisliste.docx",
        "file_type": "docx",
        "size_bytes": 150_000,
        "chunks_count": 12,
        "status": "ready",
        "created_at": "2024-11-10T14:20:00Z",
        "category": "pricing",
    },
    {
        "id": "doc-003",
        "filename": "FAQ_Einwandbehandlung.txt",
        "file_type": "txt",
        "size_bytes": 50_000,
        "chunks_count": 8,
        "status": "ready",
        "created_at": "2024-11-01T09:15:00Z",
        "category": "objections",
    },
]


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Query(None, description="Kategorie: products, pricing, faq, objections, compliance, company"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    📤 Lädt ein Dokument in die Knowledge Base hoch.
    
    Unterstützte Formate: PDF, DOCX, DOC, TXT, MD
    Max. Größe: 10 MB
    
    Das Dokument wird:
    1. Validiert (Format, Größe)
    2. In Chunks aufgeteilt
    3. Vektorisiert (Embeddings)
    4. In der Datenbank gespeichert
    """
    # Validiere Dateiendung
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Dateityp nicht erlaubt. Erlaubt: {', '.join(ALLOWED_EXTENSIONS.keys())}"
        )
    
    # Lese Datei
    content = await file.read()
    size = len(content)
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Datei zu groß. Maximum: {MAX_FILE_SIZE // (1024*1024)} MB"
        )
    
    # TODO: Implementiere echte Dokumentenverarbeitung
    # 1. Text extrahieren (PyPDF2, python-docx, etc.)
    # 2. Text in Chunks aufteilen
    # 3. Embeddings erstellen (OpenAI ada-002)
    # 4. In Supabase/pgvector speichern
    
    doc_id = str(uuid4())[:8]
    
    # Mock Response
    return DocumentUploadResponse(
        id=doc_id,
        filename=filename,
        file_type=ext[1:],  # ohne Punkt
        size_bytes=size,
        chunks_created=max(1, size // 1000),  # Mock: 1 Chunk pro KB
        status="processing",
        created_at=datetime.now().isoformat(),
    )


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    📚 Listet alle Dokumente in der Knowledge Base auf.
    """
    # TODO: Echte DB-Abfrage
    docs = MOCK_DOCUMENTS
    
    if category:
        docs = [d for d in docs if d.get("category") == category]
    
    if status:
        docs = [d for d in docs if d.get("status") == status]
    
    total_chunks = sum(d.get("chunks_count", 0) for d in docs)
    
    return DocumentListResponse(
        documents=[DocumentListItem(**d) for d in docs],
        total=len(docs),
        total_chunks=total_chunks,
    )


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    🗑️ Löscht ein Dokument und alle zugehörigen Chunks.
    """
    # TODO: Echte Löschung aus DB
    
    # Prüfe ob Dokument existiert
    doc = next((d for d in MOCK_DOCUMENTS if d["id"] == document_id), None)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    
    return {
        "message": f"Dokument '{doc['filename']}' gelöscht",
        "deleted_chunks": doc.get("chunks_count", 0),
    }


@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    request: SearchRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    🔍 Semantische Suche in der Knowledge Base.
    
    Nutzt Vektor-Ähnlichkeit (Cosine Similarity) für relevante Ergebnisse.
    """
    # TODO: Echte Vektor-Suche implementieren
    # 1. Query embedden
    # 2. pgvector similarity search
    # 3. Ergebnisse ranken
    
    # Mock Results
    mock_results = [
        SearchResultItem(
            chunk_id="chunk-001",
            document_id="doc-001",
            document_name="Produktkatalog_2024.pdf",
            content=f"Relevanter Inhalt für: {request.query}...",
            score=0.92,
            metadata={"page": 5, "section": "Produkte"},
        ),
        SearchResultItem(
            chunk_id="chunk-015",
            document_id="doc-002",
            document_name="Preisliste.docx",
            content=f"Weitere relevante Information zu: {request.query}...",
            score=0.85,
            metadata={"section": "Preise"},
        ),
    ]
    
    # Filter by min_score
    filtered_results = [r for r in mock_results if r.score >= request.min_score]
    
    return SearchResponse(
        results=filtered_results[:request.top_k],
        query=request.query,
        total_found=len(filtered_results),
    )


@router.get("/stats", response_model=KnowledgeStatsResponse)
async def get_knowledge_stats(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    📊 Gibt Statistiken über die Knowledge Base zurück.
    """
    # TODO: Echte Statistiken aus DB
    
    total_size = sum(d.get("size_bytes", 0) for d in MOCK_DOCUMENTS)
    
    docs_by_type = {}
    docs_by_category = {}
    
    for doc in MOCK_DOCUMENTS:
        file_type = doc.get("file_type", "unknown")
        category = doc.get("category", "uncategorized")
        
        docs_by_type[file_type] = docs_by_type.get(file_type, 0) + 1
        docs_by_category[category] = docs_by_category.get(category, 0) + 1
    
    return KnowledgeStatsResponse(
        total_documents=len(MOCK_DOCUMENTS),
        total_chunks=sum(d.get("chunks_count", 0) for d in MOCK_DOCUMENTS),
        total_size_mb=round(total_size / (1024 * 1024), 2),
        documents_by_type=docs_by_type,
        documents_by_category=docs_by_category,
        last_updated=datetime.now().isoformat(),
    )


@router.get("/categories")
async def get_categories(
    current_user: dict = Depends(get_current_user),
):
    """
    📁 Gibt alle verfügbaren Kategorien zurück.
    """
    return {
        "categories": [
            {"id": "products", "label": "Produkte", "emoji": "📦"},
            {"id": "pricing", "label": "Preise", "emoji": "💰"},
            {"id": "faq", "label": "FAQ", "emoji": "❓"},
            {"id": "objections", "label": "Einwände", "emoji": "🛡️"},
            {"id": "compliance", "label": "Compliance", "emoji": "⚖️"},
            {"id": "company", "label": "Unternehmen", "emoji": "🏢"},
            {"id": "testimonials", "label": "Erfolgsgeschichten", "emoji": "⭐"},
        ]
    }

