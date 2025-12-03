"""
Document Management Router
Allows uploading, listing and downloading workspace documents.
"""
import base64
import mimetypes
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from storage3.utils import StorageException

from app.core.auth_helper import get_current_user_id
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/api/documents", tags=["documents"])

DOCUMENT_BUCKET = "documents"


class DocumentUploadPayload(BaseModel):
    workspace_id: str
    contact_id: Optional[str] = None
    filename: str
    file_type: Optional[str] = None
    file_data: str = Field(..., description="Base64 encoded file body")
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


def _upload_to_storage(file_bytes: bytes, path: str, content_type: str):
    supabase = get_supabase_client()
    bucket = supabase.storage.from_(DOCUMENT_BUCKET)
    try:
        bucket.upload(
            path,
            file_bytes,
            {"content-type": content_type, "x-upsert": "true"},
        )
    except StorageException as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Upload fehlgeschlagen: {exc.message}") from exc

    public_url = bucket.get_public_url(path)
    return public_url


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_document(
    payload: DocumentUploadPayload,
    user_id: str = Depends(get_current_user_id),
):
    """
    Upload a new document and persist metadata in the documents table.
    """
    try:
        file_bytes = base64.b64decode(payload.file_data)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail="Ungültige Datei (Base64).") from exc

    content_type = payload.file_type or mimetypes.guess_type(payload.filename)[0] or "application/octet-stream"
    storage_key = f"{payload.workspace_id}/{uuid.uuid4()}-{payload.filename}"
    public_url = _upload_to_storage(file_bytes, storage_key, content_type)

    record = {
        "workspace_id": payload.workspace_id,
        "contact_id": payload.contact_id,
        "uploaded_by": user_id,
        "filename": payload.filename,
        "file_type": content_type,
        "file_size": len(file_bytes),
        "storage_path": storage_key,
        "public_url": public_url,
        "description": payload.description,
        "tags": payload.tags,
    }

    supabase = get_supabase_client()
    try:
        response = supabase.table("documents").insert(record).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Dokument konnte nicht gespeichert werden: {exc}") from exc

    if not response.data:
        raise HTTPException(status_code=500, detail="Dokument wurde nicht gespeichert.")

    return response.data[0]


@router.get("/contact/{contact_id}")
async def get_documents_for_contact(
    contact_id: str,
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001 (enforces auth)
):
    """
    Returns all documents linked to a contact.
    """
    supabase = get_supabase_client()
    try:
        response = (
            supabase.table("documents")
            .select("*")
            .eq("contact_id", contact_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Dokumente konnten nicht geladen werden: {exc}") from exc

    return {"documents": response.data or []}


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001
):
    """
    Creates a signed URL for downloading the file.
    """
    supabase = get_supabase_client()
    try:
        response = (
            supabase.table("documents")
            .select("*")
            .eq("id", document_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Dokument konnte nicht geladen werden: {exc}") from exc

    if not response.data:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")

    document = response.data[0]
    storage = supabase.storage.from_(DOCUMENT_BUCKET)
    try:
        signed = storage.create_signed_url(document["storage_path"], expires_in=60 * 30)
    except StorageException as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Download-Link konnte nicht erstellt werden: {exc.message}") from exc

    download_url = signed.get("signedURL") or signed.get("signedUrl")

    return {
        "filename": document["filename"],
        "url": download_url,
    }


