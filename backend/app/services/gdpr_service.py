"""
═══════════════════════════════════════════════════════════════════════════
GDPR COMPLIANCE SERVICE
═══════════════════════════════════════════════════════════════════════════
Implementierung aller DSGVO-Anforderungen:
- Art. 15: Auskunftsrecht
- Art. 17: Recht auf Vergessenwerden  
- Art. 20: Datenportabilität
═══════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from uuid import UUID
import json
import csv
import io
from app.core.supabase import get_supabase_client


class GDPRService:
    """
    Service für DSGVO-konforme Datenverarbeitung.
    """
    
    def __init__(self, supabase=None):
        self.supabase = supabase or get_supabase_client()
    
    async def create_export_request(
        self,
        user_id: str,
        lead_id: Optional[str] = None,
        export_format: str = 'json',
        include_attachments: bool = True
    ) -> str:
        """
        Erstellt eine Datenexport-Anfrage (DSGVO Art. 20).
        
        Args:
            user_id: User der den Export anfordert
            lead_id: Optional - spezifischer Lead, sonst alle Daten
            export_format: 'json', 'csv', 'pdf', 'xml'
            include_attachments: Dateien/Bilder einschließen
            
        Returns:
            Request ID (UUID)
        """
        expires_at = (datetime.now() + timedelta(days=7)).isoformat()
        
        request_data = {
            'user_id': user_id,
            'lead_id': lead_id,
            'export_scope': 'single_lead' if lead_id else 'all_leads',
            'export_format': export_format,
            'include_attachments': include_attachments,
            'status': 'pending',
            'expires_at': expires_at,
            'requested_at': datetime.now().isoformat()
        }
        
        result = self.supabase.table('data_export_requests').insert(
            request_data
        ).execute()
        
        if not result.data:
            raise Exception("Fehler beim Erstellen der Export-Anfrage")
        
        request_id = result.data[0]['id']
        
        # Log access
        self._log_access(
            user_id=user_id,
            action='export',
            table_name='users',
            metadata={'export_request_id': request_id}
        )
        
        return request_id
    
    async def generate_export(
        self,
        request_id: str
    ) -> Dict[str, Any]:
        """
        Generiert den tatsächlichen Export (Background Job).
        """
        # Get request
        request = self.supabase.table('data_export_requests').select('*').eq(
            'id', request_id
        ).execute()
        
        if not request.data:
            raise Exception("Export-Anfrage nicht gefunden")
        
        req_data = request.data[0]
        
        # Update status
        self.supabase.table('data_export_requests').update({
            'status': 'processing',
            'started_processing_at': datetime.now().isoformat()
        }).eq('id', request_id).execute()
        
        try:
            # Call PostgreSQL function for data export
            result = self.supabase.rpc(
                'export_user_data',
                {'p_user_id': req_data['user_id']}
            ).execute()
            
            export_data = result.data if result.data else {}
            
            # Format based on requested format
            if req_data['export_format'] == 'json':
                file_content = json.dumps(export_data, indent=2, default=str)
                file_extension = 'json'
            elif req_data['export_format'] == 'csv':
                file_content = self._convert_to_csv(export_data)
                file_extension = 'csv'
            else:
                file_content = json.dumps(export_data, indent=2, default=str)
                file_extension = 'json'
            
            # TODO: Upload to storage (Supabase Storage oder S3)
            file_path = f"exports/{req_data['user_id']}/{request_id}.{file_extension}"
            # file_url = await self._upload_export_file(file_path, file_content)
            file_url = f"https://storage.example.com/{file_path}"  # Placeholder
            
            # Update request
            self.supabase.table('data_export_requests').update({
                'status': 'completed',
                'file_path': file_path,
                'download_url': file_url,
                'file_size_bytes': len(file_content.encode('utf-8')),
                'completed_at': datetime.now().isoformat()
            }).eq('id', request_id).execute()
            
            return {
                "status": "completed",
                "download_url": file_url,
                "expires_at": req_data['expires_at']
            }
            
        except Exception as e:
            # Mark as failed
            self.supabase.table('data_export_requests').update({
                'status': 'failed',
                'error_message': str(e)
            }).eq('id', request_id).execute()
            
            raise e
    
    async def get_download_url(self, request_id: str) -> str:
        """
        Liefert Download-URL für fertigen Export.
        """
        request = self.supabase.table('data_export_requests').select('*').eq(
            'id', request_id
        ).execute()
        
        if not request.data:
            raise Exception("Export nicht gefunden")
        
        req_data = request.data[0]
        
        # Check if expired
        if datetime.fromisoformat(req_data['expires_at']) < datetime.now():
            raise Exception("Export ist abgelaufen")
        
        # Update download count
        self.supabase.table('data_export_requests').update({
            'download_count': req_data.get('download_count', 0) + 1,
            'last_downloaded_at': datetime.now().isoformat()
        }).eq('id', request_id).execute()
        
        return req_data['download_url']
    
    async def create_deletion_request(
        self,
        lead_id: str,
        user_id: str,
        reason: str,
        legal_basis: str = 'art_17_dsgvo'
    ) -> str:
        """
        Erstellt Löschanfrage (DSGVO Art. 17).
        """
        request_data = {
            'lead_id': lead_id,
            'user_id': user_id,
            'reason': reason,
            'legal_basis': legal_basis,
            'status': 'pending',
            'requested_at': datetime.now().isoformat()
        }
        
        result = self.supabase.table('data_deletion_requests').insert(
            request_data
        ).execute()
        
        if not result.data:
            raise Exception("Fehler beim Erstellen der Löschanfrage")
        
        return result.data[0]['id']
    
    async def execute_deletion(
        self,
        request_id: str,
        admin_id: str,
        deletion_method: str = 'anonymize'
    ) -> Dict[str, Any]:
        """
        Führt genehmigte Löschung durch.
        """
        # Get request
        request = self.supabase.table('data_deletion_requests').select('*').eq(
            'id', request_id
        ).execute()
        
        if not request.data:
            raise Exception("Löschanfrage nicht gefunden")
        
        req_data = request.data[0]
        lead_id = req_data['lead_id']
        
        # Update status
        self.supabase.table('data_deletion_requests').update({
            'status': 'processing',
            'approved_by': admin_id,
            'deletion_method': deletion_method
        }).eq('id', request_id).execute()
        
        try:
            if deletion_method == 'anonymize':
                # Call anonymization function
                self.supabase.rpc('anonymize_lead', {
                    'p_lead_id': lead_id,
                    'p_reason': req_data['reason']
                }).execute()
                
            elif deletion_method == 'hard_delete':
                # Call hard delete function
                self.supabase.rpc('hard_delete_lead', {
                    'p_lead_id': lead_id,
                    'p_authorized_by': admin_id,
                    'p_reason': req_data['reason']
                }).execute()
            
            # Mark as completed
            self.supabase.table('data_deletion_requests').update({
                'status': 'completed',
                'processed_at': datetime.now().isoformat(),
                'completed_at': datetime.now().isoformat(),
                'processed_by': admin_id
            }).eq('id', request_id).execute()
            
            return {
                "status": "completed",
                "method": deletion_method,
                "lead_id": lead_id
            }
            
        except Exception as e:
            # Mark as failed
            self.supabase.table('data_deletion_requests').update({
                'status': 'rejected',
                'rejection_reason': f"Technischer Fehler: {str(e)}"
            }).eq('id', request_id).execute()
            
            raise e
    
    async def reject_deletion(
        self,
        request_id: str,
        admin_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Lehnt Löschanfrage ab.
        """
        self.supabase.table('data_deletion_requests').update({
            'status': 'rejected',
            'rejection_reason': reason,
            'processed_at': datetime.now().isoformat(),
            'processed_by': admin_id
        }).eq('id', request_id).execute()
        
        return {"status": "rejected", "reason": reason}
    
    async def check_consent(
        self,
        user_id: str,
        consent_type: str
    ) -> bool:
        """
        Prüft ob Einwilligung vorliegt.
        """
        result = self.supabase.rpc('check_user_consent', {
            'p_user_id': user_id,
            'p_consent_type': consent_type
        }).execute()
        
        return result.data if result.data is not None else False
    
    async def grant_consent(
        self,
        user_id: str,
        consent_type: str,
        consent_text: str,
        consent_version: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Erteilt Einwilligung.
        """
        # Revoke old consents of same type
        self.supabase.table('user_consents').update({
            'is_active': False,
            'revoked_at': datetime.now().isoformat()
        }).eq('user_id', user_id).eq(
            'consent_type', consent_type
        ).eq('is_active', True).execute()
        
        # Create new consent
        consent_data = {
            'user_id': user_id,
            'consent_type': consent_type,
            'consented': True,
            'consent_version': consent_version,
            'consent_text': consent_text,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'granted_at': datetime.now().isoformat(),
            'is_active': True
        }
        
        result = self.supabase.table('user_consents').insert(consent_data).execute()
        
        return result.data[0]['id'] if result.data else None
    
    async def revoke_consent(
        self,
        user_id: str,
        consent_type: str
    ) -> bool:
        """
        Widerruft Einwilligung.
        """
        self.supabase.table('user_consents').update({
            'is_active': False,
            'revoked_at': datetime.now().isoformat()
        }).eq('user_id', user_id).eq(
            'consent_type', consent_type
        ).eq('is_active', True).execute()
        
        return True
    
    async def generate_privacy_report(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Generiert Privacy-Übersichtsbericht.
        """
        result = self.supabase.rpc('generate_privacy_report', {
            'p_user_id': user_id
        }).execute()
        
        return result.data if result.data else {}
    
    def _log_access(
        self,
        user_id: str,
        action: str,
        table_name: str,
        lead_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> None:
        """
        Interner Helper für Access Logging.
        """
        log_data = {
            'user_id': user_id,
            'lead_id': lead_id,
            'action': action,
            'table_name': table_name,
            'metadata': metadata or {},
            'created_at': datetime.now().isoformat()
        }
        
        self.supabase.table('data_access_log').insert(log_data).execute()
    
    def _convert_to_csv(self, data: Dict) -> str:
        """
        Konvertiert Export-Daten zu CSV.
        """
        output = io.StringIO()
        
        # Simple CSV for leads
        if 'leads' in data and data['leads']:
            writer = csv.DictWriter(
                output,
                fieldnames=data['leads'][0].keys()
            )
            writer.writeheader()
            writer.writerows(data['leads'])
        
        return output.getvalue()

