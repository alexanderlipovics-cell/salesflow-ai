from datetime import datetime
from typing import List, Optional
import uuid
import io

import fitz  # PyMuPDF
import docx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from ..core.security import get_current_active_user
from ..core.deps import get_supabase

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class Product(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    price: Optional[str] = None
    benefits: List[str] = []
    objections: List[dict] = []  # [{objection, response}]


class Objection(BaseModel):
    id: Optional[str] = None
    objection: str
    response: str


class SalesScript(BaseModel):
    id: Optional[str] = None
    name: str
    content: str


class CompanyInfo(BaseModel):
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    company_description: Optional[str] = None


class KnowledgeBase(BaseModel):
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    company_description: Optional[str] = None
    products: List[Product] = []
    custom_objections: List[Objection] = []
    sales_scripts: List[SalesScript] = []


def _extract_user_id(current_user) -> str:
    if isinstance(current_user, dict):
        return str(
            current_user.get("user_id")
            or current_user.get("id")
            or current_user.get("sub")
        )
    if hasattr(current_user, "id"):
        return str(getattr(current_user, "id"))
    return str(current_user)


def _build_ai_context(data: dict) -> str:
    if not data:
        return ""

    context_parts: List[str] = []

    if data.get("company_name"):
        context_parts.append(f"## Firma: {data['company_name']}")
        if data.get("company_description"):
            context_parts.append(data["company_description"])

    if data.get("products"):
        context_parts.append("\n## Produkte:")
        for p in data["products"]:
            context_parts.append(f"\n### {p.get('name')}")
            if p.get("description"):
                context_parts.append(p["description"])
            if p.get("price"):
                context_parts.append(f"Preis: {p['price']}")
            if p.get("benefits"):
                context_parts.append(f"Vorteile: {', '.join(p['benefits'])}")
            if p.get("objections"):
                for obj in p["objections"]:
                    context_parts.append(
                        f"- Einwand '{obj.get('objection', '')}': {obj.get('response', '')}"
                    )

    if data.get("custom_objections"):
        context_parts.append("\n## Einwandbehandlung:")
        for obj in data["custom_objections"]:
            context_parts.append(
                f"- '{obj.get('objection', '')}' → {obj.get('response', '')}"
            )

    if data.get("documents"):
        context_parts.append("\n## Dokumente:")
        for doc in data["documents"]:
            context_parts.append(f"\n### {doc.get('filename')}")
            content = (doc.get("content") or "")[:2000]
            context_parts.append(content)

    return "\n".join(context_parts)


def extract_text_from_pdf(file_content: bytes) -> str:
    try:
        doc = fitz.open(stream=file_content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"PDF Extraktion fehlgeschlagen: {str(e)}"
        )


def extract_text_from_docx(file_content: bytes) -> str:
    try:
        document = docx.Document(io.BytesIO(file_content))
        text = "\n".join([paragraph.text for paragraph in document.paragraphs])
        return text.strip()
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Word Extraktion fehlgeschlagen: {str(e)}"
        )


