# backend/app/services/storage_service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  STORAGE SERVICE                                                           ║
║  Supabase Storage für Audio-Dateien und andere Uploads                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Audio-Upload zu Supabase Storage
- Signierte URLs für temporären Zugriff
- Automatisches Cleanup alter Dateien
"""

import uuid
from typing import Optional, Literal
from datetime import datetime
from dataclasses import dataclass

from ..core.config import settings
from ..db.supabase import get_supabase


# ═══════════════════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class UploadResult:
    """Ergebnis eines Uploads."""
    path: str                       # Pfad im Storage
    public_url: Optional[str]       # Öffentliche URL (wenn Bucket public)
    signed_url: Optional[str]       # Signierte URL mit Ablaufzeit
    expires_at: Optional[str]       # Ablaufzeit der signierten URL


# ═══════════════════════════════════════════════════════════════════════════
# STORAGE SERVICE
# ═══════════════════════════════════════════════════════════════════════════

class StorageService:
    """
    Service für Supabase Storage Operationen.
    
    Verwaltet Audio-Dateien und andere Uploads.
    """
    
    def __init__(self, bucket: str = None):
        """
        Initialisiert den Storage Service.
        
        Args:
            bucket: Name des Storage Buckets (default aus settings)
        """
        self.client = get_supabase()
        self.bucket = bucket or settings.SUPABASE_STORAGE_BUCKET
    
    async def upload_audio(
        self,
        audio_bytes: bytes,
        user_id: str,
        filename: Optional[str] = None,
        content_type: str = "audio/mpeg",
        folder: str = "voice",
    ) -> UploadResult:
        """
        Lädt eine Audio-Datei hoch.
        
        Args:
            audio_bytes: Die Audio-Daten
            user_id: ID des Users (für Pfad-Struktur)
            filename: Optionaler Dateiname
            content_type: MIME-Type der Datei
            folder: Unterordner (z.B. "voice", "tts")
            
        Returns:
            UploadResult mit URLs
        """
        # Einzigartigen Dateinamen generieren
        if not filename:
            ext = self._get_extension(content_type)
            filename = f"{uuid.uuid4().hex}.{ext}"
        
        # Pfad: {folder}/{user_id}/{timestamp}_{filename}
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        path = f"{folder}/{user_id}/{timestamp}_{filename}"
        
        # Upload durchführen
        try:
            result = self.client.storage.from_(self.bucket).upload(
                path=path,
                file=audio_bytes,
                file_options={"content-type": content_type},
            )
            
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Upload error: {result.error}")
            
        except Exception as e:
            # Fallback: Überschreiben wenn Datei existiert
            if "Duplicate" in str(e) or "already exists" in str(e):
                result = self.client.storage.from_(self.bucket).update(
                    path=path,
                    file=audio_bytes,
                    file_options={"content-type": content_type},
                )
            else:
                raise
        
        # URLs generieren
        public_url = self._get_public_url(path)
        signed_url, expires_at = await self.create_signed_url(path)
        
        return UploadResult(
            path=path,
            public_url=public_url,
            signed_url=signed_url,
            expires_at=expires_at,
        )
    
    async def create_signed_url(
        self,
        path: str,
        expires_in: int = None,
    ) -> tuple[str, str]:
        """
        Erstellt eine signierte URL für temporären Zugriff.
        
        Args:
            path: Pfad der Datei im Storage
            expires_in: Ablaufzeit in Sekunden (default aus settings)
            
        Returns:
            Tuple aus (signed_url, expires_at_iso)
        """
        expires_in = expires_in or settings.AUDIO_URL_EXPIRY_SECONDS
        
        result = self.client.storage.from_(self.bucket).create_signed_url(
            path=path,
            expires_in=expires_in,
        )
        
        if hasattr(result, 'error') and result.error:
            raise Exception(f"Signed URL error: {result.error}")
        
        signed_url = result.get("signedURL") or result.get("signed_url", "")
        
        # Ablaufzeit berechnen
        from datetime import timedelta
        expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat() + "Z"
        
        return signed_url, expires_at
    
    async def download(self, path: str) -> bytes:
        """
        Lädt eine Datei herunter.
        
        Args:
            path: Pfad der Datei im Storage
            
        Returns:
            Datei-Bytes
        """
        result = self.client.storage.from_(self.bucket).download(path)
        
        if isinstance(result, bytes):
            return result
        
        raise Exception(f"Download failed for path: {path}")
    
    async def delete(self, paths: list[str]) -> bool:
        """
        Löscht Dateien.
        
        Args:
            paths: Liste von Dateipfaden
            
        Returns:
            True wenn erfolgreich
        """
        try:
            self.client.storage.from_(self.bucket).remove(paths)
            return True
        except Exception as e:
            print(f"Delete error: {e}")
            return False
    
    async def list_files(
        self,
        folder: str,
        limit: int = 100,
    ) -> list[dict]:
        """
        Listet Dateien in einem Ordner.
        
        Args:
            folder: Ordnerpfad
            limit: Maximale Anzahl
            
        Returns:
            Liste von Datei-Metadaten
        """
        result = self.client.storage.from_(self.bucket).list(
            path=folder,
            options={"limit": limit},
        )
        
        return result or []
    
    def _get_public_url(self, path: str) -> str:
        """Erstellt die öffentliche URL (wenn Bucket public)."""
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{self.bucket}/{path}"
    
    def _get_extension(self, content_type: str) -> str:
        """Ermittelt Dateiendung aus Content-Type."""
        extensions = {
            "audio/mpeg": "mp3",
            "audio/mp3": "mp3",
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/m4a": "m4a",
            "audio/mp4": "m4a",
            "audio/ogg": "ogg",
            "audio/webm": "webm",
            "audio/flac": "flac",
        }
        return extensions.get(content_type, "mp3")


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════

_storage_service: Optional[StorageService] = None


def get_storage_service(bucket: str = None) -> StorageService:
    """Gibt den Storage Service zurück."""
    global _storage_service
    
    if _storage_service is None or bucket:
        _storage_service = StorageService(bucket)
    
    return _storage_service