@router.get("")
async def get_knowledge(user=Depends(get_current_active_user), supabase=Depends(get_supabase)):
    """Get user's complete knowledge base."""
    user_id = _extract_user_id(user)
    try:
        result = (
            supabase.table("user_knowledge")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if result.data:
            return result.data
        return {
            "company_name": None,
            "company_type": None,
            "company_description": None,
            "products": [],
            "documents": [],
            "custom_objections": [],
            "sales_scripts": [],
        }
    except Exception:
        return {
            "company_name": None,
            "company_type": None,
            "company_description": None,
            "products": [],
            "documents": [],
            "custom_objections": [],
            "sales_scripts": [],
        }


@router.put("/company")
async def update_company_info(
    data: CompanyInfo, user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    """Update company information."""
    user_id = _extract_user_id(user)
    try:
        existing = (
            supabase.table("user_knowledge").select("id").eq("user_id", user_id).execute()
        )

        payload = {
            "company_name": data.company_name,
            "company_type": data.company_type,
            "company_description": data.company_description,
        }

        if existing.data:
            result = (
                supabase.table("user_knowledge")
                .update(payload)
                .eq("user_id", user_id)
                .execute()
            )
        else:
            result = (
                supabase.table("user_knowledge")
                .insert({"user_id": user_id, **payload})
                .execute()
            )

        return {"success": True, "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/products")
async def add_product(
    product: Product, user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    """Add a new product."""
    user_id = _extract_user_id(user)
    try:
        existing = (
            supabase.table("user_knowledge")
            .select("products")
            .eq("user_id", user_id)
            .execute()
        )

        products = existing.data[0]["products"] if existing.data else []
        new_product = product.model_dump()
        new_product["id"] = str(uuid.uuid4())
        products.append(new_product)

        if existing.data:
            supabase.table("user_knowledge").update({"products": products}).eq(
                "user_id", user_id
            ).execute()
        else:
            supabase.table("user_knowledge").insert(
                {"user_id": user_id, "products": products}
            ).execute()

        return {"success": True, "product": new_product}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    product: Product,
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Update an existing product."""
    user_id = _extract_user_id(user)
    try:
        existing = (
            supabase.table("user_knowledge")
            .select("products")
            .eq("user_id", user_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")

        products = existing.data[0]["products"]
        for i, p in enumerate(products):
            if p["id"] == product_id:
                updated = product.model_dump()
                updated["id"] = product_id
                products[i] = updated
                break
        else:
            raise HTTPException(status_code=404, detail="Product not found")

        supabase.table("user_knowledge").update({"products": products}).eq(
            "user_id", user_id
        ).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str, user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    """Delete a product."""
    user_id = _extract_user_id(user)
    try:
        existing = (
            supabase.table("user_knowledge")
            .select("products")
            .eq("user_id", user_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")

        products = [p for p in existing.data[0]["products"] if p["id"] != product_id]

        supabase.table("user_knowledge").update({"products": products}).eq(
            "user_id", user_id
        ).execute()

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    user=Depends(get_current_active_user),
    supabase=Depends(get_supabase),
):
    """Upload and extract text from PDF or Word document."""
    user_id = _extract_user_id(user)
    try:
        allowed_types = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Nur PDF und Word Dokumente erlaubt")

        content = await file.read()

        max_bytes = 10 * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(status_code=400, detail="Datei ist größer als 10MB")

        text = (
            extract_text_from_pdf(content)
            if file.content_type == "application/pdf"
            else extract_text_from_docx(content)
        )

        max_chars = 50000
        if len(text) > max_chars:
            text = text[:max_chars] + "\n\n[... Text gekürzt ...]"

        doc_entry = {
            "id": str(uuid.uuid4()),
            "filename": file.filename,
            "content": text,
            "type": "pdf" if file.content_type == "application/pdf" else "docx",
            "uploaded_at": datetime.now().isoformat(),
            "char_count": len(text),
        }

        existing = (
            supabase.table("user_knowledge")
            .select("documents")
            .eq("user_id", user_id)
            .execute()
        )

        documents = existing.data[0]["documents"] if existing.data else []
        documents.append(doc_entry)

        if existing.data:
            supabase.table("user_knowledge").update({"documents": documents}).eq(
                "user_id", user_id
            ).execute()
        else:
            supabase.table("user_knowledge").insert(
                {"user_id": user_id, "documents": documents}
            ).execute()

        return {
            "success": True,
            "document": {
                "id": doc_entry["id"],
                "filename": doc_entry["filename"],
                "char_count": doc_entry["char_count"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str, user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    """Delete a document."""
    user_id = _extract_user_id(user)
    try:
        existing = (
            supabase.table("user_knowledge")
            .select("documents")
            .eq("user_id", user_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")

        documents = [d for d in existing.data[0]["documents"] if d["id"] != doc_id]

        supabase.table("user_knowledge").update({"documents": documents}).eq(
            "user_id", user_id
        ).execute()

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/objections")
async def add_objection(
    objection: Objection, user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    """Add a custom objection handler."""
    user_id = _extract_user_id(user)
    try:
        existing = (
            supabase.table("user_knowledge")
            .select("custom_objections")
            .eq("user_id", user_id)
            .execute()
        )

        objections = existing.data[0]["custom_objections"] if existing.data else []
        new_obj = objection.model_dump()
        new_obj["id"] = str(uuid.uuid4())
        objections.append(new_obj)

        if existing.data:
            supabase.table("user_knowledge").update({"custom_objections": objections}).eq(
                "user_id", user_id
            ).execute()
        else:
            supabase.table("user_knowledge").insert(
                {"user_id": user_id, "custom_objections": objections}
            ).execute()

        return {"success": True, "objection": new_obj}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/objections/{obj_id}")
async def delete_objection(
    obj_id: str, user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    """Delete a custom objection."""
    user_id = _extract_user_id(user)
    try:
        existing = (
            supabase.table("user_knowledge")
            .select("custom_objections")
            .eq("user_id", user_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")

        objections = [o for o in existing.data[0]["custom_objections"] if o["id"] != obj_id]

        supabase.table("user_knowledge").update({"custom_objections": objections}).eq(
            "user_id", user_id
        ).execute()

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/for-ai")
async def get_knowledge_for_ai(
    user=Depends(get_current_active_user), supabase=Depends(get_supabase)
):
    """Get formatted knowledge for AI context injection."""
    user_id = _extract_user_id(user)
    try:
        result = (
            supabase.table("user_knowledge")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data:
            return {"context": ""}

        data = result.data[0]
        return {"context": _build_ai_context(data)}
    except Exception:
        return {"context": ""}

